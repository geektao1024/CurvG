/**
 * Server-authoritative animation model policy.
 *
 * Only models in this allowlist may be used by the animation APIs. Keep this
 * list deliberately small: every entry must have a documented provider
 * endpoint. Unknown models fail closed instead of silently inheriting access
 * when an upstream platform adds new aliases.
 *
 * Single public model (2026-10-15): KIE Claude Haiku 5.5 — better scenes in
 * the owner's comparison and a tenth of GPT-6.1 Sol's token price ($0.06 /
 * $0.30 per 1M in/out), which is what makes the plans profitable at full use
 * (docs/MONETIZATION.md). GPT-6.1 Sol was the single model on 2026-10-14.
 * DeepSeek and Kuaipao
 * were removed from routing after 30 days without one delivered video (Kuaipao
 * out of quota since mid-September, DeepSeek truncating). Retired entries stay
 * allowlisted with `publicCatalog: false` only so historical conversations
 * keep their labels; `resolveChatProvider` routes them to the public model.
 */
export const animationModelPolicies = [
  {
    provider: 'kie',
    model: 'claude-haiku-5-5',
    presetKey: 'curvgPro',
    requiredTier: 'free',
    publicCatalog: true,
  },
  {
    provider: 'kie',
    model: 'gpt-6-1-sol',
    presetKey: 'curvgPro',
    requiredTier: 'free',
    publicCatalog: false,
  },
  {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    presetKey: 'curvgLite',
    requiredTier: 'free',
    publicCatalog: false,
  },
  {
    provider: 'kie',
    model: 'gpt-5-6-luna',
    presetKey: 'curvgPro',
    requiredTier: 'free',
    publicCatalog: false,
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

export const DEFAULT_ANIMATION_MODEL = 'claude-haiku-5-5';
export const DEFAULT_ANIMATION_PROVIDER = 'kie';

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
  if (model === 'gpt-6-1-sol' || model === 'gpt-5-6-sol') return 'xhigh';
  // Claude on Kie has a thinking on/off switch only; `high` turns it on.
  if (model === 'claude-haiku-5-5') return 'high';
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
  if (model === 'gpt-6-1-sol' || model === 'gpt-5-6-sol') return 'high';
  if (model === 'claude-haiku-5-5') return 'high';
  return model === 'gemini-3.6-flash' ? 'medium' : undefined;
}

// Auto candidates in preference order; resolveChatProvider picks the first
// with a configured credential. One target while KIE is the only vendor.
export const FREE_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'claude-haiku-5-5' },
] as const;

export const PRO_AUTO_MODEL_TARGETS = [
  { provider: 'kie', model: 'claude-haiku-5-5' },
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
