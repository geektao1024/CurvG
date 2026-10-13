import { z } from 'zod';

export const ANIMATION_PRODUCTION_MODES = [
  'explainer',
  'simulation_short',
] as const;
export const animationProductionModeSchema = z.enum(ANIMATION_PRODUCTION_MODES);
export type AnimationProductionMode = z.infer<
  typeof animationProductionModeSchema
>;

const idSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z][a-zA-Z0-9_.:/-]*$/);
const finite = z.number().finite();
const positive = finite.positive();
const vec2 = z.tuple([finite, finite]);
const digest = z.string().regex(/^[a-f0-9]{64}$/);

export const ringEscapeSolverConfigSchema = z
  .object({
    fixedDt: positive.max(1 / 30),
    substeps: z.number().int().min(1).max(128),
    seed: z.number().int().min(0).max(0xffff_ffff),
    initial: z
      .object({
        position: vec2,
        speed: positive,
        headingRadians: finite,
        jitterRadians: finite.min(0).max(Math.PI),
      })
      .strict(),
    rings: z
      .object({
        count: z.number().int().min(1).max(10_000),
        firstRadius: positive,
        spacing: positive,
        gapCenterRadians: finite,
        gapWidthRadians: positive.max(Math.PI * 2),
        gapRotationPerRingRadians: finite.optional(),
      })
      .strict(),
    escapeBoundary: z
      .object({
        radius: positive,
        gapCenterRadians: finite,
        gapWidthRadians: positive.max(Math.PI * 2),
      })
      .strict(),
    checkpointEverySteps: z.number().int().positive().max(1_000_000),
    limits: z
      .object({
        maxSteps: z.number().int().positive().max(10_000_000),
        maxEvents: z.number().int().min(4).max(1_000_000),
        maxCrossingsPerSubstep: z.number().int().positive().max(100_000),
        maxPositionMagnitude: positive,
      })
      .strict(),
  })
  .strict()
  .superRefine((config, context) => {
    const outerRing =
      config.rings.firstRadius +
      (config.rings.count - 1) * config.rings.spacing;
    if (config.escapeBoundary.radius <= outerRing) {
      context.addIssue({
        code: 'custom',
        path: ['escapeBoundary', 'radius'],
        message: 'escapeBoundary.radius must be outside every ring',
      });
    }
    if (
      Math.hypot(
        config.initial.position[0] as number,
        config.initial.position[1] as number
      ) >= config.rings.firstRadius
    ) {
      context.addIssue({
        code: 'custom',
        path: ['initial', 'position'],
        message: 'particle must start inside the first ring',
      });
    }
    if (config.escapeBoundary.gapWidthRadians >= Math.PI * 2) {
      context.addIssue({
        code: 'custom',
        path: ['escapeBoundary', 'gapWidthRadians'],
        message: 'gap width must be smaller than 2*pi',
      });
    }
    if (config.rings.gapWidthRadians >= Math.PI * 2) {
      context.addIssue({
        code: 'custom',
        path: ['rings', 'gapWidthRadians'],
        message: 'gap width must be smaller than 2*pi',
      });
    }
  });

export type RingEscapeSolverConfigContract = z.infer<
  typeof ringEscapeSolverConfigSchema
>;

export const ringEscapeScenarioConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    productionMode: z.literal('simulation_short'),
    family: z.literal('ring_escape'),
    solverConfig: ringEscapeSolverConfigSchema,
    endWhen: z
      .object({
        kind: z.literal('terminal_event'),
        terminalReasons: z.tuple([
          z.literal('escaped'),
          z.literal('max_steps'),
          z.literal('event_limit'),
          z.literal('crossing_limit'),
          z.literal('position_limit'),
        ]),
      })
      .strict(),
    output: z
      .object({
        frame: z.literal('9:16'),
        width: z.literal(1080),
        height: z.literal(1920),
        fps: z.literal(30),
        canonicalPrecision: z.literal(12),
      })
      .strict(),
  })
  .strict();

export const animationSimulationScenarioConfigSchema = z.discriminatedUnion(
  'family',
  [ringEscapeScenarioConfigSchema]
);
export type RingEscapeScenarioConfig = z.infer<
  typeof ringEscapeScenarioConfigSchema
>;
export type AnimationSimulationScenarioConfig = z.infer<
  typeof animationSimulationScenarioConfigSchema
>;

export function parseAnimationSimulationScenarioConfig(
  value: unknown
): AnimationSimulationScenarioConfig {
  return animationSimulationScenarioConfigSchema.parse(value);
}

