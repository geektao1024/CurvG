import { getSandbox, type Sandbox } from '@cloudflare/sandbox';

import {
  canonicalSimulationEventSchema,
  digestCanonicalJson,
  digestUtf8Text,
  simulationRunManifestSchema,
  simulationStateCheckpointSchema,
} from '../../src/lib/animation-simulation';
import {
  digestRingEscapeAudioPlan,
  ringEscapeAudioPlanSchema,
  type RingEscapeAudioPlan,
} from '../../src/lib/simulation-audio';

export { Sandbox } from '@cloudflare/sandbox';

interface RenderJob {
  animationId: string;
  callbackUrl: string;
  qualityGateUrl: string;
  code: string;
  jobId: string;
  frame: '16:9' | '9:16';
  durationSeconds: number;
  productionMode: 'explainer' | 'simulation_short';
  idempotencyKey: string;
  protocolVersion: 'legacy' | 'curvg-renderer/v2';
  simulationArtifacts?: {
    eventsJsonl: string;
    stateTrackJson: string;
    runManifestJson: string;
    audioPlanJson: string;
    runDigest: string;
    compiledSourceDigest: string;
    audioPlanDigest: string;
    eventCount: number;
  };
}

interface LegacyQueuedRenderJob {
  animationId: string;
  callbackUrl: string;
  qualityGateUrl: string;
  code: string;
  jobId: string;
}

type QueuedRenderJob = RenderJob | LegacyQueuedRenderJob;

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  ARTIFACTS: R2Bucket;
  RENDER_QUEUE: Queue<QueuedRenderJob>;
  CALLBACK_ORIGIN: string;
  RENDERER_TOKEN: string;
}

class NonRetryableRenderError extends Error {}
class CanceledRenderError extends Error {}

const animationIdPattern = /^[A-Za-z0-9-]{1,80}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const QUALITY_GATE_TIMEOUT_MS = 120_000;
const CALLBACK_TIMEOUT_MS = 30_000;
const TARGET_VIDEO_FRAME_RATE = 30;
const VIDEO_FRAME_RATE_TOLERANCE = 0.1;
const MAX_VIDEO_DURATION_SECONDS = 300;
const SIMULATION_ARTIFACT_BYTE_LIMITS = {
  eventsJsonl: 128 * 1024,
  stateTrackJson: 512 * 1024,
  runManifestJson: 64 * 1024,
  audioPlanJson: 32 * 1024,
  total: 800 * 1024,
} as const;
const MAX_RENDER_REQUEST_BYTES = 2 * 1024 * 1024;
const V2_RENDER_PROTOCOL = 'curvg-renderer/v2' as const;
const V2_RENDER_FIELDS = [
  'frame',
  'durationSeconds',
  'idempotencyKey',
] as const;

async function readRenderRequestBody(
  request: Request
): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (
    Number.isSafeInteger(declaredLength) &&
    declaredLength > MAX_RENDER_REQUEST_BYTES
  ) {
    throw new Error('Render request body is too large');
  }
  if (!request.body) throw new Error('Render request body is required');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RENDER_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Render request body is too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error('Render request body is invalid JSON');
  }
  if (!isRecord(value)) throw new Error('Render request body is invalid');
  return value;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function hasOwnRendererField(
  value: Record<string, unknown>,
  field: string
): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

export function classifyRenderProtocol(
  body: Record<string, unknown>
): RenderJob['protocolVersion'] {
  const presentV2Fields = V2_RENDER_FIELDS.filter((field) =>
    hasOwnRendererField(body, field)
  );
  const explicitlyVersioned = hasOwnRendererField(body, 'protocolVersion');
  if (explicitlyVersioned && body.protocolVersion !== V2_RENDER_PROTOCOL) {
    throw new Error('Invalid renderer protocol version');
  }
  if (presentV2Fields.length === 0 && !explicitlyVersioned) {
    if (
      (body.productionMode !== undefined &&
        body.productionMode !== 'explainer') ||
      hasOwnRendererField(body, 'simulationArtifacts')
    ) {
      throw new Error('Legacy render requests only support explainer mode');
    }
    return 'legacy';
  }
  if (presentV2Fields.length !== V2_RENDER_FIELDS.length) {
    throw new Error('Incomplete renderer v2 contract');
  }
  return V2_RENDER_PROTOCOL;
}

function lastPositiveConfigNumber(code: string, field: string) {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*config\\.${field}\\s*=\\s*(\\d+(?:\\.\\d+)?)\\s*(?:#.*)?(?=\\n|$)`,
    'g'
  );
  let value: number | undefined;
  for (const match of code.matchAll(pattern)) {
    const candidate = Number(match[1]);
    if (Number.isFinite(candidate) && candidate > 0) value = candidate;
  }
  return value;
}

export function inferLegacyFrameFromCode(code: string): '16:9' | '9:16' {
  const pixelWidth = lastPositiveConfigNumber(code, 'pixel_width');
  const pixelHeight = lastPositiveConfigNumber(code, 'pixel_height');
  if (pixelWidth !== undefined && pixelHeight !== undefined) {
    if (pixelHeight > pixelWidth) return '9:16';
    if (pixelWidth > pixelHeight) return '16:9';
  }
  const frameWidth = lastPositiveConfigNumber(code, 'frame_width');
  const frameHeight = lastPositiveConfigNumber(code, 'frame_height');
  if (frameWidth !== undefined && frameHeight !== undefined) {
    if (frameHeight > frameWidth) return '9:16';
    if (frameWidth > frameHeight) return '16:9';
  }
  // The renderer predates portrait support. An unannotated legacy scene is
  // therefore landscape unless its source explicitly proves otherwise.
  return '16:9';
}

export async function parseSimulationArtifacts(
  value: unknown
): Promise<NonNullable<RenderJob['simulationArtifacts']> | undefined> {
  if (!isRecord(value)) return undefined;
  const eventsJsonl = value.eventsJsonl;
  const stateTrackJson = value.stateTrackJson;
  const runManifestJson = value.runManifestJson;
  const audioPlanJson = value.audioPlanJson;
  if (
    typeof eventsJsonl !== 'string' ||
    typeof stateTrackJson !== 'string' ||
    typeof runManifestJson !== 'string' ||
    typeof audioPlanJson !== 'string'
  ) {
    throw new Error('Simulation artifacts must be UTF-8 strings');
  }
  const sizes = {
    eventsJsonl: utf8Length(eventsJsonl),
    stateTrackJson: utf8Length(stateTrackJson),
    runManifestJson: utf8Length(runManifestJson),
    audioPlanJson: utf8Length(audioPlanJson),
  };
  for (const [name, size] of Object.entries(sizes)) {
    const limit = SIMULATION_ARTIFACT_BYTE_LIMITS[name as keyof typeof sizes];
    if (size === 0 || size > limit) {
      throw new Error(`Simulation ${name} exceeds its byte limit`);
    }
  }
  if (
    Object.values(sizes).reduce((total, size) => total + size, 0) >
    SIMULATION_ARTIFACT_BYTE_LIMITS.total
  ) {
    throw new Error('Simulation artifacts exceed their total byte limit');
  }

  const eventLines = eventsJsonl.split('\n');
  if (eventLines.at(-1) === '') eventLines.pop();
  if (eventLines.length === 0 || eventLines.some((line) => line.length === 0)) {
    throw new Error('Simulation event log is empty or malformed');
  }
  const events = eventLines.map((line, index) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      throw new Error(`Simulation event line ${index + 1} is invalid JSON`);
    }
    const result = canonicalSimulationEventSchema.safeParse(parsed);
    if (!result.success || result.data.seq !== index) {
      throw new Error(`Simulation event line ${index + 1} is invalid`);
    }
    return result.data;
  });
  const terminal = events.at(-1);
  if (
    terminal?.kind !== 'terminal' ||
    terminal.payload.reason !== 'escaped' ||
    events.slice(0, -1).some((event) => event.kind === 'terminal')
  ) {
    throw new Error('Simulation event log must end with terminal:escaped');
  }
  for (let index = 1; index < events.length; index += 1) {
    if (
      events[index].time < events[index - 1].time ||
      events[index].step < events[index - 1].step
    ) {
      throw new Error('Simulation events must be chronological');
    }
  }

  let stateTrackValue: unknown;
  let manifestValue: unknown;
  let audioPlanValue: unknown;
  try {
    stateTrackValue = JSON.parse(stateTrackJson) as unknown;
    manifestValue = JSON.parse(runManifestJson) as unknown;
    audioPlanValue = JSON.parse(audioPlanJson) as unknown;
  } catch {
    throw new Error(
      'Simulation state track, manifest, or audio plan is invalid JSON'
    );
  }
  if (!Array.isArray(stateTrackValue) || stateTrackValue.length === 0) {
    throw new Error('Simulation state track must be a non-empty array');
  }
  const stateTrack = stateTrackValue.map((entry, index) => {
    const result = simulationStateCheckpointSchema.safeParse(entry);
    if (!result.success || result.data.seq !== index) {
      throw new Error(`Simulation state checkpoint ${index} is invalid`);
    }
    return result.data;
  });
  for (let index = 1; index < stateTrack.length; index += 1) {
    if (
      stateTrack[index].time < stateTrack[index - 1].time ||
      stateTrack[index].step < stateTrack[index - 1].step ||
      stateTrack[index].eventCursor < stateTrack[index - 1].eventCursor
    ) {
      throw new Error('Simulation state checkpoints must be chronological');
    }
  }
  const finalCheckpoint = stateTrack.at(-1);
  if (
    !finalCheckpoint?.terminal ||
    finalCheckpoint.eventCursor !== events.length ||
    stateTrack.slice(0, -1).some((checkpoint) => checkpoint.terminal)
  ) {
    throw new Error('Simulation state track does not cover the terminal event');
  }
  const manifestResult = simulationRunManifestSchema.safeParse(manifestValue);
  if (!manifestResult.success) {
    throw new Error('Simulation run manifest is invalid');
  }
  const manifest = manifestResult.data;
  const audioPlanResult = ringEscapeAudioPlanSchema.safeParse(audioPlanValue);
  if (!audioPlanResult.success) {
    throw new Error('Simulation audio plan is invalid');
  }
  const audioPlan = audioPlanResult.data;
  if (
    manifest.productionMode !== 'simulation_short' ||
    manifest.family !== 'ring_escape' ||
    manifest.summary.terminalReason !== 'escaped' ||
    manifest.summary.eventCount !== events.length
  ) {
    throw new Error('Simulation run manifest does not match an escaped run');
  }
  const [eventLogDigest, checkpointsDigest, summaryDigest] = await Promise.all([
    digestCanonicalJson(events),
    digestCanonicalJson(stateTrack),
    digestCanonicalJson(manifest.summary),
  ]);
  const audioPlanDigest = await digestRingEscapeAudioPlan(audioPlan);
  for (const cue of audioPlan.cues) {
    const event = events[cue.eventSeq];
    if (!event || event.kind !== cue.kind) {
      throw new Error(
        'Simulation audio cues must reference canonical event seq/kind pairs'
      );
    }
  }
  const identity = {
    schemaVersion: manifest.schemaVersion,
    productionMode: manifest.productionMode,
    family: manifest.family,
    solver: manifest.solver,
    scenarioDigest: manifest.scenarioDigest,
    eventLogDigest: manifest.eventLogDigest,
    checkpointsDigest: manifest.checkpointsDigest,
    summaryDigest: manifest.summaryDigest,
    compiledSourceDigest: manifest.compiledSourceDigest,
    audioPlanDigest: manifest.audioPlanDigest,
  };
  const runDigest = await digestCanonicalJson(identity);
  if (
    manifest.eventLogDigest !== eventLogDigest ||
    manifest.checkpointsDigest !== checkpointsDigest ||
    manifest.summaryDigest !== summaryDigest ||
    manifest.audioPlanDigest !== audioPlanDigest ||
    manifest.runDigest !== runDigest
  ) {
    throw new Error('Simulation artifact digest verification failed');
  }
  return {
    eventsJsonl,
    stateTrackJson,
    runManifestJson,
    audioPlanJson,
    runDigest: manifest.runDigest,
    compiledSourceDigest: manifest.compiledSourceDigest,
    audioPlanDigest: manifest.audioPlanDigest,
    eventCount: events.length,
  };
}

