import assert from 'node:assert/strict';
import test from 'node:test';

import {
  animationModelPolicies,
  canUseAnimationModel,
  decideAnimationModelAccess,
  DEFAULT_ANIMATION_MODEL,
  getAnimationModelPolicy,
} from '../src/config/animation-models';
import { productIncludesProModels } from '../src/config/pricing';
import {
  AnimationApiError,
  parseModelChoice,
} from '../src/routes/api/animations/-shared';

test('the default free model is explicitly allowlisted', () => {
  const policy = getAnimationModelPolicy('yunwu', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.requiredTier, 'free');
  assert.equal(canUseAnimationModel('free', policy), true);
});

test('direct API selections cannot bypass the Free/Pro boundary', () => {
  const freeAuto = decideAnimationModelAccess({
    tier: 'free',
    choice: 'auto',
  });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed)
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'yunwu',
      requestedModel: 'qwen3-coder-plus',
    }),
    { allowed: false, reason: 'PRO_REQUIRED' }
  );

  const proExplicit = decideAnimationModelAccess({
    tier: 'pro',
    choice: 'yunwu',
    requestedModel: 'qwen3-coder-plus',
  });
  assert.equal(proExplicit.allowed, true);

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'auto',
      requestedModel: 'qwen3-coder-plus',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'pro',
      // Keep the runtime fail-closed assertion for stale clients, even though
      // the public TypeScript contract no longer exposes this provider.
      choice: 'openai' as never,
      requestedModel: 'gpt-5',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
});

test('free access cannot use Pro-only models', () => {
  const proPolicies = animationModelPolicies.filter(
    (policy) => policy.requiredTier === 'pro'
  );

  assert.ok(proPolicies.length > 0);
  for (const policy of proPolicies) {
    assert.equal(canUseAnimationModel('free', policy), false, policy.model);
  }
});

test('Pro access can use both free and Pro models', () => {
  for (const policy of animationModelPolicies) {
    assert.equal(canUseAnimationModel('pro', policy), true, policy.model);
  }
});

test('unknown providers and model aliases fail closed', () => {
  const unknowns = [
    getAnimationModelPolicy('unknown-provider', DEFAULT_ANIMATION_MODEL),
    getAnimationModelPolicy('yunwu', 'qwen3-coder'),
    getAnimationModelPolicy('yunwu', 'new-unreviewed-model'),
  ];

  for (const policy of unknowns) {
    assert.equal(policy, undefined);
    const allowed = policy ? canUseAnimationModel('pro', policy) : false;
    assert.equal(allowed, false);
  }
});

test('stale API provider choices do not silently become Auto', () => {
  assert.equal(parseModelChoice(undefined), 'auto');
  assert.equal(parseModelChoice('yunwu'), 'yunwu');
  assert.throws(
    () => parseModelChoice('openai'),
    (error: unknown) =>
      error instanceof AnimationApiError &&
      error.code === 'INVALID_MODEL' &&
      error.status === 400
  );
});

test('the payment catalog is the source of truth for Pro model entitlement', () => {
  assert.equal(productIncludesProModels('starter_monthly'), false);
  assert.equal(productIncludesProModels('pro_monthly'), true);
  assert.equal(productIncludesProModels('enterprise_yearly'), true);
  assert.equal(productIncludesProModels('pro_lifetime'), true);
  assert.equal(productIncludesProModels('unknown_product'), false);
});
