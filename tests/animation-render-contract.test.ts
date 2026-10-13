import assert from 'node:assert/strict';
import test from 'node:test';

import { HttpAnimationRenderer } from '../src/core/animation-renderer';
import { compileAnimationSpec } from '../src/lib/manim-compiler';
import { auditedGeometrySpec } from './animation-spec-fixture';

test('renderer submits the approved frame, duration, and 1080p30 delivery contract', async () => {
  const previousFetch = globalThis.fetch;
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;

  globalThis.fetch = (async (input, init) => {
    requestedUrl = String(input);
    requestedInit = init;
    return new Response(
      JSON.stringify({
        jobId: 'render-contract-1',
        status: 'queued',
        protocolVersion: 'curvg-renderer/v2',
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }) as typeof globalThis.fetch;

  try {
    const renderer = new HttpAnimationRenderer({
      baseUrl: 'https://renderer.curvg.test/',
      token: 'renderer-test-token',
    });

    const result = await renderer.render({
      animationId: 'animation-1',
      code: 'from manim import *',
      callbackUrl:
        'https://curvg.test/api/animations/animation-1/render-callback',
      qualityGateUrl:
        'https://curvg.test/api/animations/animation-1/quality-gate',
      frame: '9:16',
      durationSeconds: 18.5,
      idempotencyKey: 'a'.repeat(64),
    });

    assert.equal(requestedUrl, 'https://renderer.curvg.test/render');
    assert.equal(requestedInit?.method, 'POST');

    const body = JSON.parse(String(requestedInit?.body)) as Record<
      string,
      unknown
    >;
    assert.equal(body.frame, '9:16');
    assert.equal(body.durationSeconds, 18.5);
    assert.equal(body.quality, '1080p30');
    assert.equal(body.idempotencyKey, 'a'.repeat(64));
    assert.equal(result.protocolVersion, 'curvg-renderer/v2');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('compiler fixes generated Manim scenes at 30 frames per second', () => {
  const source = compileAnimationSpec(auditedGeometrySpec());

  assert.match(source, /^config\.frame_rate = 30$/m);
});

test('renderer rejects malformed submission identities before dispatch', async () => {
  const previousFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    return Response.json({ jobId: 'unexpected', status: 'queued' });
  }) as typeof globalThis.fetch;
  try {
    const renderer = new HttpAnimationRenderer({
      baseUrl: 'https://renderer.curvg.test',
      token: 'renderer-test-token',
    });
    await assert.rejects(
      () =>
        renderer.render({
          animationId: 'animation-1',
          code: 'from manim import *',
          callbackUrl:
            'https://curvg.test/api/animations/animation-1/render-callback',
          qualityGateUrl:
            'https://curvg.test/api/animations/animation-1/quality-gate',
          frame: '16:9',
          durationSeconds: 8,
          idempotencyKey: 'not-a-digest',
        }),
      /idempotency key is invalid/
    );
    assert.equal(fetchCount, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
