import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { restoreAnimationVersion } from '@/modules/animations/service';
import { respData, respErr } from '@/lib/resp';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string; version: string };
}) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const version = Number.parseInt(params.version, 10);
    if (!Number.isSafeInteger(version) || version < 1) {
      return respErr('Invalid version', { status: 400 });
    }
    return respData(
      await restoreAnimationVersion({
        userId: session.user.id,
        id: params.id,
        version,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Restore failed', {
      status: 400,
    });
  }
}

export const Route = createFileRoute(
  '/api/animations/$id/versions/$version/restore'
)({ server: { handlers: { POST } } });
