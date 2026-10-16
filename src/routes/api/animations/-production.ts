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
import type { AnimationDetail, AnimationRenderDelivery } from '@/lib/animation';

import {
  AnimationApiError,
  callbackUrl,
  freePreviewsRemaining,
  qualityGateUrl,
  resolveAnimationOrchestrator,
  resolveRenderEntitlement,
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
  /** Force a deliverable (the HD export button); otherwise decided by credits. */
  delivery?: AnimationRenderDelivery;
  /** The user pressed render (approve route), so warnings were seen. */
  userApproved?: boolean;
  signal?: AbortSignal;
}): Promise<AnimationDetail> {
  // A beta plan with unresolved mathematical findings waits for the user.
  if (
    !params.userApproved &&
    params.animation.status === 'awaiting_approval' &&
    params.animation.parts.mathWarnings?.length
  ) {
    return params.animation;
  }
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
  let delivery: AnimationRenderDelivery = params.delivery || 'hd';
  if (renderer) {
    try {
      const entitlement = await resolveRenderEntitlement(
        params.configs,
        params.userId,
        params.delivery
      );
      delivery = entitlement.delivery;
      const task = await createTask({
        userId: params.userId,
        mediaType: 'animation_render',
        provider: renderer.name,
        model: params.animation.parts.template
          ? `template:${params.animation.parts.template.id}`
          : 'deterministic-manim-v3',
        prompt: `animation:${params.animation.id}`,
        costCredits: entitlement.costCredits,
        options: {
          animationId: params.animation.id,
          delivery,
          freeRender: entitlement.costCredits === 0,
        },
      });
      creditTaskId = task.id;
      // Two renders started at once could both have seen the last free
      // preview. Count again now that this task exists; the loser fails.
      if (
        entitlement.costCredits === 0 &&
        (await freePreviewsRemaining(params.configs, params.userId)) < 0
      ) {
        await updateTask({ taskId: task.id, status: AITaskStatus.FAILED });
        creditTaskId = undefined;
        throw new AnimationApiError(
          'No free previews left; add credits to render',
          'INSUFFICIENT_CREDITS',
          402
        );
      }
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
      // An HD export of a finished preview leaves the preview as it was.
      if (params.animation.status !== 'completed') {
        await markAnimationProductionFailure({
          userId: params.userId,
          id: params.animation.id,
          error: failure,
        }).catch(() => undefined);
      }
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
      delivery,
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
