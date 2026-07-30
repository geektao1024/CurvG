import assert from 'node:assert/strict';
import test from 'node:test';

import {
  animationModelPolicies,
  canUseAnimationModel,
  decideAnimationModelAccess,
  DEFAULT_ANIMATION_MODEL,
  getAnimationModelPolicy,
  getAnimationReasoningEffort,
} from '../src/config/animation-models';
import { productIncludesProModels } from '../src/config/pricing';
import {
  animationModelValue,
  parseAnimationModelValue,
} from '../src/lib/animation';
import {
  AnimationApiError,
  parseModelChoice,
} from '../src/routes/api/animations/-shared';

test('the default free model is explicitly allowlisted on Kie', () => {
  const policy = getAnimationModelPolicy('kie', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.model, 'gemini-3.6-flash');
  assert.equal(policy.requiredTier, 'free');
  assert.equal(canUseAnimationModel('free', policy), true);
});

test('only reviewed reasoning models receive a low-effort hint', () => {
  for (const model of [
    'gemini-3.6-flash',
    'grok-4-5',
    'gemini-3.1-pro',
    'gpt-5-2',
    'gpt-5-5',
  ]) {
    assert.equal(getAnimationReasoningEffort(model), 'low', model);
  }
  assert.equal(getAnimationReasoningEffort('claude-sonnet-4-6'), undefined);
  assert.equal(getAnimationReasoningEffort('claude-opus-4-7'), undefined);
});

test('direct API selections enforce the free and Pro boundary', () => {
  const freeModels = ['gemini-3.6-flash', 'grok-4-5', 'gemini-3.1-pro'];
  const proModels = [
    'gpt-5-2',
    'gpt-5-5',
    'claude-sonnet-4-6',
    'claude-opus-4-7',
  ];

  const freeAuto = decideAnimationModelAccess({ tier: 'free', choice: 'auto' });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed)
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);

  for (const model of freeModels) {
    assert.equal(
      decideAnimationModelAccess({
        tier: 'free',
        choice: 'kie',
        requestedModel: model,
      }).allowed,
      true,
      model
    );
  }

  for (const model of proModels) {
    assert.deepEqual(
      decideAnimationModelAccess({
        tier: 'starter',
        choice: 'kie',
        requestedModel: model,
      }),
      { allowed: false, reason: 'PRO_REQUIRED' },
      model
    );
    assert.equal(
      decideAnimationModelAccess({
        tier: 'pro',
        choice: 'kie',
        requestedModel: model,
      }).allowed,
      true,
      model
    );
  }

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'auto',
      requestedModel: 'grok-4-5',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
});

test('all seven policies are Kie-only with the requested tier split', () => {
  assert.equal(animationModelPolicies.length, 7);
  assert.ok(
    animationModelPolicies.every((policy) => policy.provider === 'kie')
  );
  assert.equal(
    animationModelPolicies.filter((policy) => policy.requiredTier === 'free')
      .length,
    3
  );
  assert.equal(
    animationModelPolicies.filter((policy) => policy.requiredTier === 'pro')
      .length,
    4
  );
  assert.equal(
    animationModelPolicies.some(
      (policy) => (policy.requiredTier as string) === 'starter'
    ),
    false
  );
});

test('Starter inherits Free models but not Pro models', () => {
  for (const policy of animationModelPolicies) {
    assert.equal(
      canUseAnimationModel('starter', policy),
      policy.requiredTier === 'free',
      policy.model
    );
  }
});

test('Pro access can use every allowlisted model', () => {
  for (const policy of animationModelPolicies) {
    assert.equal(canUseAnimationModel('pro', policy), true, policy.model);
  }
});

test('unknown providers, old Yunwu values, and aliases fail closed', () => {
  const unknowns = [
    getAnimationModelPolicy('unknown-provider', DEFAULT_ANIMATION_MODEL),
    getAnimationModelPolicy('yunwu', 'deepseek-v4-pro'),
    getAnimationModelPolicy('kie', 'gemini-3-pro'),
    getAnimationModelPolicy('kie', 'new-unreviewed-model'),
  ];

  for (const policy of unknowns) assert.equal(policy, undefined);
  assert.deepEqual(parseAnimationModelValue('yunwu:deepseek-v4-pro'), {
    modelChoice: 'auto',
  });
});

test('stale API provider choices are rejected instead of becoming Auto', () => {
  assert.equal(parseModelChoice(undefined), 'auto');
  assert.equal(parseModelChoice('kie'), 'kie');
  for (const provider of ['yunwu', 'openai']) {
    assert.throws(
      () => parseModelChoice(provider),
      (error: unknown) =>
        error instanceof AnimationApiError &&
        error.code === 'INVALID_MODEL' &&
        error.status === 400,
      provider
    );
  }
});

test('client model values preserve the explicit Kie boundary', () => {
  assert.equal(
    animationModelValue('kie', 'gemini-3.6-flash'),
    'kie:gemini-3.6-flash'
  );
  assert.deepEqual(parseAnimationModelValue('kie:gemini-3.6-flash'), {
    modelChoice: 'kie',
    model: 'gemini-3.6-flash',
  });
  assert.deepEqual(parseAnimationModelValue('unknown:gemini-3.6-flash'), {
    modelChoice: 'auto',
  });
});

test('the payment catalog is the source of truth for Pro model entitlement', () => {
  assert.equal(productIncludesProModels('starter_monthly'), false);
  assert.equal(productIncludesProModels('pro_monthly'), true);
  assert.equal(productIncludesProModels('enterprise_yearly'), true);
  assert.equal(productIncludesProModels('pro_lifetime'), true);
  assert.equal(productIncludesProModels('unknown_product'), false);
});
