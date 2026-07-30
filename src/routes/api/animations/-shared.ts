import { and, eq, isNull, lte, or } from 'drizzle-orm';

import {
  ChatModelCircuitBreaker,
  ChatProviderError,
  ProviderFailoverChatProvider,
  type ChatProvider,
} from '@/core/ai/chat';
import { KieChatProvider } from '@/core/ai/kie-chat';
import { HttpAnimationRenderer } from '@/core/animation-renderer';
import { db } from '@/core/db';
import {
  animationModelPolicies,
  canUseAnimationModel,
  decideAnimationModelAccess,
  FREE_AUTO_MODEL_TARGETS,
  getAnimationModelPolicy,
  getAnimationReasoningEffort,
  PRO_AUTO_MODEL_TARGETS,
  type AnimationAccessTier,
  type AnimationModelPolicy,
} from '@/config/animation-models';
import { animationGenerationLease } from '@/config/db/schema';
import { AnimationConflictError } from '@/modules/animations/service';
import type { ConfigMap } from '@/modules/config/service';
import { getAnimationAccessTier } from '@/modules/subscriptions/service';
import type {
  AnimationModelCatalog,
  AnimationModelChoice,
  AnimationModelOption,
  AnimationSubject,
} from '@/lib/animation';
import { getUuid } from '@/lib/hash';

const subjects = new Set<AnimationSubject>([
  'general',
  'math',
  'physics',
  'computer-science',
  'biology',
  'chemistry',
  'economics',
]);

const modelChoices = new Set<AnimationModelChoice>(['auto', 'kie']);

export class AnimationApiError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'PRO_REQUIRED'
      | 'MODEL_UNAVAILABLE'
      | 'INVALID_MODEL'
      | 'INSUFFICIENT_CREDITS'
      | 'CAPACITY_LIMIT',
    readonly status: number,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = 'AnimationApiError';
  }
}

export interface AnimationErrorResponse {
  message: string;
  status: number;
  retryAfterSeconds?: number;
}

function retryAfterSeconds(
  retryAfterMs: number | undefined,
  fallbackSeconds: number
) {
  if (typeof retryAfterMs === 'number' && retryAfterMs >= 0) {
    return Math.max(1, Math.min(Math.ceil(retryAfterMs / 1_000), 60));
  }
  return fallbackSeconds;
}

function retryAfterFromCause(error: unknown): number | undefined {
  if (error instanceof ChatProviderError && error.retryable) {
    return retryAfterSeconds(
      error.retryAfterMs,
      error.code === 'upstream_saturated' ? 5 : 3
    );
  }
  if (error && typeof error === 'object' && 'cause' in error) {
    return retryAfterFromCause((error as { cause?: unknown }).cause);
  }
  return undefined;
}

export function animationErrorResponse(error: unknown): AnimationErrorResponse {
  if (error instanceof AnimationApiError) {
    return {
      message: error.message,
      status: error.status,
      retryAfterSeconds:
        error.retryAfterSeconds ??
        (error.code === 'CAPACITY_LIMIT'
          ? 5
          : error.status === 503
            ? 15
            : undefined),
    };
  }
  if (error instanceof AnimationConflictError) {
    return { message: error.message, status: error.status };
  }
  if (error instanceof ChatProviderError) {
    const messages: Record<typeof error.code, string> = {
      upstream_saturated:
        'The selected AI model is at capacity. Please retry shortly.',
      upstream_timeout: 'The AI model timed out. Please retry.',
      upstream_unavailable: 'The AI provider is temporarily unavailable.',
      model_unavailable: 'The selected AI model is not currently available.',
      upstream_auth: 'The AI provider configuration is invalid.',
      upstream_quota: 'The AI provider quota is exhausted.',
      invalid_response: 'The AI provider returned an invalid response.',
      empty_response: 'The AI provider returned an empty response.',
      stream_interrupted: 'The AI response was interrupted. Please retry.',
      unknown: 'The AI request failed.',
    };
    const saturated = error.code === 'upstream_saturated';
    return {
      message: messages[error.code],
      status: saturated ? 429 : 503,
      retryAfterSeconds: error.retryable
        ? retryAfterSeconds(error.retryAfterMs, saturated ? 5 : 3)
        : undefined,
    };
  }
  if (error && typeof error === 'object') {
    const failure = (
      error as {
        failure?: { message?: unknown; code?: unknown; retryable?: unknown };
      }
    ).failure;
    if (failure && typeof failure.message === 'string') {
      const code = failure.code;
      const saturated = code === 'UPSTREAM_SATURATED';
      const retryable = failure.retryable === true;
      return {
        message: failure.message,
        status: saturated ? 429 : 503,
        retryAfterSeconds: retryable
          ? (retryAfterFromCause(error) ?? (saturated ? 5 : 3))
          : undefined,
      };
    }
  }
  console.error('[animations] request failed', error);
  return {
    message: 'Animation service is temporarily unavailable',
    status: 500,
  };
}

