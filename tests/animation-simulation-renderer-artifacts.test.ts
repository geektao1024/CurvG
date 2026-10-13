import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

import { HttpAnimationRenderer } from '../src/core/animation-renderer';
import {
  adaptRingEscapeSolverResult,
  buildSimulationRunManifest,
  canonicalSimulationEventSchema,
  createDefaultRingEscapeScenarioConfig,
  digestCanonicalJson,
  digestUtf8Text,
  simulationRunManifestSchema,
  simulationStateCheckpointSchema,
  stableCanonicalJson,
} from '../src/lib/animation-simulation';
import { buildRingEscapeReplayPlan } from '../src/lib/manim-simulation-compiler';
import {
  buildRingEscapeAudioPlan,
  digestRingEscapeAudioPlan,
  ringEscapeAudioPlanSchema,
  serializeRingEscapeAudioPlan,
} from '../src/lib/simulation-audio';
import { solveRingEscape } from '../src/lib/simulation-ring-escape';

const rendererSource = readFileSync(
  join(process.cwd(), 'renderer', 'src', 'index.ts'),
  'utf8'
);

type ParsedArtifacts = {
  eventsJsonl: string;
  stateTrackJson: string;
  runManifestJson: string;
  audioPlanJson: string;
  runDigest: string;
  compiledSourceDigest: string;
  audioPlanDigest: string;
  eventCount: number;
};

const compiledSimulationSource = `from manim import *
class CurvGScene(Scene):
    def construct(self):
        ring = Circle()
        particle = Dot()
        self.add(ring, particle)
        self.wait(1)
`;

function loadSimulationArtifactParser() {
  const start = rendererSource.indexOf('function utf8Length(');
  const end = rendererSource.indexOf('async function parseJob(');
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = rendererSource
    .slice(start, end)
    .replace(
      'export function classifyRenderProtocol',
      'function classifyRenderProtocol'
    )
    .replace(
      'export function inferLegacyFrameFromCode',
      'function inferLegacyFrameFromCode'
    )
    .replace(
      'export async function parseSimulationArtifacts',
      'async function parseSimulationArtifacts'
    );
  const javascript = ts.transpileModule(
    `${source}\nreturn parseSimulationArtifacts;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  return new Function(
    'SIMULATION_ARTIFACT_BYTE_LIMITS',
    'canonicalSimulationEventSchema',
    'simulationStateCheckpointSchema',
    'simulationRunManifestSchema',
    'digestCanonicalJson',
    'ringEscapeAudioPlanSchema',
    'digestRingEscapeAudioPlan',
    'isRecord',
    javascript
  )(
    {
      eventsJsonl: 128 * 1024,
      stateTrackJson: 512 * 1024,
      runManifestJson: 64 * 1024,
      audioPlanJson: 32 * 1024,
      total: 800 * 1024,
    },
    canonicalSimulationEventSchema,
    simulationStateCheckpointSchema,
    simulationRunManifestSchema,
    digestCanonicalJson,
    ringEscapeAudioPlanSchema,
    digestRingEscapeAudioPlan,
    (value: unknown) =>
      !!value && typeof value === 'object' && !Array.isArray(value)
  ) as (value: unknown) => Promise<ParsedArtifacts | undefined>;
}

function loadSimulationSourceVerifier() {
  const start = rendererSource.indexOf(
    'async function verifySimulationSourceDigest('
  );
  const end = rendererSource.indexOf('function hasBearerToken(');
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = rendererSource.slice(start, end);
  const javascript = ts.transpileModule(
    `${source}\nreturn verifySimulationSourceDigest;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  return new Function('digestUtf8Text', javascript)(digestUtf8Text) as (
    code: string,
    artifacts: ParsedArtifacts
  ) => Promise<void>;
}

function loadRendererRolloutHelpers() {
  const start = rendererSource.indexOf('function hasOwnRendererField(');
  const end = rendererSource.indexOf(
    'export async function parseSimulationArtifacts('
  );
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const source = rendererSource
    .slice(start, end)
    .replace(
      'export function classifyRenderProtocol',
      'function classifyRenderProtocol'
    )
    .replace(
      'export function inferLegacyFrameFromCode',
      'function inferLegacyFrameFromCode'
    );
  const javascript = ts.transpileModule(
    `${source}\nreturn { classifyRenderProtocol, inferLegacyFrameFromCode };`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText;
  return new Function('V2_RENDER_FIELDS', 'V2_RENDER_PROTOCOL', javascript)(
    ['frame', 'durationSeconds', 'idempotencyKey'],
    'curvg-renderer/v2'
  ) as {
    classifyRenderProtocol: (
      body: Record<string, unknown>
    ) => 'legacy' | 'curvg-renderer/v2';
    inferLegacyFrameFromCode: (code: string) => '16:9' | '9:16';
  };
}

async function verifiedArtifacts() {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 7 });
  const result = solveRingEscape(scenario.solverConfig);
  const run = await adaptRingEscapeSolverResult({ scenario, result });
  const replay = buildRingEscapeReplayPlan(result);
  const audioPlan = buildRingEscapeAudioPlan({
    events: run.events,
    eventFrameMap: replay.eventFrames.map(({ sequence, type, frame }) => ({
      seq: sequence,
      kind: type,
      frame,
    })),
    durationFrames: replay.timeline.totalFrames,
  });
  const audioPlanDigest = await digestRingEscapeAudioPlan(audioPlan);
  const manifest = await buildSimulationRunManifest({
    scenario,
    result,
    compiledSourceDigest: await digestUtf8Text(compiledSimulationSource),
    audioPlanDigest,
  });
  return {
    eventsJsonl: `${run.events.map(stableCanonicalJson).join('\n')}\n`,
    stateTrackJson: stableCanonicalJson(run.checkpoints),
    runManifestJson: stableCanonicalJson(manifest),
    audioPlanJson: serializeRingEscapeAudioPlan(audioPlan),
  };
}

