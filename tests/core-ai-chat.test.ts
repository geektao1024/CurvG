import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ChatModelCircuitBreaker,
  ChatProviderError,
  FailoverChatProvider,
  OpenAICompatibleChatProvider,
  type ChatCompletionInput,
  type ChatProvider,
} from '../src/core/ai/chat';

const input: ChatCompletionInput = {
  model: 'primary-model',
  messages: [{ role: 'user', content: 'Reply with OK.' }],
};

function successResponse(model = 'primary-model', content = 'OK') {
  return Response.json({
    model,
    choices: [{ message: { content } }],
  });
}

function providerWith(params: {
  fetch: typeof globalThis.fetch;
  sleeps?: number[];
  maxAttempts?: number;
}) {
  return new OpenAICompatibleChatProvider({
    apiKey: 'test-key',
    baseUrl: 'https://example.invalid/v1',
    name: 'yunwu',
    fetch: params.fetch,
    sleep: async (delayMs) => {
      params.sleeps?.push(delayMs);
    },
    random: () => 0,
    maxAttempts: params.maxAttempts ?? 2,
    requestTimeoutMs: 1_000,
    overallTimeoutMs: 30_000,
  });
}

test('429 honors Retry-After before retrying', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const provider = providerWith({
    sleeps,
    fetch: (async () => {
      calls += 1;
      if (calls === 1) {
        return Response.json(
          {
            error: { message: '当前分组上游负载已饱和，请稍后再试' },
            request_id: 'req-saturated',
          },
          { status: 429, headers: { 'retry-after': '2' } }
        );
      }
      return successResponse();
    }) as typeof globalThis.fetch,
  });

  const result = await provider.complete(input);

  assert.equal(result.content, 'OK');
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [2_000]);
});

test('503 retries with exponential backoff', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const provider = providerWith({
    sleeps,
    fetch: (async () => {
      calls += 1;
      return calls === 1
        ? Response.json(
            { error: { message: 'gateway unavailable' } },
            { status: 503 }
          )
        : successResponse();
    }) as typeof globalThis.fetch,
  });

  const result = await provider.complete(input);

  assert.equal(result.content, 'OK');
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [500]);
});

test('authentication and quota failures do not retry', async (t) => {
  const cases = [
    {
      name: '401 authentication failure',
      response: () =>
        Response.json({ error: { message: 'invalid key' } }, { status: 401 }),
      code: 'upstream_auth',
    },
    {
      name: 'quota failure',
      response: () =>
        Response.json(
          { error: { message: 'user quota is not enough' } },
          { status: 402 }
        ),
      code: 'upstream_quota',
    },
  ] as const;

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      let calls = 0;
      const sleeps: number[] = [];
      const provider = providerWith({
        sleeps,
        maxAttempts: 3,
        fetch: (async () => {
          calls += 1;
          return scenario.response();
        }) as typeof globalThis.fetch,
      });

      await assert.rejects(provider.complete(input), (error: unknown) => {
        assert.ok(error instanceof ChatProviderError);
        assert.equal(error.code, scenario.code);
        assert.equal(error.retryable, false);
        return true;
      });
      assert.equal(calls, 1);
      assert.deepEqual(sleeps, []);
    });
  }
});

test('HTTP 200 with empty content exhausts the retry budget', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const provider = providerWith({
    sleeps,
    fetch: (async () => {
      calls += 1;
      return Response.json({ model: 'primary-model', choices: [] });
    }) as typeof globalThis.fetch,
  });

  await assert.rejects(provider.complete(input), (error: unknown) => {
    assert.ok(error instanceof ChatProviderError);
    assert.equal(error.code, 'empty_response');
    assert.equal(error.retryable, true);
    return true;
  });
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [500]);
});

test('network failure is normalized and retried', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const provider = providerWith({
    sleeps,
    fetch: (async () => {
      calls += 1;
      if (calls === 1) {
        throw new TypeError('fetch failed', {
          cause: new Error('ECONNRESET'),
        });
      }
      return successResponse();
    }) as typeof globalThis.fetch,
  });

  const result = await provider.complete(input);

  assert.equal(result.content, 'OK');
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [500]);
});