export function createDefaultRingEscapeScenarioConfig(
  options: {
    seed?: number;
    maxSteps?: number;
  } = {}
): RingEscapeScenarioConfig {
  return ringEscapeScenarioConfigSchema.parse({
    schemaVersion: 1,
    productionMode: 'simulation_short',
    family: 'ring_escape',
    solverConfig: {
      fixedDt: 1 / 120,
      substeps: 4,
      seed: options.seed ?? 0x5eed_1234,
      initial: {
        position: [0, 0],
        speed: 1.6,
        headingRadians: 0,
        jitterRadians: 0,
      },
      rings: {
        count: 3,
        firstRadius: 1,
        spacing: 0.8,
        gapCenterRadians: Math.PI,
        gapWidthRadians: 0.55,
        gapRotationPerRingRadians: 0,
      },
      escapeBoundary: {
        radius: 3.6,
        gapCenterRadians: Math.PI,
        gapWidthRadians: 0.55,
      },
      checkpointEverySteps: 3,
      limits: {
        maxSteps: options.maxSteps ?? 1_800,
        maxEvents: 1_000,
        maxCrossingsPerSubstep: 16,
        maxPositionMagnitude: 100,
      },
    },
    endWhen: {
      kind: 'terminal_event',
      terminalReasons: [
        'escaped',
        'max_steps',
        'event_limit',
        'crossing_limit',
        'position_limit',
      ],
    },
    output: {
      frame: '9:16',
      width: 1080,
      height: 1920,
      fps: 30,
      canonicalPrecision: 12,
    },
  });
}

const terminalReasonSchema = z.enum([
  'escaped',
  'max_steps',
  'event_limit',
  'crossing_limit',
  'position_limit',
]);

const ringEscapeSolverEventSchema = z.discriminatedUnion('type', [
  z.object({
    sequence: z.number().int().min(0),
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    position: vec2,
    velocity: vec2,
    type: z.literal('spawn'),
    seed: z.number().int(),
    seedSample: finite,
    appliedJitterRadians: finite,
  }),
  ...(['contact_enter', 'contact_exit'] as const).map((type) =>
    z.object({
      sequence: z.number().int().min(0),
      step: z.number().int().min(0),
      substep: z.number().int().min(0),
      time: finite.min(0),
      position: vec2,
      velocity: vec2,
      type: z.literal(type),
      contactId: idSchema,
      boundaryId: idSchema,
    })
  ),
  z.object({
    sequence: z.number().int().min(0),
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    position: vec2,
    velocity: vec2,
    type: z.literal('escape'),
    boundaryId: z.literal('escape'),
  }),
  z.object({
    sequence: z.number().int().min(0),
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    position: vec2,
    velocity: vec2,
    type: z.literal('terminal'),
    reason: terminalReasonSchema,
  }),
]);

const ringEscapeSolverCheckpointSchema = z.object({
  step: z.number().int().min(0),
  substep: z.number().int().min(0),
  time: finite.min(0),
  position: vec2,
  velocity: vec2,
  activeContactIds: z.array(idSchema),
  eventCursor: z.number().int().min(0),
});

const ringEscapeSolverResultSchema = z.object({
  solver: z.literal('ring_escape/v1'),
  config: ringEscapeSolverConfigSchema,
  seed: z.number().int().min(0).max(0xffff_ffff),
  fixedDt: positive,
  substeps: z.number().int().positive(),
  events: z.array(ringEscapeSolverEventSchema),
  checkpoints: z.array(ringEscapeSolverCheckpointSchema),
  finalState: z.object({
    position: vec2,
    velocity: vec2,
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    terminalReason: terminalReasonSchema,
  }),
  digest: z.string().regex(/^fnv1a64:[a-f0-9]{16}$/),
});

export const canonicalSimulationEventSchema = z
  .object({
    seq: z.number().int().min(0),
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    kind: z.enum([
      'spawn',
      'contact_enter',
      'contact_exit',
      'escape',
      'terminal',
    ]),
    sourceId: idSchema,
    targetId: idSchema.optional(),
    position: vec2,
    velocity: vec2,
    contactId: idSchema.optional(),
    payload: z.record(z.string(), z.union([z.string(), finite, z.boolean()])),
  })
  .strict();
export type CanonicalSimulationEvent = z.infer<
  typeof canonicalSimulationEventSchema
>;

