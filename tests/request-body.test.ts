import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  readRequestBodyCapped,
  REQUEST_BODY_LIMITS,
  requestWithRawBody,
} from '../src/lib/request-body';

const encoder = new TextEncoder();

function qualityGateQaReport() {
  return {
    analyzerVersion: 1,
    status: 'pass',
    score: 100,
    sampleCount: 12,
    frames: Array.from({ length: 12 }, (_, index) => ({
      index: index + 1,
      occupancy: 0.2,
      edgeContent: 0.01,
      edgeRisk: false,
      centerOffset: 0.1,
      contrast: 0.8,
      contentBounds: [0.1, 0.1, 0.9, 0.9],
    })),
    transitionDeltas: Array.from({ length: 11 }, () => 0.1),
    durationSeconds: 20,
    temporalSampleRate: 30,
    temporalSampleCount: 600,
    blackSegments: [],
    frozenSegments: [],
    flashTimestamps: [],
    issues: [],
  };
}

function escapedManimSource(length: number): string {
  const header = `from manim import *
class CurvGScene(Scene):
    def construct(self):
        formula = MathTex(r"\\frac{x^2}{2} + \\sqrt{x}")
        self.play(Write(formula), run_time=1)
`;
  const latexComment =
    '        # LaTeX: \\int_0^1 x^2 \\, dx = \\frac{1}{3}\\n';
  const repeats = Math.ceil((length - header.length) / latexComment.length);
  return `${header}${latexComment.repeat(Math.max(0, repeats))}`.slice(
    0,
    length
  );
}

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

test('quality gate has room for escaped 60 KB Manim source and valid QA JSON', async () => {
  assert.equal(REQUEST_BODY_LIMITS.renderCallback, 16 * 1024);
  assert.equal(REQUEST_BODY_LIMITS.animationQualityGate, 192 * 1024);

  const payload = {
    kind: 'final_review',
    attempt: 0,
    jobId: '12345678-1234-1234-1234-123456789abc',
    approvedCode: escapedManimSource(60_000),
    visualQa: qualityGateQaReport(),
  };
  const serialized = JSON.stringify(payload);
  const byteLength = encoder.encode(serialized).byteLength;
  assert.ok(byteLength > REQUEST_BODY_LIMITS.renderCallback);
  assert.ok(byteLength <= REQUEST_BODY_LIMITS.animationQualityGate);

  const parsed = await readJsonBodyCapped<typeof payload>(
    streamedRequest([serialized]),
    REQUEST_BODY_LIMITS.animationQualityGate
  );
  assert.equal(parsed.approvedCode, payload.approvedCode);
  assert.deepEqual(parsed.visualQa, payload.visualQa);
});

test('quality gate rejects a chunked body above its dedicated 192 KiB cap', async () => {
  const oversized = JSON.stringify({
    approvedCode: 'x'.repeat(REQUEST_BODY_LIMITS.animationQualityGate),
  });
  assert.ok(
    encoder.encode(oversized).byteLength >
      REQUEST_BODY_LIMITS.animationQualityGate
  );

  await assert.rejects(
    () =>
      readJsonBodyCapped(
        streamedRequest([oversized]),
        REQUEST_BODY_LIMITS.animationQualityGate
      ),
    (error: unknown) =>
      isRequestBodyTooLargeError(error) &&
      error.maxBytes === REQUEST_BODY_LIMITS.animationQualityGate
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
