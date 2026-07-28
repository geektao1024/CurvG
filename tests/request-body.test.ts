import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  readRequestBodyCapped,
  requestWithRawBody,
} from '../src/lib/request-body';

const encoder = new TextEncoder();

function streamedRequest(chunks: string[], contentLength?: string): Request {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Request('https://example.test/hook', {
    method: 'POST',
    headers: contentLength ? { 'content-length': contentLength } : undefined,
    body,
    duplex: 'half',
  } as RequestInit);
}

test('reads chunked JSON under the cap', async () => {
  const body = await readJsonBodyCapped<{ prompt: string }>(
    streamedRequest(['{"pro', 'mpt":"ok"}']),
    64
  );
  assert.deepEqual(body, { prompt: 'ok' });
});

test('rejects declared oversized bodies before reading', async () => {
  await assert.rejects(
    () => readRequestBodyCapped(streamedRequest(['small'], '100'), 16),
    isRequestBodyTooLargeError
  );
});

test('rejects chunked oversized bodies without Content-Length', async () => {
  await assert.rejects(
    () => readRequestBodyCapped(streamedRequest(['1234', '5678']), 7),
    isRequestBodyTooLargeError
  );
});

test('preserves raw webhook bytes after capped reading', async () => {
  const raw = encoder.encode('{"a":1, "signature":"exact spacing"}');
  const original = new Request('https://example.test/hook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-signature': 'abc' },
    body: raw,
  });
  const bytes = await readRequestBodyCapped(original, 1024);
  const rebuilt = requestWithRawBody(original, bytes);
  assert.deepEqual([...new Uint8Array(await rebuilt.arrayBuffer())], [...raw]);
  assert.equal(rebuilt.headers.get('x-signature'), 'abc');
});
