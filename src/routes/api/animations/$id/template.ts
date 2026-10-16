import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { updateTemplateAnimation } from '@/modules/animations/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';
import { TemplateParamError } from '@/lib/video-templates';

import { animationErrorInit, animationErrorResponse } from '../-shared';

/** New parameters for a template video; free, no render until asked. */
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
      intervalMs: 1_000,
      keyPrefix: 'video-template-update',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationCreate
    );
    const values =
      body.params &&
      typeof body.params === 'object' &&
      !Array.isArray(body.params)
        ? (body.params as Record<string, unknown>)
        : {};
    return respData(
      await updateTemplateAnimation({
        userId: session.user.id,
        id: params.id,
        values,
        context: {
          ...(body.frame === '9:16' || body.frame === '16:9'
            ? { frame: body.frame }
            : {}),
          ...(body.theme === 'paper' || body.theme === 'studio'
            ? { theme: body.theme }
            : {}),
        },
      })
    );
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    if (error instanceof TemplateParamError) {
      return respErr(error.message, { status: 400 });
    }
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

export const Route = createFileRoute('/api/animations/$id/template')({
  server: { handlers: { POST } },
});
