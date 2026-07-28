import { AnimationConflictError } from '@/modules/animations/service';
import type {
  AnimationFailure,
  AnimationGenerationEvent,
} from '@/lib/animation';

import { AnimationApiError } from './-shared';

function thrownFailure(error: unknown): AnimationFailure | undefined {
  if (
    error instanceof AnimationConflictError ||
    (error instanceof AnimationApiError && error.code === 'CAPACITY_LIMIT')
  ) {
    return {
      stage: 'spec',
      code: 'BUSY',
      message: error.message,
      retryable: true,
    };
  }
  if (!error || typeof error !== 'object') return undefined;
  const failure = (error as { failure?: unknown }).failure;
  if (!failure || typeof failure !== 'object') return undefined;
  const value = failure as Partial<AnimationFailure>;
  return typeof value.message === 'string' &&
    typeof value.code === 'string' &&
    typeof value.stage === 'string' &&
    typeof value.retryable === 'boolean'
    ? (value as AnimationFailure)
    : undefined;
}

export function animationEventStream(
  run: (
    send: (event: AnimationGenerationEvent) => void,
    signal: AbortSignal
  ) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const abortController = new AbortController();
  let open = true;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: AnimationGenerationEvent) => {
        if (!open) return;
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          open = false;
        }
      };
      heartbeat = setInterval(() => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          open = false;
          abortController.abort();
        }
      }, 15_000);
      void run(send, abortController.signal)
        .catch((error) => {
          const failure = thrownFailure(error);
          send({
            type: 'error',
            message: failure?.message || 'CurvG could not finish this step.',
            failure,
          });
        })
        .finally(() => {
          if (heartbeat) clearInterval(heartbeat);
          if (!open) return;
          open = false;
          try {
            controller.close();
          } catch {}
        });
    },
    cancel() {
      open = false;
      abortController.abort();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}