export const simulationStateCheckpointSchema = z
  .object({
    seq: z.number().int().min(0),
    step: z.number().int().min(0),
    substep: z.number().int().min(0),
    time: finite.min(0),
    position: vec2,
    velocity: vec2,
    activeContactIds: z.array(idSchema),
    eventCursor: z.number().int().min(0),
    terminal: z.boolean(),
  })
  .strict();
export type SimulationStateCheckpoint = z.infer<
  typeof simulationStateCheckpointSchema
>;

export interface AdaptedRingEscapeRun {
  events: CanonicalSimulationEvent[];
  checkpoints: SimulationStateCheckpoint[];
  summary: {
    status: 'terminated';
    steps: number;
    simulatedDuration: number;
    eventCount: number;
    counts: Record<CanonicalSimulationEvent['kind'], number>;
    terminalReason: z.infer<typeof terminalReasonSchema>;
    solverDigest: string;
    finalStateDigest: string;
  };
}

export async function adaptRingEscapeSolverResult(params: {
  scenario: unknown;
  result: unknown;
}): Promise<AdaptedRingEscapeRun> {
  const scenario = ringEscapeScenarioConfigSchema.parse(params.scenario);
  const result = ringEscapeSolverResultSchema.parse(params.result);
  if (
    result.seed !== scenario.solverConfig.seed ||
    result.fixedDt !== scenario.solverConfig.fixedDt ||
    result.substeps !== scenario.solverConfig.substeps ||
    stableCanonicalJson(result.config) !==
      stableCanonicalJson(scenario.solverConfig)
  ) {
    throw new Error('solver result does not match scenario config');
  }
  if (result.events.length > scenario.solverConfig.limits.maxEvents) {
    throw new Error('event log exceeds scenario limits');
  }
  if (result.finalState.step > scenario.solverConfig.limits.maxSteps) {
    throw new Error('solver steps exceed scenario limits');
  }

  const events = result.events.map((event, index) => {
    if (event.sequence !== index) {
      throw new Error(
        'solver event sequence must be contiguous and zero-based'
      );
    }
    const common = {
      seq: event.sequence,
      step: event.step,
      substep: event.substep,
      time: event.time,
      kind: event.type,
      sourceId: 'particle',
      position: event.position,
      velocity: event.velocity,
    };
    if (event.type === 'spawn') {
      return canonicalSimulationEventSchema.parse({
        ...common,
        payload: {
          seed: event.seed,
          seedSample: event.seedSample,
          appliedJitterRadians: event.appliedJitterRadians,
        },
      });
    }
    if (event.type === 'contact_enter' || event.type === 'contact_exit') {
      return canonicalSimulationEventSchema.parse({
        ...common,
        targetId: event.boundaryId,
        contactId: event.contactId,
        payload: {},
      });
    }
    if (event.type === 'escape') {
      return canonicalSimulationEventSchema.parse({
        ...common,
        targetId: event.boundaryId,
        payload: {},
      });
    }
    if (event.type !== 'terminal') {
      throw new Error(`Unsupported solver event type: ${event.type}`);
    }
    return canonicalSimulationEventSchema.parse({
      ...common,
      payload: { reason: event.reason },
    });
  });
  const terminal = events.at(-1);
  if (terminal?.kind !== 'terminal') {
    throw new Error('solver event log must end with a terminal event');
  }

  let previousCursor = -1;
  const checkpoints = result.checkpoints.map((checkpoint, seq) => {
    if (checkpoint.eventCursor < previousCursor) {
      throw new Error('checkpoint event cursors must be monotonic');
    }
    if (checkpoint.eventCursor > events.length) {
      throw new Error('checkpoint event cursor exceeds the event log');
    }
    previousCursor = checkpoint.eventCursor;
    return simulationStateCheckpointSchema.parse({
      seq,
      ...checkpoint,
      terminal:
        checkpoint.step === result.finalState.step &&
        checkpoint.substep === result.finalState.substep &&
        checkpoint.time === result.finalState.time,
    });
  });
  const finalCheckpoint = checkpoints.at(-1);
  if (
    !finalCheckpoint?.terminal ||
    finalCheckpoint.eventCursor !== events.length
  ) {
    throw new Error(
      'final checkpoint must cover the terminal state and event log'
    );
  }

  const counts = {
    spawn: 0,
    contact_enter: 0,
    contact_exit: 0,
    escape: 0,
    terminal: 0,
  };
  for (const event of events) counts[event.kind] += 1;
  return {
    events,
    checkpoints,
    summary: {
      status: 'terminated',
      steps: result.finalState.step,
      simulatedDuration: result.finalState.time,
      eventCount: events.length,
      counts,
      terminalReason: result.finalState.terminalReason,
      solverDigest: result.digest,
      finalStateDigest: await digestCanonicalJson(result.finalState),
    },
  };
}

