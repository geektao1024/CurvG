/**
 * Trusted deterministic solver for the first `simulation_short` scene.
 *
 * The model may describe or style this scene, but it must never produce the
 * physical state or event stream. Animation and audio consume this result.
 *
 * Same-substep mutation rule:
 * 1. Release contacts that were already separated at substep start, ordered by
 *    contactId.
 * 2. Sweep the remaining motion and resolve the earliest boundary crossing.
 *    Equal-time crossings are ordered by the stable boundary id.
 * 3. A solid crossing emits at most one contact_enter for its active contactId,
 *    reflects the velocity, and continues with the remaining substep time.
 * 4. A gap crossing is transparent. Crossing the escape boundary through its
 *    explicit gap emits escape then terminal; no later mutation is permitted.
 */

export type RingEscapeVec2 = readonly [number, number];

export interface RingEscapeConfig {
  fixedDt: number;
  substeps: number;
  seed: number;
  initial: {
    position: RingEscapeVec2;
    speed: number;
    headingRadians: number;
    jitterRadians: number;
  };
  rings: {
    count: number;
    firstRadius: number;
    spacing: number;
    gapCenterRadians: number;
    gapWidthRadians: number;
    gapRotationPerRingRadians?: number;
  };
  escapeBoundary: {
    radius: number;
    gapCenterRadians: number;
    gapWidthRadians: number;
  };
  checkpointEverySteps: number;
  limits: {
    maxSteps: number;
    maxEvents: number;
    maxCrossingsPerSubstep: number;
    maxPositionMagnitude: number;
  };
}

export type RingEscapeTerminalReason =
  | 'escaped'
  | 'max_steps'
  | 'event_limit'
  | 'crossing_limit'
  | 'position_limit';

interface EventBase {
  sequence: number;
  step: number;
  substep: number;
  time: number;
  position: RingEscapeVec2;
  velocity: RingEscapeVec2;
}

export type RingEscapeEvent =
  | (EventBase & {
      type: 'spawn';
      seed: number;
      seedSample: number;
      appliedJitterRadians: number;
    })
  | (EventBase & {
      type: 'contact_enter' | 'contact_exit';
      contactId: string;
      boundaryId: string;
    })
  | (EventBase & {
      type: 'escape';
      boundaryId: 'escape';
    })
  | (EventBase & {
      type: 'terminal';
      reason: RingEscapeTerminalReason;
    });

export interface RingEscapeCheckpoint {
  step: number;
  substep: number;
  time: number;
  position: RingEscapeVec2;
  velocity: RingEscapeVec2;
  activeContactIds: string[];
  eventCursor: number;
}

export interface RingEscapeResult {
  solver: 'ring_escape/v1';
  config: RingEscapeConfig;
  seed: number;
  fixedDt: number;
  substeps: number;
  events: RingEscapeEvent[];
  checkpoints: RingEscapeCheckpoint[];
  finalState: {
    position: RingEscapeVec2;
    velocity: RingEscapeVec2;
    step: number;
    substep: number;
    time: number;
    terminalReason: RingEscapeTerminalReason;
  };
  digest: string;
}

/**
 * A verified, short-running fixture for pipeline integration and health checks.
 * It deterministically exits through aligned gaps without solid contact.
 */
export const VERIFIED_RING_ESCAPE_CONFIG: Readonly<RingEscapeConfig> = {
  fixedDt: 0.1,
  substeps: 4,
  seed: 0x5eed1234,
  initial: {
    position: [0, 0],
    speed: 1,
    headingRadians: 0,
    jitterRadians: 0.002,
  },
  rings: {
    count: 3,
    firstRadius: 0.5,
    spacing: 0.5,
    gapCenterRadians: 0,
    gapWidthRadians: 0.3,
  },
  escapeBoundary: {
    radius: 2,
    gapCenterRadians: 0,
    gapWidthRadians: 0.3,
  },
  checkpointEverySteps: 5,
  limits: {
    maxSteps: 100,
    maxEvents: 100,
    maxCrossingsPerSubstep: 8,
    maxPositionMagnitude: 10,
  },
};

