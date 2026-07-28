import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  AITaskStatus,
  createTask,
  updateTask,
} from '@/modules/ai-tasks/service';
import { approveAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

import {
  AnimationApiError,
  animationErrorInit,
  animationErrorResponse,
  callbackUrl,
  resolveRenderer,
} from '../-shared';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5_000,
      keyPrefix: 'animation-generation',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationApprove
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    const configs = await getAllConfigs();
    const renderer = resolveRenderer(configs);
    let creditTaskId: string | undefined;
    if (renderer) {
      const configuredCost = Number.parseInt(
        configs.animation_render_credits || '20',
        10
      );
      const costCredits = Number.isSafeInteger(configuredCost)
        ? Math.max(0, Math.min(configuredCost, 1_000_000))
        : 20;
      try {
        const task = await createTask({
          userId: session.user.id,
          mediaType: 'animation_render',
          provider: renderer.name,
          model: 'deterministic-manim-v2',
          prompt: `animation:${params.id}`,
          costCredits,
          options: { animationId: params.id },
        });
        creditTaskId = task.id;
      } catch (error) {
        if (
          /insufficient credits/i.test(
            error instanceof Error ? error.message : ''
          )
        ) {
          throw new AnimationApiError(
            'Insufficient credits for this render',
            'INSUFFICIENT_CREDITS',
            402
          );
        }
        throw error;
      }
    }
    try {
      return respData(
        await approveAnimation({
          userId: session.user.id,
          id: params.id,
          renderer,
          callbackUrl: callbackUrl(request, configs.app_url, params.id),
          creditTaskId,
          signal: request.signal,
        })
      );
    } catch (error) {
      if (creditTaskId) {
        await updateTask({
          taskId: creditTaskId,
          status: AITaskStatus.FAILED,
        }).catch(() => undefined);
      }
      throw error;
    }
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

export const Route = createFileRoute('/api/animations/$id/approve')({
  server: { handlers: { POST } },
});