async function verifySimulationSourceDigest(
  code: string,
  artifacts: NonNullable<RenderJob['simulationArtifacts']>
) {
  const sourceDigest = await digestUtf8Text(code);
  if (sourceDigest !== artifacts.compiledSourceDigest) {
    throw new Error(
      'Simulation source does not match the compiled source digest'
    );
  }
}

function hasBearerToken(request: Request, expected: string): boolean {
  const value = request.headers.get('authorization') || '';
  const actual = value.startsWith('Bearer ') ? value.slice(7) : '';
  const left = new TextEncoder().encode(actual);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0 && right.length > 0;
}

async function parseJob(
  request: Request,
  body: Record<string, unknown>,
  env: Env
) {
  const protocolVersion = classifyRenderProtocol(body);
  const animationId =
    typeof body.animationId === 'string' ? body.animationId : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const callbackValue =
    typeof body.callbackUrl === 'string' ? body.callbackUrl : '';
  const qualityGateValue =
    typeof body.qualityGateUrl === 'string' ? body.qualityGateUrl : '';
  const frame =
    protocolVersion === 'legacy' ? inferLegacyFrameFromCode(code) : body.frame;
  // Legacy callers never supplied a duration contract. Keep the value as a
  // bounded render placeholder; formal legacy media is probed from the output
  // and is deliberately not represented as renderer/v2 lineage.
  const durationSeconds =
    protocolVersion === 'legacy'
      ? MAX_VIDEO_DURATION_SECONDS
      : body.durationSeconds;
  const productionMode = body.productionMode ?? 'explainer';
  const requestedIdempotencyKey =
    typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  if (!animationIdPattern.test(animationId)) {
    throw new Error('Invalid animation ID');
  }
  if (code.length < 100 || code.length > 60_000) {
    throw new Error('Invalid Manim code length');
  }
  if (!code.includes('from manim import')) {
    throw new Error('Manim import is required');
  }
  if (
    !/class\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
      code
    )
  ) {
    throw new Error('CurvGScene is required');
  }
  if (frame !== '16:9' && frame !== '9:16') {
    throw new Error('Invalid render frame');
  }
  if (
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds < 1 ||
    durationSeconds > MAX_VIDEO_DURATION_SECONDS
  ) {
    throw new Error('Invalid render duration');
  }
  if (productionMode !== 'explainer' && productionMode !== 'simulation_short') {
    throw new Error('Invalid production mode');
  }
  if (
    protocolVersion === V2_RENDER_PROTOCOL &&
    !digestPattern.test(requestedIdempotencyKey)
  ) {
    throw new Error('Invalid renderer idempotency key');
  }
  const idempotencyKey =
    protocolVersion === 'legacy'
      ? await digestUtf8Text(
          JSON.stringify({ animationId, code, callbackValue, qualityGateValue })
        )
      : requestedIdempotencyKey;
  const simulationArtifacts = await parseSimulationArtifacts(
    body.simulationArtifacts
  );
  if (
    (productionMode === 'simulation_short' && !simulationArtifacts) ||
    (productionMode === 'explainer' && simulationArtifacts)
  ) {
    throw new Error('Simulation artifacts do not match the production mode');
  }
  if (productionMode === 'simulation_short' && simulationArtifacts) {
    await verifySimulationSourceDigest(code, simulationArtifacts);
    const audioPlan = ringEscapeAudioPlanSchema.parse(
      JSON.parse(simulationArtifacts.audioPlanJson) as unknown
    );
    if (audioPlan.durationFrames !== Math.round(durationSeconds * 30)) {
      throw new Error(
        'Simulation audio durationFrames must match the render duration'
      );
    }
  }
  const callbackUrl = new URL(callbackValue);
  const allowedOrigin = new URL(env.CALLBACK_ORIGIN).origin;
  if (
    callbackUrl.protocol !== 'https:' &&
    callbackUrl.hostname !== 'localhost'
  ) {
    throw new Error('Callback URL must use HTTPS');
  }
  if (callbackUrl.origin !== allowedOrigin) {
    throw new Error('Callback origin is not allowed');
  }
  const expectedPath = `/api/animations/${encodeURIComponent(animationId)}/render-callback`;
  if (callbackUrl.pathname !== expectedPath) {
    throw new Error('Callback path is invalid');
  }
  const qualityGateUrl = new URL(qualityGateValue);
  if (
    qualityGateUrl.protocol !== 'https:' &&
    qualityGateUrl.hostname !== 'localhost'
  ) {
    throw new Error('Quality gate URL must use HTTPS');
  }
  if (qualityGateUrl.origin !== allowedOrigin) {
    throw new Error('Quality gate origin is not allowed');
  }
  const expectedQualityPath = `/api/animations/${encodeURIComponent(animationId)}/quality-gate`;
  if (qualityGateUrl.pathname !== expectedQualityPath) {
    throw new Error('Quality gate path is invalid');
  }
  if (new URL(request.url).pathname !== '/render') {
    throw new Error('Not found');
  }
  return {
    animationId,
    code,
    callbackUrl: callbackUrl.toString(),
    qualityGateUrl: qualityGateUrl.toString(),
    jobId: `job-${idempotencyKey.slice(0, 32)}`,
    idempotencyKey,
    frame,
    durationSeconds,
    productionMode,
    protocolVersion,
    ...(simulationArtifacts ? { simulationArtifacts } : {}),
  } satisfies RenderJob;
}

