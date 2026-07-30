import type { ChatProvider } from '@/core/ai/chat';
import type { AnimationOrchestrationPlan } from '@/core/animation-orchestrator';
import {
  AITaskStatus,
  createTask,
  updateTask,
} from '@/modules/ai-tasks/service';
import {
  approveAnimation,
  markAnimationProductionFailure,
} from '@/modules/animations/service';
import type { ConfigMap } from '@/modules/config/service';
import type { AnimationDetail } from '@/lib/animation';

import {
  AnimationApiError,
  callbackUrl,
  qualityGateUrl,
  resolveAnimationOrchestrator,
  resolveRenderer,
  withAnimationGenerationCapacity,
} from './-shared';

export async function startSilentAnimationProduction(params: {
  request: Request;
  configs: ConfigMap;
  userId: string;
  animation: AnimationDetail;
  provider?: ChatProvider;
  model?: string;
  orchestrationPlan?: AnimationOrchestrationPlan | null;
  capacityOwnerToken?: string;
  signal?: AbortSignal;
}): Promise<AnimationDetail> {
  let renderer: ReturnType<typeof resolveRenderer>;
  let orchestrator: ReturnType<typeof resolveAnimationOrchestrator>;
  let orchestrationPlan = params.orchestrationPlan;
  try {
    renderer = resolveRenderer(params.configs);
  } catch (error) {
    await markAnimationProductionFailure({
      userId: params.userId,
      id: params.animation.id,
      error,
    }).catch(() => undefined);
    throw error;
  }
  try {
    orchestrator = resolveAnimationOrchestrator(params.configs);
  } catch (error) {
    orchestrationPlan = null;
    console.error('[animation-orchestrator] configuration degraded', {
      animationId: params.animation.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
  let creditTaskId: string | undefined;
  if (renderer) {
    const configuredCost = Number.parseInt(
      params.configs.animation_render_credits || '20',
      10
    );
    const costCredits = Number.isSafeInteger(configuredCost)
      ? Math.max(0, Math.min(configuredCost, 1_000_000))
      : 20;
    try {
      const task = await createTask({
        userId: params.userId,
        mediaType: 'animation_render',
        provider: renderer.name,
        model: 'deterministic-manim-v3',
        prompt: `animation:${params.animation.id}`,
        costCredits,
        options: { animationId: params.animation.id },
      });
      creditTaskId = task.id;
    } catch (error) {
      let failure = error;
      if (
        /insufficient credits/i.test(
          error instanceof Error ? error.message : ''
        )
      ) {
        failure = new AnimationApiError(
          'Insufficient credits for this render',
          'INSUFFICIENT_CREDITS',
          402
        );
      }
      await markAnimationProductionFailure({
        userId: params.userId,
        id: params.animation.id,
        error: failure,
      }).catch(() => undefined);
      throw failure;
    }
  }

  const run = () =>
    approveAnimation({
      userId: params.userId,
      id: params.animation.id,
      provider: params.provider,
      model: params.model,
      renderer,
      orchestrator,
      orchestrationPlan,
      callbackUrl: callbackUrl(
        params.request,
        params.configs.app_url,
        params.animation.id
      ),
      qualityGateUrl: qualityGateUrl(
        params.request,
        params.configs.app_url,
        params.animation.id
      ),
      creditTaskId,
      signal: params.signal,
    });

  try {
    return params.provider
      ? await withAnimationGenerationCapacity(
          params.userId,
          run,
          undefined,
          params.capacityOwnerToken
        )
      : await run();
  } catch (error) {
    if (creditTaskId) {
      await updateTask({
        taskId: creditTaskId,
        status: AITaskStatus.FAILED,
      }).catch(() => undefined);
    }
    await markAnimationProductionFailure({
      userId: params.userId,
      id: params.animation.id,
      error,
    }).catch(() => undefined);
    throw error;
  }
}
