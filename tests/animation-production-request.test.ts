import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AnimationApiError,
  parseAnimationProductionRequest,
} from '../src/routes/api/animations/-shared';

test('create production mode defaults to explainer while revision preserves the current track', () => {
  assert.deepEqual(parseAnimationProductionRequest({}), {
    productionMode: 'explainer',
  });
  assert.deepEqual(parseAnimationProductionRequest({}, { revision: true }), {
    productionMode: undefined,
  });
});

test('production mode rejects unknown values', () => {
  for (const productionMode of ['simulation', null, 1]) {
    assert.throws(
      () => parseAnimationProductionRequest({ productionMode }),
      (error: unknown) =>
        error instanceof AnimationApiError && error.status === 400
    );
  }
});

test('simulation_short accepts only description ring_escape with a trusted scenario', () => {
  const parsed = parseAnimationProductionRequest({
    productionMode: 'simulation_short',
    mode: 'description',
    simulationFamily: 'ring_escape',
  });
  assert.equal(parsed.productionMode, 'simulation_short');
  assert.equal(parsed.simulationFamily, 'ring_escape');
  assert.equal(parsed.simulationScenario?.family, 'ring_escape');
  assert.equal(parsed.simulationScenario?.output.frame, '9:16');

  for (const body of [
    {
      productionMode: 'simulation_short',
      mode: 'formula',
      simulationFamily: 'ring_escape',
    },
    {
      productionMode: 'simulation_short',
      mode: 'description',
      simulationFamily: 'other',
    },
    { productionMode: 'explainer', simulationFamily: 'ring_escape' },
  ]) {
    assert.throws(() => parseAnimationProductionRequest(body));
  }
});

test('client-authored simulation physics never crosses the API boundary', () => {
  for (const clientField of [
    'solverConfig',
    'scenario',
    'simulationParameters',
    'physics',
  ]) {
    assert.throws(() =>
      parseAnimationProductionRequest({
        productionMode: 'simulation_short',
        mode: 'description',
        simulationFamily: 'ring_escape',
        [clientField]: { seed: 1 },
      })
    );
  }
});
