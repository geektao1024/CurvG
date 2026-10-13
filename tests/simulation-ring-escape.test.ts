import assert from 'node:assert/strict';
import test from 'node:test';

import {
  solveRingEscape,
  VERIFIED_RING_ESCAPE_CONFIG,
  type RingEscapeConfig,
  type RingEscapeEvent,
} from '../src/lib/simulation-ring-escape';

type ContactEvent = Extract<
  RingEscapeEvent,
  { type: 'contact_enter' | 'contact_exit' }
>;

function isContactEvent(event: RingEscapeEvent): event is ContactEvent {
  return event.type === 'contact_enter' || event.type === 'contact_exit';
}

function baseConfig(): RingEscapeConfig {
  return {
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
}

test('ring escape is a stable seeded fixed-step simulation', () => {
  const first = solveRingEscape(baseConfig());
  const second = solveRingEscape(baseConfig());

  assert.deepEqual(first, second);
  assert.match(first.digest, /^fnv1a64:[0-9a-f]{16}$/);
  assert.equal(first.fixedDt, 0.1);
  assert.equal(first.substeps, 4);
  assert.equal(first.finalState.terminalReason, 'escaped');
  assert.deepEqual(
    first.events.map((event) => event.type),
    ['spawn', 'escape', 'terminal']
  );
  assert.equal(first.events[0]?.type, 'spawn');
  if (first.events[0]?.type === 'spawn') {
    assert.notEqual(first.events[0].seedSample, 0);
    assert.notEqual(first.events[0].appliedJitterRadians, 0);
  }
  assert.equal(first.checkpoints[0]?.step, 0);
  assert.equal(first.checkpoints.at(-1)?.eventCursor, first.events.length);
});

test('exported verified config is escaped and digest covers its complete result', () => {
  const result = solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG);

  assert.equal(result.finalState.terminalReason, 'escaped');
  assert.equal(result.events.at(-2)?.type, 'escape');
  assert.equal(result.events.at(-1)?.type, 'terminal');
  assert.match(result.digest, /^fnv1a64:[0-9a-f]{16}$/);
  assert.deepEqual(result.config, {
    ...VERIFIED_RING_ESCAPE_CONFIG,
    rings: {
      ...VERIFIED_RING_ESCAPE_CONFIG.rings,
      gapRotationPerRingRadians: 0,
    },
  });
});

test('solid ring contact reflects at constant speed and is de-duplicated until exit', () => {
  const config = baseConfig();
  config.rings = {
    count: 1,
    firstRadius: 1,
    spacing: 0.5,
    gapCenterRadians: Math.PI,
    gapWidthRadians: 0.5,
  };
  config.escapeBoundary = {
    radius: 2,
    gapCenterRadians: Math.PI,
    gapWidthRadians: 0.5,
  };
  config.initial.jitterRadians = 0;
  config.limits.maxSteps = 80;

  const result = solveRingEscape(config);
  const contacts = result.events.filter(isContactEvent);

  assert.equal(result.finalState.terminalReason, 'escaped');
  assert.deepEqual(
    contacts.map((event) => [event.type, event.contactId]),
    [
      ['contact_enter', 'particle:ring:0000'],
      ['contact_exit', 'particle:ring:0000'],
    ]
  );
  assert.deepEqual(
    result.events.slice(-2).map((event) => event.type),
    ['escape', 'terminal']
  );

  for (const snapshot of [...result.events, ...result.checkpoints]) {
    assert.ok(
      Math.abs(Math.hypot(snapshot.velocity[0], snapshot.velocity[1]) - 1) <
        1e-10
    );
  }
});

test('changing the seed changes the mechanically applied initial perturbation and digest', () => {
  const firstConfig = baseConfig();
  const secondConfig = baseConfig();
  secondConfig.seed += 1;

  const first = solveRingEscape(firstConfig);
  const second = solveRingEscape(secondConfig);

  assert.notEqual(first.events[0], undefined);
  assert.notDeepEqual(first.events[0], second.events[0]);
  assert.notEqual(first.digest, second.digest);
});

test('limits terminate deterministically and preserve a final checkpoint', () => {
  const config = baseConfig();
  config.initial.speed = 0.1;
  config.limits.maxSteps = 2;
  config.checkpointEverySteps = 1;

  const result = solveRingEscape(config);

  assert.equal(result.finalState.terminalReason, 'max_steps');
  assert.equal(result.events.at(-1)?.type, 'terminal');
  assert.equal(result.checkpoints.at(-1)?.time, 0.2);
  assert.equal(result.checkpoints.at(-1)?.eventCursor, result.events.length);
});

test('invalid geometry and unsafe limits are rejected before simulation', () => {
  const config = baseConfig();
  config.escapeBoundary.radius = 1;
  assert.throws(
    () => solveRingEscape(config),
    /escapeBoundary\.radius must be outside every ring/
  );

  const eventConfig = baseConfig();
  eventConfig.limits.maxEvents = 3;
  assert.throws(
    () => solveRingEscape(eventConfig),
    /limits\.maxEvents must be an integer/
  );
});
