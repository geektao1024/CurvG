import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { instantiateAnimationTemplate } from '@/modules/animation-templates/service';
import {
  createAnimation,
  createAnimationFromTemplate,
  listAnimations,
} from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type {
  AnimationCreationMode,
  AnimationDetail,
  AnimationMathObjectType,
} from '@/lib/animation';
import { detectMathObjectType } from '@/lib/math-preview';
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
  parseModelChoice,
  parseSubject,
  resolveChatProvider,
  withAnimationGenerationCapacity,
} from './animations/-shared';
import { animationEventStream } from './animations/-stream';

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    return respData(await listAnimations(session.user.id));
  } catch (error) {
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

async function POST({ request }: { request: Request }) {
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
      REQUEST_BODY_LIMITS.animationCreate
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    const mode: AnimationCreationMode =
      body.mode === 'template' || body.mode === 'formula'
        ? body.mode
        : 'description';
    if (mode === 'template') {
      const templateId =
        typeof body.templateId === 'string' ? body.templateId.trim() : '';
      if (!/^[A-Za-z0-9-]{1,80}$/.test(templateId)) {
        return respErr('Template is required', { status: 400 });
      }
      const values =
        body.values &&
        typeof body.values === 'object' &&
        !Array.isArray(body.values)
          ? (body.values as Record<string, unknown>)
          : undefined;
      const instantiated = await instantiateAnimationTemplate({
        id: templateId,
        locale: getLocale(),
        values,
      });
      return respData(
        await createAnimationFromTemplate({
          userId: session.user.id,
          templateId,
          title: instantiated.template.title,
          prompt: `Template: ${instantiated.template.title}`,
          mathObjectType: instantiated.template.mathObjectType,
          spec: instantiated.spec,
        })
      );
    }
    const formula =
      mode === 'formula' && typeof body.formula === 'string'
        ? body.formula.trim()
        : '';
    const intent =
      mode === 'formula' && typeof body.intent === 'string'
        ? body.intent.trim()
        : '';
    if (mode === 'formula' && (!formula || formula.length > 1000)) {
      return respErr('A valid formula is required', { status: 400 });
    }
    const requestedMathType =
      typeof body.mathObjectType === 'string' ? body.mathObjectType : undefined;
    const mathObjectType: AnimationMathObjectType | undefined =
      mode === 'formula'
        ? (['function', 'integral', 'series', 'matrix'] as const).includes(
            requestedMathType as AnimationMathObjectType
          )
          ? (requestedMathType as AnimationMathObjectType)
          : detectMathObjectType(formula)
        : undefined;
    const prompt =
      mode === 'formula'
        ? [
            `Create an animation for this ${mathObjectType}: ${formula}`,
            intent ? `User intent: ${intent}` : '',
            'Keep the formula exact. Use a semantic formula region and a graph region when applicable.',
          ]
            .filter(Boolean)
            .join('\n')
        : typeof body.prompt === 'string'
          ? body.prompt.trim()
          : '';
    if (!prompt) return respErr('Prompt is required', { status: 400 });
    if (prompt.length > 5000) {
      return respErr('Prompt is too long', { status: 400 });
    }
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
        const animation = await withAnimationGenerationCapacity(
          session.user.id,
          () =>
            createAnimation({
              userId: session.user.id,
              prompt,
              subject: parseSubject(body.subject),
              creationMode: mode,
              mathObjectType,
              sourceFormula: formula || undefined,
              modelSelection,
              ...provider,
              signal,
              hooks: {
                onStarted: (started) =>
                  send({ type: 'started', animation: started }),
                onSummaryDelta: (delta) => send({ type: 'delta', delta }),
              },
            })
        );
        send({ type: 'completed', animation });
      });
    }
    const result: AnimationDetail = await withAnimationGenerationCapacity(
      session.user.id,
      () =>
        createAnimation({
          userId: session.user.id,
          prompt,
          subject: parseSubject(body.subject),
          creationMode: mode,
          mathObjectType,
          sourceFormula: formula || undefined,
          modelSelection,
          ...provider,
          signal: request.signal,
        })
    );
    return respData(result);
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    const failure = animationErrorResponse(error);
    return respErr(failure.message, animationErrorInit(failure));
  }
}

export const Route = createFileRoute('/api/animations')({
  server: { handlers: { GET, POST } },
});
