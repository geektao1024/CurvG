import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { matchVideoTemplate } from '@/modules/animations/template-match';
import { getAllConfigs } from '@/modules/config/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';
import { getLocale } from '@/paraglide/runtime.js';

import {
  animationErrorInit,
  animationErrorResponse,
  resolveChatProvider,
} from '../animations/-shared';

/**
 * Free text → a verified template with its parameters filled. One small
 * model call (a few seconds, a fraction of a cent); nothing is created or
 * charged until the user presses render.
 */
async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 2_000,
      keyPrefix: 'video-template-match',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationCreate
    );
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required', { status: 400 });
    if (prompt.length > 2000)
      return respErr('Prompt is too long', { status: 400 });
    const configs = await getAllConfigs();
    const { provider, model } = await resolveChatProvider(
      configs,
      session.user.id,
      'auto'
    );
    return respData(
      await matchVideoTemplate({
        provider,
        model,
        prompt,
        locale: typeof body.locale === 'string' ? body.locale : getLocale(),
        signal: request.signal,
      })
    );
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

export const Route = createFileRoute('/api/video-templates/match')({
  server: { handlers: { POST } },
});
