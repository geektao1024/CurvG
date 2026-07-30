import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getAnimation,
  removeAnimation,
  renameAnimation,
} from '@/modules/animations/service';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr, respOk } from '@/lib/resp';

async function getUser(request: Request) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error('Unauthorized');
  return session.user;
}

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const user = await getUser(request);
    return respData(await getAnimation(user.id, params.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

async function DELETE({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const user = await getUser(request);
    await removeAnimation(user.id, params.id);
    return respOk();
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

async function PATCH({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const user = await getUser(request);
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationAction
    );
    if (typeof body.title !== 'string') {
      return respErr('Title is required', { status: 400 });
    }
    return respData(
      await renameAnimation({
        userId: user.id,
        id: params.id,
        title: body.title,
      })
    );
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    const message = error instanceof Error ? error.message : 'Internal error';
    return respErr(message, {
      status: message === 'Unauthorized' ? 401 : 400,
    });
  }
}

export const Route = createFileRoute('/api/animations/$id')({
  server: { handlers: { GET, PATCH, DELETE } },
});
