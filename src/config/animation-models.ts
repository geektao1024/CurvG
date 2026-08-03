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
    model: 'gpt-5-6-sol',
    presetKey: 'kieGpt56Sol',
    requiredTier: 'free',
  },
  {
    provider: 'kie',
    model: 'gemini-3.6-flash',
    presetKey: 'kieGemini36Flash',
    requiredTier: 'free',
  },
] as const;

export type AnimationModelPolicy = (typeof animationModelPolicies)[number];
export type AnimationAccessTier = 'free' | 'starter' | 'pro';

export const DEFAULT_ANIMATION_MODEL = 'gpt-5-6-sol';
export const DEFAULT_ANIMATION_PROVIDER = 'kie';

/**
 * Provider tuning is allowlisted just like model access. The GPT-5.6 route
 * runs planning and mathematical stages at xhigh reasoning: production
 * showed the strict scene contract needs the extra depth, and the widened
 * stage deadlines (2026-08-03) buy the latency this costs. KIE clamps the
 * effort to `high` automatically if the upstream rejects the higher tier.
 */
export function getAnimationReasoningEffort(
  model: string
): 'xhigh' | 'high' | undefined {
  if (model === 'gpt-5-6-sol') return 'xhigh';
  return model === 'gemini-3.6-flash' ? 'high' : undefined;
}

/**
 * Scene assembly and Python composition consume already-approved planning
 * artifacts and produce the largest responses. One tier below the planning
 * effort keeps them inside the per-target deadline while the mathematical
 * stages get full depth.
 */
export function getAnimationCompositionReasoningEffort(
  model: string
): 'high' | 'medium' | undefined {
  if (model === 'gpt-5-6-sol') return 'high';
  return model === 'gemini-3.6-flash' ? 'medium' : undefined;
}

export const FREE_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'gpt-5-6-sol' },
] as const;

// Keep the Pro Auto target identical during the focused comparison period so
// subscription tier cannot silently change the model under evaluation.
export const PRO_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'gpt-5-6-sol' },
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
