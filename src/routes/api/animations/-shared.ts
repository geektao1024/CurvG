import { and, eq, isNull, lte, or } from 'drizzle-orm';

import {
  ChatModelCircuitBreaker,
  ChatProviderError,
  ProviderFailoverChatProvider,
  type ChatProvider,
} from '@/core/ai/chat';
import { KieChatProvider, type KieChatModel } from '@/core/ai/kie-chat';
import { KuaipaoChatProvider } from '@/core/ai/kuaipao-chat';
import { HttpAnimationOrchestrator } from '@/core/animation-orchestrator';
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

const modelChoices = new Set<AnimationModelChoice>(['auto', 'kuaipao']);

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
      upstream_invalid_request: 'The AI provider rejected the request shape.',
      output_truncated: 'The AI response reached its output limit.',
      malformed_stream: 'The AI provider returned a malformed stream.',
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

function kuaipaoProvider(configs: ConfigMap) {
  if (!configs.kuaipao_api_key) {
    throw new AnimationApiError(
      'Kuaipao chat provider is not configured',
      'MODEL_UNAVAILABLE',
      503
    );
  }
  return new KuaipaoChatProvider({
    apiKey: configs.kuaipao_api_key,
    baseUrl: configs.kuaipao_base_url || 'https://kuaipao.pro/v1',
    maxAttempts: 2,
    requestTimeoutMs: 240_000,
    overallTimeoutMs: 300_000,
  });
}

function kieProvider(configs: ConfigMap) {
  if (!configs.kie_api_key) {
    throw new AnimationApiError(
      'KIE chat provider is not configured',
      'MODEL_UNAVAILABLE',
      503
    );
  }
  return new KieChatProvider({
    apiKey: configs.kie_api_key,
    baseUrl: configs.kie_base_url || 'https://api.kie.ai',
    maxAttempts: 2,
    requestTimeoutMs: 105_000,
    overallTimeoutMs: 210_000,
  });
}

export interface AnimationProviderTargetPlan {
  provider: 'kuaipao' | 'kie';
  model: string;
  reasoningEffort?: 'high';
}

const KIE_RESILIENCE_MODEL = 'gpt-5-5' satisfies KieChatModel;

/**
 * Keep the public product choice pinned to GPT-5.6 while giving both Auto and
 * an explicit Kuaipao selection a genuinely independent recovery route. The
 * fallback is intentionally server-owned: it is invoked only after the
 * primary provider fails, and is not advertised as another selectable model.
 */
export function animationProviderTargetPlan(
  configs: ConfigMap,
  primary: Pick<AnimationModelPolicy, 'provider' | 'model'>
): AnimationProviderTargetPlan[] {
  const targets: AnimationProviderTargetPlan[] = [];
  if (primary.provider === 'kuaipao' && configs.kuaipao_api_key) {
    targets.push({
      provider: 'kuaipao',
      model: primary.model,
      reasoningEffort: getAnimationReasoningEffort(primary.model),
    });
  }
  if (configs.kie_api_key) {
    targets.push({
      provider: 'kie',
      model: KIE_RESILIENCE_MODEL,
      reasoningEffort: 'high',
    });
  }
  return targets;
}

interface ProviderResolution {
  provider: ChatProvider;
  model: string;
}

const autoModelCircuitBreaker = new ChatModelCircuitBreaker();
// GPT-5.6 scene/code synthesis regularly needs more than 105 seconds even at
// bounded composition effort. Give the primary target a realistic window;
// the caller's absolute stage deadline still caps the complete failover chain
// and leaves KIE the remaining budget when Kuaipao does not respond.
const ANIMATION_PROVIDER_TIMEOUT_MS = 180_000;

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
  return policy.provider === 'kuaipao' && !!configs.kuaipao_api_key;
}

