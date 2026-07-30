import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatProviderError } from '../src/core/ai/chat';
import {
  KUAIPAO_GPT_56_MODEL,
  KuaipaoChatProvider,
  kuaipaoResponsesUrl,
  parseKuaipaoResponseText,
} from '../src/core/ai/kuaipao-chat';

test('Kuaipao endpoint selection is restricted to official gateways', () => {
  assert.equal(
    kuaipaoResponsesUrl('https://kuaipao.ai'),
    'https://kuaipao.ai/v1/responses'
  );
  assert.equal(
    kuaipaoResponsesUrl('https://kuaipao.pro/v1/responses'),
    'https://kuaipao.pro/v1/responses'
  );
  assert.throws(
    () => kuaipaoResponsesUrl('http://kuaipao.pro/v1'),
    /official HTTPS endpoint/
  );
  assert.throws(
    () => kuaipaoResponsesUrl('https://internal.example/v1'),
    /official HTTPS endpoint/
  );
  assert.throws(
    () => kuaipaoResponsesUrl('https://kuaipao.pro/redirect'),
    /path is not supported/
  );
});

test('Kuaipao GPT-5.6 uses the reviewed Responses endpoint and high reasoning', async () => {
  let requestUrl = '';
  let authorization = '';
  let requestBody: Record<string, unknown> | undefined;
  const provider = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    baseUrl: 'https://kuaipao.pro/v1/',
    maxAttempts: 1,
    fetch: (async (url, init) => {
      requestUrl = String(url);
      authorization = new Headers(init?.headers).get('authorization') || '';
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        id: 'resp_test',
        model: KUAIPAO_GPT_56_MODEL,
        output: [
          {
            type: 'message',
            content: [{ type: 'output_text', text: 'Scene ready' }],
          },
        ],
      });
    }) as typeof globalThis.fetch,
  });

  const result = await provider.complete({
    model: KUAIPAO_GPT_56_MODEL,
    messages: [
      { role: 'system', content: 'Return final output only.' },
      { role: 'user', content: 'Build a scene.' },
    ],
    maxTokens: 12_000,
    temperature: 0.7,
    reasoningEffort: 'high',
  });

  assert.equal(requestUrl, 'https://kuaipao.pro/v1/responses');
  assert.equal(authorization, 'Bearer test-kuaipao-key');
  assert.equal(requestBody?.model, KUAIPAO_GPT_56_MODEL);
  assert.equal(requestBody?.max_output_tokens, 12_000);
  assert.deepEqual(requestBody?.reasoning, { effort: 'high' });
  assert.equal('temperature' in requestBody!, false);
  assert.deepEqual(requestBody?.input, [
    {
      role: 'developer',
      content: [{ type: 'input_text', text: 'Return final output only.' }],
    },
    {
      role: 'user',
      content: [{ type: 'input_text', text: 'Build a scene.' }],
    },
  ]);
  assert.deepEqual(result, {
    content: 'Scene ready',
    model: KUAIPAO_GPT_56_MODEL,
    provider: 'kuaipao',
  });
});

test('Kuaipao response parsing accepts the gateway documented Chat shape', () => {
  assert.equal(
    parseKuaipaoResponseText({
      choices: [{ message: { content: 'Compatible result' } }],
    }),
    'Compatible result'
  );
  assert.equal(
    parseKuaipaoResponseText({
      data: { output_text: 'Wrapped result', model: KUAIPAO_GPT_56_MODEL },
    }),
    'Wrapped result'
  );
});