export async function normalizeQueuedJob(
  value: QueuedRenderJob
): Promise<RenderJob> {
  const candidate = value as Partial<RenderJob>;
  if (
    candidate.protocolVersion !== undefined &&
    candidate.protocolVersion !== 'legacy' &&
    candidate.protocolVersion !== V2_RENDER_PROTOCOL
  ) {
    throw new NonRetryableRenderError('Queued render protocol is invalid');
  }
  const presentV2Fields = V2_RENDER_FIELDS.filter(
    (field) => candidate[field] !== undefined
  );
  if (
    candidate.protocolVersion === V2_RENDER_PROTOCOL ||
    (candidate.protocolVersion === undefined &&
      presentV2Fields.length === V2_RENDER_FIELDS.length)
  ) {
    if (
      (candidate.frame !== '16:9' && candidate.frame !== '9:16') ||
      typeof candidate.durationSeconds !== 'number' ||
      !Number.isFinite(candidate.durationSeconds) ||
      candidate.durationSeconds < 1 ||
      candidate.durationSeconds > MAX_VIDEO_DURATION_SECONDS ||
      !digestPattern.test(candidate.idempotencyKey || '') ||
      (candidate.productionMode !== 'explainer' &&
        candidate.productionMode !== 'simulation_short') ||
      (candidate.productionMode === 'simulation_short') !==
        !!candidate.simulationArtifacts
    ) {
      throw new NonRetryableRenderError('Queued renderer v2 job is invalid');
    }
    return {
      ...(value as RenderJob),
      protocolVersion: V2_RENDER_PROTOCOL,
    };
  }
  if (candidate.protocolVersion === undefined && presentV2Fields.length > 0) {
    throw new NonRetryableRenderError(
      'Queued renderer v2 contract is incomplete'
    );
  }
  if (
    candidate.productionMode !== undefined &&
    candidate.productionMode !== 'explainer'
  ) {
    throw new NonRetryableRenderError(
      'Legacy queued renders only support explainer mode'
    );
  }
  if (candidate.simulationArtifacts !== undefined) {
    throw new NonRetryableRenderError(
      'Legacy queued renders cannot contain simulation artifacts'
    );
  }
  const legacy = value as LegacyQueuedRenderJob;
  const idempotencyKey = digestPattern.test(candidate.idempotencyKey || '')
    ? candidate.idempotencyKey!
    : await digestUtf8Text(
        JSON.stringify({
          animationId: legacy.animationId,
          code: legacy.code,
          callbackUrl: legacy.callbackUrl,
          qualityGateUrl: legacy.qualityGateUrl,
        })
      );
  return {
    animationId: legacy.animationId,
    callbackUrl: legacy.callbackUrl,
    qualityGateUrl: legacy.qualityGateUrl,
    code: legacy.code,
    // Queue messages created by the old Worker already have a job id that the
    // application persisted. Never replace it during a rolling deployment.
    jobId: legacy.jobId,
    frame:
      candidate.frame === '16:9' || candidate.frame === '9:16'
        ? candidate.frame
        : inferLegacyFrameFromCode(legacy.code),
    durationSeconds: MAX_VIDEO_DURATION_SECONDS,
    productionMode: 'explainer',
    idempotencyKey,
    protocolVersion: 'legacy',
  };
}

interface QualityGateResult {
  action: 'approve' | 'repair' | 'reject';
  code?: string;
  frame?: '16:9' | '9:16';
  durationSeconds?: number;
}

async function requestQualityGate(
  job: RenderJob,
  env: Env,
  payload: Record<string, unknown>
): Promise<QualityGateResult> {
  const response = await fetch(job.qualityGateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RENDERER_TOKEN}`,
    },
    body: JSON.stringify({
      ...payload,
      jobId: job.jobId,
      ...(job.protocolVersion === V2_RENDER_PROTOCOL
        ? { protocolVersion: V2_RENDER_PROTOCOL }
        : {}),
    }),
    signal: AbortSignal.timeout(QUALITY_GATE_TIMEOUT_MS),
  });
  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || result.code !== 0) {
    throw new Error(
      typeof result.message === 'string'
        ? result.message
        : `Quality gate failed (${response.status})`
    );
  }
  const data =
    result.data && typeof result.data === 'object'
      ? (result.data as Record<string, unknown>)
      : undefined;
  const action = data?.action;
  if (action !== 'approve' && action !== 'repair' && action !== 'reject') {
    throw new Error('Quality gate returned an invalid action');
  }
  const code = typeof data?.code === 'string' ? data.code : undefined;
  let frame: '16:9' | '9:16' | undefined;
  let durationSeconds: number | undefined;
  if (action === 'repair') {
    if (
      !code ||
      code.length < 100 ||
      code.length > 60_000 ||
      !code.includes('from manim import') ||
      !/class\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
        code
      )
    ) {
      throw new Error('Quality gate returned invalid repaired code');
    }
    if (job.protocolVersion === V2_RENDER_PROTOCOL) {
      if (
        (data?.frame !== '16:9' && data?.frame !== '9:16') ||
        typeof data.durationSeconds !== 'number' ||
        !Number.isFinite(data.durationSeconds) ||
        data.durationSeconds < 1 ||
        data.durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        throw new Error('Quality gate returned an invalid render contract');
      }
      frame = data.frame;
      durationSeconds = data.durationSeconds;
    } else if (
      data?.frame !== undefined ||
      data?.durationSeconds !== undefined
    ) {
      if (
        (data.frame !== '16:9' && data.frame !== '9:16') ||
        typeof data.durationSeconds !== 'number' ||
        !Number.isFinite(data.durationSeconds) ||
        data.durationSeconds < 1 ||
        data.durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        throw new Error('Quality gate returned an invalid render contract');
      }
      frame = data.frame;
      durationSeconds = data.durationSeconds;
    }
  }
  return {
    action,
    code,
    ...(action === 'repair' ? { frame, durationSeconds } : {}),
  };
}

async function notify(
  job: RenderJob,
  env: Env,
  payload: Record<string, unknown>
) {
  const response = await fetch(job.callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RENDERER_TOKEN}`,
    },
    body: JSON.stringify({
      ...payload,
      ...(job.simulationArtifacts
        ? {
            runDigest: job.simulationArtifacts.runDigest,
            compiledSourceDigest: job.simulationArtifacts.compiledSourceDigest,
          }
        : {}),
      jobId: job.jobId,
      ...(job.protocolVersion === V2_RENDER_PROTOCOL
        ? {
            protocolVersion: V2_RENDER_PROTOCOL,
            productionMode: job.productionMode,
          }
        : {}),
    }),
    signal: AbortSignal.timeout(CALLBACK_TIMEOUT_MS),
  });
  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || result.code !== 0) {
    throw new Error(
      typeof result.message === 'string'
        ? result.message
        : `Callback failed (${response.status})`
    );
  }
  const data =
    result.data && typeof result.data === 'object'
      ? (result.data as Record<string, unknown>)
      : undefined;
  return data?.cancelRequested === true;
}

async function notifyStage(
  job: RenderJob,
  env: Env,
  stage: 'validating' | 'compiling' | 'transcoding' | 'reviewing' | 'uploading',
  progress: number
) {
  if (await notify(job, env, { status: 'rendering', stage, progress })) {
    throw new CanceledRenderError(`Render canceled during ${stage}`);
  }
}

function artifactUrls(job: RenderJob, includeQaReport = true) {
  const base = `/api/animations/${encodeURIComponent(job.animationId)}/artifact`;
  return {
    videoUrl: `${base}/video?jobId=${encodeURIComponent(job.jobId)}`,
    thumbnailUrl: `${base}/thumbnail?jobId=${encodeURIComponent(job.jobId)}`,
    contactSheetUrl: `${base}/contact-sheet?jobId=${encodeURIComponent(job.jobId)}`,
    ...(includeQaReport
      ? {
          qaReportUrl: `${base}/qa-report?jobId=${encodeURIComponent(job.jobId)}`,
        }
      : {}),
    ...(job.productionMode === 'simulation_short'
      ? {
          eventsUrl: `${base}/events?jobId=${encodeURIComponent(job.jobId)}`,
          stateTrackUrl: `${base}/state-track?jobId=${encodeURIComponent(job.jobId)}`,
          runManifestUrl: `${base}/run-manifest?jobId=${encodeURIComponent(job.jobId)}`,
        }
      : {}),
  };
}

function artifactResponse(object: R2ObjectBody): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('content-disposition', 'inline');
  let status = 200;
  const range = object.range;
  if (
    range &&
    'offset' in range &&
    'length' in range &&
    typeof range.offset === 'number' &&
    typeof range.length === 'number'
  ) {
    const start = range.offset;
    const end = start + range.length - 1;
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
    headers.set('content-length', String(range.length));
    status = 206;
  } else {
    headers.set('content-length', String(object.size));
  }
  return new Response(object.body, { status, headers });
}

function simulationArtifactMetadata(
  job: RenderJob,
  contentType: string
): R2PutOptions {
  return {
    httpMetadata: { contentType },
    customMetadata: {
      animationId: job.animationId,
      jobId: job.jobId,
      productionMode: job.productionMode,
      runDigest: job.simulationArtifacts?.runDigest || '',
      compiledSourceDigest: job.simulationArtifacts?.compiledSourceDigest || '',
      audioPlanDigest: job.simulationArtifacts?.audioPlanDigest || '',
      eventCount: String(job.simulationArtifacts?.eventCount || 0),
    },
  };
}

