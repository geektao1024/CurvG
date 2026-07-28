import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatProviderError } from '../src/core/ai/chat';
import { enforceMinIntervalRateLimit } from '../src/lib/rate-limit';
import {
  ANIMATION_STAGE_TIMEOUT_MS,
  animationStageDeadlineAt,
  renderFailureRequiresCodeRegeneration,
} from '../src/modules/animations/service';
import {
  AnimationApiError,
  animationErrorInit,
  animationErrorResponse,
  withAnimationGenerationCapacity,
} from '../src/routes/api/animations/-shared';
import { animationEventStream } from '../src/routes/api/animations/-stream';
import { renderCallbackErrorResponse } from '../src/routes/api/animations/$id/render-callback';

const unitLeaseBackend = {
  async acquire(userId: string) {
    return `unit-${userId}`;
  },
  async release() {},
};

function request(path: string, cookie: string) {
  return new Request(`https://curvg.test${path}`, {
    method: 'POST',
    headers: {
      cookie,
      'x-forwarded-for': '203.0.113.10',
    },
  });
}

test('authenticated rate limits cannot be bypassed by rotating cookies or paths', () => {
  globalThis.__minIntervalRateLimitStore = new Map();
  const options = {
    intervalMs: 10_000,
    keyPrefix: 'animation-generation',
    extraKey: 'user-1',
  };

  assert.equal(
    enforceMinIntervalRateLimit(
      request('/api/animations', 'junk=one'),
      options
    ),
    null
  );
  const rotatedCookie = enforceMinIntervalRateLimit(
    request('/api/animations/id/approve', 'junk=two'),
    options
  );
  assert.equal(rotatedCookie?.status, 429);

  assert.equal(
    enforceMinIntervalRateLimit(request('/api/animations', 'junk=two'), {
      ...options,
      extraKey: 'user-2',
    }),
    null
  );
});

test('webhook rate limits ignore rotating cookies and prefer the trusted Cloudflare IP', () => {
  globalThis.__minIntervalRateLimitStore = new Map();
  const options = {
    intervalMs: 10_000,
    keyPrefix: 'paypal-webhook-verification',
    includeCookie: false,
  };
  const makeRequest = (cloudflareIp: string, cookie: string) =>
    new Request('https://curvg.test/api/payment/notify/paypal', {
      method: 'POST',
      headers: {
        cookie,
        'cf-connecting-ip': cloudflareIp,
        'x-forwarded-for': '198.51.100.10',
      },
    });

  assert.equal(
    enforceMinIntervalRateLimit(
      makeRequest('203.0.113.1', 'junk=one'),
      options
    ),
    null
  );
  assert.equal(
    enforceMinIntervalRateLimit(makeRequest('203.0.113.1', 'junk=two'), options)
      ?.status,
    429
  );
  assert.equal(
    enforceMinIntervalRateLimit(
      makeRequest('203.0.113.2', 'junk=three'),
      options
    ),
    null
  );
});

test('animation capacity rejects concurrent work for the same user', async () => {
  globalThis.__animationCapacityState = { activeUsers: new Set() };
  let release!: () => void;
  const blocker = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = withAnimationGenerationCapacity(
    'user-1',
    async () => {
      await blocker;
      return 'done';
    },
    unitLeaseBackend
  );

  await assert.rejects(
    withAnimationGenerationCapacity(
      'user-1',
      async () => 'unexpected',
      unitLeaseBackend
    ),
    (error: unknown) => {
      assert.ok(error instanceof AnimationApiError);
      assert.equal(error.code, 'CAPACITY_LIMIT');
      assert.equal(error.status, 429);
      return true;
    }
  );
  release();
  assert.equal(await first, 'done');
});

test('animation capacity bounds aggregate upstream work', async () => {
  globalThis.__animationCapacityState = { activeUsers: new Set() };
  const releases: Array<() => void> = [];
  const active = Array.from({ length: 4 }, (_, index) =>
    withAnimationGenerationCapacity(
      `user-${index}`,
      () => new Promise<void>((resolve) => releases.push(resolve)),
      unitLeaseBackend
    )
  );

  await assert.rejects(
    withAnimationGenerationCapacity(
      'user-overflow',
      async () => undefined,
      unitLeaseBackend
    ),
    (error: unknown) =>
      error instanceof AnimationApiError && error.status === 429
  );
  releases.forEach((release) => release());
  await Promise.all(active);
});

test('SSE exposes controlled busy failures as structured retryable events', async () => {
  const response = animationEventStream(async () => {
    throw new AnimationApiError(
      'Animation generation is busy. Please retry shortly.',
      'CAPACITY_LIMIT',
      429
    );
  });

  const body = await response.text();
  assert.match(body, /"type":"error"/);
  assert.match(body, /"code":"BUSY"/);
  assert.match(body, /"retryable":true/);
});

test('saturated upstream failures return safe retry headers', () => {
  const failure = animationErrorResponse(
    new ChatProviderError('upstream internals must not leak', {
      code: 'upstream_saturated',
      retryable: true,
      retryAfterMs: 6_100,
      provider: 'yunwu',
      model: 'hidden-model',
    })
  );
  const init = animationErrorInit(failure);

  assert.equal(failure.status, 429);
  assert.equal(
    failure.message,
    'The selected AI model is at capacity. Please retry shortly.'
  );
  assert.equal(new Headers(init.headers).get('retry-after'), '7');
});

test('deterministic renderer errors trigger code repair, infrastructure errors do not', () => {
  assert.equal(
    renderFailureRequiresCodeRegeneration(
      'Traceback: AttributeError: Axes has no attribute get_grid_lines'
    ),
    true
  );
  assert.equal(
    renderFailureRequiresCodeRegeneration('renderer queue temporarily full'),
    false
  );
  assert.equal(renderFailureRequiresCodeRegeneration(undefined), false);
});

test('each animation stage has one bounded absolute deadline', () => {
  assert.equal(
    animationStageDeadlineAt(1_000),
    1_000 + ANIMATION_STAGE_TIMEOUT_MS
  );
});

test('renderer callback internal failures return retryable HTTP status without leaking details', async () => {
  const response = renderCallbackErrorResponse(
    new Error('database password and internal stack must not leak')
  );
  assert.equal(response.status, 500);
  const body = await response.text();
  assert.match(body, /Render callback failed/);
  assert.doesNotMatch(body, /database password/);
});