function resilientProvider(
  configs: ConfigMap,
  primary: AnimationModelPolicy
): ChatProvider {
  const specs = animationProviderTargetPlan(configs, primary);
  if (specs.length === 0) {
    throw new AnimationApiError(
      'Animation model is not currently available',
      'MODEL_UNAVAILABLE',
      503
    );
  }
  const providers = new Map<string, ChatProvider>();
  const targets = specs.map((spec) => {
    let provider = providers.get(spec.provider);
    if (!provider) {
      provider =
        spec.provider === 'kuaipao'
          ? kuaipaoProvider(configs)
          : kieProvider(configs);
      providers.set(spec.provider, provider);
    }
    return {
      provider,
      model: spec.model,
      reasoningEffort: spec.reasoningEffort,
    };
  });
  if (targets.length === 1) return targets[0].provider;
  return new ProviderFailoverChatProvider(
    targets,
    targets.length * ANIMATION_PROVIDER_TIMEOUT_MS,
    autoModelCircuitBreaker,
    ANIMATION_PROVIDER_TIMEOUT_MS
  );
}

export async function listAnimationModels(
  configs: ConfigMap,
  userId: string
): Promise<AnimationModelCatalog> {
  const viewerTier = await getAnimationAccessTier(userId);
  // The product catalog is the intersection of the reviewed model allowlist
  // and a configured credential. We deliberately do not expose every model
  // returned by the upstream `/models` endpoint.
  const kuaipaoOptions = configs.kuaipao_api_key
    ? policyOptions(viewerTier, 'kuaipao')
    : [];
  const discoveredOptions = kuaipaoOptions;
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
  // Historic animation rows may still carry a Kie selection. Public requests
  // pass through parseModelChoice and reject that stale value; only trusted
  // persisted rows are migrated to the new Auto target here so approval and
  // repair of existing work do not become permanently blocked.
  const normalizedChoice =
    (choice as string) === 'kuaipao' ? 'kuaipao' : 'auto';
  const decision = decideAnimationModelAccess({
    tier,
    choice: normalizedChoice,
    requestedModel: normalizedChoice === 'kuaipao' ? requestedModel : undefined,
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
    return {
      provider: resilientProvider(configs, decision.policy),
      model: decision.policy.model,
    };
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
  return {
    provider: resilientProvider(configs, policies[0]),
    model: policies[0].model,
  };
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
  acquire(userId: string, ownerToken?: string): Promise<string | null>;
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
  async acquire(userId, ownerToken) {
    await ensureAnimationCapacitySlots();
    const now = new Date();
    await db()
      .update(animationGenerationLease)
      .set({ leaseToken: null, userId: null, expiresAt: null })
      .where(lte(animationGenerationLease.expiresAt, now));

    const [existingUserLease] = await db()
      .select({
        slotId: animationGenerationLease.slotId,
        leaseToken: animationGenerationLease.leaseToken,
      })
      .from(animationGenerationLease)
      .where(eq(animationGenerationLease.userId, userId))
      .limit(1);
    if (existingUserLease) {
      if (!ownerToken || existingUserLease.leaseToken !== ownerToken) {
        return null;
      }
      await db()
        .update(animationGenerationLease)
        .set({
          expiresAt: new Date(now.getTime() + ANIMATION_CAPACITY_LEASE_MS),
        })
        .where(
          and(
            eq(animationGenerationLease.slotId, existingUserLease.slotId),
            eq(animationGenerationLease.leaseToken, ownerToken)
          )
        );
      return ownerToken;
    }

    const token = ownerToken || getUuid();
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
  leaseBackend: AnimationCapacityLeaseBackend = databaseAnimationCapacityLease,
  ownerToken?: string
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
    leaseToken = await leaseBackend.acquire(userId, ownerToken);
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

export function resolveAnimationOrchestrator(configs: ConfigMap) {
  const url = configs.animation_orchestrator_url?.trim();
  const token = configs.animation_orchestrator_token?.trim();
  if (!url && !token) return undefined;
  if (!url || !token) {
    throw new Error('Animation orchestrator configuration is incomplete');
  }
  return new HttpAnimationOrchestrator({ baseUrl: url, token });
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
