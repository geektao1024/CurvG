import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { reviseAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import { parseModelChoice, resolveChatProvider } from '../-shared';
import { animationEventStream } from '../-stream';

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
      keyPrefix: 'animation-revision',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required');
    if (prompt.length > 5000) return respErr('Prompt is too long');
    const configs = await getAllConfigs();
    const provider = await resolveChatProvider(
      configs,
      parseModelChoice(body.modelChoice),
      typeof body.model === 'string' ? body.model.trim() : undefined
    );
    if (request.headers.get('accept')?.includes('text/event-stream')) {
      return animationEventStream(async (send) => {
        const animation = await reviseAnimation({
          userId: session.user.id,
          id: params.id,
          prompt,
          ...provider,
          hooks: {
            onStarted: (started) =>
              send({ type: 'started', animation: started }),
            onSummaryDelta: (delta) => send({ type: 'delta', delta }),
          },
        });
        send({ type: 'completed', animation });
      });
    }
    return respData(
      await reviseAnimation({
        userId: session.user.id,
        id: params.id,
        prompt,
        ...provider,
      })
    );
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations/$id/message')({
  server: { handlers: { POST } },
});
