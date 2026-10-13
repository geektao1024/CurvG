import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptRingEscapeSolverResult,
  buildSimulationRunManifest,
  createDefaultRingEscapeScenarioConfig,
  digestCanonicalJson,
  digestUtf8Text,
  parseAnimationSimulationScenarioConfig,
  stableCanonicalJson,
} from '../src/lib/animation-simulation';
import { solveRingEscape } from '../src/lib/simulation-ring-escape';

test('default ring_escape scenario is safe to persist in AnimationParts', () => {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 99 });
  assert.equal(scenario.family, 'ring_escape');
  assert.equal(scenario.productionMode, 'simulation_short');
  assert.equal(scenario.solverConfig.seed, 99);
  assert.deepEqual(parseAnimationSimulationScenarioConfig(scenario), scenario);
  assert.throws(() =>
    parseAnimationSimulationScenarioConfig({
      ...scenario,
      solverConfig: {
        ...scenario.solverConfig,
        escapeBoundary: {
          ...scenario.solverConfig.escapeBoundary,
          radius: 1,
        },
      },
    })
  );
});

test('canonical JSON and SHA-256 are independent of key insertion order', async () => {
  assert.equal(
    stableCanonicalJson({ z: 1, nested: { b: true, a: -0 }, a: 'first' }),
    '{"a":"first","nested":{"a":0,"b":true},"z":1}'
  );
  assert.equal(
    await digestCanonicalJson({ a: 1, b: { c: 2 } }),
    await digestCanonicalJson({ b: { c: 2 }, a: 1 })
  );
  assert.throws(() => stableCanonicalJson({ invalid: Number.NaN }));
});

test('trusted solver output adapts to a canonical terminal event log', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig({
    seed: 0x5eed1234,
  });
  const solverConfig = scenario.solverConfig;
  const actualScenario = { ...scenario, solverConfig };
  const result = solveRingEscape(solverConfig);
  const run = await adaptRingEscapeSolverResult({
    scenario: actualScenario,
    result,
  });

  assert.deepEqual(
    run.events.map((event) => event.kind),
    ['spawn', 'contact_enter', 'contact_exit', 'escape', 'terminal']
  );
  assert.equal(run.summary.eventCount, run.events.length);
  assert.equal(run.summary.terminalReason, 'escaped');
  assert.equal(run.checkpoints.at(-1)?.terminal, true);

  await assert.rejects(() =>
    adaptRingEscapeSolverResult({
      scenario: actualScenario,
      result: { ...result, seed: result.seed + 1 },
    })
  );
});

test('same scenario and seeded solver run produce the same run digest', async () => {
  const scenario = createDefaultRingEscapeScenarioConfig({ seed: 7 });
  const result = solveRingEscape(scenario.solverConfig);
  const compiledSourceDigest = await digestUtf8Text(
    'from manim import *\nclass CurvGScene(Scene):\n    pass\n'
  );
  const audioPlanDigest = await digestUtf8Text('canonical audio plan');
  const first = await buildSimulationRunManifest({
    scenario,
    result,
    compiledSourceDigest,
    audioPlanDigest,
  });
  const second = await buildSimulationRunManifest({
    scenario: JSON.parse(JSON.stringify(scenario)),
    result: JSON.parse(JSON.stringify(result)),
    compiledSourceDigest,
    audioPlanDigest,
  });
  assert.equal(first.scenarioDigest, second.scenarioDigest);
  assert.equal(first.eventLogDigest, second.eventLogDigest);
  assert.equal(first.audioPlanDigest, audioPlanDigest);
  assert.equal(first.runDigest, second.runDigest);
  assert.equal(first.summary.terminalReason, result.finalState.terminalReason);
});
