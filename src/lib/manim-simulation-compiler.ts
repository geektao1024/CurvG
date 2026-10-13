import {
  digestRingEscapeResult,
  type RingEscapeConfig,
  type RingEscapeEvent,
  type RingEscapeResult,
  type RingEscapeVec2,
} from './simulation-ring-escape';

export interface RingEscapeSimulationCompileOptions {
  /** Formal Shorts output must remain between six and twelve seconds. */
  durationSeconds?: number;
  /** A short, static title. It is created before playback, never in a callback. */
  title?: string;
}

interface TrackPoint {
  time: number;
  position: RingEscapeVec2;
  event?: RingEscapeEvent;
}

interface MotionSegment {
  from: TrackPoint;
  to: TrackPoint;
  elapsed: number;
}

export interface RingEscapeTimelineBudget {
  fps: 30;
  requestedDurationSeconds: number;
  targetFrames: number;
  totalFrames: number;
  actualDurationSeconds: number;
  revealFrames: number;
  eventTransitionFrames: number;
  eventTransitionCount: number;
  motionFrames: number;
  motionSegmentFrames: number[];
  payoffFrames: number;
  payoffHoldFrames: number;
}

export interface RingEscapeEventFrame {
  sequence: number;
  type: RingEscapeEvent['type'];
  /** First output frame whose transition communicates this event. */
  frame: number;
}

export interface RingEscapeReplayPlan {
  timeline: RingEscapeTimelineBudget;
  eventFrames: RingEscapeEventFrame[];
}

const DEFAULT_DURATION_SECONDS = 8;
const MIN_DURATION_SECONDS = 6;
const MAX_DURATION_SECONDS = 12;
const MAX_EVENTS = 60;
const MAX_CHECKPOINTS = 72;
const MAX_SOURCE_BYTES = 60_000;
const FRAME_RATE = 30;
const BASE_SCENE_SCALE = 1.4;
const REVEAL_SECONDS = 0.8;
const EVENT_TRANSITION_SECONDS = 0.16;
const PAYOFF_SECONDS = 0.7;
const PAYOFF_HOLD_SECONDS = 0.5;
const MIN_MOTION_SECONDS = 2;

/** Static 9:16 layout contract. Text and the arena occupy disjoint bands. */
export const RING_ESCAPE_SHORT_LAYOUT = Object.freeze({
  frameWidth: 9,
  frameHeight: 16,
  safeTopY: 6.4,
  safeBottomY: -5.6,
  maxTextWidth: 7.4,
  arenaCenterY: 0,
  arenaMaxRadius: 3.15,
  titleY: 5.7,
  digestBadgeY: 5.12,
  payoffY: 4.15,
  statusY: -4.3,
  counterY: -4.92,
});

function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
  return value;
}

function pythonNumber(value: number): string {
  finite('simulation coordinate', value);
  const rounded = Number(value.toFixed(6));
  return String(Object.is(rounded, -0) ? 0 : rounded);
}

function pythonString(value: string): string {
  return JSON.stringify(value);
}

function scenePoint(position: RingEscapeVec2, sceneScale: number): string {
  return `[${pythonNumber(position[0] * sceneScale)}, ${pythonNumber(
    position[1] * sceneScale + RING_ESCAPE_SHORT_LAYOUT.arenaCenterY
  )}, 0]`;
}

function cleanTitle(value: string | undefined): string {
  const title = (value ?? 'RING ESCAPE').replace(/\s+/g, ' ').trim();
  if (!title || title.length > 48) {
    throw new Error('title must contain 1-48 characters');
  }
  if (
    title.startsWith('/') ||
    title.startsWith('~') ||
    title.includes('../') ||
    title.includes('..\\') ||
    title.includes('://')
  ) {
    throw new Error('title must not contain a path or URL');
  }
  return title;
}

function withoutDigest(
  result: RingEscapeResult
): Omit<RingEscapeResult, 'digest'> {
  const { digest: _digest, ...unsigned } = result;
  return unsigned;
}

