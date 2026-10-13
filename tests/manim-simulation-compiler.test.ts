import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createDefaultRingEscapeScenarioConfig } from '../src/lib/animation-simulation';
import {
  buildRingEscapeReplayPlan,
  buildRingEscapeTimelineBudget,
  compileRingEscapeSimulationShort,
  RING_ESCAPE_SHORT_LAYOUT,
} from '../src/lib/manim-simulation-compiler';
import {
  solveRingEscape,
  VERIFIED_RING_ESCAPE_CONFIG,
} from '../src/lib/simulation-ring-escape';

test('compiles the same canonical run to identical vertical Manim source', () => {
  const firstRun = solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG);
  const secondRun = solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG);
  const first = compileRingEscapeSimulationShort(firstRun);
  const second = compileRingEscapeSimulationShort(secondRun);

  assert.equal(first, second);
  assert.match(first, /class CurvGScene\(Scene\):/);
  assert.match(first, /config\.pixel_width = 1080/);
  assert.match(first, /config\.pixel_height = 1920/);
  assert.match(first, /config\.frame_width = 9/);
  assert.match(first, /config\.frame_height = 16/);
  assert.match(first, /config\.frame_rate = 30/);
  assert.match(first, new RegExp(`# solver_digest: ${firstRun.digest}`));
  assert.match(first, /# terminal_reason: escaped/);
  assert.match(first, new RegExp(`# event_count: ${firstRun.events.length}`));
  assert.match(first, /# timeline_frames: 240/);
  assert.match(first, /# timeline_seconds: 8/);
  assert.match(first, /GAP FOUND · ESCAPE/);
  assert.match(first, /ESCAPED/);
  assert.match(first, /self\.add\(rings, particle\)/);
  assert.doesNotMatch(first, /FadeIn\(rings\)|FadeIn\(particle\)/);
  assert.ok(new TextEncoder().encode(first).byteLength < 60_000);
});

function emittedTimelineFrames(source: string): number[] {
  return [...source.matchAll(/(?:run_time=|self\.wait\()(\d+) \/ 30/g)].map(
    (match) => Number(match[1])
  );
}

test('allocates the production run on one exact integer-frame timeline', () => {
  const result = solveRingEscape(
    createDefaultRingEscapeScenarioConfig().solverConfig
  );
  const budget = buildRingEscapeTimelineBudget(result);
  const source = compileRingEscapeSimulationShort(result);
  const emittedFrames = emittedTimelineFrames(source);

  assert.equal(budget.fps, 30);
  assert.equal(budget.targetFrames, 240);
  assert.equal(budget.totalFrames, 240);
  assert.equal(budget.actualDurationSeconds, 8);
  assert.equal(
    budget.motionSegmentFrames.reduce((sum, frames) => sum + frames, 0),
    budget.motionFrames
  );
  assert.ok(budget.motionSegmentFrames.every((frames) => frames >= 1));
  assert.equal(
    emittedFrames.length,
    budget.motionSegmentFrames.length + budget.eventTransitionCount + 3
  );
  assert.equal(
    emittedFrames.reduce((sum, frames) => sum + frames, 0),
    budget.targetFrames
  );
  assert.doesNotMatch(source, /run_time=0\.\d+/);
});

test('maps every canonical event onto the exact visual transition frame', () => {
  const result = solveRingEscape(
    createDefaultRingEscapeScenarioConfig().solverConfig
  );
  const replay = buildRingEscapeReplayPlan(result);

  assert.deepEqual(
    replay.eventFrames.map(({ sequence, type }) => ({ sequence, type })),
    result.events.map((event) => ({
      sequence: event.sequence,
      type: event.type,
    }))
  );
  assert.equal(replay.eventFrames[0].frame, 0);
  assert.ok(
    replay.eventFrames.every(
      (event, index) =>
        index === 0 || event.frame >= replay.eventFrames[index - 1].frame
    )
  );
  const escape = replay.eventFrames.find((event) => event.type === 'escape');
  const terminal = replay.eventFrames.find(
    (event) => event.type === 'terminal'
  );
  assert.ok(escape && terminal);
  assert.equal(
    terminal.frame - escape.frame,
    replay.timeline.eventTransitionFrames
  );
  assert.ok(terminal.frame < replay.timeline.totalFrames);
});

test('rounds requested duration once, within one output frame', () => {
  const result = solveRingEscape(
    createDefaultRingEscapeScenarioConfig().solverConfig
  );

  for (const requestedDurationSeconds of [6, 7.25, 8, 11.99, 12]) {
    const budget = buildRingEscapeTimelineBudget(result, {
      durationSeconds: requestedDurationSeconds,
    });
    assert.equal(
      budget.totalFrames,
      Math.round(requestedDurationSeconds * budget.fps)
    );
    assert.ok(
      Math.abs(budget.actualDurationSeconds - requestedDurationSeconds) <=
        1 / budget.fps
    );
  }
});

test('keeps arena, title, payoff, and status in disjoint vertical bands', () => {
  const result = solveRingEscape(
    createDefaultRingEscapeScenarioConfig().solverConfig
  );
  const longTitle = 'A'.repeat(48);
  const source = compileRingEscapeSimulationShort(result, {
    title: longTitle,
  });
  const escapeRadius = Number(
    source.match(/escape_ring = Arc\(radius=([0-9.]+)/)?.[1]
  );

  assert.ok(Number.isFinite(escapeRadius));
  assert.ok(escapeRadius <= RING_ESCAPE_SHORT_LAYOUT.arenaMaxRadius);
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.titleY >
      RING_ESCAPE_SHORT_LAYOUT.arenaCenterY + escapeRadius + 1
  );
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.payoffY >
      RING_ESCAPE_SHORT_LAYOUT.arenaCenterY + escapeRadius + 0.5
  );
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.statusY <
      RING_ESCAPE_SHORT_LAYOUT.arenaCenterY - escapeRadius - 0.75
  );
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.statusY - RING_ESCAPE_SHORT_LAYOUT.counterY >= 0.5
  );
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.titleY < RING_ESCAPE_SHORT_LAYOUT.safeTopY
  );
  assert.ok(
    RING_ESCAPE_SHORT_LAYOUT.counterY > RING_ESCAPE_SHORT_LAYOUT.safeBottomY
  );
  assert.match(
    source,
    new RegExp(
      `title\\.scale_to_fit_width\\(${RING_ESCAPE_SHORT_LAYOUT.maxTextWidth}\\)`
    )
  );
  assert.match(
    source,
    new RegExp(
      `title\\.move_to\\(\\[0, ${RING_ESCAPE_SHORT_LAYOUT.titleY}, 0\\]\\)`
    )
  );
  assert.match(
    source,
    new RegExp(
      `status\\.move_to\\(\\[0, ${RING_ESCAPE_SHORT_LAYOUT.statusY}, 0\\]\\)`
    )
  );
  assert.match(
    source,
    new RegExp(
      `counter\\.move_to\\(\\[0, ${RING_ESCAPE_SHORT_LAYOUT.counterY}, 0\\]\\)`
    )
  );
});

