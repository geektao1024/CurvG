/**
 * Probe OpenCode's inference gateway (Anthropic Messages route) for Claude
 * Haiku 5.5: auth header, reliability and latency, native structured output
 * (output_config.format), and whether CurvG's strict plan/scene schemas are
 * accepted as they are.
 *
 * Usage (reads OPENCODE_API_KEY from the environment; never printed):
 *   pnpm tsx scripts/with-env.ts "npx tsx scripts/probe-opencode.ts"
 *   PROBE_RUNS=4 PROBE_ONLY=base,schema ...
 */
import {
  planArtifactSchema,
  sceneResponseSchema,
  validateAnimationPlanningArtifact,
} from '@/lib/animation-pipeline';
import {
  stripNullFields,
  toAnthropicStructuredSchema,
  toStrictJsonSchema,
} from '@/lib/strict-json-schema';

const apiKey =
  process.env.OPENCODE_API_KEY || process.env.opencode_API_KEY || '';
if (!apiKey) {
  console.error('Set OPENCODE_API_KEY (value is never printed).');
  process.exit(1);
}
const baseUrl = (
  process.env.OPENCODE_BASE_URL || 'https://opencode.ai/inference/v1'
).replace(/\/+$/, '');
const model = process.env.PROBE_MODEL || 'claude-haiku-5-5';
const runs = Math.max(1, Number.parseInt(process.env.PROBE_RUNS || '2', 10));
const only = (process.env.PROBE_ONLY || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

type Body = Record<string, unknown>;
type Check = (value: unknown) => string;

const QUESTION =
  'Plan a 20 second animation explaining why the derivative is the slope of a tangent line.';
const SMALL_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    durationSeconds: { type: 'number' },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'durationSeconds', 'assumptions'],
  additionalProperties: false,
};
const SCENE_ASK =
  'Scene for a 6 second animation: axes, the curve y=x^2, a point at (1,1) moving along the curve, and a tangent line from (0,-1) to (2,3). Shot ids: s1 (0-3s), s2 (3-6s).';

const user = (text: string) => [{ role: 'user', content: text }];
const format = (schema: Body) => ({
  output_config: {
    format: {
      type: 'json_schema',
      schema: toAnthropicStructuredSchema(schema),
    },
  },
});

const VARIANTS: Record<
  string,
  { body: Body; check?: Check; auth?: 'x-api-key' | 'bearer' }
> = {
  auth_x_api_key: {
    auth: 'x-api-key',
    body: { messages: user('Reply with the word ok.'), max_tokens: 64 },
  },
  auth_bearer: {
    auth: 'bearer',
    body: { messages: user('Reply with the word ok.'), max_tokens: 64 },
  },
  base: {
    body: {
      system: 'Return only JSON.',
      messages: user(
        `${QUESTION} Reply with one JSON object: {"title": string, "durationSeconds": number, "assumptions": string[]}.`
      ),
      max_tokens: 2_000,
    },
  },
  effort_low: {
    body: {
      messages: user(`${QUESTION} One sentence.`),
      max_tokens: 2_000,
      output_config: { effort: 'low' },
    },
  },
  schema_small: {
    body: {
      messages: user(QUESTION),
      max_tokens: 2_000,
      ...format(SMALL_SCHEMA),
    },
  },
  schema_plan: {
    body: {
      messages: user(QUESTION),
      max_tokens: 24_000,
      ...format(toStrictJsonSchema(planArtifactSchema)),
    },
    check: (value) => {
      const plan = value as Record<string, unknown[]>;
      return `shots=${plan.shots?.length} beats=${plan.curriculum?.length}`;
    },
  },
  schema_scene: {
    body: {
      messages: user(SCENE_ASK),
      max_tokens: 16_000,
      ...format(sceneResponseSchema()),
    },
    check: (value) => {
      validateAnimationPlanningArtifact('scene', value);
      return 'scene zod ok';
    },
  },
};

async function call(name: string, variant: (typeof VARIANTS)[string]) {
  const started = Date.now();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (variant.auth === 'bearer') headers.Authorization = `Bearer ${apiKey}`;
  else headers['x-api-key'] = apiKey;
  try {
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model, stream: false, ...variant.body }),
      signal: AbortSignal.timeout(300_000),
    });
    const raw = await response.text();
    let data: Record<string, any> = {};
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw: raw.slice(0, 160) };
    }
    const ms = Date.now() - started;
    if (!response.ok || data.type === 'error' || data.error) {
      return {
        name,
        ok: false,
        ms,
        http: response.status,
        message: String(
          data.error?.message || data.message || data.raw || ''
        ).slice(0, 220),
      };
    }
    const text = (Array.isArray(data.content) ? data.content : [])
      .filter((block: any) => block?.type === 'text')
      .map((block: any) => block.text)
      .join('');
    let verdict = 'n/a';
    if (variant.check || variant.body.output_config) {
      try {
        const parsed = stripNullFields(JSON.parse(text));
        verdict = variant.check ? variant.check(parsed) : 'json ok';
      } catch (error) {
        verdict = `INVALID ${String((error as Error).message)
          .replace(/\s+/g, ' ')
          .slice(0, 160)}`;
      }
    }
    return {
      name,
      ok: true,
      ms,
      stop: data.stop_reason,
      usage: `${data.usage?.input_tokens ?? '?'}/${data.usage?.output_tokens ?? '?'}`,
      chars: text.length,
      verdict,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      message: String((error as Error).message).slice(0, 160),
    };
  }
}

const selected = Object.entries(VARIANTS).filter(
  ([name]) => only.length === 0 || only.includes(name)
);
console.log(`model=${model} runs=${runs} base=${baseUrl}`);
const totals: Record<string, { ok: number; runs: number; ms: number[] }> = {};
for (const [name, variant] of selected) {
  totals[name] = { ok: 0, runs: 0, ms: [] };
  for (let run = 0; run < runs; run += 1) {
    const result = await call(name, variant);
    totals[name]!.runs += 1;
    totals[name]!.ms.push(result.ms);
    if (result.ok) totals[name]!.ok += 1;
    console.log(JSON.stringify(result));
  }
}
console.log('\nSUMMARY');
for (const [name, total] of Object.entries(totals)) {
  const sorted = [...total.ms].sort((a, b) => a - b);
  console.log(
    `${name.padEnd(16)} ${total.ok}/${total.runs} ok  median ${sorted[Math.floor(sorted.length / 2)]}ms`
  );
}
