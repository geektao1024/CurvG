import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { createAnimation, listAnimations } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type { AnimationDetail } from '@/lib/animation';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import { respData, respErr } from '@/lib/resp';

import {
  parseModelChoice,
  parseSubject,
  resolveChatProvider,
} from './animations/-shared';
import { animationEventStream } from './animations/-stream';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');
    return respData(await listAnimations(session.user.id));
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized');
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 10_000,
      keyPrefix: 'animation-create',
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
        const animation = await createAnimation({
          userId: session.user.id,
          prompt,
          subject: parseSubject(body.subject),
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
    const result: AnimationDetail = await createAnimation({
      userId: session.user.id,
      prompt,
      subject: parseSubject(body.subject),
      ...provider,
    });
    return respData(result);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations')({
  server: { handlers: { GET, POST } },
});
