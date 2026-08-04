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

test('the default free model is CurvG Lite on DeepSeek', () => {
  const policy = getAnimationModelPolicy('deepseek', DEFAULT_ANIMATION_MODEL);

  assert.ok(policy);
  assert.equal(policy.model, 'deepseek-v4-flash');
  assert.equal(policy.presetKey, 'curvgLite');
  assert.equal(policy.requiredTier, 'free');
  assert.equal(canUseAnimationModel('free', policy), true);
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

test('Auto resolves to Lite; explicit selections cover both public tiers', () => {
  const freeAuto = decideAnimationModelAccess({ tier: 'free', choice: 'auto' });
  assert.equal(freeAuto.allowed, true);
  if (freeAuto.allowed) {
    assert.equal(freeAuto.policy.provider, 'deepseek');
    assert.equal(freeAuto.policy.model, DEFAULT_ANIMATION_MODEL);
  }

  assert.equal(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'deepseek',
      requestedModel: 'deepseek-v4-flash',
    }).allowed,
    true
  );
  assert.equal(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'kie',
      requestedModel: 'gpt-5-6-luna',
    }).allowed,
    true
  );
  // Retired catalog entries stay allowlisted for historical rows.
  assert.equal(
    decideAnimationModelAccess({
      tier: 'free',
      choice: 'kie',
      requestedModel: 'gpt-5-6-sol',
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

test('the catalog holds the two public tiers plus retired hidden entries', () => {
  assert.deepEqual(animationModelPolicies, [
    {
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
      presetKey: 'curvgLite',
      requiredTier: 'free',
      publicCatalog: true,
    },
    {
      provider: 'kie',
      model: 'gpt-5-6-luna',
      presetKey: 'curvgPro',
      requiredTier: 'free',
      publicCatalog: true,
    },
    {
      provider: 'kie',
      model: 'gpt-5-6-sol',
      presetKey: 'kieGpt56Sol',
      requiredTier: 'free',
      publicCatalog: false,
    },
    {
      provider: 'kie',
      model: 'gemini-3.6-flash',
      presetKey: 'kieGemini36Flash',
      requiredTier: 'free',
      publicCatalog: false,
    },
  ]);
});

test('Lite chain: DeepSeek primary with Kuaipao recovery', () => {
  const lite = animationModelPolicies[0];
  assert.deepEqual(
    animationProviderTargetPlan(
      {
        deepseek_api_key: 'configured',
        kuaipao_api_key: 'configured',
        kie_api_key: 'configured',
      },
      lite
    ),
    [
      {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
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
    animationProviderTargetPlan({ deepseek_api_key: 'configured' }, lite),
    [
      {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        reasoningEffort: 'high',
      },
    ]
  );
});

test('Pro chain: KIE Luna, Kuaipao recovery, DeepSeek last resort', () => {
  const pro = animationModelPolicies[1];
  assert.deepEqual(
    animationProviderTargetPlan(
      {
        deepseek_api_key: 'configured',
        kuaipao_api_key: 'configured',
        kie_api_key: 'configured',
      },
      pro
    ),
    [
      {
        provider: 'kie',
        model: 'gpt-5-6-luna',
        reasoningEffort: 'max',
      },
      {
        provider: 'kuaipao',
        model: 'gpt-5.6-sol',
        reasoningEffort: 'high',
      },
      {
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        reasoningEffort: 'high',
      },
    ]
  );
  // Without a DeepSeek key the Pro chain degrades to the 2026-08-03 pair.
  assert.deepEqual(
    animationProviderTargetPlan(
      { kie_api_key: 'configured', kuaipao_api_key: 'configured' },
      pro
    ).map((target) => target.provider),
    ['kie', 'kuaipao']
  );
});

test('the backup route joins the plan last and only when fully configured', () => {
  const pro = animationModelPolicies[1];
  const base = {
    kie_api_key: 'configured',
    kuaipao_api_key: 'configured',
    deepseek_api_key: 'configured',
  };

  // All three backup settings present: the route is appended after every
  // first-party provider, never before them.
  const plan = animationProviderTargetPlan(
    {
      ...base,
      animation_backup_base_url: 'https://backup.example.com/v1',
      animation_backup_api_key: 'configured',
      animation_backup_model: 'gpt-5.5',
    },
    pro
  );
  assert.deepEqual(
    plan.map((target) => target.provider),
    ['kie', 'kuaipao', 'deepseek', 'backup']
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
      animationProviderTargetPlan(partial, pro).map(
        (target) => target.provider
      ),
      ['kie', 'kuaipao', 'deepseek'],
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
