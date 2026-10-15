/**
 * Probe KIE's Claude route (claude/v1/messages) one request parameter at a
 * time, to find which request shapes fail and which structured-output
 * mechanisms the reseller passes through.
 *
 * KIE documents only model / messages (user|assistant) / tools / thinkingFlag
 * / stream / max_tokens. Production also sends `system` and `temperature`, and
 * Claude Haiku 5.5 itself rejects non-default temperature. Each variant runs
 * PROBE_RUNS times so intermittent "Internal error" rates are visible.
 *
 * Usage:
 *   KIE_API_KEY=... node scripts/probe-kie-claude.mjs
 *   PROBE_RUNS=6 PROBE_MODEL=claude-haiku-5-5 node scripts/probe-kie-claude.mjs
 *   PROBE_ONLY=base,system node scripts/probe-kie-claude.mjs
 *
 * Costs a few cents. The script never prints the key.
 */

const apiKey = process.env.KIE_API_KEY;
if (!apiKey) {
  console.error('Set KIE_API_KEY (value is never printed).');
  process.exit(1);
}
const baseUrl = (process.env.KIE_BASE_URL || 'https://api.kie.ai').replace(
  /\/+$/,
  ''
);
const model = process.env.PROBE_MODEL || 'claude-haiku-5-5';
const runs = Math.max(1, Number.parseInt(process.env.PROBE_RUNS || '4', 10));
const only = (process.env.PROBE_ONLY || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const QUESTION =
  'Plan a 20 second animation explaining why the derivative is the slope of a tangent line.';
const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    durationSeconds: { type: 'number' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'durationSeconds', 'assumptions'],
  additionalProperties: false,
};
const TOOL = {
  name: 'submit_intent',
  description: 'Submit the planned animation intent.',
  input_schema: SCHEMA,
};
const JSON_ASK = `${QUESTION} Reply with one JSON object: {"title": string, "durationSeconds": number, "assumptions": string[]}. No prose.`;
// About 6k input tokens, close to a real planning stage prompt.
const LONG_CONTEXT = `CONTEXT:\n${JSON.stringify({
  notes: Array.from({ length: 220 }, (_, index) => ({
    id: `note_${index}`,
    text: 'The secant slope (f(x+h)-f(x))/h approaches the tangent slope as h shrinks toward zero.',
  })),
})}`;

const user = (text) => [{ role: 'user', content: text }];

const VARIANTS = {
  base: { messages: user(JSON_ASK), max_tokens: 512, thinkingFlag: false },
  system: {
    system: 'You are a planning specialist. Return only JSON.',
    messages: user(JSON_ASK),
    max_tokens: 512,
    thinkingFlag: false,
  },
  temperature: {
    messages: user(JSON_ASK),
    max_tokens: 512,
    thinkingFlag: false,
    temperature: 0.1,
  },
  thinking: { messages: user(JSON_ASK), max_tokens: 9_800, thinkingFlag: true },
  long_input: {
    messages: user(`${JSON_ASK}\n\n${LONG_CONTEXT}`),
    max_tokens: 1_800,
    thinkingFlag: false,
  },
  // Mirrors KieChatProvider's intent-stage request today.
  production_shape: {
    system:
      'Produce only the requested stage artifact. Do not solve downstream stages early.',
    messages: user(`${JSON_ASK}\n\n${LONG_CONTEXT}`),
    max_tokens: 9_800,
    thinkingFlag: true,
    temperature: 0.1,
  },
  tool_prompted: {
    messages: user(`${QUESTION} Call submit_intent with the plan.`),
    tools: [TOOL],
    max_tokens: 1_024,
    thinkingFlag: false,
  },
  tool_forced: {
    messages: user(`${QUESTION} Call submit_intent with the plan.`),
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    max_tokens: 1_024,
    thinkingFlag: false,
  },
  tool_strict: {
    messages: user(`${QUESTION} Call submit_intent with the plan.`),
    tools: [{ ...TOOL, strict: true }],
    max_tokens: 1_024,
    thinkingFlag: false,
  },
  output_config: {
    messages: user(QUESTION),
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    max_tokens: 1_024,
    thinkingFlag: false,
  },
};

function summarize(data) {
  const blocks = Array.isArray(data.content) ? data.content : [];
  const types = blocks.map((block) => block?.type).join('+') || 'none';
  const tool = blocks.find((block) => block?.type === 'tool_use');
  const text = blocks
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('');
  let json = 'n/a';
  if (tool) {
    json =
      tool.input && typeof tool.input === 'object'
        ? 'tool_input_ok'
        : 'tool_input_bad';
  } else if (text) {
    try {
      JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
      json = 'text_json_ok';
    } catch {
      json = 'text_not_json';
    }
  }
  const usage = data.usage || {};
  return {
    types,
    json,
    stop: data.stop_reason,
    usage: `${usage.input_tokens ?? '?'}/${usage.output_tokens ?? '?'}`,
    credits: data.credits_consumed,
  };
}

async function call(name, body) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/claude/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, stream: false, ...body }),
      signal: AbortSignal.timeout(180_000),
    });
    const raw = await response.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.slice(0, 160) };
    }
    const businessCode = Number(data.code);
    const failed =
      !response.ok ||
      (Number.isFinite(businessCode) &&
        businessCode !== 0 &&
        businessCode !== 200) ||
      data.type === 'error' ||
      data.error;
    const ms = Date.now() - started;
    if (failed) {
      const message =
        data.error?.message || data.msg || data.message || data.raw || '';
      return {
        name,
        ok: false,
        ms,
        http: response.status,
        code: data.code,
        message: String(message).slice(0, 140),
      };
    }
    return { name, ok: true, ms, http: response.status, ...summarize(data) };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      message: String(error?.message || error).slice(0, 140),
    };
  }
}

const selected = Object.entries(VARIANTS).filter(
  ([name]) => only.length === 0 || only.includes(name)
);
console.log(
  `model=${model} runs=${runs} variants=${selected.map(([n]) => n).join(',')}\n`
);
const totals = {};
for (const [name, body] of selected) {
  totals[name] = { ok: 0, runs: 0, ms: [] };
  for (let run = 0; run < runs; run += 1) {
    const result = await call(name, body);
    totals[name].runs += 1;
    totals[name].ms.push(result.ms);
    if (result.ok) totals[name].ok += 1;
    console.log(JSON.stringify(result));
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
}
console.log('\nSUMMARY');
for (const [name, total] of Object.entries(totals)) {
  const sorted = [...total.ms].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(17)} ${total.ok}/${total.runs} ok  median ${sorted[Math.floor(sorted.length / 2)]}ms`
  );
}