async function uploadSimulationArtifacts(job: RenderJob, env: Env) {
  const artifacts = job.simulationArtifacts;
  if (job.productionMode !== 'simulation_short' || !artifacts) return;
  const prefix = `animations/${job.animationId}/${job.jobId}`;
  await Promise.all([
    env.ARTIFACTS.put(`${prefix}/events.jsonl`, artifacts.eventsJsonl, {
      ...simulationArtifactMetadata(job, 'application/x-ndjson; charset=utf-8'),
    }),
    env.ARTIFACTS.put(`${prefix}/state-track.json`, artifacts.stateTrackJson, {
      ...simulationArtifactMetadata(job, 'application/json; charset=utf-8'),
    }),
  ]);
  // The manifest is the commit marker for the immutable solver bundle. Never
  // publish it before both payload objects have been accepted by R2.
  await env.ARTIFACTS.put(
    `${prefix}/run-manifest.json`,
    artifacts.runManifestJson,
    simulationArtifactMetadata(job, 'application/json; charset=utf-8')
  );
}

async function serveArtifact(request: Request, env: Env): Promise<Response> {
  const match = new URL(request.url).pathname.match(
    /^\/artifact\/([A-Za-z0-9-]{1,80})\/([A-Za-z0-9-]{1,80})\/(video|thumbnail|contact-sheet|qa-report|events|state-track|run-manifest)$/
  );
  if (!match) {
    return Response.json({ error: 'Artifact not found' }, { status: 404 });
  }
  const [, animationId, jobId, kind] = match;
  const extension =
    kind === 'video'
      ? 'video.mp4'
      : kind === 'thumbnail'
        ? 'thumbnail.jpg'
        : kind === 'contact-sheet'
          ? 'contact-sheet.jpg'
          : kind === 'qa-report'
            ? 'qa-report.json'
            : kind === 'events'
              ? 'events.jsonl'
              : kind === 'state-track'
                ? 'state-track.json'
                : 'run-manifest.json';
  const object = await env.ARTIFACTS.get(
    `animations/${animationId}/${jobId}/${extension}`,
    { range: request.headers }
  );
  if (!object || !('body' in object)) {
    return Response.json({ error: 'Artifact not found' }, { status: 404 });
  }
  return artifactResponse(object);
}

function commandError(stderr: string, fallback: string): string {
  const message = stderr.trim();
  if (!message) return fallback;
  if (message.length <= 1900) return message;
  return `${message.slice(0, 300)}\n... traceback truncated ...\n${message.slice(-1550)}`;
}

const multipartPartSize = 5 * 1024 * 1024;

function combineChunks(chunks: Uint8Array[], size: number) {
  if (chunks.length === 1) return chunks[0];
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

async function uploadBinaryFile(
  sandbox: Sandbox,
  bucket: R2Bucket,
  key: string,
  path: string,
  options: R2MultipartOptions
): Promise<number> {
  const file = await sandbox.readFile(path, { encoding: 'none' });
  const reader = file.content.getReader();
  const upload = await bucket.createMultipartUpload(key, options);
  const parts: R2UploadedPart[] = [];
  let chunks: Uint8Array[] = [];
  let bufferedSize = 0;
  let totalBytes = 0;
  let released = false;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        reader.releaseLock();
        released = true;
        break;
      }
      chunks.push(result.value);
      bufferedSize += result.value.byteLength;
      totalBytes += result.value.byteLength;
      if (bufferedSize >= multipartPartSize) {
        parts.push(
          await upload.uploadPart(
            parts.length + 1,
            combineChunks(chunks, bufferedSize)
          )
        );
        chunks = [];
        bufferedSize = 0;
      }
    }
    if (bufferedSize > 0) {
      parts.push(
        await upload.uploadPart(
          parts.length + 1,
          combineChunks(chunks, bufferedSize)
        )
      );
    }
    if (parts.length === 0) throw new Error('Rendered artifact is empty');
    await upload.complete(parts);
    return totalBytes;
  } catch (error) {
    await upload.abort().catch(() => undefined);
    throw error;
  } finally {
    if (!released) {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}

const MAX_QUALITY_REPAIRS = 2;
// Floor for a plausible formal MP4. Deliberately far below any legitimate
// 1080p30 output so it only catches stub/truncated files, never short videos.
const MIN_VIDEO_BYTES = 32_768;

function attemptProgress(attempt: number, offset: number) {
  return Math.min(92, 10 + attempt * 28 + offset);
}

function applyRepairResult(job: RenderJob, gate: QualityGateResult): string {
  if (job.productionMode === 'simulation_short') {
    throw new NonRetryableRenderError(
      'Simulation source cannot be replaced by a model repair'
    );
  }
  if (gate.action !== 'repair' || !gate.code) {
    throw new NonRetryableRenderError(
      'Quality gate did not return valid repaired code'
    );
  }
  if (job.protocolVersion === V2_RENDER_PROTOCOL) {
    if (!gate.frame || gate.durationSeconds === undefined) {
      throw new NonRetryableRenderError(
        'Quality gate did not return a complete repair'
      );
    }
    job.frame = gate.frame;
    job.durationSeconds = gate.durationSeconds;
  } else if (gate.frame && gate.durationSeconds !== undefined) {
    job.frame = gate.frame;
    job.durationSeconds = gate.durationSeconds;
  } else {
    job.frame = inferLegacyFrameFromCode(gate.code);
  }
  return gate.code;
}

function sourceWithRenderContract(params: {
  source: string;
  frame: '16:9' | '9:16';
  phase: 'preview' | 'delivery';
}): string {
  const portrait = params.frame === '9:16';
  const delivery = params.phase === 'delivery';
  const pixelWidth = portrait ? (delivery ? 1080 : 480) : delivery ? 1920 : 854;
  const pixelHeight = portrait
    ? delivery
      ? 1920
      : 854
    : delivery
      ? 1080
      : 480;
  const frameWidth = portrait ? 9 : 14.222;
  const frameHeight = portrait ? 16 : 8;
  const frameRate = delivery ? 30 : 15;
  return `${params.source.trimEnd()}

# CurvG trusted render contract. This executes after model/compiler module
# configuration and before Manim instantiates the scene.
config.pixel_width = ${pixelWidth}
config.pixel_height = ${pixelHeight}
config.frame_width = ${frameWidth}
config.frame_height = ${frameHeight}
config.frame_rate = ${frameRate}
`;
}

interface RenderEvidence {
  playbackPath: string;
  thumbnailPath: string;
  contactSheetPath: string;
  qaReportPath: string;
  media: RenderedVideoMetadata;
  visualQa: Record<string, unknown>;
  audioQa: Record<string, unknown>;
  videoDigest?: string;
}

interface RenderedVideoMetadata {
  codec: 'h264';
  pixelFormat: 'yuv420p';
  width: number;
  height: number;
  frameRate: number;
  frameCount: number;
  durationSeconds: number;
  audio: RenderedAudioMetadata | null;
}

interface RenderedAudioMetadata {
  codec: 'aac';
  sampleRate: 48_000;
  channels: 2;
}

interface DeliveryVideoContractBase {
  frame: '16:9' | '9:16';
  durationSeconds: number;
}

type DeliveryVideoContract =
  | (DeliveryVideoContractBase & { productionMode: 'explainer' })
  | (DeliveryVideoContractBase & {
      productionMode: 'simulation_short';
      audioPlan: RingEscapeAudioPlan;
    });

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = finiteNumber(value);
  return parsed !== undefined && Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : undefined;
}

function parseFrameRate(value: unknown): number | undefined {
  if (typeof value === 'number') return finiteNumber(value);
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const [numeratorValue, denominatorValue, ...extra] = value.split('/');
  if (extra.length > 0) return undefined;
  const numerator = finiteNumber(numeratorValue);
  if (denominatorValue === undefined) return numerator;
  const denominator = finiteNumber(denominatorValue);
  if (
    numerator === undefined ||
    denominator === undefined ||
    denominator === 0
  ) {
    return undefined;
  }
  return numerator / denominator;
}

