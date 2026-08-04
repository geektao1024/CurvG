import { startSilentAnimationProduction } from '@/routes/api/animations/-production';
/// <reference types="@cloudflare/workers-types" />

import {
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
import {
  AnimationGenerationError,
  finalizeAnimationPlanningFailure,
  getAnimation,
  planAnimation,
  recordAnimationQueueState,
} from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type { AnimationFailure } from '@/lib/animation';
import type { AnimationWorkflowPayload } from '@/lib/cloudflare-workflow';

type AnimationWorkflowEnv = Record<string, unknown>;

// Saturated upstreams recover on their own schedule, not on a five-second
// timer. Instead of failing after two quick tries, the workflow queues: each
// planning stage still runs its configured provider failover, and when a whole
// attempt fails retryably the workflow waits out this widening ladder
// (~17 minutes end to end), recording the queue state so the client shows an
// honest "retrying automatically" instead of a dead error. A scene-only
// failure can recover from the five approved upstream artifacts; unrelated
// earlier-stage failures remain queue-then-succeed or fail visibly.
const PLANNING_RETRY_DELAY_SECONDS = [5, 30, 60, 120, 240, 300, 300] as const;
const MAX_PLANNING_ATTEMPTS = PLANNING_RETRY_DELAY_SECONDS.length + 1;

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
    let planningCanceled = false;
    let queueSince: string | undefined;
    for (let attempt = 1; attempt <= MAX_PLANNING_ATTEMPTS; attempt += 1) {
      let failureCode: string = 'UNKNOWN';
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
            // The user can cancel while the workflow is queued between
            // attempts; honor it before spending another provider call.
            if (animation.status === 'canceled') {
              return { canceled: true as const };
            }
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
        if ('canceled' in outcome && outcome.canceled) {
          planningCanceled = true;
          planningError = undefined;
          break;
        }
        if ('completed' in outcome && outcome.completed) {
          planningError = undefined;
          break;
        }
        if ('failure' in outcome) {
          planningError = new AnimationGenerationError(outcome.failure);
          failureCode = outcome.failure.code;
          if (!outcome.failure.retryable || attempt === MAX_PLANNING_ATTEMPTS)
            break;
        }
      } catch (error) {
        planningError = error;
        if (attempt === MAX_PLANNING_ATTEMPTS) break;
      }
      const delaySeconds = PLANNING_RETRY_DELAY_SECONDS[attempt - 1];
      if (!queueSince) {
        queueSince = await step.do('queue-since', async () =>
          new Date().toISOString()
        );
      }
      const since = queueSince;
      await step.do(
        `record-queue-state-${attempt}`,
        {
          retries: { limit: 2, delay: '2 seconds', backoff: 'exponential' },
          timeout: '30 seconds',
        },
        async () => {
          exposeRuntimeEnv(this.env);
          await recordAnimationQueueState({
            userId: payload.userId,
            id: payload.animationId,
            queue: {
              attempt,
              maxAttempts: MAX_PLANNING_ATTEMPTS,
              nextRetryAt: new Date(
                Date.now() + delaySeconds * 1000
              ).toISOString(),
              since,
              reason: failureCode as AnimationFailure['code'],
            },
          });
          return { recorded: attempt };
        }
      );
      await step.sleep(
        `wait-before-planning-attempt-${attempt + 1}`,
        `${delaySeconds} seconds`
      );
    }
    if (planningCanceled) {
      await step.do(
        'clear-queue-after-cancel',
        {
          retries: { limit: 2, delay: '2 seconds', backoff: 'exponential' },
          timeout: '30 seconds',
        },
        async () => {
          exposeRuntimeEnv(this.env);
          await recordAnimationQueueState({
            userId: payload.userId,
            id: payload.animationId,
          });
          return { cleared: true };
        }
      );
      return { animationId: payload.animationId };
    }
    if (queueSince && !planningError) {
      await step.do(
        'clear-queue-after-success',
        {
          retries: { limit: 2, delay: '2 seconds', backoff: 'exponential' },
          timeout: '30 seconds',
        },
        async () => {
          exposeRuntimeEnv(this.env);
          await recordAnimationQueueState({
            userId: payload.userId,
            id: payload.animationId,
          });
          return { cleared: true };
        }
      );
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
          capacityOwnerToken: `ANWF_${payload.animationId}`,
        });
        return { animationId: produced.id, status: produced.status };
      }
    );

    return { animationId: payload.animationId };
  }
}
