/**
 * Probe a KIE GPT model on the Responses route (codex/v1/responses) one
 * request parameter at a time: which shapes fail, what latency and credit
 * cost look like, and whether strict json_schema output (text.format) is
 * honoured. KIE documents model / input / stream / reasoning.effort / tools /
 * tool_choice / text.format; max_output_tokens and system turns are not
 * documented, so they get their own variants.
 *
 * Usage:
 *   KIE_API_KEY=... node scripts/probe-kie-gpt.mjs
 *   PROBE_MODEL=gpt-6-luna PROBE_RUNS=3 PROBE_ONLY=base,schema node scripts/probe-kie-gpt.mjs
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
const model = process.env.PROBE_MODEL || 'gpt-6-luna';
const runs = Math.max(1, Number.parseInt(process.env.PROBE_RUNS || '3', 10));
const only = (process.env.PROBE_ONLY || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const QUESTION =
  'Plan a 20 second animation explaining why the derivative is the slope of a tangent line.';
const JSON_ASK = `${QUESTION} Reply with one JSON object: {"title": string, "durationSeconds": number, "assumptions": string[]}. No prose.`;
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
// Roughly 6k input tokens, close to a real planning prompt.
const LONG_CONTEXT = `CONTEXT:\n${JSON.stringify({
  notes: Array.from({ length: 220 }, (_, index) => ({
    id: `note_${index}`,
    text: 'The secant slope (f(x+h)-f(x))/h approaches the tangent slope as h shrinks toward zero.',
  })),
})}`;

const userTurn = (text) => ({
  role: 'user',
  content: [{ type: 'input_text', text }],
});
const schemaFormat = {
  text: {
    format: {
      type: 'json_schema',
      name: 'intent',
      strict: true,
      schema: SCHEMA,
    },
  },
};

const VARIANTS = {
  base: { input: [userTurn(JSON_ASK)], reasoning: { effort: 'low' } },
  string_input: { input: JSON_ASK, reasoning: { effort: 'low' } },
  effort_medium: {
    input: [userTurn(JSON_ASK)],
    reasoning: { effort: 'medium' },
  },
  effort_high: { input: [userTurn(JSON_ASK)], reasoning: { effort: 'high' } },
  system_turn: {
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: 'Return only JSON.' }],
      },
      userTurn(JSON_ASK),
    ],
    reasoning: { effort: 'low' },
  },
  developer_turn: {
    input: [
      {
        role: 'developer',
        content: [{ type: 'input_text', text: 'Return only JSON.' }],
      },
      userTurn(JSON_ASK),
    ],
    reasoning: { effort: 'low' },
  },
  instructions: {
    instructions: 'Return only JSON.',
    input: [userTurn(JSON_ASK)],
    reasoning: { effort: 'low' },
  },
  max_output_tokens: {
    input: [userTurn(JSON_ASK)],
    reasoning: { effort: 'low' },
    max_output_tokens: 2_000,
  },
  schema: {
    input: [userTurn(QUESTION)],
    reasoning: { effort: 'low' },
    ...schemaFormat,
  },
  schema_long_medium: {
    input: [userTurn(`${QUESTION}\n\n${LONG_CONTEXT}`)],
    reasoning: { effort: 'medium' },
    ...schemaFormat,
  },
};

function outputText(data) {
  if (typeof data.output_text === 'string') return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((part) => part?.type === 'output_text')
    .map((part) => part.text)
    .join('');
}

function summarize(data) {
  const text = outputText(data).trim();
  let json = text ? 'text_not_json' : 'empty';
  if (text) {
    try {
      const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      json =
        parsed &&
        typeof parsed.title === 'string' &&
        typeof parsed.durationSeconds === 'number' &&
        Array.isArray(parsed.assumptions) &&
        Object.keys(parsed).length === 3
          ? 'schema_exact'
          : 'json_other_shape';
    } catch {
      // keep text_not_json
    }
  }
  const usage = data.usage || {};
  const reasoning = usage.output_tokens_details?.reasoning_tokens;
  return {
    status: data.status,
    json,
    usage: `${usage.input_tokens ?? '?'}/${usage.output_tokens ?? '?'}${
      reasoning === undefined ? '' : ` (reasoning ${reasoning})`
    }`,
    credits: data.credits_consumed,
  };
}

async function call(name, body) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/codex/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, stream: false, ...body }),
      signal: AbortSignal.timeout(300_000),
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
      Boolean(data.error) ||
      data.status === 'failed';
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
        message: String(message).slice(0, 160),
      };
    }
    return { name, ok: true, ms, http: response.status, ...summarize(data) };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      message: String(error?.message || error).slice(0, 160),
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
  totals[name] = { ok: 0, runs: 0, ms: [], credits: 0 };
  for (let run = 0; run < runs; run += 1) {
    const result = await call(name, body);
    totals[name].runs += 1;
    totals[name].ms.push(result.ms);
    if (result.ok) totals[name].ok += 1;
    if (typeof result.credits === 'number')
      totals[name].credits += result.credits;
    console.log(JSON.stringify(result));
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
}
console.log('\nSUMMARY');
for (const [name, total] of Object.entries(totals)) {
  const sorted = [...total.ms].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(19)} ${total.ok}/${total.runs} ok  median ${
      sorted[Math.floor(sorted.length / 2)]
    }ms  credits ${total.credits.toFixed(2)}`
  );
}
