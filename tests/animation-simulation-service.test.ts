import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { createClient } from '@libsql/client';

import type {
  AnimationRenderer,
  AnimationRenderRequest,
} from '../src/core/animation-renderer';

const testDirectory = mkdtempSync(
  join(tmpdir(), 'curvg-animation-simulation-service-')
);
const databasePath = join(testDirectory, 'service.db');

process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_URL = `file:${databasePath}`;
process.env.DB_SINGLETON_ENABLED = 'true';

after(() => {
  rmSync(testDirectory, { recursive: true, force: true });
});

const setupClient = createClient({ url: `file:${databasePath}` });
await setupClient.executeMultiple(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE user (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    utm_source TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    locale TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE chat (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    model TEXT NOT NULL,
    provider TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    parts TEXT NOT NULL,
    metadata TEXT,
    content TEXT
  );

  CREATE TABLE animation_planning_stage (
    id TEXT PRIMARY KEY NOT NULL,
    chat_id TEXT NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    status TEXT NOT NULL,
    attempt INTEGER NOT NULL DEFAULT 0,
    input_hash TEXT NOT NULL,
    output_hash TEXT,
    artifact TEXT,
    diagnostic TEXT,
    error_code TEXT,
    error_message TEXT,
    request_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE chat_message (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    chat_id TEXT NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    role TEXT NOT NULL,
    parts TEXT NOT NULL,
    metadata TEXT,
    model TEXT NOT NULL,
    provider TEXT NOT NULL
  );
`);
await setupClient.execute({
  sql: 'INSERT INTO user (id, name, email) VALUES (?, ?, ?)',
  args: [
    'simulation-service-user',
    'Simulation Service',
    'simulation@test.dev',
  ],
});
setupClient.close();

const {
  approveAnimation,
  createSimulationAnimation,
  getAnimation,
  isCurrentAnimationRender,
  recordAnimationQualityGate,
  updateRender,
} = await import('../src/modules/animations/service');

const cleanVisualQa = {
  analyzerVersion: 1 as const,
  status: 'pass' as const,
  score: 96,
  sampleCount: 12 as const,
  frames: Array.from({ length: 12 }, (_, index) => ({
    index,
    occupancy: 0.42,
    edgeContent: 0.01,
    edgeRisk: false,
    centerOffset: 0.04,
    contrast: 0.86,
    contentBounds: [0.2, 0.15, 0.8, 0.85] as [number, number, number, number],
  })),
  transitionDeltas: Array.from({ length: 11 }, () => 0.18),
  durationSeconds: 8,
  temporalSampleRate: 4,
  temporalSampleCount: 32,
  blackSegments: [] as Array<[number, number]>,
  frozenSegments: [] as Array<[number, number]>,
  flashTimestamps: [] as number[],
  issues: [],
};

test('simulation service completes only the current reviewed job with all canonical artifacts', async () => {
  const userId = 'simulation-service-user';
  const jobId = 'simulation-service-render-1';
  const capturedRequests: AnimationRenderRequest[] = [];
  const renderer: AnimationRenderer = {
    name: 'simulation-service-mock',
    async render(request) {
      capturedRequests.push(request);
      return {
        jobId,
        status: 'queued',
        provider: 'simulation-service-mock',
        protocolVersion: 'curvg-renderer/v2' as const,
      };
    },
  };

  const created = await createSimulationAnimation({
    userId,
    prompt: 'Show one particle escaping through concentric ring gaps.',
    subject: 'physics',
  });

  assert.equal(created.status, 'awaiting_approval');
  assert.equal(created.parts.productionMode, 'simulation_short');
  assert.equal(created.parts.simulationScenario?.family, 'ring_escape');
  assert.equal(created.parts.simulationEvidence?.terminalReason, 'escaped');
  assert.match(
    created.parts.simulationEvidence?.manifest.runDigest || '',
    /^[a-f0-9]{64}$/
  );

  const queued = await approveAnimation({
    userId,
    id: created.id,
    renderer,
    callbackUrl: `https://curvg.test/api/animations/${created.id}/render-callback`,
    qualityGateUrl: `https://curvg.test/api/animations/${created.id}/quality-gate`,
  });

  assert.equal(queued.status, 'queued');
  assert.equal(queued.parts.productionMode, 'simulation_short');
  assert.equal(queued.parts.render?.jobId, jobId);
  assert.equal(queued.parts.render?.protocolVersion, 'curvg-renderer/v2');
  assert.equal(await isCurrentAnimationRender(created.id, jobId), true);
  assert.equal(capturedRequests.length, 1);
  assert.equal(capturedRequests[0]?.productionMode, 'simulation_short');
  const submittedArtifacts = capturedRequests[0]?.simulationArtifacts;
  assert.ok(submittedArtifacts);
  assert.equal(
    JSON.parse(submittedArtifacts.runManifestJson).runDigest,
    queued.parts.simulationEvidence?.manifest.runDigest
  );
  const runDigest = queued.parts.simulationEvidence!.manifest.runDigest;
  const compiledSourceDigest =
    queued.parts.simulationEvidence!.compiledSourceDigest;
  const videoDigest = 'a'.repeat(64);
  assert.equal(queued.parts.render?.runDigest, runDigest);
  assert.equal(queued.parts.render?.compiledSourceDigest, compiledSourceDigest);
  assert.equal(queued.parts.render?.videoDigest, undefined);

  const delivery = {
    id: created.id,
    jobId,
    status: 'completed' as const,
    productionMode: 'simulation_short' as const,
    runDigest,
    compiledSourceDigest,
    videoDigest,
    videoUrl: 'https://media.curvg.test/simulation.mp4',
    thumbnailUrl: 'https://media.curvg.test/simulation.jpg',
    contactSheetUrl: 'https://media.curvg.test/simulation-contact.jpg',
    qaReportUrl: 'https://media.curvg.test/simulation-qa.json',
    eventsUrl: 'https://curvg.test/private/events.jsonl',
    stateTrackUrl: 'https://curvg.test/private/state-track.json',
    runManifestUrl: 'https://curvg.test/private/run-manifest.json',
    visualQa: cleanVisualQa,
  };

  await assert.rejects(
    () =>
      updateRender({
        id: created.id,
        jobId: 'stale-simulation-render',
        status: 'rendering',
        productionMode: 'simulation_short',
      }),
    /Render job does not match the animation/
  );
  await assert.rejects(
    () =>
      updateRender({
        id: created.id,
        jobId,
        status: 'rendering',
        productionMode: 'explainer',
      }),
    /Render production mode does not match the animation/
  );

  await assert.rejects(
    () =>
      updateRender({
        id: created.id,
        jobId,
        status: 'rendering',
        productionMode: 'simulation_short',
        runDigest,
      }),
    /invalid compiled source digest/
  );
  await assert.rejects(
    () =>
      updateRender({
        ...delivery,
        runDigest: 'b'.repeat(64),
      }),
    /lineage does not match/
  );
  const blockedByLineage = await getAnimation(userId, created.id);
  assert.equal(blockedByLineage.status, 'queued');
  assert.equal(blockedByLineage.parts.videoUrl, undefined);
  assert.equal(blockedByLineage.parts.eventsUrl, undefined);
  assert.equal(blockedByLineage.parts.render?.videoDigest, undefined);

  const renderingCallback = await updateRender({
    id: created.id,
    jobId,
    status: 'rendering',
    stage: 'compiling',
    progress: 42,
    productionMode: 'simulation_short',
    runDigest,
    compiledSourceDigest,
  });
  assert.equal(renderingCallback.status, 'rendering');
  const rendering = await getAnimation(userId, created.id);
  assert.equal(rendering.status, 'rendering');
  assert.equal(rendering.parts.render?.jobId, jobId);
  assert.equal(rendering.parts.render?.stage, 'compiling');
  assert.equal(rendering.parts.render?.progress, 42);

  await assert.rejects(
    () =>
      recordAnimationQualityGate({
        id: created.id,
        jobId,
        attempt: 0,
        kind: 'final_review',
        action: 'approve',
        code: `${rendering.parts.code}\n# callback tamper`,
        visualQa: cleanVisualQa,
      }),
    /cannot replace trusted specification or source/
  );
  const blockedSourceReplacement = await getAnimation(userId, created.id);
  assert.equal(blockedSourceReplacement.parts.code, rendering.parts.code);

  await assert.rejects(
    () => updateRender(delivery),
    /Formal delivery render has not passed quality review/
  );
  const blockedWithoutReview = await getAnimation(userId, created.id);
  assert.equal(blockedWithoutReview.status, 'rendering');
  assert.equal(blockedWithoutReview.parts.videoUrl, undefined);
  assert.equal(blockedWithoutReview.parts.eventsUrl, undefined);

  const reviewed = await recordAnimationQualityGate({
    id: created.id,
    jobId,
    attempt: 0,
    kind: 'delivery_review',
    action: 'approve',
    videoDigest,
    visualQa: cleanVisualQa,
  });
  assert.equal(reviewed.productionMode, 'simulation_short');
  assert.equal(reviewed.qualityControl.status, 'approved');
  assert.equal(reviewed.qualityControl.maxRepairs, 0);
  assert.deepEqual(
    reviewed.qualityControl.attempts.map(({ kind, action }) => ({
      kind,
      action,
    })),
    [{ kind: 'delivery_review', action: 'approve' }]
  );

  for (const artifact of [
    'eventsUrl',
    'stateTrackUrl',
    'runManifestUrl',
  ] as const) {
    await assert.rejects(
      () => updateRender({ ...delivery, [artifact]: undefined }),
      /Completed simulation render is missing canonical run artifacts/
    );
  }
  const blockedWithoutArtifacts = await getAnimation(userId, created.id);
  assert.equal(blockedWithoutArtifacts.status, 'rendering');
  assert.equal(blockedWithoutArtifacts.parts.videoUrl, undefined);
  assert.equal(blockedWithoutArtifacts.parts.eventsUrl, undefined);

  await assert.rejects(
    () => updateRender({ ...delivery, videoDigest: undefined }),
    /valid video digest/
  );
  const blockedWithoutVideoDigest = await getAnimation(userId, created.id);
  assert.equal(blockedWithoutVideoDigest.status, 'rendering');
  assert.equal(blockedWithoutVideoDigest.parts.videoUrl, undefined);
  assert.equal(blockedWithoutVideoDigest.parts.eventsUrl, undefined);

  const completedCallback = await updateRender(delivery);
  assert.equal(completedCallback.status, 'completed');
  assert.equal(completedCallback.cancelRequested, false);

  const completed = await getAnimation(userId, created.id);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.parts.productionMode, 'simulation_short');
  assert.equal(completed.parts.simulationEvidence?.terminalReason, 'escaped');
  assert.equal(completed.parts.simulationEvidence?.videoDigest, videoDigest);
  assert.equal(completed.parts.render?.jobId, jobId);
  assert.equal(completed.parts.render?.status, 'completed');
  assert.equal(completed.parts.render?.runDigest, runDigest);
  assert.equal(
    completed.parts.render?.compiledSourceDigest,
    compiledSourceDigest
  );
  assert.equal(completed.parts.render?.videoDigest, videoDigest);
  assert.equal(completed.parts.eventsUrl, delivery.eventsUrl);
  assert.equal(completed.parts.stateTrackUrl, delivery.stateTrackUrl);
  assert.equal(completed.parts.runManifestUrl, delivery.runManifestUrl);
  assert.equal(await isCurrentAnimationRender(created.id, jobId), true);

  await assert.rejects(
    () =>
      updateRender({
        ...delivery,
        videoDigest: 'c'.repeat(64),
        thumbnailUrl: 'https://media.curvg.test/untrusted-replay.jpg',
      }),
    /video digest does not match prior delivery/
  );
  const blockedReplay = await getAnimation(userId, created.id);
  assert.equal(blockedReplay.parts.thumbnailUrl, delivery.thumbnailUrl);
  assert.equal(
    blockedReplay.parts.simulationEvidence?.videoDigest,
    videoDigest
  );

  const inspectionClient = createClient({ url: `file:${databasePath}` });
  const persisted = await inspectionClient.execute({
    sql: 'SELECT parts FROM chat WHERE id = ?',
    args: [created.id],
  });
  inspectionClient.close();
  const storedParts = JSON.parse(String(persisted.rows[0]?.parts)) as {
    productionMode?: string;
    simulationEvidence?: { terminalReason?: string; videoDigest?: string };
    eventsUrl?: string;
    stateTrackUrl?: string;
    runManifestUrl?: string;
    render?: {
      jobId?: string;
      runDigest?: string;
      compiledSourceDigest?: string;
      videoDigest?: string;
    };
  };
  assert.equal(storedParts.productionMode, 'simulation_short');
  assert.equal(storedParts.simulationEvidence?.terminalReason, 'escaped');
  assert.equal(storedParts.simulationEvidence?.videoDigest, videoDigest);
  assert.equal(storedParts.render?.jobId, jobId);
  assert.equal(storedParts.render?.runDigest, runDigest);
  assert.equal(storedParts.render?.compiledSourceDigest, compiledSourceDigest);
  assert.equal(storedParts.render?.videoDigest, videoDigest);
  assert.equal(storedParts.eventsUrl, delivery.eventsUrl);
  assert.equal(storedParts.stateTrackUrl, delivery.stateTrackUrl);
  assert.equal(storedParts.runManifestUrl, delivery.runManifestUrl);
});