function parseRenderedVideoMetadata(
  stdout: string,
  deliveryContract?: DeliveryVideoContract
): RenderedVideoMetadata {
  let value: unknown;
  try {
    value = JSON.parse(stdout) as unknown;
  } catch {
    throw new NonRetryableRenderError(
      'Rendered video metadata is not valid JSON'
    );
  }
  if (!isRecord(value) || !Array.isArray(value.streams)) {
    throw new NonRetryableRenderError('Rendered video metadata is incomplete');
  }
  const videoStreams = value.streams.filter(
    (stream): stream is Record<string, unknown> =>
      isRecord(stream) && stream.codec_type === 'video'
  );
  if (videoStreams.length !== 1) {
    throw new NonRetryableRenderError(
      'Rendered video must contain exactly one video stream'
    );
  }
  const audioStreams = value.streams.filter(
    (candidate): candidate is Record<string, unknown> =>
      isRecord(candidate) && candidate.codec_type === 'audio'
  );
  const stream = videoStreams[0];
  if (stream.codec_name !== 'h264') {
    throw new NonRetryableRenderError('Rendered video codec must be H.264');
  }
  if (stream.pix_fmt !== 'yuv420p') {
    throw new NonRetryableRenderError(
      'Rendered video pixel format must be yuv420p'
    );
  }
  const width = positiveInteger(stream.width);
  const height = positiveInteger(stream.height);
  if (width === undefined || height === undefined) {
    throw new NonRetryableRenderError('Rendered video resolution is invalid');
  }
  const frameRate =
    parseFrameRate(stream.avg_frame_rate) ??
    parseFrameRate(stream.r_frame_rate);
  if (frameRate === undefined || frameRate <= 0 || frameRate > 120) {
    throw new NonRetryableRenderError('Rendered video frame rate is invalid');
  }
  const duration = isRecord(value.format)
    ? finiteNumber(value.format.duration)
    : undefined;
  if (
    duration === undefined ||
    duration <= 0 ||
    duration > MAX_VIDEO_DURATION_SECONDS
  ) {
    throw new NonRetryableRenderError('Rendered video duration is invalid');
  }
  const frameCount =
    positiveInteger(stream.nb_read_frames) ?? positiveInteger(stream.nb_frames);
  if (frameCount === undefined) {
    throw new NonRetryableRenderError('Rendered video frame count is invalid');
  }
  let audio: RenderedAudioMetadata | null = null;
  if (deliveryContract) {
    const expectedWidth = deliveryContract.frame === '9:16' ? 1080 : 1920;
    const expectedHeight = deliveryContract.frame === '9:16' ? 1920 : 1080;
    if (width !== expectedWidth || height !== expectedHeight) {
      throw new NonRetryableRenderError(
        `Formal video resolution must be ${expectedWidth}x${expectedHeight}`
      );
    }
    if (
      Math.abs(frameRate - TARGET_VIDEO_FRAME_RATE) > VIDEO_FRAME_RATE_TOLERANCE
    ) {
      throw new NonRetryableRenderError(
        'Formal video frame rate must be approximately 30 fps'
      );
    }
    const durationTolerance = 1 / frameRate + 0.001;
    if (
      Math.abs(duration - deliveryContract.durationSeconds) > durationTolerance
    ) {
      throw new NonRetryableRenderError(
        'Formal video duration does not match the approved specification'
      );
    }
    const expectedFrameCount = duration * frameRate;
    if (Math.abs(frameCount - expectedFrameCount) > 2) {
      throw new NonRetryableRenderError(
        'Formal video frame count does not match its duration and frame rate'
      );
    }
    const approvedFrameCount = Math.round(
      deliveryContract.durationSeconds * TARGET_VIDEO_FRAME_RATE
    );
    if (Math.abs(frameCount - approvedFrameCount) > 1) {
      throw new NonRetryableRenderError(
        'Formal video frame count differs from the approved timeline by more than one frame'
      );
    }
    if (deliveryContract.productionMode === 'simulation_short') {
      if (audioStreams.length !== 1) {
        throw new NonRetryableRenderError(
          'Formal simulation video must contain exactly one audio stream'
        );
      }
      const audioStream = audioStreams[0];
      if (audioStream.codec_name !== 'aac') {
        throw new NonRetryableRenderError(
          'Formal simulation audio codec must be AAC'
        );
      }
      if (positiveInteger(audioStream.sample_rate) !== 48_000) {
        throw new NonRetryableRenderError(
          'Formal simulation audio sample rate must be 48000 Hz'
        );
      }
      if (positiveInteger(audioStream.channels) !== 2) {
        throw new NonRetryableRenderError(
          'Formal simulation audio must contain two channels'
        );
      }
      audio = { codec: 'aac', sampleRate: 48_000, channels: 2 };
    } else if (audioStreams.length !== 0) {
      throw new NonRetryableRenderError(
        'Formal explainer video must not contain an audio stream'
      );
    }
  }
  return {
    codec: 'h264',
    pixelFormat: 'yuv420p',
    width,
    height,
    frameRate,
    frameCount,
    durationSeconds: duration,
    audio,
  };
}

function parseAudioAnalysis(
  stdout: string,
  audioPlan: RingEscapeAudioPlan
): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(stdout) as unknown;
  } catch {
    throw new NonRetryableRenderError(
      'Simulation audio analyzer output is not valid JSON'
    );
  }
  if (!isRecord(value) || value.status !== 'pass') {
    throw new NonRetryableRenderError('Simulation audio analyzer did not pass');
  }
  if (
    !Array.isArray(value.cues) ||
    value.cues.length !== audioPlan.cues.length
  ) {
    throw new NonRetryableRenderError(
      'Simulation audio analyzer cue evidence is incomplete'
    );
  }
  value.cues.forEach((candidate, index) => {
    const expected = audioPlan.cues[index];
    if (!isRecord(candidate)) {
      throw new NonRetryableRenderError(
        'Simulation audio analyzer cue evidence is invalid'
      );
    }
    const onsetErrorFrames = finiteNumber(candidate.onsetErrorFrames);
    const durationErrorFrames = finiteNumber(candidate.durationErrorFrames);
    if (
      candidate.status !== 'pass' ||
      candidate.eventSeq !== expected.eventSeq ||
      candidate.kind !== expected.kind ||
      onsetErrorFrames === undefined ||
      Math.abs(onsetErrorFrames) > 1 ||
      durationErrorFrames === undefined ||
      Math.abs(durationErrorFrames) > 1
    ) {
      throw new NonRetryableRenderError(
        `Simulation audio cue ${expected.eventSeq} failed timing analysis`
      );
    }
  });
  const metrics = value.metrics;
  const reference = isRecord(metrics) ? metrics.reference : undefined;
  const decoded = isRecord(metrics) ? metrics.decoded : undefined;
  if (
    !isRecord(metrics) ||
    metrics.sampleRate !== 48_000 ||
    metrics.channels !== 2 ||
    !isRecord(reference) ||
    reference.clippingSamples !== 0 ||
    !isRecord(decoded) ||
    decoded.clippingSamples !== 0
  ) {
    throw new NonRetryableRenderError(
      'Simulation audio analyzer detected clipping or an invalid media contract'
    );
  }
  return value;
}

function isReusableDeliveryReport(
  value: unknown,
  job: Pick<
    RenderJob,
    'frame' | 'durationSeconds' | 'productionMode' | 'simulationArtifacts'
  >
): value is Record<string, unknown> {
  if (!isRecord(value) || value.analyzerVersion !== 1) return false;
  if (!Array.isArray(value.frames) || value.frames.length !== 12) return false;
  const media = value.media;
  if (!isRecord(media)) return false;
  const expectedWidth = job.frame === '9:16' ? 1080 : 1920;
  const expectedHeight = job.frame === '9:16' ? 1920 : 1080;
  const frameRate = finiteNumber(media.frameRate);
  const durationSeconds = finiteNumber(media.durationSeconds);
  const frameCount = positiveInteger(media.frameCount);
  const audio = media.audio;
  const audioQa = value.audio;
  const reusableAudio =
    job.productionMode === 'simulation_short'
      ? isRecord(audio) &&
        audio.codec === 'aac' &&
        audio.sampleRate === 48_000 &&
        audio.channels === 2 &&
        isRecord(audioQa) &&
        audioQa.status === 'pass'
      : audio === null &&
        isRecord(audioQa) &&
        audioQa.status === 'not_applicable';
  return (
    media.codec === 'h264' &&
    media.pixelFormat === 'yuv420p' &&
    media.width === expectedWidth &&
    media.height === expectedHeight &&
    frameRate !== undefined &&
    Math.abs(frameRate - TARGET_VIDEO_FRAME_RATE) <=
      VIDEO_FRAME_RATE_TOLERANCE &&
    durationSeconds !== undefined &&
    Math.abs(durationSeconds - job.durationSeconds) <= 1 / frameRate + 0.001 &&
    frameCount !== undefined &&
    Math.abs(
      frameCount - Math.round(job.durationSeconds * TARGET_VIDEO_FRAME_RATE)
    ) <= 1 &&
    reusableAudio
  );
}

