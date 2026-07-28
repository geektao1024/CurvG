import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { publishAnimation } from '@/modules/animations/service';
import { respData, respErr } from '@/lib/resp';

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
    return respData(await publishAnimation(session.user.id, params.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Publish failed', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/animations/$id/publish')({
  server: { handlers: { POST } },
});