test('a caller cancellation is never retried', async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const controller = new AbortController();
  controller.abort();
  const provider = providerWith({
    sleeps,
    maxAttempts: 3,
    fetch: (async () => {
      calls += 1;
      throw new DOMException('aborted', 'AbortError');
    }) as typeof globalThis.fetch,
  });

  await assert.rejects(
    provider.complete({ ...input, signal: controller.signal }),
    (error: unknown) => {
      assert.ok(error instanceof ChatProviderError);
      assert.equal(error.code, 'stream_interrupted');
      assert.equal(error.retryable, false);
      return true;
    }
  );
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('SSE interruption after a delta is not retried', async () => {
  let calls = 0;
  const deltas: string[] = [];
  const encoder = new TextEncoder();
  const provider = providerWith({
    maxAttempts: 3,
    fetch: (async () => {
      calls += 1;
      let pulls = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            pulls += 1;
            if (pulls === 1) {
              controller.enqueue(
                encoder.encode(
                  'data: {"choices":[{"delta":{"content":"partial"}}]}\n'
                )
              );
              return;
            }
            controller.error(new Error('socket closed'));
          },
        }),
        { status: 200, headers: { 'content-type': 'text/event-stream' } }
      );
    }) as typeof globalThis.fetch,
  });

  await assert.rejects(
    provider.stream(input, (delta) => deltas.push(delta)),
    (error: unknown) => {
      assert.ok(error instanceof ChatProviderError);
      assert.equal(error.code, 'stream_interrupted');
      assert.equal(error.partialOutput, true);
      assert.equal(error.retryable, false);
      return true;
    }
  );
  assert.equal(calls, 1);
  assert.deepEqual(deltas, ['partial']);
});

test('Auto failover switches only for retryable failures without partial output', async (t) => {
  await t.test('complete switches after a retryable failure', async () => {
    const models: string[] = [];
    const base: ChatProvider = {
      name: 'yunwu',
      async complete(request) {
        models.push(request.model);
        if (request.model === 'primary-model') {
          throw new ChatProviderError('capacity full', {
            code: 'upstream_saturated',
            retryable: true,
            provider: 'yunwu',
            model: request.model,
          });
        }
        return { content: 'fallback', model: request.model, provider: 'yunwu' };
      },
    };

    const result = await new FailoverChatProvider(base, [
      'fallback-model',
    ]).complete(input);

    assert.equal(result.content, 'fallback');
    assert.equal(result.model, 'fallback-model');
    assert.deepEqual(models, ['primary-model', 'fallback-model']);
  });

  await t.test('complete stops after a non-retryable failure', async () => {
    const models: string[] = [];
    const base: ChatProvider = {
      name: 'yunwu',
      async complete(request) {
        models.push(request.model);
        throw new ChatProviderError('invalid key', {
          code: 'upstream_auth',
          retryable: false,
          provider: 'yunwu',
          model: request.model,
        });
      },
    };

    await assert.rejects(
      new FailoverChatProvider(base, ['fallback-model']).complete(input),
      (error: unknown) => {
        assert.ok(error instanceof ChatProviderError);
        assert.equal(error.code, 'upstream_auth');
        return true;
      }
    );
    assert.deepEqual(models, ['primary-model']);
  });

  await t.test(
    'stream switches when no partial output was emitted',
    async () => {
      const models: string[] = [];
      const deltas: string[] = [];
      const base: ChatProvider = {
        name: 'yunwu',
        async complete() {
          throw new Error('unexpected complete call');
        },
        async stream(request, onDelta) {
          models.push(request.model);
          if (request.model === 'primary-model') {
            throw new ChatProviderError('gateway unavailable', {
              code: 'upstream_unavailable',
              retryable: true,
              provider: 'yunwu',
              model: request.model,
            });
          }
          onDelta('fallback');
          return {
            content: 'fallback',
            model: request.model,
            provider: 'yunwu',
          };
        },
      };

      const result = await new FailoverChatProvider(base, [
        'fallback-model',
      ]).stream(input, (delta) => deltas.push(delta));

      assert.equal(result.model, 'fallback-model');
      assert.deepEqual(models, ['primary-model', 'fallback-model']);
      assert.deepEqual(deltas, ['fallback']);
    }
  );

  await t.test('stream stops after partial output', async () => {
    const models: string[] = [];
    const deltas: string[] = [];
    const base: ChatProvider = {
      name: 'yunwu',
      async complete() {
        throw new Error('unexpected complete call');
      },
      async stream(request, onDelta) {
        models.push(request.model);
        onDelta('partial');
        throw new ChatProviderError('socket closed', {
          code: 'stream_interrupted',
          retryable: false,
          provider: 'yunwu',
          model: request.model,
          partialOutput: true,
        });
      },
    };

    await assert.rejects(
      new FailoverChatProvider(base, ['fallback-model']).stream(
        input,
        (delta) => deltas.push(delta)
      ),
      (error: unknown) => {
        assert.ok(error instanceof ChatProviderError);
        assert.equal(error.partialOutput, true);
        return true;
      }
    );
    assert.deepEqual(models, ['primary-model']);
    assert.deepEqual(deltas, ['partial']);
  });
});