async function prepareRenderEvidence(
  sandbox: Sandbox,
  mediaRoot: string,
  deliveryContract?: DeliveryVideoContract
): Promise<RenderEvidence> {
  const locate = await sandbox.exec(
    `find ${mediaRoot} -type f -name 'CurvGScene.mp4' -print -quit`,
    { timeout: 10_000 }
  );
  const videoPath = locate.stdout.trim();
  const expectedPrefix = `${mediaRoot}/`;
  if (
    !videoPath.startsWith(expectedPrefix) ||
    !/^\/workspace\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.mp4$/.test(videoPath)
  ) {
    throw new NonRetryableRenderError('Rendered video path is invalid');
  }

  const playbackPath = '/workspace/video.mp4';
  let audioQa: Record<string, unknown> = { status: 'not_applicable' };
  let simulationAudioPlan: RingEscapeAudioPlan | undefined;
  let optimize;
  if (deliveryContract?.productionMode === 'simulation_short') {
    simulationAudioPlan = deliveryContract.audioPlan;
    const audioPlanPath = '/workspace/audio-plan.json';
    const referenceAudioPath = '/workspace/audio.wav';
    await sandbox.writeFile(
      audioPlanPath,
      JSON.stringify(deliveryContract.audioPlan)
    );
    const synth = await sandbox.exec(
      'python3 /opt/curvg/audio_pipeline.py synth --plan /workspace/audio-plan.json --output /workspace/audio.wav',
      { timeout: 60_000, cwd: '/workspace' }
    );
    if (!synth.success) {
      throw new NonRetryableRenderError(
        commandError(synth.stderr, 'Simulation audio synthesis failed')
      );
    }
    optimize = await sandbox.exec(
      `ffmpeg -y -i ${videoPath} -i ${referenceAudioPath} -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart ${playbackPath}`,
      { timeout: 60_000, cwd: '/workspace' }
    );
    if (!optimize.success) {
      throw new NonRetryableRenderError(
        commandError(optimize.stderr, 'Simulation audio mux failed')
      );
    }
  } else {
    optimize = await sandbox.exec(
      `ffmpeg -y -i ${videoPath} -map 0:v:0 -an -c copy -movflags +faststart ${playbackPath}`,
      { timeout: 60_000 }
    );
  }
  if (!optimize.success) {
    throw new NonRetryableRenderError(
      commandError(optimize.stderr, 'Video playback optimization failed')
    );
  }

  const thumbnailPath = '/workspace/thumbnail.jpg';
  const thumbnail = await sandbox.exec(
    `ffmpeg -y -ss 00:00:01 -i ${playbackPath} -frames:v 1 ${thumbnailPath}`,
    { timeout: 30_000 }
  );
  if (!thumbnail.success) {
    throw new NonRetryableRenderError(
      commandError(thumbnail.stderr, 'Thumbnail generation failed')
    );
  }

  const metadataProbe = await sandbox.exec(
    `ffprobe -v error -count_frames -show_entries format=duration:stream=codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,r_frame_rate,nb_frames,nb_read_frames,sample_rate,channels -of json ${playbackPath}`,
    { timeout: 15_000 }
  );
  if (!metadataProbe.success) {
    throw new NonRetryableRenderError(
      commandError(metadataProbe.stderr, 'Rendered video metadata probe failed')
    );
  }
  const media = parseRenderedVideoMetadata(
    metadataProbe.stdout,
    deliveryContract
  );
  if (simulationAudioPlan) {
    const decodedSampleCount = simulationAudioPlan.durationFrames * 1_600;
    const decode = await sandbox.exec(
      `ffmpeg -y -i /workspace/video.mp4 -map 0:a:0 -f s16le -acodec pcm_s16le -ar 48000 -ac 2 -frames:a ${decodedSampleCount} /workspace/audio-decoded.pcm`,
      { timeout: 60_000, cwd: '/workspace' }
    );
    if (!decode.success) {
      throw new NonRetryableRenderError(
        commandError(decode.stderr, 'Simulation AAC decode failed')
      );
    }
    const audioAnalysis = await sandbox.exec(
      'python3 /opt/curvg/audio_pipeline.py analyze --plan /workspace/audio-plan.json --reference /workspace/audio.wav --pcm /workspace/audio-decoded.pcm',
      { timeout: 60_000, cwd: '/workspace' }
    );
    if (!audioAnalysis.success || audioAnalysis.stdout.length > 64_000) {
      throw new NonRetryableRenderError(
        commandError(audioAnalysis.stderr, 'Simulation audio analysis failed')
      );
    }
    audioQa = parseAudioAnalysis(audioAnalysis.stdout, simulationAudioPlan);
  }
  let videoDigest: string | undefined;
  if (deliveryContract) {
    const videoHash = await sandbox.exec(`sha256sum ${playbackPath}`, {
      timeout: 15_000,
      cwd: '/workspace',
    });
    const hashMatch = videoHash.stdout.match(
      /^([a-f0-9]{64})  \/workspace\/video\.mp4\n?$/
    );
    if (!videoHash.success || !hashMatch) {
      throw new NonRetryableRenderError(
        commandError(videoHash.stderr, 'Formal video SHA-256 failed')
      );
    }
    videoDigest = hashMatch[1];
  }
  const duration = media.durationSeconds;

  const contactSheetPath = '/workspace/contact-sheet.jpg';
  const sampleRate = (12 / duration).toFixed(8);
  const contactSheet = await sandbox.exec(
    `ffmpeg -y -i ${playbackPath} -vf "fps=${sampleRate},scale=360:-2:flags=lanczos,tile=4x3:padding=8:margin=8:color=0x0B0D14" -frames:v 1 -q:v 2 ${contactSheetPath}`,
    { timeout: 60_000 }
  );
  if (!contactSheet.success) {
    throw new NonRetryableRenderError(
      commandError(contactSheet.stderr, 'Visual QA contact sheet failed')
    );
  }

  const analysis = await sandbox.exec(
    `python3 /opt/curvg/analyze_contact_sheet.py ${contactSheetPath} ${playbackPath}`,
    { timeout: 240_000, cwd: '/workspace' }
  );
  let visualQa: Record<string, unknown> | undefined;
  if (analysis.success && analysis.stdout.length <= 20_000) {
    try {
      const parsed = JSON.parse(analysis.stdout) as Record<string, unknown>;
      if (
        parsed.analyzerVersion === 1 &&
        (parsed.status === 'pass' || parsed.status === 'review') &&
        Array.isArray(parsed.frames) &&
        parsed.frames.length === 12 &&
        typeof parsed.temporalSampleCount === 'number'
      ) {
        visualQa = parsed;
      }
    } catch {
      visualQa = undefined;
    }
  }
  if (!visualQa) {
    throw new Error(
      commandError(
        analysis.stderr,
        'Visual QA analyzer did not produce valid evidence'
      )
    );
  }
  const qaReportPath = '/workspace/qa-report.json';
  await sandbox.writeFile(
    qaReportPath,
    JSON.stringify({ ...visualQa, media, audio: audioQa })
  );
  return {
    playbackPath,
    thumbnailPath,
    contactSheetPath,
    qaReportPath,
    media,
    visualQa,
    audioQa,
    ...(videoDigest ? { videoDigest } : {}),
  };
}

async function preserveBestRenderEvidence(
  sandbox: Sandbox,
  evidence: RenderEvidence
): Promise<RenderEvidence> {
  const copy = await sandbox.exec(
    'cp /workspace/video.mp4 /workspace/best-video.mp4 && cp /workspace/thumbnail.jpg /workspace/best-thumbnail.jpg && cp /workspace/contact-sheet.jpg /workspace/best-contact-sheet.jpg && cp /workspace/qa-report.json /workspace/best-qa-report.json',
    { timeout: 30_000, cwd: '/workspace' }
  );
  if (!copy.success) {
    throw new NonRetryableRenderError(
      commandError(copy.stderr, 'Best render snapshot failed')
    );
  }
  return {
    playbackPath: '/workspace/best-video.mp4',
    thumbnailPath: '/workspace/best-thumbnail.jpg',
    contactSheetPath: '/workspace/best-contact-sheet.jpg',
    qaReportPath: '/workspace/best-qa-report.json',
    media: evidence.media,
    visualQa: evidence.visualQa,
    audioQa: evidence.audioQa,
    ...(evidence.videoDigest ? { videoDigest: evidence.videoDigest } : {}),
  };
}

function hasReusableSimulationLineage(
  job: RenderJob,
  objects: {
    video: R2Object | null;
    events: R2Object | null;
    stateTrack: R2Object | null;
    runManifest: R2Object | null;
  }
) {
  if (job.productionMode === 'explainer') return true;
  const artifacts = job.simulationArtifacts;
  if (!artifacts) return false;
  const matchesLineage = (object: R2Object | null) =>
    object?.customMetadata?.runDigest === artifacts.runDigest &&
    object.customMetadata.compiledSourceDigest ===
      artifacts.compiledSourceDigest &&
    object.customMetadata.audioPlanDigest === artifacts.audioPlanDigest;
  return (
    matchesLineage(objects.video) &&
    matchesLineage(objects.events) &&
    matchesLineage(objects.stateTrack) &&
    matchesLineage(objects.runManifest) &&
    /^[a-f0-9]{64}$/.test(objects.video?.customMetadata?.videoDigest || '') &&
    objects.runManifest?.customMetadata?.eventCount ===
      String(artifacts.eventCount)
  );
}

function completedSimulationLineage(
  job: RenderJob,
  videoDigest: string | undefined
) {
  const artifacts = job.simulationArtifacts;
  return job.productionMode === 'simulation_short' && artifacts && videoDigest
    ? {
        runDigest: artifacts.runDigest,
        compiledSourceDigest: artifacts.compiledSourceDigest,
        videoDigest,
      }
    : {};
}

