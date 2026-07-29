/**
 * Server-authoritative animation model policy.
 *
 * Only models in this allowlist may be used by the animation APIs. Keep this
 * list deliberately small: every entry has been verified against the Yunwu
 * OpenAI-compatible endpoint. Unknown models fail closed instead of silently
 * becoming free when Yunwu adds new aliases.
 */
export const animationModelPolicies = [
  {
    provider: 'yunwu',
    model: 'deepseek-v4-pro',
    presetKey: 'deepseekV4Pro',
    requiredTier: 'free',
  },
  {
    provider: 'yunwu',
    model: 'deepseek-v4-flash',
    presetKey: 'deepseekV4Flash',
    requiredTier: 'starter',
  },
  {
    provider: 'yunwu',
    model: 'qwen3-coder-plus',
    presetKey: 'qwen3Coder',
    requiredTier: 'starter',
  },
  {
    provider: 'yunwu',
    model: 'gpt-5',
    presetKey: 'gpt5',
    requiredTier: 'pro',
  },
  {
    provider: 'yunwu',
    model: 'gpt-5.5',
    presetKey: 'gpt55',
    requiredTier: 'pro',
  },
  {
    provider: 'yunwu',
    model: 'claude-sonnet-4-6',
    presetKey: 'claudeSonnet46',
    requiredTier: 'pro',
  },
  {
    provider: 'yunwu',
    model: 'claude-opus-4-7',
    presetKey: 'claudeOpus47',
    requiredTier: 'pro',
  },
] as const;

export type AnimationModelPolicy = (typeof animationModelPolicies)[number];
export type AnimationAccessTier = 'free' | 'starter' | 'pro';

export const DEFAULT_ANIMATION_MODEL = 'deepseek-v4-pro';

// Auto mode may fail over only for Pro users. Explicit model selections never
// switch silently. Keep the chain short so one request cannot fan out across
// the whole catalog during an upstream incident.
export const PRO_AUTO_FALLBACK_MODELS = [
  'qwen3-coder-plus',
  'claude-sonnet-4-6',
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
  if ((!auto && params.choice !== 'yunwu') || (auto && params.requestedModel)) {
    return { allowed: false, reason: 'INVALID_MODEL' };
  }
  const model = auto ? DEFAULT_ANIMATION_MODEL : params.requestedModel?.trim();
  if (!model) return { allowed: false, reason: 'INVALID_MODEL' };
  const policy = getAnimationModelPolicy('yunwu', model);
  if (!policy) return { allowed: false, reason: 'MODEL_UNAVAILABLE' };
  if (!canUseAnimationModel(params.tier, policy)) {
    return { allowed: false, reason: 'PRO_REQUIRED' };
  }
  return { allowed: true, auto, policy };
}
