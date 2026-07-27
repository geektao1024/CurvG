import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { approveAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import {
  callbackUrl,
  parseModelChoice,
  resolveChatProvider,
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
    if (!session?.user) return respErr('Unauthorized');
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5_000,
      keyPrefix: 'animation-approve',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const body = await request.json().catch(() => ({}));
    const configs = await getAllConfigs();
    const provider = await resolveChatProvider(
      configs,
      parseModelChoice(body.modelChoice),
      typeof body.model === 'string' ? body.model.trim() : undefined
    );
    return respData(
      await approveAnimation({
        userId: session.user.id,
        id: params.id,
        renderer: resolveRenderer(configs),
        callbackUrl: callbackUrl(request, configs.app_url, params.id),
        ...provider,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations/$id/approve')({
  server: { handlers: { POST } },
});