function validateResult(result: RingEscapeResult): void {
  if (result.solver !== 'ring_escape/v1') {
    throw new Error('unsupported ring escape solver');
  }
  if (result.finalState.terminalReason !== 'escaped') {
    throw new Error(
      'ring escape Short requires a verified escaped terminal state'
    );
  }
  if (result.events.length < 3 || result.events.length > MAX_EVENTS) {
    throw new Error(`ring escape event count must be in [3, ${MAX_EVENTS}]`);
  }
  if (result.checkpoints.length < 2) {
    throw new Error('ring escape result requires at least two checkpoints');
  }
  if (result.events[0]?.type !== 'spawn') {
    throw new Error('ring escape event log must start with spawn');
  }
  const terminal = result.events.at(-1);
  if (terminal?.type !== 'terminal' || terminal.reason !== 'escaped') {
    throw new Error('ring escape event log must end with terminal:escaped');
  }
  for (let index = 0; index < result.events.length; index += 1) {
    const event = result.events[index];
    if (event.sequence !== index) {
      throw new Error('ring escape event sequence is not contiguous');
    }
    finite('event.time', event.time);
    finite('event.position.x', event.position[0]);
    finite('event.position.y', event.position[1]);
  }
  const expectedDigest = digestRingEscapeResult(withoutDigest(result));
  if (result.digest !== expectedDigest) {
    throw new Error('ring escape result digest does not match its payload');
  }
}

function selectCheckpoints(result: RingEscapeResult) {
  if (result.checkpoints.length <= MAX_CHECKPOINTS) return result.checkpoints;
  const selected = [];
  const lastIndex = result.checkpoints.length - 1;
  for (let index = 0; index < MAX_CHECKPOINTS; index += 1) {
    selected.push(
      result.checkpoints[
        Math.round((index * lastIndex) / (MAX_CHECKPOINTS - 1))
      ]
    );
  }
  return selected;
}

function buildTrack(result: RingEscapeResult): TrackPoint[] {
  const points: TrackPoint[] = [
    ...selectCheckpoints(result).map((checkpoint) => ({
      time: checkpoint.time,
      position: checkpoint.position,
    })),
    ...result.events.map((event) => ({
      time: event.time,
      position: event.position,
      event,
    })),
  ];
  points.sort(
    (left, right) =>
      left.time - right.time ||
      (left.event?.sequence ?? -1) - (right.event?.sequence ?? -1)
  );

  const merged: TrackPoint[] = [];
  for (const point of points) {
    const previous = merged.at(-1);
    if (
      previous &&
      Math.abs(previous.time - point.time) < 1e-9 &&
      previous.position[0] === point.position[0] &&
      previous.position[1] === point.position[1]
    ) {
      // At a shared snapshot, keep the latest canonical event. Same-time events
      // are still rendered separately from the event log below.
      if (point.event) previous.event = point.event;
      continue;
    }
    merged.push({ ...point });
  }
  return merged;
}

function buildMotionSegments(track: TrackPoint[]): MotionSegment[] {
  const segments: MotionSegment[] = [];
  for (let index = 1; index < track.length; index += 1) {
    const from = track[index - 1];
    const to = track[index];
    const elapsed = to.time - from.time;
    if (elapsed <= 1e-9) continue;
    segments.push({ from, to, elapsed });
  }
  if (segments.length === 0) {
    throw new Error('ring escape result requires a positive-duration track');
  }
  return segments;
}

function resolveDurationSeconds(value: number | undefined): number {
  const durationSeconds = value ?? DEFAULT_DURATION_SECONDS;
  finite('durationSeconds', durationSeconds);
  if (
    durationSeconds < MIN_DURATION_SECONDS ||
    durationSeconds > MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `durationSeconds must be in [${MIN_DURATION_SECONDS}, ${MAX_DURATION_SECONDS}]`
    );
  }
  return durationSeconds;
}

function distributeFrames(weights: number[], totalFrames: number): number[] {
  if (totalFrames < weights.length) {
    throw new Error(
      'motion budget cannot give every segment at least one frame'
    );
  }
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (!Number.isFinite(weightSum) || weightSum <= 0) {
    throw new Error('motion timeline weights must have a positive sum');
  }

  // Each self.play call must own at least one output frame. Allocate the rest
  // by largest remainder so integer frame rounding cannot grow the film.
  const remaining = totalFrames - weights.length;
  const quotas = weights.map((weight) => (weight / weightSum) * remaining);
  const frames = quotas.map((quota) => 1 + Math.floor(quota));
  const unassigned =
    totalFrames - frames.reduce((sum, value) => sum + value, 0);
  const order = quotas
    .map((quota, index) => ({ index, remainder: quota - Math.floor(quota) }))
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index
    );
  for (let index = 0; index < unassigned; index += 1) {
    frames[order[index].index] += 1;
  }
  return frames;
}

