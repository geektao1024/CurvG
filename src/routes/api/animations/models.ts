import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { respData, respErr } from '@/lib/resp';

import { listAnimationModels } from './-shared';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');
    return respData(await listAnimationModels(await getAllConfigs()), {
      headers: { 'Cache-Control': 'private, max-age=60' },
    });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations/models')({
  server: { handlers: { GET } },
});