test('renderer accepts an audio-bound digest-verified escaped simulation bundle', async () => {
  const artifacts = await verifiedArtifacts();
  const parsed = await loadSimulationArtifactParser()(artifacts);
  const manifest = simulationRunManifestSchema.parse(
    JSON.parse(artifacts.runManifestJson)
  );

  assert.equal(parsed?.runDigest, manifest.runDigest);
  assert.equal(parsed?.audioPlanDigest, manifest.audioPlanDigest);
  assert.equal(parsed?.eventCount, manifest.summary.eventCount);
  assert.equal(
    await digestRingEscapeAudioPlan(JSON.parse(artifacts.audioPlanJson)),
    manifest.audioPlanDigest
  );
  assert.match(manifest.runDigest, /^[a-f0-9]{64}$/);
  assert.equal(manifest.summary.terminalReason, 'escaped');
});

test('renderer run identity includes exact compiled source and rejects tampered code', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 7 });
  const result = solveRingEscape(scenario.solverConfig);
  const firstSourceDigest = await digestUtf8Text(compiledSimulationSource);
  const audioPlanDigest = await digestUtf8Text('audio plan fixture');
  const secondSourceDigest = await digestUtf8Text(
    `${compiledSimulationSource}\n# tampered`
  );
  const [first, second] = await Promise.all([
    buildSimulationRunManifest({
      scenario,
      result,
      compiledSourceDigest: firstSourceDigest,
      audioPlanDigest,
    }),
    buildSimulationRunManifest({
      scenario,
      result,
      compiledSourceDigest: secondSourceDigest,
      audioPlanDigest,
    }),
  ]);
  assert.notEqual(first.runDigest, second.runDigest);

  const artifacts = await verifiedArtifacts();
  const manifest = simulationRunManifestSchema.parse(
    JSON.parse(artifacts.runManifestJson)
  );
  const parsed: ParsedArtifacts = {
    ...artifacts,
    runDigest: manifest.runDigest,
    compiledSourceDigest: manifest.compiledSourceDigest,
    audioPlanDigest: manifest.audioPlanDigest,
    eventCount: Number(manifest.summary.eventCount),
  };
  const verifySource = loadSimulationSourceVerifier();
  await verifySource(compiledSimulationSource, parsed);
  await assert.rejects(
    () => verifySource(`${compiledSimulationSource}\n# tampered`, parsed),
    /does not match the compiled source digest/
  );
});

