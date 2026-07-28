import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { updateAnimationSpec } from '@/modules/animations/service';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

async function PATCH({
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
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationSpec
    );
    return respData(
      await updateAnimationSpec({
        userId: session.user.id,
        id: params.id,
        spec: body.spec,
      })
    );
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    return respErr(
      error instanceof Error ? error.message : 'Specification update failed',
      { status: 400 }
    );
  }
}

export const Route = createFileRoute('/api/animations/$id/spec')({
  server: { handlers: { PATCH } },
});
