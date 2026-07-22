import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAnimation, removeAnimation } from '@/modules/animations/service';
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

export const Route = createFileRoute('/api/animations/$id')({
  server: { handlers: { GET, DELETE } },
});
