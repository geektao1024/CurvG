import { z } from 'zod';

import {
  canonicalSimulationEventSchema,
  digestCanonicalJson,
  stableCanonicalJson,
  type CanonicalSimulationEvent,
} from './animation-simulation';

export const RING_ESCAPE_AUDIO_FPS = 30 as const;
export const RING_ESCAPE_AUDIO_SAMPLE_RATE = 48_000 as const;
export const RING_ESCAPE_AUDIO_CHANNELS = 2 as const;
export const RING_ESCAPE_AUDIO_MIN_DURATION_FRAMES = 180 as const;
export const RING_ESCAPE_AUDIO_MAX_DURATION_FRAMES = 360 as const;
export const RING_ESCAPE_AUDIO_SAMPLES_PER_FRAME =
  RING_ESCAPE_AUDIO_SAMPLE_RATE / RING_ESCAPE_AUDIO_FPS;

export const RING_ESCAPE_AUDIO_EVENT_KINDS = [
  'spawn',
  'contact_enter',
  'contact_exit',
  'escape',
  'terminal',
] as const;

const audioEventKindSchema = z.enum(RING_ESCAPE_AUDIO_EVENT_KINDS);
export type RingEscapeAudioEventKind = z.infer<typeof audioEventKindSchema>;

const finite = z.number().finite();
const frameSchema = z
  .number()
  .int()
  .min(0)
  .max(RING_ESCAPE_AUDIO_MAX_DURATION_FRAMES - 1);

export const ringEscapeEventFrameSchema = z
  .object({
    seq: z.number().int().min(0),
    kind: audioEventKindSchema,
    frame: frameSchema,
  })
  .strict();
export type RingEscapeEventFrame = z.infer<typeof ringEscapeEventFrameSchema>;

interface CuePreset {
  gain: number;
  frequency: number;
  durationMs: number;
}

/**
 * Fixed synthesis instructions. Consumers can generate these tones directly;
 * the contract never names or depends on an external audio asset.
 */
const CUE_PRESETS = Object.freeze({
  spawn: Object.freeze({ gain: 0.18, frequency: 220, durationMs: 120 }),
  contact_enter: Object.freeze({
    gain: 0.42,
    frequency: 880,
    durationMs: 90,
  }),
  contact_exit: Object.freeze({
    gain: 0.24,
    frequency: 440,
    durationMs: 70,
  }),
  escape: Object.freeze({ gain: 0.58, frequency: 1_320, durationMs: 240 }),
  terminal: Object.freeze({
    gain: 0.5,
    frequency: 1_760,
    durationMs: 180,
  }),
}) satisfies Readonly<Record<RingEscapeAudioEventKind, CuePreset>>;

export const RING_ESCAPE_AUDIO_MAX_EVENTS = 256 as const;
export const RING_ESCAPE_AUDIO_MAX_CUES = 256 as const;

function frameToSampleIndex(frame: number): number {
  return Math.round(
    (frame * RING_ESCAPE_AUDIO_SAMPLE_RATE) / RING_ESCAPE_AUDIO_FPS
  );
}

export const ringEscapeAudioCueSchema = z
  .object({
    eventSeq: z
      .number()
      .int()
      .min(0)
      .max(RING_ESCAPE_AUDIO_MAX_EVENTS - 1),
    kind: audioEventKindSchema,
    frame: frameSchema,
    sampleIndex: z
      .number()
      .int()
      .min(0)
      .max(
        RING_ESCAPE_AUDIO_MAX_DURATION_FRAMES *
          RING_ESCAPE_AUDIO_SAMPLES_PER_FRAME -
          1
      ),
    gain: finite.min(0).max(1),
    frequency: finite.min(20).max(20_000),
    durationMs: finite.positive().max(1_000),
  })
  .strict();
export type RingEscapeAudioCue = z.infer<typeof ringEscapeAudioCueSchema>;

function clippedDurationMs(
  kind: RingEscapeAudioEventKind,
  frame: number,
  durationFrames: number
) {
  const presetSamples = Math.round(
    (CUE_PRESETS[kind].durationMs * RING_ESCAPE_AUDIO_SAMPLE_RATE) / 1_000
  );
  const remainingSamples =
    frameToSampleIndex(durationFrames) - frameToSampleIndex(frame);
  return (
    (Math.min(presetSamples, remainingSamples) * 1_000) /
    RING_ESCAPE_AUDIO_SAMPLE_RATE
  );
}

