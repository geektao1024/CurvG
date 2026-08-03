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

test('the default free model is explicitly allowlisted on KIE', () => {
  const policy = getAnimationModelPolicy('kie', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.model, 'gemini-3.6-flash');
  assert.equal(policy.requiredTier, 'free');
  assert.equal(canUseAnimationModel('free', policy), true);
});

test('only Gemini 3.6 receives the high-effort planning hint', () => {
  assert.equal(getAnimationReasoningEffort('gemini-3.6-flash'), 'high');
  assert.equal(getAnimationReasoningEffort('gpt-5.6-sol'), undefined);
  assert.equal(getAnimationReasoningEffort('gpt-5.5'), undefined);
});

test('large Gemini composition stages use bounded medium effort', () => {
  assert.equal(
    getAnimationCompositionReasoningEffort('gemini-3.6-flash'),
    'medium'
  );
  assert.equal(
    getAnimationCompositionReasoningEffort('gpt-5.6-sol'),
    undefined
  );
  assert.equal(getAnimationCompositionReasoningEffort('gpt-5.5'), undefined);
});

test('Auto and explicit API selections resolve only to KIE Gemini 3.6', () => {
  const freeAuto = decideAnimationModelAccess({ tier: 'free', choice: 'auto' });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed)
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);

  assert.equal(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'kie',
      requestedModel: 'gemini-3.6-flash',
    }).allowed,
    true
  );

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'auto',
      requestedModel: 'gemini-3.6-flash',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
});

test('the generation catalog contains only reviewed KIE Gemini 3.6', () => {
  assert.deepEqual(animationModelPolicies, [
    {
      provider: 'kie',
      model: 'gemini-3.6-flash',
      presetKey: 'kieGemini36Flash',
      requiredTier: 'free',
    },
  ]);
});

test('KIE Gemini is primary and Kuaipao GPT-5.6 is hidden resilience', () => {
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
        provider: 'kie',
        model: 'gemini-3.6-flash',
        reasoningEffort: 'high',
      },
      {
        provider: 'kuaipao',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
      },
    ]
  );
  assert.deepEqual(
    animationProviderTargetPlan({ kie_api_key: 'configured' }, primary),
    [
      {
        provider: 'kie',
        model: 'gemini-3.6-flash',
        reasoningEffort: 'high',
      },
    ]
  );
});

test('the backup route joins the plan last and only when fully configured', () => {
  const primary = animationModelPolicies[0];
  const base = {
    kie_api_key: 'configured',
    kuaipao_api_key: 'configured',
  };

  // All three backup settings present: the route is appended after the two
  // first-party providers, never before them.
  const plan = animationProviderTargetPlan(
    {
      ...base,
      animation_backup_base_url: 'https://backup.example.com/v1',
      animation_backup_api_key: 'configured',
      animation_backup_model: 'gpt-5.5',
    },
    primary
  );
  assert.deepEqual(
    plan.map((target) => target.provider),
    ['kie', 'kuaipao', 'backup']
  );
  assert.deepEqual(plan.at(-1), {
    provider: 'backup',
    model: 'gpt-5.5',
    reasoningEffort: 'high',
  });

  // A partially configured backup route must stay inert — activating on a
  // base URL without a key would turn a typo into silent request failures.
  for (const missing of [
    'animation_backup_base_url',
    'animation_backup_api_key',
    'animation_backup_model',
  ]) {
    const partial: Record<string, string> = {
      ...base,
      animation_backup_base_url: 'https://backup.example.com/v1',
      animation_backup_api_key: 'configured',
      animation_backup_model: 'gpt-5.5',
    };
    delete partial[missing];
    assert.deepEqual(
      animationProviderTargetPlan(partial, primary).map(
        (target) => target.provider
      ),
      ['kie', 'kuaipao'],
      `expected inert backup route without ${missing}`
    );
  }
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

test('unknown providers, legacy Kuaipao values, and aliases fail closed', () => {
  const unknowns = [
    getAnimationModelPolicy('unknown-provider', DEFAULT_ANIMATION_MODEL),
    getAnimationModelPolicy('yunwu', 'deepseek-v4-pro'),
    getAnimationModelPolicy('kie', 'gemini-3-pro'),
    getAnimationModelPolicy('kuaipao', 'gpt-5.6-sol'),
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
  assert.equal(parseModelChoice('kie'), 'kie');
  for (const provider of ['yunwu', 'openai', 'kuaipao']) {
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

test('client model values preserve the explicit KIE boundary', () => {
  assert.equal(
    animationModelValue('kie', 'gemini-3.6-flash'),
    'kie:gemini-3.6-flash'
  );
  assert.deepEqual(parseAnimationModelValue('kie:gemini-3.6-flash'), {
    modelChoice: 'kie',
    model: 'gemini-3.6-flash',
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