export function animationErrorInit(
  failure: AnimationErrorResponse
): ResponseInit {
  return {
    status: failure.status,
    headers: failure.retryAfterSeconds
      ? { 'Retry-After': String(failure.retryAfterSeconds) }
      : undefined,
  };
}

export function parseSubject(value: unknown): AnimationSubject {
  if (typeof value === 'string' && subjects.has(value as AnimationSubject)) {
    return value as AnimationSubject;
  }
  return 'general';
}

export function parseModelChoice(value: unknown): AnimationModelChoice {
  if (value === undefined || value === null) return 'auto';
  if (
    typeof value === 'string' &&
    modelChoices.has(value as AnimationModelChoice)
  ) {
    return value as AnimationModelChoice;
  }
  throw new AnimationApiError('Invalid animation model', 'INVALID_MODEL', 400);
}

function kieProvider(configs: ConfigMap) {
  if (!configs.kie_api_key) {
    throw new AnimationApiError(
      'Kie chat provider is not configured',
      'MODEL_UNAVAILABLE',
      503
    );
  }
  return new KieChatProvider({
    apiKey: configs.kie_api_key,
    baseUrl: configs.kie_base_url || 'https://api.kie.ai',
    maxAttempts: 1,
    // Explicit models do not have Auto's fallback budget. Give a large v5
    // scene plan enough time to stream and finish its mathematical audit while
    // the service-level 5 minute deadline remains the hard upper bound.
    requestTimeoutMs: 240_000,
    overallTimeoutMs: 300_000,
    reasoningOnlyTimeoutMs: 60_000,
  });
}

interface ProviderResolution {
  provider: ChatProvider;
  model: string;
}

const autoModelCircuitBreaker = new ChatModelCircuitBreaker();

function policyOptions(
  tier: AnimationAccessTier,
  provider: AnimationModelOption['provider']
): AnimationModelOption[] {
  return animationModelPolicies
    .filter((policy) => policy.provider === provider)
    .map((policy) => ({
      provider: policy.provider,
      model: policy.model,
      isDefault: false,
      presetKey: policy.presetKey,
      requiredTier: policy.requiredTier,
      entitled: canUseAnimationModel(tier, policy),
    }));
}

function autoModelPolicies(tier: AnimationAccessTier): AnimationModelPolicy[] {
  const targets =
    tier === 'pro' ? PRO_AUTO_MODEL_TARGETS : FREE_AUTO_MODEL_TARGETS;
  return targets.flatMap((target) => {
    const policy = getAnimationModelPolicy(target.provider, target.model);
    return policy && canUseAnimationModel(tier, policy) ? [policy] : [];
  });
}

function policyKey(policy: Pick<AnimationModelOption, 'provider' | 'model'>) {
  return `${policy.provider}:${policy.model}`;
}

function policyAvailable(policy: AnimationModelPolicy, configs: ConfigMap) {
  return policy.provider === 'kie' && !!configs.kie_api_key;
}

export async function listAnimationModels(
  configs: ConfigMap,
  userId: string
): Promise<AnimationModelCatalog> {
  const viewerTier = await getAnimationAccessTier(userId);
  // Kie does not document a shared `/models` discovery endpoint. Its catalog
  // is the intersection of our reviewed endpoint allowlist and a configured
  // credential, never an invented discovery request.
  const kieOptions = configs.kie_api_key
    ? policyOptions(viewerTier, 'kie')
    : [];
  const discoveredOptions = kieOptions;
  const entitledTargets = new Set(
    discoveredOptions.filter((option) => option.entitled).map(policyKey)
  );
  const effectiveDefault = autoModelPolicies(viewerTier).find((policy) =>
    entitledTargets.has(policyKey(policy))
  );
  const options = discoveredOptions.map((option) => ({
    ...option,
    isDefault:
      option.provider === effectiveDefault?.provider &&
      option.model === effectiveDefault.model,
  }));
  return {
    options,
    defaultProvider: effectiveDefault?.provider,
    defaultModel: effectiveDefault?.model,
    viewerTier,
    catalogStale: false,
  };
}

