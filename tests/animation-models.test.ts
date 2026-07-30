import assert from 'node:assert/strict';
import test from 'node:test';

import {
  animationModelPolicies,
  canUseAnimationModel,
  decideAnimationModelAccess,
  DEFAULT_ANIMATION_MODEL,
  getAnimationCompositionReasoningEffort,
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
  animationProviderTargetPlan,
  parseModelChoice,
} from '../src/routes/api/animations/-shared';

test('the default free model is explicitly allowlisted on Kuaipao', () => {
  const policy = getAnimationModelPolicy('kuaipao', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.model, 'gpt-5.6-sol');
  assert.equal(policy.requiredTier, 'free');
  assert.equal(canUseAnimationModel('free', policy), true);
});

test('only GPT-5.6 receives the high-effort quality comparison hint', () => {
  assert.equal(getAnimationReasoningEffort('gpt-5.6-sol'), 'high');
  assert.equal(getAnimationReasoningEffort('gpt-5.5'), undefined);
});

test('large GPT-5.6 composition stages use bounded medium effort', () => {
  assert.equal(getAnimationCompositionReasoningEffort('gpt-5.6-sol'), 'medium');
  assert.equal(getAnimationCompositionReasoningEffort('gpt-5.5'), undefined);
});

test('Auto and explicit API selections resolve only to GPT-5.6', () => {
  const freeAuto = decideAnimationModelAccess({ tier: 'free', choice: 'auto' });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed)
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);

  assert.equal(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'kuaipao',
      requestedModel: 'gpt-5.6-sol',
    }).allowed,
    true
  );

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'auto',
      requestedModel: 'gpt-5.6-sol',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
});

test('the generation catalog contains only reviewed Kuaipao GPT-5.6', () => {
  assert.deepEqual(animationModelPolicies, [
    {
      provider: 'kuaipao',
      model: 'gpt-5.6-sol',
      presetKey: 'kuaipaoGpt56Sol',
      requiredTier: 'free',
    },
  ]);
});

test('KIE Gemini is a hidden resilience target after Kuaipao GPT-5.6', () => {
  const primary = animationModelPolicies[0];
  assert.deepEqual(
    animationProviderTargetPlan(
      {
        kuaipao_api_key: 'configured',
        kie_api_key: 'configured',
      },
      primary
    ),
    [
      {
        provider: 'kuaipao',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
      },
      {
        provider: 'kie',
        model: 'gemini-3.6-flash',
        reasoningEffort: 'high',
      },
    ]
  );
  assert.deepEqual(
    animationProviderTargetPlan({ kuaipao_api_key: 'configured' }, primary),
    [
      {
        provider: 'kuaipao',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
      },
    ]
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

test('unknown providers, legacy Kie values, and aliases fail closed', () => {
  const unknowns = [
    getAnimationModelPolicy('unknown-provider', DEFAULT_ANIMATION_MODEL),
    getAnimationModelPolicy('yunwu', 'deepseek-v4-pro'),
    getAnimationModelPolicy('kie', 'gemini-3-pro'),
    getAnimationModelPolicy('kuaipao', 'gpt-5.6'),
    getAnimationModelPolicy('kuaipao', 'new-unreviewed-model'),
  ];

  for (const policy of unknowns) assert.equal(policy, undefined);
  assert.deepEqual(parseAnimationModelValue('yunwu:deepseek-v4-pro'), {
    modelChoice: 'auto',
  });
});

test('stale API provider choices are rejected instead of becoming Auto', () => {
  assert.equal(parseModelChoice(undefined), 'auto');
  assert.equal(parseModelChoice('kuaipao'), 'kuaipao');
  for (const provider of ['yunwu', 'openai', 'kie']) {
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

test('client model values preserve the explicit Kuaipao boundary', () => {
  assert.equal(
    animationModelValue('kuaipao', 'gpt-5.6-sol'),
    'kuaipao:gpt-5.6-sol'
  );
  assert.deepEqual(parseAnimationModelValue('kuaipao:gpt-5.6-sol'), {
    modelChoice: 'kuaipao',
    model: 'gpt-5.6-sol',
  });
  assert.deepEqual(parseAnimationModelValue('unknown:gpt-5.6-sol'), {
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