function cueIssue(
  context: z.RefinementCtx,
  index: number,
  field: keyof RingEscapeAudioCue,
  message: string
) {
  context.addIssue({
    code: 'custom',
    path: ['cues', index, field],
    message,
  });
}

export const ringEscapeAudioPlanSchema = z
  .object({
    schemaVersion: z.literal(1),
    family: z.literal('ring_escape'),
    fps: z.literal(RING_ESCAPE_AUDIO_FPS),
    sampleRate: z.literal(RING_ESCAPE_AUDIO_SAMPLE_RATE),
    channels: z.literal(RING_ESCAPE_AUDIO_CHANNELS),
    durationFrames: z
      .number()
      .int()
      .min(RING_ESCAPE_AUDIO_MIN_DURATION_FRAMES)
      .max(RING_ESCAPE_AUDIO_MAX_DURATION_FRAMES),
    cues: z
      .array(ringEscapeAudioCueSchema)
      .min(1)
      .max(RING_ESCAPE_AUDIO_MAX_CUES),
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.cues[0]?.kind !== 'spawn' || plan.cues[0].eventSeq !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['cues', 0],
        message: 'audio cues must start with event 0 spawn',
      });
    }

    let previousEventSeq = -1;
    let previousFrame = -1;
    let terminalCueCount = 0;
    plan.cues.forEach((cue, index) => {
      const preset = CUE_PRESETS[cue.kind];
      if (cue.eventSeq <= previousEventSeq) {
        cueIssue(
          context,
          index,
          'eventSeq',
          'cue event sequences must be strictly increasing'
        );
      }
      if (cue.frame < previousFrame) {
        cueIssue(context, index, 'frame', 'cue frames must be monotonic');
      }
      if (cue.frame >= plan.durationFrames) {
        cueIssue(
          context,
          index,
          'frame',
          'cue frame must be inside the audio duration'
        );
      }
      if (cue.sampleIndex !== frameToSampleIndex(cue.frame)) {
        cueIssue(
          context,
          index,
          'sampleIndex',
          'cue sampleIndex must equal frame * samplesPerFrame'
        );
      }
      if (cue.gain !== preset.gain) {
        cueIssue(context, index, 'gain', 'cue gain does not match its kind');
      }
      if (cue.frequency !== preset.frequency) {
        cueIssue(
          context,
          index,
          'frequency',
          'cue frequency does not match its kind'
        );
      }
      if (
        cue.durationMs !==
        clippedDurationMs(cue.kind, cue.frame, plan.durationFrames)
      ) {
        cueIssue(
          context,
          index,
          'durationMs',
          'cue duration does not match its kind and remaining audio bounds'
        );
      }
      if (cue.kind === 'terminal') terminalCueCount += 1;
      previousEventSeq = cue.eventSeq;
      previousFrame = cue.frame;
    });

    if (terminalCueCount > 1) {
      context.addIssue({
        code: 'custom',
        path: ['cues'],
        message: 'audio plan may contain at most one terminal cue',
      });
    }
    const terminalIndex = plan.cues.findIndex((cue) => cue.kind === 'terminal');
    if (terminalIndex >= 0 && terminalIndex !== plan.cues.length - 1) {
      context.addIssue({
        code: 'custom',
        path: ['cues', terminalIndex],
        message: 'terminal cue must be the last cue',
      });
    }
    const lastKind = plan.cues.at(-1)?.kind;
    if (lastKind !== 'escape' && lastKind !== 'terminal') {
      context.addIssue({
        code: 'custom',
        path: ['cues', plan.cues.length - 1],
        message: 'audio cues must end with escape or terminal',
      });
    }
  });
export type RingEscapeAudioPlan = z.infer<typeof ringEscapeAudioPlanSchema>;

export function parseRingEscapeAudioPlan(value: unknown): RingEscapeAudioPlan {
  return ringEscapeAudioPlanSchema.parse(value);
}