test('renderer rejects simulation event tampering and non-escaped delivery', async () => {
  const parse = loadSimulationArtifactParser();
  const artifacts = await verifiedArtifacts();
  const lines = artifacts.eventsJsonl.trimEnd().split('\n');
  const first = JSON.parse(lines[0]) as { position: [number, number] };
  first.position[0] += 0.125;
  lines[0] = stableCanonicalJson(first);
  await assert.rejects(
    () => parse({ ...artifacts, eventsJsonl: `${lines.join('\n')}\n` }),
    /digest verification failed/
  );

  const terminal = JSON.parse(lines.at(-1)!) as {
    payload: Record<string, unknown>;
  };
  terminal.payload.reason = 'max_steps';
  lines[lines.length - 1] = stableCanonicalJson(terminal);
  await assert.rejects(
    () => parse({ ...artifacts, eventsJsonl: `${lines.join('\n')}\n` }),
    /terminal:escaped/
  );
});

test('renderer enforces simulation artifact byte limits before parsing', async () => {
  const parse = loadSimulationArtifactParser();
  const artifacts = await verifiedArtifacts();
  await assert.rejects(
    () =>
      parse({
        ...artifacts,
        eventsJsonl: 'x'.repeat(128 * 1024 + 1),
      }),
    /eventsJsonl exceeds its byte limit/
  );
});

test('renderer source serves private simulation artifacts and commits manifest last', () => {
  assert.match(rendererSource, /events\|state-track\|run-manifest/);
  assert.match(rendererSource, /application\/x-ndjson; charset=utf-8/);
  assert.match(rendererSource, /events\.jsonl/);
  assert.match(rendererSource, /state-track\.json/);
  const upload = rendererSource.slice(
    rendererSource.indexOf('async function uploadSimulationArtifacts('),
    rendererSource.indexOf('function commandError(')
  );
  assert.ok(
    upload.indexOf('Promise.all([') < upload.indexOf('run-manifest.json')
  );
  assert.match(rendererSource, /reusableSimulationArtifacts/);
  assert.match(
    rendererSource,
    /object\.customMetadata\.compiledSourceDigest ===\s+artifacts\.compiledSourceDigest/
  );
  assert.match(
    rendererSource,
    /\^\[a-f0-9\]\{64\}\$.*objects\.video\?\.customMetadata\?\.videoDigest/s
  );
  assert.match(rendererSource, /sha256sum \$\{playbackPath\}/);
  assert.match(rendererSource, /completedSimulationLineage/);
  assert.doesNotMatch(rendererSource, /crypto\.randomUUID\(\)/);
  assert.match(
    rendererSource,
    /jobId: `job-\$\{idempotencyKey\.slice\(0, 32\)\}`/
  );
});

test('renderer rollout accepts only wholly legacy explainers and never partial-v2 downgrade', () => {
  const { classifyRenderProtocol } = loadRendererRolloutHelpers();
  assert.equal(classifyRenderProtocol({}), 'legacy');
  assert.equal(
    classifyRenderProtocol({ productionMode: 'explainer' }),
    'legacy'
  );
  assert.equal(
    classifyRenderProtocol({
      frame: '9:16',
      durationSeconds: 8,
      idempotencyKey: 'a'.repeat(64),
    }),
    'curvg-renderer/v2'
  );
  assert.throws(
    () => classifyRenderProtocol({ frame: '9:16' }),
    /Incomplete renderer v2 contract/
  );
  assert.throws(
    () =>
      classifyRenderProtocol({
        productionMode: 'simulation_short',
        simulationArtifacts: {},
      }),
    /only support explainer mode/
  );
  assert.throws(
    () => classifyRenderProtocol({ protocolVersion: 'curvg-renderer/v1' }),
    /Invalid renderer protocol version/
  );
});

