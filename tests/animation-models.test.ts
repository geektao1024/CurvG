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

test('the default model is KIE GPT-6 Luna', () => {
  const policy = getAnimationModelPolicy('kie', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.model, 'gpt-6-luna');
  assert.equal(policy.presetKey, 'curvgPro');
  assert.equal(policy.requiredTier, 'free');
  assert.equal(policy.publicCatalog, true);
  assert.equal(canUseAnimationModel('free', policy), true);
  assert.equal(getAnimationReasoningEffort('gpt-6-luna'), 'high');
  assert.equal(getAnimationCompositionReasoningEffort('gpt-6-luna'), 'medium');
  // Haiku 5.5 (retired 2026-10-16) keeps its tuning for old rows.
  assert.equal(getAnimationReasoningEffort('claude-haiku-5-5'), 'high');
  // GPT-6.1 Sol stays allowlisted (hidden) with its tuning for old rows.
  assert.equal(getAnimationReasoningEffort('gpt-6-1-sol'), 'xhigh');
});

test('planning effort: Luna max, DeepSeek high, retired routes unchanged', () => {
  assert.equal(getAnimationReasoningEffort('gpt-5-6-luna'), 'max');
  assert.equal(getAnimationReasoningEffort('deepseek-v4-flash'), 'high');
  assert.equal(getAnimationReasoningEffort('gpt-5-6-sol'), 'xhigh');
  assert.equal(getAnimationReasoningEffort('gemini-3.6-flash'), 'high');
  assert.equal(getAnimationReasoningEffort('gpt-5.6-sol'), undefined);
  assert.equal(getAnimationReasoningEffort('gpt-5.5'), undefined);
});

test('composition effort: Pro keeps max (2026-08-04), others one tier below', () => {
  assert.equal(getAnimationCompositionReasoningEffort('gpt-5-6-luna'), 'max');
  assert.equal(
    getAnimationCompositionReasoningEffort('deepseek-v4-flash'),
    'high'
  );
  assert.equal(getAnimationCompositionReasoningEffort('gpt-5-6-sol'), 'high');
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

test('Auto resolves to Claude Haiku 5.5; retired entries stay allowlisted', () => {
  const freeAuto = decideAnimationModelAccess({ tier: 'free', choice: 'auto' });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed) {
    assert.equal(freeAuto.policy.provider, 'kie');
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);
  }

  // Retired catalog entries stay allowlisted so historical rows keep their
  // labels; resolveChatProvider reroutes them to Auto.
  for (const [choice, requestedModel] of [
    ['deepseek', 'deepseek-v4-flash'],
    ['kie', 'gpt-5-6-luna'],
    ['kie', 'gpt-5-6-sol'],
    ['kie', 'gpt-6-1-sol'],
  ] as const) {
    assert.equal(
      decideAnimationModelAccess({ tier: 'free', choice, requestedModel })
        .allowed,
      true
    );
  }

  assert.deepEqual(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'auto',
      requestedModel: 'gemini-3.6-flash',
    }),
    { allowed: false, reason: 'INVALID_MODEL' }
  );
});

test('GPT-6 Luna is the only public catalog entry', () => {
  assert.deepEqual(
    animationModelPolicies
      .filter((policy) => policy.publicCatalog)
      .map((policy) => `${policy.provider}:${policy.model}`),
    ['kie:gpt-6-luna']
  );
});

test('KIE is the only vendor in the chain (2026-10-14)', () => {
  const haiku = animationModelPolicies[0];
  const allKeys = {
    deepseek_api_key: 'configured',
    kuaipao_api_key: 'configured',
    kie_api_key: 'configured',
  };
  assert.deepEqual(animationProviderTargetPlan(allKeys, haiku), [
    { provider: 'kie', model: 'gpt-6-luna', reasoningEffort: 'high' },
  ]);
  // DeepSeek and Kuaipao keys left in admin settings never join the chain.
  assert.deepEqual(
    animationProviderTargetPlan(
      { deepseek_api_key: 'configured', kuaipao_api_key: 'configured' },
      haiku
    ),
    []
  );
  const lite = getAnimationModelPolicy('deepseek', 'deepseek-v4-flash')!;
  assert.deepEqual(animationProviderTargetPlan(allKeys, lite), []);
});

test('the backup route joins the plan last and only when fully configured', () => {
  const sol = animationModelPolicies[0];
  const base = { kie_api_key: 'configured' };
  const plan = animationProviderTargetPlan(
    {
      ...base,
      animation_backup_base_url: 'https://backup.example.com/v1',
      animation_backup_api_key: 'configured',
      animation_backup_model: 'gpt-5.5',
    },
    sol
  );
  assert.deepEqual(
    plan.map((target) => target.provider),
    ['kie', 'backup']
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
      animationProviderTargetPlan(partial, sol).map(
        (target) => target.provider
      ),
      ['kie'],
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
    getAnimationModelPolicy('deepseek', 'deepseek-v4-pro'),
    getAnimationModelPolicy('deepseek', 'deepseek-chat'),
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
  assert.equal(parseModelChoice('deepseek'), 'deepseek');
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

test('client model values preserve the explicit provider boundary', () => {
  assert.equal(
    animationModelValue('deepseek', 'deepseek-v4-flash'),
    'deepseek:deepseek-v4-flash'
  );
  assert.deepEqual(parseAnimationModelValue('deepseek:deepseek-v4-flash'), {
    modelChoice: 'deepseek',
    model: 'deepseek-v4-flash',
  });
  assert.deepEqual(parseAnimationModelValue('kie:gpt-5-6-luna'), {
    modelChoice: 'kie',
    model: 'gpt-5-6-luna',
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
