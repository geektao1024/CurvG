import assert from 'node:assert/strict';
import test from 'node:test';

import { validateAnimationSpec } from '../src/lib/animation-schema';
import { createDefaultRingEscapeScenarioConfig } from '../src/lib/animation-simulation';
import { buildRingEscapeReplayPlan } from '../src/lib/manim-simulation-compiler';
import { parseRingEscapeAudioPlan } from '../src/lib/simulation-audio';
import { ringEscapePresentationSpec } from '../src/lib/simulation-presentation';
import { buildVerifiedRingEscapeProduction } from '../src/lib/simulation-production';

test('verified production is deterministic and reaches escaped', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 7 });
  const first = await buildVerifiedRingEscapeProduction({ scenario });
  const second = await buildVerifiedRingEscapeProduction({ scenario });

  assert.equal(first.result.finalState.terminalReason, 'escaped');
  assert.equal(first.evidence.terminalReason, 'escaped');
  assert.equal(
    first.evidence.manifest.runDigest,
    second.evidence.manifest.runDigest
  );
  assert.equal(first.artifacts.eventsJsonl, second.artifacts.eventsJsonl);
  assert.equal(first.artifacts.audioPlanJson, second.artifacts.audioPlanJson);
  assert.equal(
    first.evidence.audioPlanDigest,
    first.evidence.manifest.audioPlanDigest
  );
  const audioPlan = parseRingEscapeAudioPlan(
    JSON.parse(first.artifacts.audioPlanJson)
  );
  const replay = buildRingEscapeReplayPlan(first.result);
  for (const cue of audioPlan.cues) {
    const replayEvent = replay.eventFrames.find(
      (event) => event.sequence === cue.eventSeq
    );
    assert.equal(cue.frame, replayEvent?.frame);
    assert.equal(cue.kind, replayEvent?.type);
  }
  assert.match(
    first.artifacts.eventsJsonl.trim().split('\n').at(-1) || '',
    /"kind":"terminal"/
  );
});

test('presentation title changes the compiled source and sealed run identity', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 7 });
  const first = await buildVerifiedRingEscapeProduction({
    scenario,
    title: 'First title',
  });
  const second = await buildVerifiedRingEscapeProduction({
    scenario,
    title: 'Second title',
  });

  assert.equal(first.evidence.audioPlanDigest, second.evidence.audioPlanDigest);
  assert.notEqual(
    first.evidence.compiledSourceDigest,
    second.evidence.compiledSourceDigest
  );
  assert.notEqual(
    first.evidence.manifest.runDigest,
    second.evidence.manifest.runDigest
  );
});

test('presentation spec stays a vertical QA contract, not solver truth', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig();
  const production = await buildVerifiedRingEscapeProduction({ scenario });
  const spec = validateAnimationSpec(
    ringEscapePresentationSpec({
      title: 'Deterministic ring escape',
      seed: production.evidence.seed,
      solverDigest: production.evidence.solverDigest,
      eventCount: production.evidence.eventCount,
    })
  );

  assert.equal(spec.direction?.frame, '9:16');
  assert.equal(spec.durationSeconds, 8);
  assert.ok(
    spec.notes?.some((note) => note.includes(production.evidence.solverDigest))
  );
});
