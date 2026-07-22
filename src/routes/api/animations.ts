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
    const provider = resolveChatProvider(
      configs,
      parseModelChoice(body.modelChoice)
    );
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