test('legacy renderer rollout infers aspect ratio from trusted compiler config', () => {
  const { inferLegacyFrameFromCode } = loadRendererRolloutHelpers();
  assert.equal(
    inferLegacyFrameFromCode(
      'from manim import *\nconfig.pixel_width = 1080\nconfig.pixel_height = 1920\n'
    ),
    '9:16'
  );
  assert.equal(
    inferLegacyFrameFromCode(
      'from manim import *\nconfig.frame_width = 14.222\nconfig.frame_height = 8\n'
    ),
    '16:9'
  );
  assert.equal(inferLegacyFrameFromCode('from manim import *\n'), '16:9');
});

test('renderer rollout preserves old queue job ids and old endpoint envelopes', () => {
  const normalizeSource = rendererSource.slice(
    rendererSource.indexOf('export async function normalizeQueuedJob('),
    rendererSource.indexOf('interface QualityGateResult')
  );
  assert.match(normalizeSource, /jobId: legacy\.jobId/);
  assert.match(normalizeSource, /protocolVersion: 'legacy'/);
  const qualitySource = rendererSource.slice(
    rendererSource.indexOf('async function requestQualityGate('),
    rendererSource.indexOf('async function notify(')
  );
  const callbackSource = rendererSource.slice(
    rendererSource.indexOf('async function notify('),
    rendererSource.indexOf('async function notifyStage(')
  );
  assert.match(qualitySource, /job\.protocolVersion === V2_RENDER_PROTOCOL/);
  assert.match(callbackSource, /job\.protocolVersion === V2_RENDER_PROTOCOL/);
  assert.match(
    rendererSource,
    /job\.protocolVersion !== V2_RENDER_PROTOCOL\s+\? undefined/
  );
  assert.match(rendererSource, /kind: 'delivery_review'/);
  assert.match(
    rendererSource,
    /if \(job\.protocolVersion === V2_RENDER_PROTOCOL\)/
  );
  assert.match(rendererSource, /\? \{ approvedCode: selectedCode \}\s+: \{\}/);
});

