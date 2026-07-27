import type { AnimationGenerationEvent } from '@/lib/animation';

export function animationEventStream(
  run: (send: (event: AnimationGenerationEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  let open = true;
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
      void run(send)
        .catch((error) => {
          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Internal error',
          });
        })
        .finally(() => {
          if (!open) return;
          open = false;
          try {
            controller.close();
          } catch {}
        });
    },
    cancel() {
      open = false;
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