test('Auto skips a missing model once and advances to a fallback', async () => {
  const models: string[] = [];
  const base = providerWith({
    maxAttempts: 3,
    fetch: (async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { model: string };
      models.push(body.model);
      if (body.model === 'primary-model') {
        return Response.json(
          { error: { message: 'The model primary-model does not exist' } },
          { status: 404 }
        );
      }
      return successResponse('fallback-model', 'fallback');
    }) as typeof globalThis.fetch,
  });

  const result = await new FailoverChatProvider(base, [
    'fallback-model',
  ]).complete(input);

  assert.equal(result.model, 'fallback-model');
  // `model_unavailable` must not consume OpenAI-compatible retry attempts.
  assert.deepEqual(models, ['primary-model', 'fallback-model']);
});

test('an exhausted absolute deadline prevents another Auto fallback attempt', async () => {
  let now = 0;
  const models: string[] = [];
  const base: ChatProvider = {
    name: 'yunwu',
    async complete(request) {
      models.push(request.model);
      now = 100;
      throw new ChatProviderError('capacity full', {
        code: 'upstream_saturated',
        retryable: true,
        provider: 'yunwu',
        model: request.model,
      });
    },
  };

  await assert.rejects(
    new FailoverChatProvider(
      base,
      ['fallback-model'],
      100,
      new ChatModelCircuitBreaker(() => now),
      90,
      () => now
    ).complete(input),
    (error: unknown) => {
      assert.ok(error instanceof ChatProviderError);
      assert.equal(error.code, 'upstream_timeout');
      return true;
    }
  );
  assert.deepEqual(models, ['primary-model']);
});

test('Auto circuit breaker skips a repeatedly saturated model across requests', async () => {
  let now = 0;
  const models: string[] = [];
  const circuit = new ChatModelCircuitBreaker(() => now);
  const base: ChatProvider = {
    name: 'yunwu',
    async complete(request) {
      models.push(request.model);
      if (request.model === 'primary-model') {
        throw new ChatProviderError('capacity full', {
          code: 'upstream_saturated',
          retryable: true,
          provider: 'yunwu',
          model: request.model,
        });
      }
      return { content: 'OK', model: request.model, provider: 'yunwu' };
    },
  };
  const provider = new FailoverChatProvider(
    base,
    ['fallback-model'],
    30_000,
    circuit
  );

  await provider.complete(input);
  await provider.complete(input);
  assert.deepEqual(models, [
    'primary-model',
    'fallback-model',
    'fallback-model',
  ]);

  now = 30_001;
  await provider.complete(input);
  assert.deepEqual(models.slice(-2), ['primary-model', 'fallback-model']);
});

test('Auto reserves a separate timeout budget for fallback models', async () => {
  let now = 1_000;
  const attempts: Array<{ model: string; deadlineAt?: number }> = [];
  const base: ChatProvider = {
    name: 'yunwu',
    async complete(request) {
      attempts.push({ model: request.model, deadlineAt: request.deadlineAt });
      if (request.model === 'primary-model') {
        now += 90_000;
        throw new ChatProviderError('primary timed out', {
          code: 'upstream_timeout',
          retryable: true,
          provider: 'yunwu',
          model: request.model,
        });
      }
      return { content: 'OK', model: request.model, provider: 'yunwu' };
    },
  };

  const result = await new FailoverChatProvider(
    base,
    ['fallback-model'],
    300_000,
    new ChatModelCircuitBreaker(() => now),
    90_000,
    () => now
  ).complete(input);

  assert.equal(result.model, 'fallback-model');
  assert.deepEqual(attempts, [
    { model: 'primary-model', deadlineAt: 91_000 },
    { model: 'fallback-model', deadlineAt: 181_000 },
  ]);
});
