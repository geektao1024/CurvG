import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

import { startSilentAnimationProduction } from '../-production';
import {
  animationErrorInit,
  animationErrorResponse,
  resolveChatProvider,
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
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationApprove
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    // "Export in HD" on a finished preview, or an explicit preview render.
    const delivery =
      body.delivery === 'hd' || body.delivery === 'preview'
        ? body.delivery
        : undefined;
    const configs = await getAllConfigs();
    const detail = await getAnimation(session.user.id, params.id);
    const modelSelection = detail.parts.modelSelection || { choice: 'auto' };
    const chatResolution =
      detail.parts.creationMode === 'template'
        ? undefined
        : await resolveChatProvider(
            configs,
            session.user.id,
            modelSelection.choice,
            modelSelection.model
          );
    return respData(
      await startSilentAnimationProduction({
        request,
        configs,
        userId: session.user.id,
        animation: detail,
        provider: chatResolution?.provider,
        model: chatResolution?.model,
        delivery,
        userApproved: true,
        signal: request.signal,
      })
    );
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