test('HTTP renderer sends the verified bundle and rejects mode mismatches locally', async () => {
  const artifacts = await verifiedArtifacts();
  const previousFetch = globalThis.fetch;
  let posted: Record<string, unknown> | undefined;
  let fetchCount = 0;
  globalThis.fetch = (async (_input, init) => {
    fetchCount += 1;
    posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json(
      {
        jobId: 'simulation-render-1',
        status: 'queued',
        protocolVersion: 'curvg-renderer/v2',
      },
      { status: 202 }
    );
  }) as typeof globalThis.fetch;
  const renderer = new HttpAnimationRenderer({
    baseUrl: 'https://renderer.curvg.test',
    token: 'renderer-token',
  });
  const baseRequest = {
    animationId: 'simulation-1',
    code: compiledSimulationSource,
    callbackUrl:
      'https://curvg.test/api/animations/simulation-1/render-callback',
    qualityGateUrl:
      'https://curvg.test/api/animations/simulation-1/quality-gate',
    frame: '9:16' as const,
    durationSeconds: 8,
    idempotencyKey: 'a'.repeat(64),
  };
  try {
    await renderer.render({
      ...baseRequest,
      productionMode: 'simulation_short',
      simulationArtifacts: artifacts,
    });
    assert.equal(posted?.productionMode, 'simulation_short');
    assert.deepEqual(posted?.simulationArtifacts, artifacts);

    await assert.rejects(
      () =>
        renderer.render({
          ...baseRequest,
          productionMode: 'simulation_short',
        }),
      /artifacts are required/
    );
    await assert.rejects(
      () =>
        renderer.render({
          ...baseRequest,
          productionMode: 'explainer',
          simulationArtifacts: artifacts,
        }),
      /cannot include simulation artifacts/
    );
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('HTTP renderer rejects an oversized simulation bundle before fetch', async () => {
  const artifacts = await verifiedArtifacts();
  const renderer = new HttpAnimationRenderer({
    baseUrl: 'https://renderer.curvg.test',
    token: 'renderer-token',
  });
  await assert.rejects(
    () =>
      renderer.render({
        animationId: 'simulation-1',
        code: 'from manim import *\nclass CurvGScene(Scene):\n    pass',
        callbackUrl:
          'https://curvg.test/api/animations/simulation-1/render-callback',
        qualityGateUrl:
          'https://curvg.test/api/animations/simulation-1/quality-gate',
        frame: '9:16',
        durationSeconds: 8,
        idempotencyKey: 'a'.repeat(64),
        productionMode: 'simulation_short',
        simulationArtifacts: {
          ...artifacts,
          stateTrackJson: 'x'.repeat(512 * 1024 + 1),
        },
      }),
    /stateTrackJson exceeds its byte limit/
  );
  await assert.rejects(
    () =>
      renderer.render({
        animationId: 'simulation-1',
        code: 'from manim import *\nclass CurvGScene(Scene):\n    pass',
        callbackUrl:
          'https://curvg.test/api/animations/simulation-1/render-callback',
        qualityGateUrl:
          'https://curvg.test/api/animations/simulation-1/quality-gate',
        frame: '9:16',
        durationSeconds: 8,
        idempotencyKey: 'a'.repeat(64),
        productionMode: 'simulation_short',
        simulationArtifacts: {
          ...artifacts,
          audioPlanJson: 'x'.repeat(32 * 1024 + 1),
        },
      }),
    /audioPlanJson exceeds its byte limit/
  );
});

test('HTTP renderer rejects tampered audio plans and manifest audio digests before fetch', async () => {
  const artifacts = await verifiedArtifacts();
  const parseArtifacts = loadSimulationArtifactParser();
  const renderer = new HttpAnimationRenderer({
    baseUrl: 'https://renderer.curvg.test',
    token: 'renderer-token',
  });
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return Response.json({ jobId: 'unexpected', status: 'queued' });
  }) as typeof globalThis.fetch;
  const request = {
    animationId: 'simulation-1',
    code: compiledSimulationSource,
    callbackUrl:
      'https://curvg.test/api/animations/simulation-1/render-callback',
    qualityGateUrl:
      'https://curvg.test/api/animations/simulation-1/quality-gate',
    frame: '9:16' as const,
    durationSeconds: 8,
    productionMode: 'simulation_short' as const,
    idempotencyKey: 'a'.repeat(64),
  };

  try {
    const tamperedPlan = JSON.parse(artifacts.audioPlanJson) as {
      cues: Array<{ gain: number }>;
    };
    tamperedPlan.cues[0].gain += 0.01;
    const tamperedAudioPlanJson = stableCanonicalJson(tamperedPlan);
    await assert.rejects(
      () =>
        parseArtifacts({
          ...artifacts,
          audioPlanJson: tamperedAudioPlanJson,
        }),
      /audio plan is invalid/
    );
    await assert.rejects(
      () =>
        renderer.render({
          ...request,
          simulationArtifacts: {
            ...artifacts,
            audioPlanJson: tamperedAudioPlanJson,
          },
        }),
      /audio plan is invalid/
    );

    const tamperedManifest = JSON.parse(artifacts.runManifestJson) as {
      audioPlanDigest: string;
    };
    tamperedManifest.audioPlanDigest = '0'.repeat(64);
    const tamperedManifestJson = stableCanonicalJson(tamperedManifest);
    await assert.rejects(
      () =>
        parseArtifacts({
          ...artifacts,
          runManifestJson: tamperedManifestJson,
        }),
      /digest verification failed/
    );
    await assert.rejects(
      () =>
        renderer.render({
          ...request,
          simulationArtifacts: {
            ...artifacts,
            runManifestJson: tamperedManifestJson,
          },
        }),
      /audio plan digest verification failed/
    );
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