test('generated Python only plays canonical snapshots and has no physics loop', () => {
  const source = compileRingEscapeSimulationShort(
    solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG)
  );

  assert.doesNotMatch(source, /\brandom\b|np\.random|numpy\.random/);
  assert.doesNotMatch(source, /^\s*(?:for|while)\s/m);
  assert.doesNotMatch(
    source,
    /add_updater|always_redraw|def\s+(?:update|updater)\b/
  );
  assert.doesNotMatch(source, /velocity\s*[+\-*/]?=|position\s*[+\-*/]?=/);
  assert.match(source, /particle\.animate\.move_to/);
  assert.match(source, /Transform\(status, status_0\)/);
  assert.match(source, /Transform\(counter, counter_0\)/);
});

test('rejects a tampered solver payload and invalid duration', () => {
  const result = solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG);
  assert.throws(
    () => compileRingEscapeSimulationShort({ ...result, digest: 'fnv1a64:0' }),
    /digest does not match/
  );
  assert.throws(
    () => compileRingEscapeSimulationShort(result, { durationSeconds: 5.9 }),
    /durationSeconds must be in \[6, 12\]/
  );
});

test('generated Python passes the renderer scene validator', () => {
  const source = compileRingEscapeSimulationShort(
    solveRingEscape(VERIFIED_RING_ESCAPE_CONFIG)
  );
  const directory = mkdtempSync(join(tmpdir(), 'curvg-simulation-'));
  const scenePath = join(directory, 'scene.py');
  try {
    writeFileSync(scenePath, source, 'utf8');
    const validation = spawnSync(
      'python3',
      [join(process.cwd(), 'renderer', 'validate_scene.py'), scenePath],
      { encoding: 'utf8' }
    );
    assert.equal(
      validation.status,
      0,
      `${validation.stdout}\n${validation.stderr}`
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