/**
 * Resolve and authorize in one operation so every animation AI entry point is
 * forced through the same server-side policy. Client badges are never trusted.
 */
export async function resolveChatProvider(
  configs: ConfigMap,
  userId: string,
  choice: AnimationModelChoice,
  requestedModel?: string
): Promise<ProviderResolution> {
  const tier = await getAnimationAccessTier(userId);
  const decision = decideAnimationModelAccess({
    tier,
    choice,
    requestedModel,
  });
  if (!decision.allowed) {
    const errors = {
      INVALID_MODEL: { message: 'Invalid animation model', status: 400 },
      MODEL_UNAVAILABLE: {
        message: 'Animation model is not available',
        status: 400,
      },
      PRO_REQUIRED: {
        message: 'Your current plan does not include this model',
        status: 403,
      },
    } as const;
    const error = errors[decision.reason];
    throw new AnimationApiError(error.message, decision.reason, error.status);
  }

  if (!decision.auto) {
    if (!policyAvailable(decision.policy, configs)) {
      throw new AnimationApiError(
        'Animation model is not currently available',
        'MODEL_UNAVAILABLE',
        503
      );
    }
    return { provider: kieProvider(configs), model: decision.policy.model };
  }

  const policies = autoModelPolicies(tier)
    .filter((policy) => policyAvailable(policy, configs))
    .slice(0, 3);
  if (policies.length === 0) {
    throw new AnimationApiError(
      'Animation model is not currently available',
      'MODEL_UNAVAILABLE',
      503
    );
  }
  const providers = new Map<string, ChatProvider>();
  const targets = policies.map((policy) => {
    let provider = providers.get(policy.provider);
    if (!provider) {
      provider = kieProvider(configs);
      providers.set(policy.provider, provider);
    }
    return {
      provider,
      model: policy.model,
      reasoningEffort: getAnimationReasoningEffort(policy.model),
    };
  });
  const provider = new ProviderFailoverChatProvider(
    targets,
    300_000,
    autoModelCircuitBreaker
  );
  return { provider, model: policies[0].model };
}

interface AnimationCapacityState {
  activeUsers: Set<string>;
}

declare global {
  var __animationCapacityState: AnimationCapacityState | undefined;
}

const MAX_CONCURRENT_ANIMATION_GENERATIONS = 4;
const ANIMATION_CAPACITY_LEASE_MS = 6 * 60_000;
const ANIMATION_CAPACITY_SLOT_IDS = Array.from(
  { length: MAX_CONCURRENT_ANIMATION_GENERATIONS },
  (_, index) => `animation-${index}`
);

export interface AnimationCapacityLeaseBackend {
  acquire(userId: string): Promise<string | null>;
  release(token: string): Promise<void>;
}

let capacitySlotsReady: Promise<void> | undefined;

async function ensureAnimationCapacitySlots() {
  if (!capacitySlotsReady) {
    capacitySlotsReady = (async () => {
      for (const slotId of ANIMATION_CAPACITY_SLOT_IDS) {
        try {
          await db()
            .insert(animationGenerationLease)
            .values({ slotId, updatedAt: new Date() });
        } catch (error) {
          // Cross-dialect "insert if absent" syntax differs. Verify that the
          // expected duplicate row exists; otherwise this is a real schema or
          // database failure and generation must fail closed.
          const [existing] = await db()
            .select({ slotId: animationGenerationLease.slotId })
            .from(animationGenerationLease)
            .where(eq(animationGenerationLease.slotId, slotId))
            .limit(1);
          if (!existing) throw error;
        }
      }
    })().catch((error) => {
      capacitySlotsReady = undefined;
      throw error;
    });
  }
  return capacitySlotsReady;
}