function createTimelinePlan(
  result: RingEscapeResult,
  durationSecondsOption?: number
): {
  track: TrackPoint[];
  segments: MotionSegment[];
  budget: RingEscapeTimelineBudget;
} {
  validateResult(result);
  const requestedDurationSeconds = resolveDurationSeconds(
    durationSecondsOption
  );
  const track = buildTrack(result);
  const segments = buildMotionSegments(track);
  const eventTransitionCount = result.events.length - 1;
  const targetFrames = Math.round(requestedDurationSeconds * FRAME_RATE);
  const revealFrames = Math.round(REVEAL_SECONDS * FRAME_RATE);
  const eventTransitionFrames = Math.round(
    EVENT_TRANSITION_SECONDS * FRAME_RATE
  );
  const payoffFrames = Math.round(PAYOFF_SECONDS * FRAME_RATE);
  const payoffHoldFrames = Math.round(PAYOFF_HOLD_SECONDS * FRAME_RATE);
  const fixedFrames =
    revealFrames +
    eventTransitionCount * eventTransitionFrames +
    payoffFrames +
    payoffHoldFrames;
  const motionFrames = targetFrames - fixedFrames;
  if (motionFrames < Math.ceil(MIN_MOTION_SECONDS * FRAME_RATE)) {
    throw new Error('event log is too dense for the requested Short duration');
  }
  const motionSegmentFrames = distributeFrames(
    segments.map((segment) => segment.elapsed),
    motionFrames
  );
  const totalFrames =
    fixedFrames +
    motionSegmentFrames.reduce((sum, frameCount) => sum + frameCount, 0);
  if (totalFrames !== targetFrames) {
    throw new Error('internal timeline frame allocation mismatch');
  }

  return {
    track,
    segments,
    budget: {
      fps: FRAME_RATE,
      requestedDurationSeconds,
      targetFrames,
      totalFrames,
      actualDurationSeconds: totalFrames / FRAME_RATE,
      revealFrames,
      eventTransitionFrames,
      eventTransitionCount,
      motionFrames,
      motionSegmentFrames,
      payoffFrames,
      payoffHoldFrames,
    },
  };
}

/**
 * Return the exact integer-frame budget emitted by the compiler. Manim rounds
 * every separate play/wait call to frames, so validating decimal seconds alone
 * is insufficient for a duration contract.
 */
export function buildRingEscapeTimelineBudget(
  result: RingEscapeResult,
  options: Pick<RingEscapeSimulationCompileOptions, 'durationSeconds'> = {}
): RingEscapeTimelineBudget {
  return createTimelinePlan(result, options.durationSeconds).budget;
}

/**
 * Resolve the canonical event log onto the exact integer-frame film timeline.
 * Visual labels and audio cues must both consume this map; neither subscriber
 * is allowed to independently infer event timing from solver seconds.
 */
export function buildRingEscapeReplayPlan(
  result: RingEscapeResult,
  options: Pick<RingEscapeSimulationCompileOptions, 'durationSeconds'> = {}
): RingEscapeReplayPlan {
  const { segments, budget } = createTimelinePlan(
    result,
    options.durationSeconds
  );
  const eventFrames: RingEscapeEventFrame[] = [
    { sequence: 0, type: result.events[0].type, frame: 0 },
  ];
  const meaningfulEvents = result.events.slice(1);
  let frame = budget.revealFrames;
  let eventIndex = 0;
  for (let index = 0; index < segments.length; index += 1) {
    frame += budget.motionSegmentFrames[index];
    while (
      eventIndex < meaningfulEvents.length &&
      meaningfulEvents[eventIndex].time <= segments[index].to.time + 1e-9
    ) {
      const event = meaningfulEvents[eventIndex];
      eventFrames.push({
        sequence: event.sequence,
        type: event.type,
        frame,
      });
      frame += budget.eventTransitionFrames;
      eventIndex += 1;
    }
  }
  while (eventIndex < meaningfulEvents.length) {
    const event = meaningfulEvents[eventIndex];
    eventFrames.push({
      sequence: event.sequence,
      type: event.type,
      frame,
    });
    frame += budget.eventTransitionFrames;
    eventIndex += 1;
  }
  if (
    eventFrames.length !== result.events.length ||
    frame + budget.payoffFrames + budget.payoffHoldFrames !== budget.totalFrames
  ) {
    throw new Error('internal replay event frame allocation mismatch');
  }
  return { timeline: budget, eventFrames };
}

function sceneScale(config: RingEscapeConfig): number {
  return Math.min(
    BASE_SCENE_SCALE,
    RING_ESCAPE_SHORT_LAYOUT.arenaMaxRadius / config.escapeBoundary.radius
  );
}

function frameDuration(frameCount: number): string {
  return `${frameCount} / ${FRAME_RATE}`;
}

