/**
 * Probe whether KIE exposes gpt-5-6-luna on the codex responses route, and
 * which reasoning.effort values it accepts. Mirrors the exact request shape
 * KieChatProvider sends for `protocol: 'responses'` models (kie-chat.ts).
 *
 * Usage:
 *   KIE_API_KEY=sk-... node scripts/probe-kie-luna.mjs
 *   KIE_API_KEY=sk-... KIE_BASE_URL=https://api.kie.ai node scripts/probe-kie-luna.mjs
 *
 * Read-only against your KIE quota: each probe asks for one tiny completion
 * (max_output_tokens 16). The script never prints the key.
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

const MODELS = ['gpt-5-6-luna', 'gpt-5.6-luna'];
const EFFORTS = ['high', 'xhigh', 'max'];
const PATH = 'codex/v1/responses';

async function probe(model, effort) {
  const body = {
    model,
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: 'Reply with the word ok.' }],
      },
    ],
    stream: false,
    max_output_tokens: 16,
    reasoning: { effort },
  };
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/${PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const text = await response.text();
    let detail = '';
    try {
      const parsed = JSON.parse(text);
      detail =
        parsed?.error?.message ||
        parsed?.detail ||
        parsed?.message ||
        (parsed?.status === 'completed' ? 'completed' : parsed?.status) ||
        '';
    } catch {
      detail = text.slice(0, 120);
    }
    return {
      model,
      effort,
      http: response.status,
      ok: response.ok,
      ms: Date.now() - startedAt,
      detail: String(detail).slice(0, 160),
    };
  } catch (error) {
    return {
      model,
      effort,
      http: 0,
      ok: false,
      ms: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

const results = [];
for (const model of MODELS) {
  // Establish model validity with the known-good effort first; skip the
  // remaining efforts when the model itself is rejected.
  const first = await probe(model, EFFORTS[0]);
  results.push(first);
  const modelRejected =
    !first.ok && (first.http === 404 || /model/i.test(first.detail));
  if (modelRejected) continue;
  for (const effort of EFFORTS.slice(1)) {
    results.push(await probe(model, effort));
  }
}

console.log(`\nProbe results against ${baseUrl}/${PATH}\n`);
console.log('model            effort  http  ok     ms      detail');
for (const r of results) {
  console.log(
    `${r.model.padEnd(16)} ${r.effort.padEnd(7)} ${String(r.http).padEnd(5)} ${String(r.ok).padEnd(6)} ${String(r.ms).padEnd(7)} ${r.detail}`
  );
}
console.log(
  '\nInterpretation: ok=true rows are usable (model, effort) pairs. A 4xx on' +
    '\n"max"/"xhigh" with ok "high" means clamp reasoningEffort to high for KIE.'
);
