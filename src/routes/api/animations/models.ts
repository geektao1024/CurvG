import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

import {
  animationErrorInit,
  animationErrorResponse,
  listAnimationModels,
} from './-shared';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    return respData(
      await listAnimationModels(await getAllConfigs(), session.user.id),
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch (error) {
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

export const Route = createFileRoute('/api/animations/models')({
  server: { handlers: { GET } },
});
