import { startSilentAnimationProduction } from '@/routes/api/animations/-production';
/// <reference types="@cloudflare/workers-types" />

import {
  resolveAnimationOrchestrator,
  resolveChatProvider,
  withAnimationGenerationCapacity,
} from '@/routes/api/animations/-shared';
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';

import type { ChatProvider } from '@/core/ai/chat';
import type { AnimationOrchestrationPlan } from '@/core/animation-orchestrator';
import {
  AnimationGenerationError,
  finalizeAnimationPlanningFailure,
  getAnimation,
  planAnimation,
  prepareAnimationOrchestration,
} from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type { AnimationWorkflowPayload } from '@/lib/cloudflare-workflow';

type AnimationWorkflowEnv = Record<string, unknown>;

function exposeRuntimeEnv(env: AnimationWorkflowEnv) {
  (
    globalThis as typeof globalThis & {
      __CF_ENV__?: AnimationWorkflowEnv;
    }
  ).__CF_ENV__ = env;
}

function capacityScopedProvider(
  provider: ChatProvider,
  userId: string,
  ownerToken: string
): ChatProvider {
  return {
    name: provider.name,
    complete: (input) =>
      withAnimationGenerationCapacity(
        userId,
        () => provider.complete(input),
        undefined,
        ownerToken
      ),
    stream: provider.stream
      ? (input, onDelta) =>
          withAnimationGenerationCapacity(
            userId,
            () => provider.stream!(input, onDelta),
            undefined,
            ownerToken
          )
      : undefined,
    rejectInvalidResult: provider.rejectInvalidResult
      ? (result) => provider.rejectInvalidResult!(result)
      : undefined,
  };
}

export class AnimationWorkflow extends WorkflowEntrypoint<
  AnimationWorkflowEnv,
  AnimationWorkflowPayload
> {
  async run(
    event: Readonly<WorkflowEvent<AnimationWorkflowPayload>>,
    step: WorkflowStep
  ) {
    exposeRuntimeEnv(this.env);
    const payload = event.payload;

    let planningError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const outcome = await step.do(
          `plan-animation-attempt-${attempt}`,
          {
            // Provider and schema failures are returned as durable outcomes
            // and advance to the next named attempt. These retries are only
            // for unexpected Worker/database faults inside this one attempt.
            retries: {
              limit: 1,
              delay: '5 seconds',
              backoff: 'exponential',
            },
            timeout: '25 minutes',
          },
          async () => {
            exposeRuntimeEnv(this.env);
            const configs = await getAllConfigs();
            const animation = await getAnimation(
              payload.userId,
              payload.animationId
            );
            const selection = animation.parts.modelSelection || {
              choice: 'auto',
            };
            const resolved = await resolveChatProvider(
              configs,
              payload.userId,
              selection.choice,
              selection.model
            );
            try {
              const planned = await planAnimation({
                userId: payload.userId,
                id: payload.animationId,
                provider: capacityScopedProvider(
                  resolved.provider,
                  payload.userId,
                  `ANWF_${payload.animationId}`
                ),
                model: resolved.model,
                persistFailure: false,
              });
              return {
                completed: true as const,
                animationId: planned.id,
                status: planned.status,
              };
            } catch (error) {
              if (error instanceof AnimationGenerationError) {
                return { completed: false as const, failure: error.failure };
              }
              throw error;
            }
          }
        );
        if (outcome.completed) {
          planningError = undefined;
          break;
        }
        planningError = new AnimationGenerationError(outcome.failure);
        if (!outcome.failure.retryable || attempt === 3) break;
        await step.sleep(
          `wait-before-planning-attempt-${attempt + 1}`,
          '5 seconds'
        );
      } catch (error) {
        planningError = error;
        if (attempt === 3) break;
        await step.sleep(
          `wait-before-planning-attempt-${attempt + 1}`,
          '5 seconds'
        );
      }
    }
    if (planningError) {
      await step.do(
        'finalize-planning-failure',
        {
          retries: { limit: 2, delay: '2 seconds', backoff: 'exponential' },
          timeout: '1 minute',
        },
        async () => {
          exposeRuntimeEnv(this.env);
          await finalizeAnimationPlanningFailure({
            userId: payload.userId,
            id: payload.animationId,
            error: planningError,
          });
        }
      );
      throw new NonRetryableError(
        planningError instanceof Error
          ? planningError.message
          : 'Animation planning failed'
      );
    }

    let orchestrationPlan: AnimationOrchestrationPlan | null | undefined;
    try {
      const orchestration = await step.do(
        'prepare-python-orchestrator',
        {
          retries: { limit: 2, delay: '15 seconds', backoff: 'exponential' },
          timeout: '3 minutes',
        },
        async () => {
          exposeRuntimeEnv(this.env);
          const configs = await getAllConfigs();
          const orchestrator = resolveAnimationOrchestrator(configs);
          if (!orchestrator) return { configured: false, plan: null };
          const animation = await getAnimation(
            payload.userId,
            payload.animationId
          );
          if (!animation.parts.spec) {
            throw new NonRetryableError(
              'Animation specification is missing after planning'
            );
          }
          return {
            configured: true,
            plan: await prepareAnimationOrchestration({
              orchestrator,
              animationId: animation.id,
              prompt: animation.parts.prompt,
              spec: animation.parts.spec,
            }),
          };
        }
      );
      orchestrationPlan = orchestration.configured
        ? orchestration.plan
        : undefined;
    } catch (error) {
      // Workflow retries the external service first. Once its durable retry
      // budget is exhausted, fall back to the existing in-Worker compiler so
      // optional infrastructure cannot make the product less reliable.
      console.error('[animation-workflow] orchestrator degraded', {
        animationId: payload.animationId,
        error: error instanceof Error ? error.message : String(error),
      });
      orchestrationPlan = null;
      await step.do('record-orchestrator-degradation', async () => ({
        animationId: payload.animationId,
        status: 'degraded',
      }));
    }

    await step.do(
      'compile-and-render-animation',
      {
        retries: { limit: 1, delay: '10 seconds', backoff: 'exponential' },
        timeout: '30 minutes',
      },
      async () => {
        exposeRuntimeEnv(this.env);
        const configs = await getAllConfigs();
        const animation = await getAnimation(
          payload.userId,
          payload.animationId
        );
        const selection = animation.parts.modelSelection || { choice: 'auto' };
        const resolved = await resolveChatProvider(
          configs,
          payload.userId,
          selection.choice,
          selection.model
        );
        const produced = await startSilentAnimationProduction({
          request: new Request(new URL('/api/animations', payload.origin)),
          configs,
          userId: payload.userId,
          animation,
          provider: resolved.provider,
          model: resolved.model,
          orchestrationPlan,
          capacityOwnerToken: `ANWF_${payload.animationId}`,
        });
        return { animationId: produced.id, status: produced.status };
      }
    );

    return { animationId: payload.animationId };
  }
}