test('Kuaipao streams Responses output text deltas without reasoning leakage', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const provider = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    maxAttempts: 1,
    fetch: (async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        [
          'event: response.reasoning_summary_text.delta',
          'data: {"type":"response.reasoning_summary_text.delta","delta":"private reasoning"}',
          '',
          'event: response.output_text.delta',
          'data: {"type":"response.output_text.delta","delta":"Scene "}',
          '',
          'data: {"type":"response.output_text.delta","delta":"ready"}',
          '',
          'data: {"type":"response.completed","response":{"model":"gpt-5.6-sol","output_text":"Scene ready"}}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'),
        { headers: { 'content-type': 'text/event-stream' } }
      );
    }) as typeof globalThis.fetch,
  });
  const deltas: string[] = [];

  const result = await provider.stream!(
    {
      model: KUAIPAO_GPT_56_MODEL,
      messages: [{ role: 'user', content: 'Build a scene.' }],
      reasoningEffort: 'high',
    },
    (delta) => deltas.push(delta)
  );

  assert.equal(requestBody?.stream, true);
  assert.deepEqual(deltas, ['Scene ', 'ready']);
  assert.equal(result.content, 'Scene ready');
  assert.equal(result.model, KUAIPAO_GPT_56_MODEL);
});

test('Kuaipao accepts a completed-only Responses stream', async () => {
  const provider = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    maxAttempts: 1,
    fetch: (async () =>
      new Response(
        'data: {"type":"response.completed","response":{"output":[{"type":"message","content":[{"type":"output_text","text":"Final only"}]}]}}\n\n',
        { headers: { 'content-type': 'text/event-stream' } }
      )) as typeof globalThis.fetch,
  });
  const deltas: string[] = [];

  const result = await provider.stream!(
    {
      model: KUAIPAO_GPT_56_MODEL,
      messages: [{ role: 'user', content: 'Reply.' }],
    },
    (delta) => deltas.push(delta)
  );

  assert.deepEqual(deltas, ['Final only']);
  assert.equal(result.content, 'Final only');
});

test('Kuaipao rejects incomplete output and HTTP-200 business errors', async () => {
  const incomplete = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    maxAttempts: 1,
    fetch: (async () =>
      Response.json({
        status: 'incomplete',
        output_text: 'truncated code',
        incomplete_details: { reason: 'max_output_tokens' },
      })) as typeof globalThis.fetch,
  });
  await assert.rejects(
    incomplete.complete({
      model: KUAIPAO_GPT_56_MODEL,
      messages: [{ role: 'user', content: 'Reply.' }],
    }),
    (error: unknown) =>
      error instanceof ChatProviderError && error.code === 'invalid_response'
  );

  const businessError = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    maxAttempts: 1,
    fetch: (async () =>
      new Response(
        'data: {"code":401,"message":"Invalid API key provided."}\n\n',
        { headers: { 'content-type': 'text/event-stream' } }
      )) as typeof globalThis.fetch,
  });
  await assert.rejects(
    businessError.stream!(
      {
        model: KUAIPAO_GPT_56_MODEL,
        messages: [{ role: 'user', content: 'Reply.' }],
      },
      () => {}
    ),
    (error: unknown) =>
      error instanceof ChatProviderError && error.code === 'upstream_auth'
  );
});

test('Kuaipao rejects aliases and classifies missing channels as unavailable', async () => {
  const provider = new KuaipaoChatProvider({
    apiKey: 'test-kuaipao-key',
    maxAttempts: 1,
    fetch: (async () =>
      Response.json(
        {
          error: {
            code: 'model_not_found',
            message:
              'No available channel for model gpt-5.6-sol under group default',
          },
        },
        { status: 503 }
      )) as typeof globalThis.fetch,
  });

  await assert.rejects(
    provider.complete({
      model: 'gpt-5.6',
      messages: [{ role: 'user', content: 'Reply.' }],
    }),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'model_unavailable' &&
      error.retryable === false
  );
  await assert.rejects(
    provider.complete({
      model: KUAIPAO_GPT_56_MODEL,
      messages: [{ role: 'user', content: 'Reply.' }],
    }),
    (error: unknown) =>
      error instanceof ChatProviderError &&
      error.code === 'model_unavailable' &&
      error.retryable === false
  );
});