function ringArcLines(
  config: RingEscapeConfig,
  resolvedSceneScale: number
): string[] {
  const colors = ['#34D399', '#38BDF8', '#A78BFA', '#F472B6'];
  const lines: string[] = [];
  const ringNames: string[] = [];
  for (let index = 0; index < config.rings.count; index += 1) {
    const name = `ring_${index}`;
    ringNames.push(name);
    const radius =
      (config.rings.firstRadius + config.rings.spacing * index) *
      resolvedSceneScale;
    const gapCenter =
      config.rings.gapCenterRadians +
      (config.rings.gapRotationPerRingRadians ?? 0) * index;
    const start = gapCenter + config.rings.gapWidthRadians / 2;
    const angle = Math.PI * 2 - config.rings.gapWidthRadians;
    lines.push(
      `        ${name} = Arc(radius=${pythonNumber(radius)}, start_angle=${pythonNumber(
        start
      )}, angle=${pythonNumber(angle)}, arc_center=[0, ${pythonNumber(
        RING_ESCAPE_SHORT_LAYOUT.arenaCenterY
      )}, 0], color=${pythonString(colors[index % colors.length])}, stroke_width=8)`
    );
  }

  const escapeRadius = config.escapeBoundary.radius * resolvedSceneScale;
  const escapeStart =
    config.escapeBoundary.gapCenterRadians +
    config.escapeBoundary.gapWidthRadians / 2;
  lines.push(
    `        escape_ring = Arc(radius=${pythonNumber(
      escapeRadius
    )}, start_angle=${pythonNumber(escapeStart)}, angle=${pythonNumber(
      Math.PI * 2 - config.escapeBoundary.gapWidthRadians
    )}, arc_center=[0, ${pythonNumber(
      RING_ESCAPE_SHORT_LAYOUT.arenaCenterY
    )}, 0], color="#F59E0B", stroke_width=10)`
  );
  lines.push(
    `        rings = VGroup(${[...ringNames, 'escape_ring'].join(', ')})`
  );
  return lines;
}

function eventLabel(event: RingEscapeEvent): string {
  if (event.type === 'spawn') return `SEEDED · ${event.seed}`;
  if (event.type === 'contact_enter') return `CONTACT · ${event.boundaryId}`;
  if (event.type === 'contact_exit') return `RELEASE · ${event.boundaryId}`;
  if (event.type === 'escape') return 'GAP FOUND · ESCAPE';
  if (event.type !== 'terminal') {
    throw new Error(`unsupported event type: ${String(event.type)}`);
  }
  return `TERMINAL · ${event.reason.toUpperCase()}`;
}

/**
 * Compile a trusted solver result into a self-contained Manim Short.
 *
 * The generated Python contains no simulation loop. Every particle position,
 * event label, and counter transition comes from the supplied canonical result.
 */
