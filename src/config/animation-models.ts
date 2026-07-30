/**
 * Server-authoritative animation model policy.
 *
 * Only models in this allowlist may be used by the animation APIs. Keep this
 * list deliberately small: every entry must have a documented provider
 * endpoint. Unknown models fail closed instead of silently inheriting access
 * when an upstream platform adds new aliases.
 */
export const animationModelPolicies = [
  {
    provider: 'kie',
    model: 'gemini-3.6-flash',
    presetKey: 'kieGemini36Flash',
    requiredTier: 'free',
  },
  {
    provider: 'kie',
    model: 'grok-4-5',
    presetKey: 'kieGrok45',
    requiredTier: 'free',
  },
  {
    provider: 'kie',
    model: 'gemini-3.1-pro',
    presetKey: 'kieGemini31Pro',
    requiredTier: 'free',
  },
  {
    provider: 'kie',
    model: 'gpt-5-2',
    presetKey: 'kieGpt52',
    requiredTier: 'pro',
  },
  {
    provider: 'kie',
    model: 'gpt-5-5',
    presetKey: 'kieGpt55',
    requiredTier: 'pro',
  },
  {
    provider: 'kie',
    model: 'claude-sonnet-4-6',
    presetKey: 'kieClaudeSonnet46',
    requiredTier: 'pro',
  },
  {
    provider: 'kie',
    model: 'claude-opus-4-7',
    presetKey: 'kieClaudeOpus47',
    requiredTier: 'pro',
  },
] as const;

export type AnimationModelPolicy = (typeof animationModelPolicies)[number];
export type AnimationAccessTier = 'free' | 'starter' | 'pro';

export const DEFAULT_ANIMATION_MODEL = 'gemini-3.6-flash';
export const DEFAULT_ANIMATION_PROVIDER = 'kie';

/**
 * Provider tuning is allowlisted just like model access. Keeping reasoning at
 * low protects the animation stage deadline while still allowing the models
 * to plan structured scenes.
 */
export function getAnimationReasoningEffort(model: string): 'low' | undefined {
  return [
    'gemini-3.6-flash',
    'grok-4-5',
    'gemini-3.1-pro',
    'gpt-5-2',
    'gpt-5-5',
  ].includes(model)
    ? 'low'
    : undefined;
}

export const FREE_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'gemini-3.6-flash' },
  { provider: 'kie', model: 'grok-4-5' },
  { provider: 'kie', model: 'gemini-3.1-pro' },
] as const;

// Runtime resolution caps Auto at three targets. Claude Opus remains an
// explicit choice because using it as an automatic fallback has a materially
// higher cost and latency profile.
export const PRO_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'gpt-5-2' },
  { provider: 'kie', model: 'gpt-5-5' },
  { provider: 'kie', model: 'claude-sonnet-4-6' },
] as const;

export function getAnimationModelPolicy(
  provider: string,
  model: string
): AnimationModelPolicy | undefined {
  return animationModelPolicies.find(
    (entry) => entry.provider === provider && entry.model === model
  );
}

export function canUseAnimationModel(
  tier: AnimationAccessTier,
  policy: AnimationModelPolicy
): boolean {
  const rank: Record<AnimationAccessTier, number> = {
    free: 0,
    starter: 1,
    pro: 2,
  };
  return rank[tier] >= rank[policy.requiredTier];
}

export type AnimationModelDecision =
  | { allowed: true; auto: boolean; policy: AnimationModelPolicy }
  | {
      allowed: false;
      reason: 'INVALID_MODEL' | 'MODEL_UNAVAILABLE' | 'PRO_REQUIRED';
    };

/** Pure authorization decision shared by all animation AI entry points. */
export function decideAnimationModelAccess(params: {
  tier: AnimationAccessTier;
  choice: string;
  requestedModel?: string;
}): AnimationModelDecision {
  const auto = params.choice === 'auto';
  const explicitProvider = params.choice === 'kie' ? params.choice : undefined;
  if ((!auto && !explicitProvider) || (auto && params.requestedModel)) {
    return { allowed: false, reason: 'INVALID_MODEL' };
  }
  const model = auto ? DEFAULT_ANIMATION_MODEL : params.requestedModel?.trim();
  if (!model) return { allowed: false, reason: 'INVALID_MODEL' };
  const policy = getAnimationModelPolicy(
    auto ? DEFAULT_ANIMATION_PROVIDER : explicitProvider!,
    model
  );
  if (!policy) return { allowed: false, reason: 'MODEL_UNAVAILABLE' };
  if (!canUseAnimationModel(params.tier, policy)) {
    return { allowed: false, reason: 'PRO_REQUIRED' };
  }
  return { allowed: true, auto, policy };
}
