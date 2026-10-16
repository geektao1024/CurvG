import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { failStaleTasks } from '@/modules/ai-tasks/service';
import {
  createAnimation,
  createAnimationDraft,
  createSimulationAnimation,
  createTemplateAnimation,
  failStaleAnimationRuns,
  listAnimations,
  planAnimation,
} from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type {
  AnimationCreationMode,
  AnimationDetail,
  AnimationMathObjectType,
} from '@/lib/animation';
import {
  getAnimationWorkflowBinding,
  startAnimationWorkflow,
} from '@/lib/cloudflare-workflow';
import { detectMathObjectType } from '@/lib/math-preview';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';
import {
  buildVideoTemplate,
  getVideoTemplate,
  resolveTemplateContext,
  TemplateParamError,
} from '@/lib/video-templates';
import { getLocale } from '@/paraglide/runtime.js';

import { startSilentAnimationProduction } from './animations/-production';
import {
  animationErrorInit,
  animationErrorResponse,
  enforceFreeDailyCreations,
  parseAnimationProductionRequest,
  parseModelChoice,
  parseSubject,
  resolveChatProvider,
  resolveRenderEntitlement,
  withAnimationGenerationCapacity,
} from './animations/-shared';
import { animationEventStream } from './animations/-stream';

// Render tasks hold credits; one that never reports back is refunded after
// the same six hours a stuck run is closed.
const STALE_RENDER_TASK_MS = 6 * 60 * 60_000;

/** Close this user's stuck runs and refund stuck renders; never fails the list. */
async function sweepStaleWork(userId: string) {
  try {
    await failStaleAnimationRuns(userId);
    await failStaleTasks({
      userId,
      mediaType: 'animation_render',
      olderThan: new Date(Date.now() - STALE_RENDER_TASK_MS),
    });
  } catch (error) {
    console.error('[animations] stale work sweep failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function GET({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    await sweepStaleWork(session.user.id);
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
    const production = parseAnimationProductionRequest(body);
    if (mode === 'template') {
      // The paid path: a verified template with validated parameters. No
      // model runs here; the film's code is built and rendered right away.
      const templateId =
        typeof body.templateId === 'string' ? body.templateId.trim() : '';
      if (!getVideoTemplate(templateId)) {
        return respErr('Template not found', { status: 400 });
      }
      const values =
        body.params &&
        typeof body.params === 'object' &&
        !Array.isArray(body.params)
          ? (body.params as Record<string, unknown>)
          : undefined;
      let built;
      try {
        built = buildVideoTemplate({
          id: templateId,
          params: values,
          context: resolveTemplateContext({
            // The film's captions follow the creator's language.
            locale: typeof body.locale === 'string' ? body.locale : getLocale(),
            frame: body.frame,
            theme: body.theme,
          }),
        });
      } catch (error) {
        if (error instanceof TemplateParamError) {
          return respErr(error.message, { status: 400 });
        }
        throw error;
      }
      const matchedFrom =
        typeof body.prompt === 'string' && body.prompt.trim()
          ? body.prompt.trim().slice(0, 1000)
          : undefined;
      const configs = await getAllConfigs();
      // Fail before creating anything when this user cannot render at all.
      await resolveRenderEntitlement(configs, session.user.id);
      const animation = await createTemplateAnimation({
        userId: session.user.id,
        built,
        prompt: matchedFrom || built.title,
        matchedFrom,
      });
      return respData(
        await startSilentAnimationProduction({
          request,
          configs,
          userId: session.user.id,
          animation,
          signal: request.signal,
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
    await enforceFreeDailyCreations(configs, session.user.id);
    if (production.productionMode === 'simulation_short') {
      const produce = async (
        signal: AbortSignal,
        onStarted?: (animation: AnimationDetail) => void
      ) => {
        const planned = await createSimulationAnimation({
          userId: session.user.id,
          prompt,
          subject: parseSubject(body.subject),
          scenario: production.simulationScenario,
          hooks: { onStarted },
        });
        return startSilentAnimationProduction({
          request,
          configs,
          userId: session.user.id,
          animation: planned,
          signal,
        });
      };
      if (request.headers.get('accept')?.includes('text/event-stream')) {
        return animationEventStream(async (send, signal) => {
          const animation = await produce(signal, (started) =>
            send({ type: 'started', animation: started })
          );
          send({ type: 'completed', animation });
        });
      }
      return respData(await produce(request.signal));
    }
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
    const workflowBinding = getAnimationWorkflowBinding();
    if (workflowBinding) {
      const createDraft = () =>
        createAnimationDraft({
          userId: session.user.id,
          prompt,
          subject: parseSubject(body.subject),
          creationMode: mode,
          mathObjectType,
          sourceFormula: formula || undefined,
          modelSelection,
          model: provider.model,
          providerName: provider.provider.name,
        });
      const enqueue = async (started: AnimationDetail) => {
        await startAnimationWorkflow(
          workflowBinding,
          {
            userId: session.user.id,
            animationId: started.id,
            origin: new URL(request.url).origin,
          },
          started.parts.pipeline?.runId
        );
        return started;
      };
      if (request.headers.get('accept')?.includes('text/event-stream')) {
        return animationEventStream(async (send, signal) => {
          const started = await createDraft();
          send({ type: 'started', animation: started });
          try {
            const accepted = await enqueue(started);
            send({ type: 'accepted', animation: accepted });
          } catch {
            // A missing/broken binding should not strand a newly-created row.
            // Run the same resumable pipeline in-request as a deployment
            // fallback; completed stage artifacts are still checkpointed.
            const planned = await withAnimationGenerationCapacity(
              session.user.id,
              () =>
                planAnimation({
                  userId: session.user.id,
                  id: started.id,
                  ...provider,
                  signal,
                  hooks: {
                    onPhase: (phase) => send({ type: 'phase', phase }),
                    onPipelineStage: (stage) =>
                      send({ type: 'pipeline-stage', stage }),
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
          }
        });
      }
      const started = await createDraft();
      try {
        return respData(await enqueue(started));
      } catch {
        const planned = await withAnimationGenerationCapacity(
          session.user.id,
          () =>
            planAnimation({
              userId: session.user.id,
              id: started.id,
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
      }
    }
    if (request.headers.get('accept')?.includes('text/event-stream')) {
      return animationEventStream(async (send, signal) => {
        const planned = await withAnimationGenerationCapacity(
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
                onPhase: (phase) => send({ type: 'phase', phase }),
                onPipelineStage: (stage) =>
                  send({ type: 'pipeline-stage', stage }),
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
    const planned: AnimationDetail = await withAnimationGenerationCapacity(
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

export const Route = createFileRoute('/api/animations')({
  server: { handlers: { GET, POST } },
});
