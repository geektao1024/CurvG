import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatProviderError } from '../src/core/ai/chat';
import {
  deepseekChatModels,
  DeepSeekChatProvider,
} from '../src/core/ai/deepseek-chat';

function successResponse(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function providerWith(
  fetchImpl: typeof globalThis.fetch,
  overrides: Partial<ConstructorParameters<typeof DeepSeekChatProvider>[0]> = {}
) {
  return new DeepSeekChatProvider({
    apiKey: 'test-deepseek-key',
    fetch: fetchImpl,
    maxAttempts: 1,
    ...overrides,
  });
}

const input = {
  model: 'deepseek-v4-flash',
  messages: [
    { role: 'system' as const, content: 'Only the artifact.' },
    { role: 'user' as const, content: 'Hi' },
  ],
};

test('the DeepSeek allowlist holds exactly the reviewed Responses model', () => {
  assert.deepEqual(deepseekChatModels, ['deepseek-v4-flash']);
});

test('requests hit /responses with the documented body shape', async () => {
  let requestUrl = '';
  let requestBody: Record<string, unknown> | undefined;
  let authorization = '';
  const provider = providerWith((async (url, init) => {
    requestUrl = String(url);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    authorization = new Headers(init?.headers).get('authorization') || '';
    return successResponse({
      status: 'completed',
      model: 'deepseek-v4-flash',
      output_text: 'DeepSeek OK',
    });
  }) as typeof globalThis.fetch);

  const result = await provider.complete({
    ...input,
    messages: [
      ...input.messages,
      { role: 'assistant' as const, content: '{"draft":1}' },
      { role: 'user' as const, content: 'Fix it' },
    ],
    maxTokens: 9_000,
    temperature: 0.1,
    reasoningEffort: 'high',
  });

  assert.equal(requestUrl, 'https://api.deepseek.com/responses');
  assert.equal(authorization, 'Bearer test-deepseek-key');
  assert.equal(requestBody?.model, 'deepseek-v4-flash');
  assert.equal(requestBody?.stream, false);
  assert.equal(requestBody?.max_output_tokens, 9_000);
  assert.deepEqual(requestBody?.reasoning, { effort: 'high' });
  const items = requestBody?.input as Array<Record<string, unknown>>;
  assert.deepEqual(
    items.map((item) => item.role),
    ['developer', 'user', 'assistant', 'user']
  );
  // Assistant turns are model output; every other turn is caller input.
  assert.deepEqual(
    items.map(
      (item) =>
        (item.content as Array<Record<string, unknown>>)[0].type as string
    ),
    ['input_text', 'input_text', 'output_text', 'input_text']
  );
  assert.equal(result.content, 'DeepSeek OK');
  assert.equal(result.provider, 'deepseek');
});

test('above-high reasoning tiers are normalized before the request', async () => {
  const efforts: unknown[] = [];
  const provider = providerWith((async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    efforts.push(
      (body.reasoning as Record<string, unknown> | undefined)?.effort
    );
    return successResponse({ status: 'completed', output_text: 'OK' });
  }) as typeof globalThis.fetch);

  await provider.complete({ ...input, reasoningEffort: 'max' });
  await provider.complete({ ...input, reasoningEffort: 'xhigh' });
  await provider.complete({ ...input, reasoningEffort: 'medium' });
  await provider.complete({ ...input });

  assert.deepEqual(efforts, ['high', 'high', 'medium', undefined]);
});

test('models outside the allowlist fail closed', async () => {
  const provider = providerWith((async () =>
    successResponse({ output_text: 'never' })) as typeof globalThis.fetch);

  await assert.rejects(
    provider.complete({ ...input, model: 'deepseek-v4-pro' }),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'model_unavailable' &&
      error.retryable === false
  );
});

test('an in-body failed status is a non-retryable upstream verdict', async () => {
  const provider = providerWith((async () =>
    successResponse({
      status: 'failed',
      error: { message: 'content rejected' },
    })) as typeof globalThis.fetch);

  await assert.rejects(
    provider.complete(input),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'invalid_response' &&
      error.retryable === false &&
      error.message === 'content rejected'
  );
});

test('a truncated response maps to output_truncated', async () => {
  const provider = providerWith((async () =>
    successResponse({
      status: 'incomplete',
      output_text: 'partial…',
    })) as typeof globalThis.fetch);

  await assert.rejects(
    provider.complete(input),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'output_truncated' &&
      error.retryable === false
  );
});

test('HTTP errors classify by status: 429 retryable, 401 terminal', async () => {
  const saturated = providerWith(
    (async () =>
      new Response(
        JSON.stringify({ error: { message: 'Rate limit reached' } }),
        {
          status: 429,
        }
      )) as typeof globalThis.fetch
  );
  await assert.rejects(
    saturated.complete(input),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'upstream_saturated' &&
      error.retryable === true
  );

  const unauthorized = providerWith(
    (async () =>
      new Response(JSON.stringify({ error: { message: 'invalid api key' } }), {
        status: 401,
      })) as typeof globalThis.fetch
  );
  await assert.rejects(
    unauthorized.complete(input),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'upstream_auth' &&
      error.retryable === false
  );
});

test('an aborted caller signal is not misreported as a timeout', async () => {
  const controller = new AbortController();
  const provider = providerWith((async (_url, init) => {
    controller.abort();
    throw Object.assign(new Error('The operation was aborted'), {
      name: 'AbortError',
      signal: init?.signal,
    });
  }) as typeof globalThis.fetch);

  await assert.rejects(
    provider.complete({ ...input, signal: controller.signal }),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'stream_interrupted' &&
      error.retryable === false
  );
});

test('empty output is retryable so the failover can advance', async () => {
  const provider = providerWith((async () =>
    successResponse({
      status: 'completed',
      output: [],
    })) as typeof globalThis.fetch);

  await assert.rejects(
    provider.complete(input),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'empty_response' &&
      error.retryable === true
  );
});

test('a custom base URL keeps its path and gains /responses', async () => {
  let requestUrl = '';
  const provider = providerWith(
    (async (url) => {
      requestUrl = String(url);
      return successResponse({ status: 'completed', output_text: 'OK' });
    }) as typeof globalThis.fetch,
    { baseUrl: 'https://proxy.example.com/deepseek/' }
  );

  await provider.complete(input);
  assert.equal(requestUrl, 'https://proxy.example.com/deepseek/responses');
});