function visualQaCandidateRank(evidence: RenderEvidence): number {
  const value = evidence.visualQa.score;
  const score =
    typeof value === 'number' && Number.isFinite(value) ? value : -1;
  const hardCodes = new Set([
    'empty_frame',
    'edge_risk',
    'static_sequence',
    'black_segment',
    'flash_frame',
    'frozen_segment',
  ]);
  const issues = Array.isArray(evidence.visualQa.issues)
    ? evidence.visualQa.issues
    : [];
  const frames = Array.isArray(evidence.visualQa.frames)
    ? evidence.visualQa.frames
    : [];
  const hasHardDefect =
    issues.some(
      (issue) =>
        issue &&
        typeof issue === 'object' &&
        hardCodes.has((issue as Record<string, unknown>).code as string)
    ) ||
    frames.some(
      (frame) =>
        frame &&
        typeof frame === 'object' &&
        (frame as Record<string, unknown>).edgeRisk === true
    ) ||
    ['blackSegments', 'frozenSegments', 'flashTimestamps'].some((key) => {
      const entries = evidence.visualQa[key];
      return Array.isArray(entries) && entries.length > 0;
    });
  return hasHardDefect ? score - 1_000 : score;
}

async function uploadReviewEvidence(params: {
  sandbox: Sandbox;
  env: Env;
  job: RenderJob;
  contactSheetKey: string;
  qaReportKey: string;
  evidence: RenderEvidence;
  attempt: number;
  phase: 'preview' | 'final';
}) {
  await uploadBinaryFile(
    params.sandbox,
    params.env.ARTIFACTS,
    params.contactSheetKey,
    params.evidence.contactSheetPath,
    {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: {
        animationId: params.job.animationId,
        jobId: params.job.jobId,
        sampleCount: '12',
        attempt: String(params.attempt),
        phase: params.phase,
        ...(params.job.simulationArtifacts
          ? {
              audioPlanDigest: params.job.simulationArtifacts.audioPlanDigest,
            }
          : {}),
      },
    }
  );
  await uploadBinaryFile(
    params.sandbox,
    params.env.ARTIFACTS,
    params.qaReportKey,
    params.evidence.qaReportPath,
    {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        animationId: params.job.animationId,
        jobId: params.job.jobId,
        analyzerVersion: '1',
        attempt: String(params.attempt),
        phase: params.phase,
        ...(params.job.simulationArtifacts
          ? {
              audioPlanDigest: params.job.simulationArtifacts.audioPlanDigest,
            }
          : {}),
      },
    }
  );
}

