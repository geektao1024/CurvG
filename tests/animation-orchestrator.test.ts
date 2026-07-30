import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AnimationOrchestratorError,
  HttpAnimationOrchestrator,
} from '../src/core/animation-orchestrator';
import { auditedGeometrySpec } from './animation-spec-fixture';

function prepareResponse() {
  return {
    protocolVersion: 'curvg.orchestrator/v1',
    status: 'ready',
    visualContract: {
      contractVersion: 'curvg.visual/v1',
      frame: {
        aspectRatio: '16:9',
        safeZone: [0.06, 0.08, 0.94, 0.92],
        targetWidth: 1920,
        targetHeight: 1080,
        frameRate: 30,
      },
      hook: { deadlineSeconds: 1, requiresVisibleMotion: true },
      payoff: { startRatio: 0.67, requiresResolvedVisual: true },
      text: {
        maxWordsPerObject: 8,
        maxSimultaneousObjects: 2,
        proseIsSecondary: true,
      },
      motion: { dominantActionsPerBeat: 1, requireVisualProof: true },
      palette: ['#6A9BCC'],
    },
    templates: [],
    diagnostics: [],
    generationBrief:
      'Use visible geometry, begin motion in the first second, and resolve the visual proof in the final third.',
    preparedAt: '2026-07-30T00:00:00Z',
  };
}

test('Python orchestrator client sends a versioned authenticated prepare request', async () => {
  const previousFetch = globalThis.fetch;
  let url = '';
  let authorization = '';
  let protocol = '';
  let body: Record<string, unknown> | undefined;
  globalThis.fetch = (async (input, init) => {
    url = String(input);
    const headers = new Headers(init?.headers);
    authorization = headers.get('authorization') || '';
    protocol = headers.get('x-curvg-orchestrator-protocol') || '';
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json(prepareResponse());
  }) as typeof globalThis.fetch;
  try {
    const client = new HttpAnimationOrchestrator({
      baseUrl: 'https://orchestrator.example.com/',
      token: 'test-token',
    });
    const result = await client.prepare({
      animationId: 'animation-1',
      prompt: 'Explain sine projection',
      spec: auditedGeometrySpec(),
      mode: 'initial',
    });
    assert.equal(url, 'https://orchestrator.example.com/v1/prepare');
    assert.equal(authorization, 'Bearer test-token');
    assert.equal(protocol, '1');
    assert.equal(body?.protocolVersion, 'curvg.orchestrator/v1');
    assert.equal(result.visualContract.contractVersion, 'curvg.visual/v1');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Python orchestrator client classifies service outages as retryable', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    Response.json(
      { detail: 'temporarily unavailable' },
      { status: 503 }
    )) as typeof globalThis.fetch;
  try {
    const client = new HttpAnimationOrchestrator({
      baseUrl: 'https://orchestrator.example.com',
      token: 'test-token',
    });
    await assert.rejects(
      () =>
        client.prepare({
          animationId: 'animation-1',
          prompt: 'Explain sine projection',
          spec: auditedGeometrySpec(),
          mode: 'initial',
        }),
      (error: unknown) =>
        error instanceof AnimationOrchestratorError &&
        error.retryable &&
        error.status === 503
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Python orchestrator client rejects insecure production URLs', () => {
  assert.throws(
    () =>
      new HttpAnimationOrchestrator({
        baseUrl: 'http://orchestrator.example.com',
        token: 'test-token',
      }),
    /HTTPS/
  );
});