function validateSource(
  events: CanonicalSimulationEvent[],
  eventFrameMap: RingEscapeEventFrame[],
  durationFrames: number
) {
  if (events.length === 0 || events.length > RING_ESCAPE_AUDIO_MAX_EVENTS) {
    throw new Error(
      `canonical event count must be in [1, ${RING_ESCAPE_AUDIO_MAX_EVENTS}]`
    );
  }
  if (eventFrameMap.length !== events.length) {
    throw new Error('event frame map must contain exactly one entry per event');
  }
  if (events[0]?.kind !== 'spawn') {
    throw new Error('canonical event log must start with spawn');
  }
  if (events.at(-1)?.kind !== 'terminal') {
    throw new Error('canonical event log must end with terminal');
  }

  let previousFrame = -1;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const mapped = eventFrameMap[index];
    if (event.seq !== index) {
      throw new Error(
        'canonical event sequence must be contiguous and zero-based'
      );
    }
    if (mapped.seq !== event.seq || mapped.kind !== event.kind) {
      throw new Error('event frame map seq/kind must match canonical events');
    }
    if (mapped.frame < previousFrame) {
      throw new Error('event frame map frames must be monotonic');
    }
    if (mapped.frame >= durationFrames) {
      throw new Error('event frame map entry exceeds durationFrames');
    }
    if (index === 0 && mapped.frame !== 0) {
      throw new Error('spawn must map to frame zero');
    }
    if (event.kind === 'spawn' && index !== 0) {
      throw new Error('canonical event log must contain exactly one spawn');
    }
    if (event.kind === 'terminal' && index !== events.length - 1) {
      throw new Error(
        'canonical event log must contain exactly one terminal at the end'
      );
    }
    previousFrame = mapped.frame;
  }
}

function makeCue(
  event: CanonicalSimulationEvent,
  mapped: RingEscapeEventFrame,
  durationFrames: number
): RingEscapeAudioCue {
  const preset = CUE_PRESETS[event.kind];
  return {
    eventSeq: event.seq,
    kind: event.kind,
    frame: mapped.frame,
    sampleIndex: frameToSampleIndex(mapped.frame),
    gain: preset.gain,
    frequency: preset.frequency,
    durationMs: clippedDurationMs(event.kind, mapped.frame, durationFrames),
  };
}

function isEscapeTerminalPair(
  previous: CanonicalSimulationEvent | undefined,
  terminal: CanonicalSimulationEvent
): boolean {
  if (previous?.kind !== 'escape' || terminal.kind !== 'terminal') return false;
  return (
    (previous.step === terminal.step &&
      previous.substep === terminal.substep &&
      previous.time === terminal.time) ||
    terminal.payload.reason === 'escaped'
  );
}

/**
 * Mechanically map canonical simulation events to a bounded, deterministic
 * tone plan. The visual frame map remains exact: when the canonical terminal
 * directly confirms an escape, its later status-transition frame stays in the
 * map but its redundant audio cue is omitted.
 */
export function buildRingEscapeAudioPlan(params: {
  events: readonly unknown[];
  eventFrameMap: readonly unknown[];
  durationFrames: number;
}): RingEscapeAudioPlan {
  const events = z.array(canonicalSimulationEventSchema).parse(params.events);
  const eventFrameMap = z
    .array(ringEscapeEventFrameSchema)
    .parse(params.eventFrameMap);
  const durationFrames = z
    .number()
    .int()
    .min(RING_ESCAPE_AUDIO_MIN_DURATION_FRAMES)
    .max(RING_ESCAPE_AUDIO_MAX_DURATION_FRAMES)
    .parse(params.durationFrames);
  validateSource(events, eventFrameMap, durationFrames);

  const cues = events.flatMap((event, index) => {
    const mapped = eventFrameMap[index];
    if (
      event.kind === 'terminal' &&
      isEscapeTerminalPair(events[index - 1], event)
    ) {
      return [];
    }
    return [makeCue(event, mapped, durationFrames)];
  });

  return parseRingEscapeAudioPlan({
    schemaVersion: 1,
    family: 'ring_escape',
    fps: RING_ESCAPE_AUDIO_FPS,
    sampleRate: RING_ESCAPE_AUDIO_SAMPLE_RATE,
    channels: RING_ESCAPE_AUDIO_CHANNELS,
    durationFrames,
    cues,
  });
}

/** Canonical JSON bytes for storage, comparison, or renderer handoff. */
export function serializeRingEscapeAudioPlan(value: unknown): string {
  return stableCanonicalJson(parseRingEscapeAudioPlan(value));
}

/** SHA-256 over the same canonical JSON returned by the serializer. */
export async function digestRingEscapeAudioPlan(
  value: unknown
): Promise<string> {
  return digestCanonicalJson(parseRingEscapeAudioPlan(value));
}