export const databaseAnimationCapacityLease: AnimationCapacityLeaseBackend = {
  async acquire(userId) {
    await ensureAnimationCapacitySlots();
    const now = new Date();
    await db()
      .update(animationGenerationLease)
      .set({ leaseToken: null, userId: null, expiresAt: null })
      .where(lte(animationGenerationLease.expiresAt, now));

    const [existingUserLease] = await db()
      .select({ slotId: animationGenerationLease.slotId })
      .from(animationGenerationLease)
      .where(eq(animationGenerationLease.userId, userId))
      .limit(1);
    if (existingUserLease) return null;

    const token = getUuid();
    const expiresAt = new Date(now.getTime() + ANIMATION_CAPACITY_LEASE_MS);
    for (const slotId of ANIMATION_CAPACITY_SLOT_IDS) {
      try {
        await db()
          .update(animationGenerationLease)
          .set({ leaseToken: token, userId, expiresAt })
          .where(
            and(
              eq(animationGenerationLease.slotId, slotId),
              or(
                isNull(animationGenerationLease.leaseToken),
                lte(animationGenerationLease.expiresAt, now)
              )
            )
          );
      } catch {
        // Most commonly the nullable unique user_id constraint won a race in
        // another instance. The token read below decides whether we acquired.
      }
      const [claimed] = await db()
        .select({ leaseToken: animationGenerationLease.leaseToken })
        .from(animationGenerationLease)
        .where(
          and(
            eq(animationGenerationLease.slotId, slotId),
            eq(animationGenerationLease.leaseToken, token)
          )
        )
        .limit(1);
      if (claimed) return token;
    }
    return null;
  },

  async release(token) {
    await db()
      .update(animationGenerationLease)
      .set({ leaseToken: null, userId: null, expiresAt: null })
      .where(eq(animationGenerationLease.leaseToken, token));
  },
};

function animationCapacityState(): AnimationCapacityState {
  if (!globalThis.__animationCapacityState) {
    globalThis.__animationCapacityState = { activeUsers: new Set() };
  }
  return globalThis.__animationCapacityState;
}

/**
 * Apply backpressure before consuming an upstream model slot. Database state
 * claims in the animation service separately protect a single animation from
 * races. The database lease enforces four slots and one slot per user across
 * server processes/Worker isolates; the local Set avoids needless DB races.
 */
export async function withAnimationGenerationCapacity<T>(
  userId: string,
  task: () => Promise<T>,
  leaseBackend: AnimationCapacityLeaseBackend = databaseAnimationCapacityLease
): Promise<T> {
  const state = animationCapacityState();
  if (
    state.activeUsers.has(userId) ||
    state.activeUsers.size >= MAX_CONCURRENT_ANIMATION_GENERATIONS
  ) {
    throw new AnimationApiError(
      'Animation generation is busy. Please retry shortly.',
      'CAPACITY_LIMIT',
      429
    );
  }
  state.activeUsers.add(userId);
  let leaseToken: string | null = null;
  try {
    leaseToken = await leaseBackend.acquire(userId);
    if (!leaseToken) {
      throw new AnimationApiError(
        'Animation generation is busy. Please retry shortly.',
        'CAPACITY_LIMIT',
        429,
        5
      );
    }
    return await task();
  } finally {
    if (leaseToken) {
      try {
        await leaseBackend.release(leaseToken);
      } catch (error) {
        console.error('[animation-capacity] lease release failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    state.activeUsers.delete(userId);
  }
}

export function resolveRenderer(configs: ConfigMap) {
  const url = configs.animation_renderer_url?.trim();
  const token = configs.animation_renderer_token?.trim();
  if (!url && !token) return undefined;
  if (!url || !token) {
    throw new Error('Animation renderer configuration is incomplete');
  }
  return new HttpAnimationRenderer({ baseUrl: url, token });
}

export function callbackUrl(request: Request, appUrl: string, id: string) {
  const origin = appUrl?.trim()
    ? new URL(appUrl).origin
    : new URL(request.url).origin;
  return `${origin}/api/animations/${encodeURIComponent(id)}/render-callback`;
}

export function qualityGateUrl(request: Request, appUrl: string, id: string) {
  const origin = appUrl?.trim()
    ? new URL(appUrl).origin
    : new URL(request.url).origin;
  return `${origin}/api/animations/${encodeURIComponent(id)}/quality-gate`;
}

export function hasBearerToken(request: Request, expected: string): boolean {
  const value = request.headers.get('authorization') || '';
  const actual = value.startsWith('Bearer ') ? value.slice(7) : '';
  const left = new TextEncoder().encode(actual);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0 && right.length > 0;
}
