/**
 * Server-authoritative animation model policy.
 *
 * Only models in this allowlist may be used by the animation APIs. Keep this
 * list deliberately small: every entry must have a documented provider
 * endpoint. Unknown models fail closed instead of silently inheriting access
 * when an upstream platform adds new aliases.
 *
 * Public product tiers (2026-08-04): CurvG Lite = DeepSeek v4-flash with
 * thinking maxed, CurvG Pro = KIE GPT-5.6 Luna at max reasoning. Retired
 * catalog entries stay allowlisted with `publicCatalog: false` so historical
 * conversations that recorded them keep replaying and re-rendering.
 */
export const animationModelPolicies = [
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
] as const;

export type AnimationModelPolicy = (typeof animationModelPolicies)[number];
export type AnimationAccessTier = 'free' | 'starter' | 'pro';

// New conversations default to CurvG Lite: fastest first impression while
// both tiers are free; the telemetry table decides whether it keeps the slot.
export const DEFAULT_ANIMATION_MODEL = 'deepseek-v4-flash';
export const DEFAULT_ANIMATION_PROVIDER = 'deepseek';

/**
 * Provider tuning is allowlisted just like model access. Pro (Luna) runs at
 * literal max everywhere — the 2026-08-04 decision trades wall-clock for
 * depth now that the scene window is 300s per target. Lite (DeepSeek flash)
 * runs with thinking maxed for this route (`high`; the provider normalizes
 * anything above). KIE clamps a rejected tier to `high` automatically.
 */
export function getAnimationReasoningEffort(
  model: string
): 'max' | 'xhigh' | 'high' | undefined {
  if (model === 'gpt-5-6-luna') return 'max';
  if (model === 'deepseek-v4-flash') return 'high';
  if (model === 'gpt-5-6-sol') return 'xhigh';
  return model === 'gemini-3.6-flash' ? 'high' : undefined;
}

/**
 * Scene assembly and Python composition consume already-approved planning
 * artifacts and produce the largest responses. Pro keeps max here too (per
 * the 2026-08-04 decision — the widened scene window absorbs it); the other
 * routes stay one tier below their planning effort.
 */
export function getAnimationCompositionReasoningEffort(
  model: string
): 'max' | 'high' | 'medium' | undefined {
  if (model === 'gpt-5-6-luna') return 'max';
  if (model === 'deepseek-v4-flash') return 'high';
  if (model === 'gpt-5-6-sol') return 'high';
  return model === 'gemini-3.6-flash' ? 'medium' : undefined;
}

// Auto candidates in preference order; resolveChatProvider picks the first
// with a configured credential. Luna trails Lite so a deployment window
// without a DeepSeek key degrades Auto to Pro instead of failing every
// default-tier request with 503.
export const FREE_AUTO_MODEL_TARGETS = [
  { provider: 'deepseek', model: 'deepseek-v4-flash' },
  { provider: 'kie', model: 'gpt-5-6-luna' },
] as const;

// Keep the Pro Auto target identical during the focused comparison period so
// subscription tier cannot silently change the model under evaluation.
export const PRO_AUTO_MODEL_TARGETS = [
  { provider: 'deepseek', model: 'deepseek-v4-flash' },
  { provider: 'kie', model: 'gpt-5-6-luna' },
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
  const explicitProvider =
    params.choice === 'kie' || params.choice === 'deepseek'
      ? params.choice
      : undefined;
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