export function compileRingEscapeSimulationShort(
  result: RingEscapeResult,
  options: RingEscapeSimulationCompileOptions = {}
): string {
  const title = cleanTitle(options.title);
  const { track, segments, budget } = createTimelinePlan(
    result,
    options.durationSeconds
  );
  const replay = buildRingEscapeReplayPlan(result, options);
  const meaningfulEvents = result.events.slice(1);
  const resolvedSceneScale = sceneScale(result.config);

  const lines = [
    'from manim import *',
    'import numpy as np',
    '',
    'config.pixel_width = 1080',
    'config.pixel_height = 1920',
    'config.frame_width = 9',
    'config.frame_height = 16',
    'config.frame_rate = 30',
    '',
    `# solver_digest: ${result.digest}`,
    `# terminal_reason: ${result.finalState.terminalReason}`,
    `# event_count: ${result.events.length}`,
    `# checkpoint_count: ${result.checkpoints.length}`,
    `# seed: ${result.seed}`,
    `# timeline_frames: ${budget.totalFrames}`,
    `# timeline_seconds: ${pythonNumber(budget.actualDurationSeconds)}`,
    '',
    'class CurvGScene(Scene):',
    '    def construct(self):',
    '        self.camera.background_color = "#05070D"',
    `        title = Text(${pythonString(title)}, font_size=42, weight=BOLD, color="#F8FAFC")`,
    `        if title.width > ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)}:`,
    `            title.scale_to_fit_width(${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)})`,
    `        title.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.titleY)}, 0])`,
    `        digest_badge = Text(${pythonString(
      `RUN ${result.digest.slice(-8).toUpperCase()}`
    )}, font_size=19, color="#64748B")`,
    `        digest_badge.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.digestBadgeY)}, 0])`,
    ...ringArcLines(result.config, resolvedSceneScale),
    `        particle = VGroup(Dot(point=${scenePoint(
      track[0].position,
      resolvedSceneScale
    )}, radius=0.16, color="#F8FAFC"), Circle(radius=0.28, color="#FDE047", stroke_width=4).move_to(${scenePoint(
      track[0].position,
      resolvedSceneScale
    )}))`,
    `        status = Text(${pythonString(
      eventLabel(result.events[0])
    )}, font_size=26, weight=BOLD, color="#FDE047")`,
    `        if status.width > ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)}:`,
    `            status.scale_to_fit_width(${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)})`,
    `        status.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.statusY)}, 0])`,
    `        counter = Text(${pythonString(
      `EVENT 01 / ${String(result.events.length).padStart(2, '0')}`
    )}, font_size=21, color="#94A3B8")`,
    `        counter.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.counterY)}, 0])`,
  ];

  for (let index = 0; index < meaningfulEvents.length; index += 1) {
    const event = meaningfulEvents[index];
    lines.push(
      `        status_${index} = Text(${pythonString(
        eventLabel(event)
      )}, font_size=26, weight=BOLD, color=${
        event.type === 'escape' || event.type === 'terminal'
          ? '"#34D399"'
          : '"#FDE047"'
      })`,
      `        if status_${index}.width > ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)}:`,
      `            status_${index}.scale_to_fit_width(${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.maxTextWidth)})`,
      `        status_${index}.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.statusY)}, 0])`,
      `        counter_${index} = Text(${pythonString(
        `EVENT ${String(event.sequence + 1).padStart(2, '0')} / ${String(
          result.events.length
        ).padStart(2, '0')}`
      )}, font_size=21, color="#94A3B8")`,
      `        counter_${index}.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.counterY)}, 0])`
    );
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    lines.push(
      `        trail_${index} = Line(${scenePoint(
        segment.from.position,
        resolvedSceneScale
      )}, ${scenePoint(
        segment.to.position,
        resolvedSceneScale
      )}, color="#38BDF8", stroke_width=3, stroke_opacity=0.72)`
    );
  }

  lines.push(
    '        # Put the causal subject on frame zero. Fading the entire arena from',
    '        # black makes the first decoded frame fail deterministic contrast QA.',
    '        self.add(rings, particle)',
    `        self.play(FadeIn(title), FadeIn(digest_badge), FadeIn(status), FadeIn(counter), run_time=${frameDuration(budget.revealFrames)})`
  );

  let eventIndex = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    lines.push(
      `        self.play(Create(trail_${index}), particle.animate.move_to(${scenePoint(
        segment.to.position,
        resolvedSceneScale
      )}), run_time=${frameDuration(budget.motionSegmentFrames[index])}, rate_func=linear)`
    );
    while (
      eventIndex < meaningfulEvents.length &&
      meaningfulEvents[eventIndex].time <= segment.to.time + 1e-9
    ) {
      lines.push(
        `        self.play(Transform(status, status_${eventIndex}), Transform(counter, counter_${eventIndex}), run_time=${frameDuration(budget.eventTransitionFrames)})`
      );
      eventIndex += 1;
    }
  }
  while (eventIndex < meaningfulEvents.length) {
    lines.push(
      `        self.play(Transform(status, status_${eventIndex}), Transform(counter, counter_${eventIndex}), run_time=${frameDuration(budget.eventTransitionFrames)})`
    );
    eventIndex += 1;
  }
  lines.push(
    '        payoff = Text("ESCAPED", font_size=54, weight=BOLD, color="#34D399")',
    `        payoff.move_to([0, ${pythonNumber(RING_ESCAPE_SHORT_LAYOUT.payoffY)}, 0])`,
    '        payoff_box = SurroundingRectangle(payoff, color="#34D399", buff=0.22, corner_radius=0.12)',
    `        self.play(FadeIn(payoff), Create(payoff_box), Indicate(particle, color="#34D399"), run_time=${frameDuration(budget.payoffFrames)})`,
    `        self.wait(${frameDuration(budget.payoffHoldFrames)})`
  );

  const source = `${lines.join('\n')}\n`;
  if (
    replay.timeline.totalFrames !== budget.totalFrames ||
    replay.eventFrames.length !== result.events.length
  ) {
    throw new Error('compiled replay plan does not match the scene timeline');
  }
  if (new TextEncoder().encode(source).byteLength >= MAX_SOURCE_BYTES) {
    throw new Error(
      `compiled simulation source must stay below ${MAX_SOURCE_BYTES} bytes`
    );
  }
  return source;
}
