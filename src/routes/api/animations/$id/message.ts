import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { reviseAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type { AnimationSubject } from '@/lib/animation';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

import { startSilentAnimationProduction } from '../-production';
import {
  animationErrorInit,
  animationErrorResponse,
  parseModelChoice,
  resolveChatProvider,
  withAnimationGenerationCapacity,
} from '../-shared';
import { animationEventStream } from '../-stream';

const ANIMATION_SUBJECTS: AnimationSubject[] = [
  'general',
  'math',
  'physics',
  'computer-science',
  'biology',
  'chemistry',
  'economics',
];

function parseSubject(value: unknown): AnimationSubject | undefined {
  return typeof value === 'string' &&
    (ANIMATION_SUBJECTS as string[]).includes(value)
    ? (value as AnimationSubject)
    : undefined;
}

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
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 5_000,
      keyPrefix: 'animation-generation',
      extraKey: session.user.id,
    });
    if (limited) return limited;
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationMessage
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return respErr('Prompt is required', { status: 400 });
    if (prompt.length > 5000) {
      return respErr('Prompt is too long', { status: 400 });
    }
    const subject = parseSubject(body.subject);
    const configs = await getAllConfigs();
    const modelChoice = parseModelChoice(body.modelChoice);
    const requestedModel =
      typeof body.model === 'string' ? body.model.trim() : undefined;
    const provider = await resolveChatProvider(
      configs,
      session.user.id,
      modelChoice,
      requestedModel
    );
    const modelSelection = { choice: modelChoice, model: requestedModel };
    if (request.headers.get('accept')?.includes('text/event-stream')) {
      return animationEventStream(async (send, signal) => {
        const planned = await withAnimationGenerationCapacity(
          session.user.id,
          () =>
            reviseAnimation({
              userId: session.user.id,
              id: params.id,
              prompt,
              subject,
              modelSelection,
              ...provider,
              signal,
              hooks: {
                onStarted: (started) =>
                  send({ type: 'started', animation: started }),
                onPhase: (phase) => send({ type: 'phase', phase }),
                onSummaryDelta: (delta) => send({ type: 'delta', delta }),
              },
            })
        );
        const animation = await startSilentAnimationProduction({
          request,
          configs,
          userId: session.user.id,
          animation: planned,
          provider: provider.provider,
          model: provider.model,
          signal,
        });
        send({ type: 'completed', animation });
      });
    }
    const planned = await withAnimationGenerationCapacity(session.user.id, () =>
      reviseAnimation({
        userId: session.user.id,
        id: params.id,
        prompt,
        subject,
        modelSelection,
        ...provider,
        signal: request.signal,
      })
    );
    return respData(
      await startSilentAnimationProduction({
        request,
        configs,
        userId: session.user.id,
        animation: planned,
        provider: provider.provider,
        model: provider.model,
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

export const Route = createFileRoute('/api/animations/$id/message')({
  server: { handlers: { POST } },
});