async function processJob(job: RenderJob, env: Env) {
  const artifactPrefix = `animations/${job.animationId}/${job.jobId}`;
  const videoKey = `${artifactPrefix}/video.mp4`;
  const thumbnailKey = `${artifactPrefix}/thumbnail.jpg`;
  const contactSheetKey = `${artifactPrefix}/contact-sheet.jpg`;
  const qaReportKey = `${artifactPrefix}/qa-report.json`;
  const eventsKey = `${artifactPrefix}/events.jsonl`;
  const stateTrackKey = `${artifactPrefix}/state-track.json`;
  const runManifestKey = `${artifactPrefix}/run-manifest.json`;
  const [
    existingVideo,
    existingThumbnail,
    existingContactSheet,
    existingQaReport,
    existingEvents,
    existingStateTrack,
    existingRunManifest,
  ] = await Promise.all([
    env.ARTIFACTS.head(videoKey),
    env.ARTIFACTS.head(thumbnailKey),
    env.ARTIFACTS.head(contactSheetKey),
    env.ARTIFACTS.head(qaReportKey),
    env.ARTIFACTS.head(eventsKey),
    env.ARTIFACTS.head(stateTrackKey),
    env.ARTIFACTS.head(runManifestKey),
  ]);
  const reusableSimulationArtifacts = hasReusableSimulationLineage(job, {
    video: existingVideo,
    events: existingEvents,
    stateTrack: existingStateTrack,
    runManifest: existingRunManifest,
  });
  const reusableDelivery =
    job.protocolVersion === V2_RENDER_PROTOCOL &&
    existingVideo?.customMetadata?.quality === '1080p30' &&
    existingVideo.customMetadata.deliveryReview === 'approved' &&
    /^[a-f0-9]{64}$/.test(existingVideo.customMetadata.videoDigest || '') &&
    existingVideo.customMetadata.deliveryReviewDigest ===
      existingVideo.customMetadata.videoDigest &&
    existingVideo.customMetadata.frame === job.frame &&
    existingVideo.customMetadata.durationSeconds ===
      String(job.durationSeconds) &&
    existingThumbnail &&
    existingContactSheet?.customMetadata?.phase === 'final' &&
    existingQaReport?.customMetadata?.phase === 'final' &&
    (job.productionMode === 'explainer' ||
      existingQaReport?.customMetadata?.audioPlanDigest ===
        job.simulationArtifacts?.audioPlanDigest) &&
    reusableSimulationArtifacts;
  const reusableLegacyDelivery =
    job.protocolVersion === 'legacy' &&
    existingVideo &&
    existingThumbnail &&
    existingContactSheet;
  if (reusableLegacyDelivery) {
    const reportObject = existingQaReport
      ? await env.ARTIFACTS.get(qaReportKey)
      : undefined;
    const report = reportObject
      ? await reportObject
          .json<Record<string, unknown>>()
          .catch(() => undefined)
      : undefined;
    await notify(job, env, {
      status: 'completed',
      ...artifactUrls(job, !!report),
      ...(report ? { visualQa: report } : {}),
    });
    return;
  }
  if (reusableDelivery) {
    const reportObject = existingQaReport
      ? await env.ARTIFACTS.get(qaReportKey)
      : undefined;
    const report = reportObject
      ? await reportObject
          .json<Record<string, unknown>>()
          .catch(() => undefined)
      : undefined;
    if (isReusableDeliveryReport(report, job)) {
      await notify(job, env, {
        status: 'completed',
        ...artifactUrls(job, true),
        visualQa: report,
        videoDigest: existingVideo?.customMetadata?.videoDigest,
        ...completedSimulationLineage(
          job,
          existingVideo?.customMetadata?.videoDigest
        ),
      });
      return;
    }
  }

  const sandbox = getSandbox(env.Sandbox, job.jobId, {
    sleepAfter: '10m',
    labels: { workload: 'curvg-manim', animationId: job.animationId },
  });
  let currentCode = job.code;
  let bestCode = currentCode;
  let bestEvidence: RenderEvidence | undefined;
  let bestAttempt = 0;
  let bestRank = -1_001;
  try {
    const qualityRepairBudget =
      job.productionMode === 'simulation_short' ? 0 : MAX_QUALITY_REPAIRS;
    for (let attempt = 0; attempt <= qualityRepairBudget; attempt += 1) {
      await sandbox.exec(
        'rm -rf /workspace/media /workspace/video.mp4 /workspace/thumbnail.jpg /workspace/contact-sheet.jpg /workspace/qa-report.json /workspace/audio-plan.json /workspace/audio.wav /workspace/audio-decoded.pcm',
        { timeout: 30_000, cwd: '/workspace' }
      );
      await sandbox.writeFile('/workspace/scene.py', currentCode);
      await notifyStage(job, env, 'validating', attemptProgress(attempt, 2));
      const validation = await sandbox.exec(
        'python3 /opt/curvg/validate_scene.py /workspace/scene.py',
        { timeout: 30_000, cwd: '/workspace' }
      );
      if (!validation.success) {
        const error = commandError(
          validation.stderr,
          'Generated code failed validation'
        );
        const gate = await requestQualityGate(job, env, {
          kind: 'render_error',
          attempt,
          error,
        });
        if (gate.action !== 'repair') {
          throw new NonRetryableRenderError(
            `Autonomous source repair was exhausted: ${error}`
          );
        }
        currentCode = applyRepairResult(job, gate);
        continue;
      }

      await sandbox.writeFile(
        '/workspace/scene.py',
        sourceWithRenderContract({
          source: currentCode,
          frame: job.frame,
          phase: 'preview',
        })
      );
      await notifyStage(job, env, 'compiling', attemptProgress(attempt, 10));
      const render = await sandbox.exec(
        'manim -ql --format=mp4 --disable_caching scene.py CurvGScene --media_dir /workspace/media',
        { timeout: 600_000, cwd: '/workspace' }
      );
      if (!render.success) {
        const error = commandError(render.stderr, 'Manim render failed');
        const gate = await requestQualityGate(job, env, {
          kind: 'render_error',
          attempt,
          error,
        });
        if (gate.action !== 'repair') {
          throw new NonRetryableRenderError(
            `Autonomous render repair was exhausted: ${error}`
          );
        }
        currentCode = applyRepairResult(job, gate);
        continue;
      }

      await notifyStage(job, env, 'transcoding', attemptProgress(attempt, 18));
      await notifyStage(job, env, 'reviewing', attemptProgress(attempt, 24));
      const previewEvidence = await prepareRenderEvidence(
        sandbox,
        '/workspace/media'
      );
      const currentRank = visualQaCandidateRank(previewEvidence);
      if (!bestEvidence || currentRank > bestRank) {
        bestEvidence = await preserveBestRenderEvidence(
          sandbox,
          previewEvidence
        );
        bestCode = currentCode;
        bestAttempt = attempt;
        bestRank = currentRank;
      }
      // On the last autonomous pass, review and deliver the strongest rendered
      // candidate instead of allowing a regressive repair to overwrite it.
      const reviewEvidence =
        attempt === qualityRepairBudget && bestEvidence
          ? bestEvidence
          : previewEvidence;
      const selectedCode =
        attempt === qualityRepairBudget ? bestCode : currentCode;
      const selectedAttempt =
        attempt === qualityRepairBudget ? bestAttempt : attempt;
      await notifyStage(job, env, 'reviewing', attemptProgress(attempt, 28));
      await uploadReviewEvidence({
        sandbox,
        env,
        job,
        contactSheetKey,
        qaReportKey,
        evidence: reviewEvidence,
        attempt: selectedAttempt,
        phase: 'preview',
      });
      const finalGate = await requestQualityGate(job, env, {
        kind: 'final_review',
        attempt,
        visualQa: reviewEvidence.visualQa,
        // The legacy application caps this endpoint at 16 KiB. It already
        // persists repaired code, so repeating the full source is unnecessary
        // for compatibility jobs. Renderer/v2 keeps exact-source approval.
        ...(job.protocolVersion === V2_RENDER_PROTOCOL
          ? { approvedCode: selectedCode }
          : {}),
      });
      if (finalGate.action === 'repair') {
        currentCode = applyRepairResult(job, finalGate);
        // This candidate was rejected semantically. It must not remain in the
        // pixel-score fallback pool after the specification or source changes.
        bestEvidence = undefined;
        bestCode = currentCode;
        bestAttempt = attempt + 1;
        bestRank = -1_001;
        continue;
      }
      if (finalGate.action !== 'approve') {
        throw new NonRetryableRenderError(
          'Final deliverable did not pass autonomous review'
        );
      }

      // The autonomous repair loop uses a low-quality render for speed. Only
      // after a candidate passes the preview gate do we spend the 1080p30
      // render budget. Evidence and a separate semantic verdict are then
      // regenerated from this exact formal MP4.
      await sandbox.exec(
        'rm -rf /workspace/media /workspace/video.mp4 /workspace/thumbnail.jpg /workspace/contact-sheet.jpg /workspace/qa-report.json /workspace/audio-plan.json /workspace/audio.wav /workspace/audio-decoded.pcm',
        { timeout: 30_000, cwd: '/workspace' }
      );
      await sandbox.writeFile(
        '/workspace/scene.py',
        sourceWithRenderContract({
          source: selectedCode,
          frame: job.frame,
          phase: 'delivery',
        })
      );
      await notifyStage(job, env, 'compiling', 90);
      const formalRender = await sandbox.exec(
        `manim -qh --fps 30 --resolution ${job.frame === '9:16' ? '1080,1920' : '1920,1080'} --format=mp4 --disable_caching scene.py CurvGScene --media_dir /workspace/media`,
        { timeout: 600_000, cwd: '/workspace' }
      );
      if (!formalRender.success) {
        throw new Error(
          commandError(formalRender.stderr, 'Formal Manim render failed')
        );
      }
      await notifyStage(job, env, 'reviewing', 94);
      const deliveryContract: DeliveryVideoContract | undefined =
        job.protocolVersion !== V2_RENDER_PROTOCOL
          ? undefined
          : job.productionMode === 'simulation_short' && job.simulationArtifacts
            ? {
                frame: job.frame,
                durationSeconds: job.durationSeconds,
                productionMode: 'simulation_short',
                audioPlan: ringEscapeAudioPlanSchema.parse(
                  JSON.parse(job.simulationArtifacts.audioPlanJson) as unknown
                ),
              }
            : {
                frame: job.frame,
                durationSeconds: job.durationSeconds,
                productionMode: 'explainer',
              };
      const deliveryEvidence = await prepareRenderEvidence(
        sandbox,
        '/workspace/media',
        deliveryContract
      );
      await uploadReviewEvidence({
        sandbox,
        env,
        job,
        contactSheetKey,
        qaReportKey,
        evidence: deliveryEvidence,
        attempt: selectedAttempt,
        phase: 'final',
      });

      if (job.protocolVersion === V2_RENDER_PROTOCOL) {
        const deliveryGate = await requestQualityGate(job, env, {
          kind: 'delivery_review',
          attempt,
          visualQa: deliveryEvidence.visualQa,
          approvedCode: selectedCode,
          videoDigest: deliveryEvidence.videoDigest,
        });
        if (deliveryGate.action === 'repair') {
          currentCode = applyRepairResult(job, deliveryGate);
          bestEvidence = undefined;
          bestCode = currentCode;
          bestAttempt = attempt + 1;
          bestRank = -1_001;
          continue;
        }
        if (deliveryGate.action !== 'approve') {
          throw new NonRetryableRenderError(
            'Formal delivery did not pass autonomous review'
          );
        }
      }

      const videoDigest = deliveryEvidence.videoDigest;
      if (
        job.protocolVersion === V2_RENDER_PROTOCOL &&
        (!videoDigest || !/^[a-f0-9]{64}$/.test(videoDigest))
      ) {
        throw new NonRetryableRenderError(
          'Formal video SHA-256 evidence is missing'
        );
      }

      await notifyStage(job, env, 'uploading', 96);
      const videoBytes = await uploadBinaryFile(
        sandbox,
        env.ARTIFACTS,
        videoKey,
        deliveryEvidence.playbackPath,
        {
          httpMetadata: { contentType: 'video/mp4' },
          customMetadata: {
            animationId: job.animationId,
            jobId: job.jobId,
            quality: '1080p30',
            ...(job.protocolVersion === V2_RENDER_PROTOCOL
              ? {
                  deliveryReview: 'approved',
                  deliveryReviewDigest: videoDigest!,
                }
              : { deliveryReview: 'legacy-final-review' }),
            frame: job.frame,
            durationSeconds: String(deliveryEvidence.media.durationSeconds),
            ...(videoDigest ? { videoDigest } : {}),
            ...(job.simulationArtifacts
              ? {
                  runDigest: job.simulationArtifacts.runDigest,
                  compiledSourceDigest:
                    job.simulationArtifacts.compiledSourceDigest,
                  audioPlanDigest: job.simulationArtifacts.audioPlanDigest,
                }
              : {}),
          },
        }
      );
      // A structurally broken render can still exit 0 with a stub file. Any
      // real 1080p30 deliverable is far above this floor; below it the MP4 is
      // a shell and must not be reported as completed.
      if (videoBytes < MIN_VIDEO_BYTES) {
        throw new Error(
          `Formal MP4 is implausibly small (${videoBytes} bytes)`
        );
      }
      await uploadBinaryFile(
        sandbox,
        env.ARTIFACTS,
        thumbnailKey,
        deliveryEvidence.thumbnailPath,
        {
          httpMetadata: { contentType: 'image/jpeg' },
          customMetadata: { animationId: job.animationId, jobId: job.jobId },
        }
      );
      await uploadSimulationArtifacts(job, env);
      await notify(job, env, {
        status: 'completed',
        ...artifactUrls(job, true),
        visualQa: deliveryEvidence.visualQa,
        ...(videoDigest ? { videoDigest } : {}),
        ...completedSimulationLineage(job, videoDigest),
      });
      return;
    }
    throw new NonRetryableRenderError(
      'Autonomous quality repair budget was exhausted'
    );
  } finally {
    await sandbox.destroy().catch(() => undefined);
  }
}

const worker: ExportedHandler<Env, QueuedRenderJob> = {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (request.method === 'GET' && pathname.startsWith('/artifact/')) {
      if (!hasBearerToken(request, env.RENDERER_TOKEN)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        return await serveArtifact(request, env);
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Artifact read failed',
          },
          { status: 500 }
        );
      }
    }
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }
    if (!hasBearerToken(request, env.RENDERER_TOKEN)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const body = await readRenderRequestBody(request);
      const job = await parseJob(request, body, env);
      await env.RENDER_QUEUE.send(job, { delaySeconds: 1 });
      return Response.json({
        jobId: job.jobId,
        status: 'queued',
        provider: 'cloudflare-sandbox',
        ...(job.protocolVersion === V2_RENDER_PROTOCOL
          ? { protocolVersion: V2_RENDER_PROTOCOL }
          : {}),
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid request' },
        { status: 400 }
      );
    }
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      let job: RenderJob | undefined;
      try {
        job = await normalizeQueuedJob(message.body);
        await processJob(job, env);
        message.ack();
      } catch (error) {
        if (error instanceof CanceledRenderError) {
          message.ack();
          continue;
        }
        if (
          !(error instanceof NonRetryableRenderError) &&
          message.attempts < 3
        ) {
          message.retry({ delaySeconds: 30 });
          continue;
        }
        try {
          const callbackJob = job || (await normalizeQueuedJob(message.body));
          await notify(callbackJob, env, {
            status: 'failed',
            error:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : 'Render failed',
          });
          message.ack();
        } catch {
          message.retry({ delaySeconds: 60 });
        }
      }
    }
  },
};

export default worker;