export const simulationRunManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    productionMode: z.literal('simulation_short'),
    family: z.literal('ring_escape'),
    solver: z.literal('ring_escape/v1'),
    digestAlgorithm: z.literal('sha256'),
    scenarioDigest: digest,
    eventLogDigest: digest,
    checkpointsDigest: digest,
    summaryDigest: digest,
    compiledSourceDigest: digest,
    audioPlanDigest: digest,
    runDigest: digest,
    summary: z.record(z.string(), z.unknown()),
  })
  .strict();
export type SimulationRunManifest = z.infer<typeof simulationRunManifestSchema>;

/**
 * Compact, persisted proof that the trusted solver reached the terminal state.
 * The full event and checkpoint streams live as renderer artifacts; keeping
 * only their signed-by-digest lineage in chat.parts avoids turning D1 rows
 * into a second artifact store.
 */
export interface AnimationSimulationEvidence {
  schemaVersion: 1;
  family: 'ring_escape';
  solver: 'ring_escape/v1';
  seed: number;
  fixedDt: number;
  substeps: number;
  terminalReason: 'escaped';
  simulatedDuration: number;
  eventCount: number;
  checkpointCount: number;
  solverDigest: string;
  /** SHA-256 of the exact trusted Python submitted to the renderer. */
  compiledSourceDigest: string;
  /** SHA-256 of the canonical deterministic audio plan artifact. */
  audioPlanDigest: string;
  /** SHA-256 of the reviewed formal MP4, populated only after delivery. */
  videoDigest?: string;
  manifest: SimulationRunManifest;
}

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

function canonicalize(value: unknown, path = '$'): CanonicalValue {
  if (value === null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError(`Non-finite number at ${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value))
    return value.map((entry, index) =>
      canonicalize(entry, `${path}[${index}]`)
    );
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError(`Non-plain object at ${path}`);
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key], `${path}.${key}`)])
    );
  }
  throw new TypeError(`Unsupported canonical JSON value at ${path}`);
}

export function stableCanonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export async function digestCanonicalJson(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableCanonicalJson(value));
  return digestBytes(bytes);
}

async function digestBytes(bytes: Uint8Array): Promise<string> {
  // Copy into an owned ArrayBuffer. TypeScript otherwise keeps the wider
  // ArrayBufferLike type (which includes SharedArrayBuffer), while WebCrypto
  // accepts BufferSource backed by ArrayBuffer only.
  const buffer = Uint8Array.from(bytes).buffer;
  const hash = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/** SHA-256 of exact UTF-8 text; unlike digestCanonicalJson this adds no JSON quoting. */
export async function digestUtf8Text(value: string): Promise<string> {
  return digestBytes(new TextEncoder().encode(value));
}

export async function buildSimulationRunManifest(params: {
  scenario: unknown;
  result: unknown;
  compiledSourceDigest: string;
  audioPlanDigest: string;
}): Promise<SimulationRunManifest> {
  const scenario = ringEscapeScenarioConfigSchema.parse(params.scenario);
  const compiledSourceDigest = digest.parse(params.compiledSourceDigest);
  const audioPlanDigest = digest.parse(params.audioPlanDigest);
  const run = await adaptRingEscapeSolverResult({
    scenario,
    result: params.result,
  });
  const scenarioDigest = await digestCanonicalJson(scenario);
  const eventLogDigest = await digestCanonicalJson(run.events);
  const checkpointsDigest = await digestCanonicalJson(run.checkpoints);
  const summaryDigest = await digestCanonicalJson(run.summary);
  const identity = {
    schemaVersion: 1,
    productionMode: 'simulation_short',
    family: 'ring_escape',
    solver: 'ring_escape/v1',
    scenarioDigest,
    eventLogDigest,
    checkpointsDigest,
    summaryDigest,
    compiledSourceDigest,
    audioPlanDigest,
  } as const;
  return simulationRunManifestSchema.parse({
    ...identity,
    digestAlgorithm: 'sha256',
    runDigest: await digestCanonicalJson(identity),
    summary: run.summary,
  });
}
