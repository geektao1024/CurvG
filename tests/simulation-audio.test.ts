import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptRingEscapeSolverResult,
  createDefaultRingEscapeScenarioConfig,
} from '../src/lib/animation-simulation';
import {
  buildRingEscapeAudioPlan,
  digestRingEscapeAudioPlan,
  parseRingEscapeAudioPlan,
  RING_ESCAPE_AUDIO_SAMPLES_PER_FRAME,
  serializeRingEscapeAudioPlan,
  type RingEscapeEventFrame,
} from '../src/lib/simulation-audio';
import { solveRingEscape } from '../src/lib/simulation-ring-escape';

async function fixture() {
  const scenario = createDefaultRingEscapeScenarioConfig({
    seed: 0x5eed1234,
  });
  const result = solveRingEscape(scenario.solverConfig);
  const run = await adaptRingEscapeSolverResult({ scenario, result });
  assert.deepEqual(
    run.events.map((event) => event.kind),
    ['spawn', 'contact_enter', 'contact_exit', 'escape', 'terminal']
  );
  const frames = [0, 72, 104, 214, 219];
  const eventFrameMap = run.events.map((event, index) => ({
    seq: event.seq,
    kind: event.kind,
    frame: frames[index],
  })) satisfies RingEscapeEventFrame[];
  return { events: run.events, eventFrameMap, durationFrames: 240 };
}

test('same canonical input produces byte-stable audio plan and digest', async () => {
  const input = await fixture();
  const first = buildRingEscapeAudioPlan(input);
  const second = buildRingEscapeAudioPlan(
    JSON.parse(JSON.stringify(input)) as typeof input
  );

  assert.equal(first.schemaVersion, 1);
  assert.equal(first.sampleRate, 48_000);
  assert.equal(first.channels, 2);
  assert.equal(first.durationFrames, 240);
  assert.equal(
    serializeRingEscapeAudioPlan(first),
    serializeRingEscapeAudioPlan(second)
  );
  assert.equal(
    await digestRingEscapeAudioPlan(first),
    await digestRingEscapeAudioPlan(second)
  );
  assert.match(await digestRingEscapeAudioPlan(first), /^[a-f0-9]{64}$/);
});

test('cue counts are event-derived and escaped terminal suppresses a second transient', async () => {
  const input = await fixture();
  const plan = buildRingEscapeAudioPlan(input);
  const eventCounts = Object.fromEntries(
    ['spawn', 'contact_enter', 'contact_exit', 'escape', 'terminal'].map(
      (kind) => [
        kind,
        input.events.filter((event) => event.kind === kind).length,
      ]
    )
  );
  const cueCounts = Object.fromEntries(
    ['spawn', 'contact_enter', 'contact_exit', 'escape', 'terminal'].map(
      (kind) => [kind, plan.cues.filter((cue) => cue.kind === kind).length]
    )
  );

  assert.deepEqual(eventCounts, {
    spawn: 1,
    contact_enter: 1,
    contact_exit: 1,
    escape: 1,
    terminal: 1,
  });
  assert.deepEqual(cueCounts, {
    spawn: 1,
    contact_enter: 1,
    contact_exit: 1,
    escape: 1,
    terminal: 0,
  });
  assert.deepEqual(
    plan.cues.map((cue) => cue.eventSeq),
    [0, 1, 2, 3]
  );
});

test('cue samples remain within one frame of their explicit visual event frame', async () => {
  const input = await fixture();
  const plan = buildRingEscapeAudioPlan(input);
  for (const cue of plan.cues) {
    const visualFrame = input.eventFrameMap[cue.eventSeq].frame;
    const audioFrame = cue.sampleIndex / RING_ESCAPE_AUDIO_SAMPLES_PER_FRAME;
    assert.ok(Math.abs(audioFrame - visualFrame) <= 1);
    assert.equal(audioFrame, cue.frame);
  }
});

test('tampered plans and invalid source mappings are rejected', async () => {
  const input = await fixture();
  const plan = buildRingEscapeAudioPlan(input);
  assert.throws(() =>
    parseRingEscapeAudioPlan({
      ...plan,
      cues: plan.cues.map((cue, index) =>
        index === 1 ? { ...cue, frequency: cue.frequency + 1 } : cue
      ),
    })
  );

  const nonContiguous = input.events.map((event, index) =>
    index === 1 ? { ...event, seq: 9 } : event
  );
  assert.throws(
    () => buildRingEscapeAudioPlan({ ...input, events: nonContiguous }),
    /contiguous/
  );

  assert.throws(() =>
    buildRingEscapeAudioPlan({
      ...input,
      eventFrameMap: input.eventFrameMap.map((entry, index) =>
        index === 2 ? { ...entry, frame: 240 } : entry
      ),
    })
  );
  assert.throws(
    () =>
      buildRingEscapeAudioPlan({
        ...input,
        eventFrameMap: input.eventFrameMap.slice(1),
      }),
    /exactly one entry/
  );
  assert.throws(
    () =>
      buildRingEscapeAudioPlan({
        ...input,
        events: input.events.slice(0, -1),
        eventFrameMap: input.eventFrameMap.slice(0, -1),
      }),
    /end with terminal/
  );
});

test('a distinct last-frame terminal is retained and clipped to audio bounds', async () => {
  const input = await fixture();
  const events = input.events.map((event) =>
    event.kind === 'terminal'
      ? {
          ...event,
          step: event.step + 1,
          time: event.time + 1,
          payload: { reason: 'max_steps' },
        }
      : event
  );
  const eventFrameMap = input.eventFrameMap.map((entry) =>
    entry.kind === 'terminal' ? { ...entry, frame: 239 } : entry
  );
  const plan = buildRingEscapeAudioPlan({
    events,
    eventFrameMap,
    durationFrames: 240,
  });
  const terminal = plan.cues.at(-1);

  assert.equal(terminal?.kind, 'terminal');
  assert.equal(terminal?.sampleIndex, 239 * 1_600);
  assert.equal(terminal?.durationMs, (1_600 * 1_000) / 48_000);
});