interface Boundary {
  id: string;
  contactId: string;
  radius: number;
  gapCenterRadians: number;
  gapWidthRadians: number;
  escape: boolean;
}

interface Crossing {
  boundary: Boundary;
  fraction: number;
  point: [number, number];
  normal: [number, number];
}

const TAU = Math.PI * 2;
const ROOT_EPSILON = 1e-10;
const CONTACT_RELEASE_EPSILON = 1e-8;
const NUMBER_PRECISION = 12;

function finite(name: string, value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
  return value;
}

function positive(name: string, value: number): number {
  finite(name, value);
  if (value <= 0) {
    throw new Error(`${name} must be greater than zero`);
  }
  return value;
}

function integerInRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer in [${minimum}, ${maximum}]`);
  }
  return value;
}

function validateGap(name: string, width: number): number {
  positive(name, width);
  if (width >= TAU) {
    throw new Error(`${name} must be smaller than 2*pi`);
  }
  return width;
}

function magnitude(vector: RingEscapeVec2): number {
  return Math.hypot(vector[0], vector[1]);
}

function dot(a: RingEscapeVec2, b: RingEscapeVec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

function rounded(value: number): number {
  const result = Number(value.toFixed(NUMBER_PRECISION));
  return Object.is(result, -0) ? 0 : result;
}

function vectorSnapshot(vector: RingEscapeVec2): RingEscapeVec2 {
  return [rounded(vector[0]), rounded(vector[1])];
}

function normalizeAngle(angle: number): number {
  const normalized = ((((angle + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return normalized === -Math.PI ? Math.PI : normalized;
}

function isInsideGap(point: RingEscapeVec2, boundary: Boundary): boolean {
  const angle = Math.atan2(point[1], point[0]);
  return (
    Math.abs(normalizeAngle(angle - boundary.gapCenterRadians)) <=
    boundary.gapWidthRadians / 2 + ROOT_EPSILON
  );
}

/** Mulberry32: a small, explicit 32-bit generator used only by this solver. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function buildBoundaries(config: RingEscapeConfig): Boundary[] {
  const boundaries: Boundary[] = [];
  for (let index = 0; index < config.rings.count; index += 1) {
    const suffix = index.toString().padStart(4, '0');
    boundaries.push({
      id: `ring:${suffix}`,
      contactId: `particle:ring:${suffix}`,
      radius: config.rings.firstRadius + config.rings.spacing * index,
      gapCenterRadians:
        config.rings.gapCenterRadians +
        (config.rings.gapRotationPerRingRadians ?? 0) * index,
      gapWidthRadians: config.rings.gapWidthRadians,
      escape: false,
    });
  }
  boundaries.push({
    id: 'escape',
    contactId: 'particle:escape',
    radius: config.escapeBoundary.radius,
    gapCenterRadians: config.escapeBoundary.gapCenterRadians,
    gapWidthRadians: config.escapeBoundary.gapWidthRadians,
    escape: true,
  });
  return boundaries;
}

function validateConfig(config: RingEscapeConfig): void {
  positive('fixedDt', config.fixedDt);
  if (config.fixedDt > 1) {
    throw new Error('fixedDt must not exceed one second');
  }
  integerInRange('substeps', config.substeps, 1, 10_000);
  if (
    !Number.isInteger(config.seed) ||
    config.seed < 0 ||
    config.seed > 0xffffffff
  ) {
    throw new Error('seed must be an unsigned 32-bit integer');
  }
  finite('initial.position.x', config.initial.position[0]);
  finite('initial.position.y', config.initial.position[1]);
  positive('initial.speed', config.initial.speed);
  finite('initial.headingRadians', config.initial.headingRadians);
  finite('initial.jitterRadians', config.initial.jitterRadians);
  if (
    config.initial.jitterRadians < 0 ||
    config.initial.jitterRadians > Math.PI
  ) {
    throw new Error('initial.jitterRadians must be in [0, pi]');
  }
  integerInRange('rings.count', config.rings.count, 1, 10_000);
  positive('rings.firstRadius', config.rings.firstRadius);
  positive('rings.spacing', config.rings.spacing);
  finite('rings.gapCenterRadians', config.rings.gapCenterRadians);
  validateGap('rings.gapWidthRadians', config.rings.gapWidthRadians);
  finite(
    'rings.gapRotationPerRingRadians',
    config.rings.gapRotationPerRingRadians ?? 0
  );
  positive('escapeBoundary.radius', config.escapeBoundary.radius);
  finite(
    'escapeBoundary.gapCenterRadians',
    config.escapeBoundary.gapCenterRadians
  );
  validateGap(
    'escapeBoundary.gapWidthRadians',
    config.escapeBoundary.gapWidthRadians
  );
  integerInRange(
    'checkpointEverySteps',
    config.checkpointEverySteps,
    1,
    1_000_000
  );
  integerInRange('limits.maxSteps', config.limits.maxSteps, 1, 10_000_000);
  integerInRange('limits.maxEvents', config.limits.maxEvents, 4, 10_000_000);
  integerInRange(
    'limits.maxCrossingsPerSubstep',
    config.limits.maxCrossingsPerSubstep,
    1,
    100_000
  );
  positive('limits.maxPositionMagnitude', config.limits.maxPositionMagnitude);

  const lastRingRadius =
    config.rings.firstRadius + config.rings.spacing * (config.rings.count - 1);
  if (config.escapeBoundary.radius <= lastRingRadius) {
    throw new Error('escapeBoundary.radius must be outside every ring');
  }
  if (magnitude(config.initial.position) >= config.rings.firstRadius) {
    throw new Error('initial.position must be inside the first ring');
  }
  if (config.escapeBoundary.radius >= config.limits.maxPositionMagnitude) {
    throw new Error(
      'limits.maxPositionMagnitude must be larger than escapeBoundary.radius'
    );
  }
}

function firstCrossing(
  position: RingEscapeVec2,
  displacement: RingEscapeVec2,
  boundaries: Boundary[]
): Crossing | undefined {
  const a = dot(displacement, displacement);
  if (a <= ROOT_EPSILON * ROOT_EPSILON) return undefined;

  const candidates: Crossing[] = [];
  for (const boundary of boundaries) {
    const b = 2 * dot(position, displacement);
    const c = dot(position, position) - boundary.radius * boundary.radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < -ROOT_EPSILON) continue;
    const root = Math.sqrt(Math.max(0, discriminant));
    for (const fraction of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
      if (fraction <= ROOT_EPSILON || fraction > 1 + ROOT_EPSILON) continue;
      const boundedFraction = Math.min(1, fraction);
      const point: [number, number] = [
        position[0] + displacement[0] * boundedFraction,
        position[1] + displacement[1] * boundedFraction,
      ];
      const pointMagnitude = magnitude(point);
      if (pointMagnitude <= ROOT_EPSILON) continue;
      candidates.push({
        boundary,
        fraction: boundedFraction,
        point,
        normal: [point[0] / pointMagnitude, point[1] / pointMagnitude],
      });
    }
  }

  candidates.sort(
    (left, right) =>
      left.fraction - right.fraction ||
      left.boundary.id.localeCompare(right.boundary.id)
  );
  return candidates[0];
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

function fnv1a64(text: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

export function digestRingEscapeResult(
  result: Omit<RingEscapeResult, 'digest'>
): string {
  return `fnv1a64:${fnv1a64(stableStringify(result))}`;
}

export function solveRingEscape(config: RingEscapeConfig): RingEscapeResult {
  validateConfig(config);
  const resolvedConfig: RingEscapeConfig = {
    fixedDt: config.fixedDt,
    substeps: config.substeps,
    seed: config.seed,
    initial: {
      position: [config.initial.position[0], config.initial.position[1]],
      speed: config.initial.speed,
      headingRadians: config.initial.headingRadians,
      jitterRadians: config.initial.jitterRadians,
    },
    rings: {
      count: config.rings.count,
      firstRadius: config.rings.firstRadius,
      spacing: config.rings.spacing,
      gapCenterRadians: config.rings.gapCenterRadians,
      gapWidthRadians: config.rings.gapWidthRadians,
      gapRotationPerRingRadians: config.rings.gapRotationPerRingRadians ?? 0,
    },
    escapeBoundary: {
      radius: config.escapeBoundary.radius,
      gapCenterRadians: config.escapeBoundary.gapCenterRadians,
      gapWidthRadians: config.escapeBoundary.gapWidthRadians,
    },
    checkpointEverySteps: config.checkpointEverySteps,
    limits: {
      maxSteps: config.limits.maxSteps,
      maxEvents: config.limits.maxEvents,
      maxCrossingsPerSubstep: config.limits.maxCrossingsPerSubstep,
      maxPositionMagnitude: config.limits.maxPositionMagnitude,
    },
  };
  const boundaries = buildBoundaries(resolvedConfig);
  const boundaryByContactId = new Map(
    boundaries.map((boundary) => [boundary.contactId, boundary])
  );
  const random = createSeededRandom(config.seed);
  // The seed sample is always consumed, including when jitterRadians is zero.
  const seedSample = random();
  const appliedJitterRadians =
    (seedSample * 2 - 1) * config.initial.jitterRadians;
  const heading = config.initial.headingRadians + appliedJitterRadians;
  let position: [number, number] = [
    config.initial.position[0],
    config.initial.position[1],
  ];
  let velocity: [number, number] = [
    Math.cos(heading) * config.initial.speed,
    Math.sin(heading) * config.initial.speed,
  ];
  let currentStep = 0;
  let currentSubstep = 0;
  let currentTime = 0;
  let terminalReason: RingEscapeTerminalReason | undefined;
  const activeContactIds = new Set<string>();
  const events: RingEscapeEvent[] = [];
  const checkpoints: RingEscapeCheckpoint[] = [];

  const eventBase = (): EventBase => ({
    sequence: events.length,
    step: currentStep,
    substep: currentSubstep,
    time: rounded(currentTime),
    position: vectorSnapshot(position),
    velocity: vectorSnapshot(velocity),
  });

  const terminate = (reason: RingEscapeTerminalReason): void => {
    if (terminalReason) return;
    terminalReason = reason;
    events.push({ ...eventBase(), type: 'terminal', reason });
  };

  const reserveTerminalOrStop = (): boolean => {
    if (events.length < config.limits.maxEvents - 1) return true;
    terminate('event_limit');
    return false;
  };

  const checkpoint = (): void => {
    const next: RingEscapeCheckpoint = {
      step: currentStep,
      substep: currentSubstep,
      time: rounded(currentTime),
      position: vectorSnapshot(position),
      velocity: vectorSnapshot(velocity),
      activeContactIds: [...activeContactIds].sort(),
      eventCursor: events.length,
    };
    const previous = checkpoints.at(-1);
    if (
      previous?.step === next.step &&
      previous.substep === next.substep &&
      previous.time === next.time
    ) {
      checkpoints[checkpoints.length - 1] = next;
    } else {
      checkpoints.push(next);
    }
  };

  events.push({
    ...eventBase(),
    type: 'spawn',
    seed: config.seed,
    seedSample: rounded(seedSample),
    appliedJitterRadians: rounded(appliedJitterRadians),
  });
  checkpoint();

  const microDt = config.fixedDt / config.substeps;
  simulation: for (let step = 1; step <= config.limits.maxSteps; step += 1) {
    currentStep = step;
    for (let substep = 0; substep < config.substeps; substep += 1) {
      currentSubstep = substep;
      const substepStartTime = (step - 1) * config.fixedDt + substep * microDt;
      currentTime = substepStartTime;

      // Contact exits are snapshots of the pre-mutation state and are emitted
      // in stable contactId order before any new crossings in this substep.
      for (const contactId of [...activeContactIds].sort()) {
        const boundary = boundaryByContactId.get(contactId);
        if (!boundary) throw new Error(`unknown active contact: ${contactId}`);
        if (
          Math.abs(magnitude(position) - boundary.radius) >
          CONTACT_RELEASE_EPSILON
        ) {
          if (!reserveTerminalOrStop()) break simulation;
          events.push({
            ...eventBase(),
            type: 'contact_exit',
            contactId,
            boundaryId: boundary.id,
          });
          activeContactIds.delete(contactId);
        }
      }

      let remainingTime = microDt;
      let elapsedTime = 0;
      let crossings = 0;
      while (remainingTime > ROOT_EPSILON) {
        const displacement: RingEscapeVec2 = [
          velocity[0] * remainingTime,
          velocity[1] * remainingTime,
        ];
        const crossing = firstCrossing(position, displacement, boundaries);
        if (!crossing) {
          position = [
            position[0] + displacement[0],
            position[1] + displacement[1],
          ];
          elapsedTime += remainingTime;
          remainingTime = 0;
          currentTime = substepStartTime + elapsedTime;
          break;
        }

        crossings += 1;
        if (crossings > config.limits.maxCrossingsPerSubstep) {
          currentTime = substepStartTime + elapsedTime;
          terminate('crossing_limit');
          break simulation;
        }
        const timeToCrossing = remainingTime * crossing.fraction;
        elapsedTime += timeToCrossing;
        remainingTime -= timeToCrossing;
        currentTime = substepStartTime + elapsedTime;
        position = crossing.point;

        if (isInsideGap(position, crossing.boundary)) {
          if (crossing.boundary.escape) {
            if (!reserveTerminalOrStop()) break simulation;
            events.push({
              ...eventBase(),
              type: 'escape',
              boundaryId: 'escape',
            });
            terminate('escaped');
            break simulation;
          }
          continue;
        }

        const contactId = crossing.boundary.contactId;
        if (!activeContactIds.has(contactId)) {
          if (!reserveTerminalOrStop()) break simulation;
          events.push({
            ...eventBase(),
            type: 'contact_enter',
            contactId,
            boundaryId: crossing.boundary.id,
          });
          activeContactIds.add(contactId);
        }
        const radialSpeed = dot(velocity, crossing.normal);
        velocity = [
          velocity[0] - 2 * radialSpeed * crossing.normal[0],
          velocity[1] - 2 * radialSpeed * crossing.normal[1],
        ];
      }

      if (magnitude(position) > config.limits.maxPositionMagnitude) {
        terminate('position_limit');
        break simulation;
      }
    }

    if (step % config.checkpointEverySteps === 0) {
      currentSubstep = config.substeps - 1;
      currentTime = step * config.fixedDt;
      checkpoint();
    }
  }

  if (!terminalReason) {
    currentStep = config.limits.maxSteps;
    currentSubstep = config.substeps - 1;
    currentTime = config.limits.maxSteps * config.fixedDt;
    terminate('max_steps');
  }
  if (!terminalReason) {
    throw new Error('solver invariant violated: missing terminal reason');
  }
  checkpoint();

  const withoutDigest: Omit<RingEscapeResult, 'digest'> = {
    solver: 'ring_escape/v1',
    config: resolvedConfig,
    seed: config.seed,
    fixedDt: config.fixedDt,
    substeps: config.substeps,
    events,
    checkpoints,
    finalState: {
      position: vectorSnapshot(position),
      velocity: vectorSnapshot(velocity),
      step: currentStep,
      substep: currentSubstep,
      time: rounded(currentTime),
      terminalReason,
    },
  };
  return {
    ...withoutDigest,
    digest: digestRingEscapeResult(withoutDigest),
  };
}
