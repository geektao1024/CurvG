import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ChatProviderError,
  ProviderFailoverChatProvider,
  type ChatProvider,
} from '../src/core/ai/chat';
import { animationFailureCodeFromHttpStatus } from '../src/lib/animation';
import { enforceMinIntervalRateLimit } from '../src/lib/rate-limit';
import {
  ANIMATION_STAGE_TIMEOUT_MS,
  animationStageDeadlineAt,
  composeAnimationCode,
  generateAnimationSpec,
  parseAnimationSpecWithRepairs,
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
import { auditedGeometrySpec } from './animation-spec-fixture';

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

test('SSE relays real planning phases to the creator workspace', async () => {
  const response = animationEventStream(async (send) => {
    send({ type: 'phase', phase: 'understanding' });
    send({ type: 'phase', phase: 'auditing' });
  });

  const body = await response.text();
  assert.match(body, /"type":"phase","phase":"understanding"/);
  assert.match(body, /"type":"phase","phase":"auditing"/);
});

test('every generated specification can repair a validator-level timeline conflict', async () => {
  const validSpec = {
    schemaVersion: 2 as const,
    title: 'Sequential timeline',
    summary: 'Draw one object without overlapping event groups.',
    durationSeconds: 2,
    assumptions: [],
    style: {
      background: '#000000',
      palette: ['#ffffff'],
      camera: 'static',
    },
    objects: [{ id: 'axes', kind: 'axes' as const, region: 'graph' as const }],
    timeline: [
      {
        id: 'draw-axes',
        at: 0,
        op: 'draw' as const,
        ref: 'axes',
        runTime: 1,
        ease: 'smooth' as const,
      },
    ],
    layout: { regions: 'single' as const },
    dependencies: [],
    notes: [],
  };
  const invalidSpec = {
    ...validSpec,
    timeline: [
      validSpec.timeline[0],
      {
        id: 'hold-axes',
        at: 0.5,
        op: 'hold' as const,
        ref: 'axes',
        runTime: 0.5,
        ease: 'linear' as const,
      },
    ],
  };
  let repairCalls = 0;
  const provider = {
    name: 'test-provider',
    async complete(input: { messages: Array<{ content: string }> }) {
      repairCalls += 1;
      assert.match(
        input.messages.at(-1)?.content || '',
        /next\.at >= current\.at \+ max/
      );
      return {
        content: JSON.stringify(validSpec),
        model: 'test-model',
        provider: 'test-provider',
      };
    },
  };

  const repaired = await parseAnimationSpecWithRepairs({
    provider,
    input: {
      model: 'test-model',
      messages: [{ role: 'user', content: 'Build a scene.' }],
    },
    result: {
      content: JSON.stringify(invalidSpec),
      model: 'test-model',
      provider: 'test-provider',
    },
  });

  assert.equal(repairCalls, 1);
  assert.ok(repaired.spec.timeline);
  assert.equal(repaired.spec.timeline.length, 1);
});

test('Auto advances to another reviewed model after repeated invalid specifications', async () => {
  const validSpec = auditedGeometrySpec();
  const approvedReview = {
    status: 'approved',
    summary: 'The specification is mathematically and visually coherent.',
    checkedClaims: [
      'The circular point and projection use the same parameter.',
    ],
    issues: [],
  } as const;
  const attempts: string[] = [];
  let fallbackCalls = 0;
  const target: ChatProvider = {
    name: 'kie',
    async complete(input: { model: string }) {
      attempts.push(input.model);
      if (input.model === 'gemini-3.6-flash') {
        return {
          content: '{"schemaVersion":5,"title":',
          model: input.model,
          provider: 'kie',
        };
      }
      fallbackCalls += 1;
      return {
        content: JSON.stringify(
          fallbackCalls === 1 ? validSpec : approvedReview
        ),
        model: input.model,
        provider: 'kie',
      };
    },
  };
  const provider = new ProviderFailoverChatProvider([
    {
      provider: target,
      model: 'gemini-3.6-flash',
      reasoningEffort: 'low',
    },
    { provider: target, model: 'grok-4-5', reasoningEffort: 'low' },
  ]);

  const result = await generateAnimationSpec({
    provider,
    model: 'gemini-3.6-flash',
    prompt: '把正弦波逐步还原为单位圆上的投影。',
    subject: 'math',
    deadlineAt: Date.now() + 60_000,
  });

  assert.equal(result.result.model, 'grok-4-5');
  assert.equal(result.spec.title, validSpec.title);
  assert.deepEqual(attempts, [
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'grok-4-5',
    'grok-4-5',
  ]);
});

test('Auto also fails over when the independent math audit stays malformed', async () => {
  const validSpec = auditedGeometrySpec();
  const approvedReview = {
    status: 'approved',
    summary: 'The fallback reviewer independently verified the proof.',
    checkedClaims: ['The point height and sine ordinate share one parameter.'],
    issues: [],
  } as const;
  const attempts: string[] = [];
  let primaryCalls = 0;
  const target: ChatProvider = {
    name: 'kie',
    async complete(input) {
      attempts.push(input.model);
      if (input.model === 'gemini-3.6-flash') {
        primaryCalls += 1;
        return {
          content:
            primaryCalls === 1 ? JSON.stringify(validSpec) : 'invalid-audit',
          model: input.model,
          provider: 'kie',
        };
      }
      return {
        content: JSON.stringify(approvedReview),
        model: input.model,
        provider: 'kie',
      };
    },
  };
  const provider = new ProviderFailoverChatProvider([
    {
      provider: target,
      model: 'gemini-3.6-flash',
      reasoningEffort: 'low',
    },
    { provider: target, model: 'grok-4-5', reasoningEffort: 'low' },
  ]);

  const result = await generateAnimationSpec({
    provider,
    model: 'gemini-3.6-flash',
    prompt: '把正弦波逐步还原为单位圆上的投影。',
    subject: 'math',
    deadlineAt: Date.now() + 60_000,
  });

  assert.equal(result.spec.title, validSpec.title);
  assert.deepEqual(attempts, [
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'grok-4-5',
  ]);
});

test('structured-output failover remains bounded when every model is invalid', async () => {
  const attempts: string[] = [];
  const target: ChatProvider = {
    name: 'kie',
    async complete(input: { model: string }) {
      attempts.push(input.model);
      return {
        content: 'not-json',
        model: input.model,
        provider: 'kie',
      };
    },
  };
  const provider = new ProviderFailoverChatProvider([
    {
      provider: target,
      model: 'gemini-3.6-flash',
      reasoningEffort: 'low',
    },
    { provider: target, model: 'grok-4-5', reasoningEffort: 'low' },
  ]);
  const input = {
    model: 'gemini-3.6-flash',
    messages: [{ role: 'user' as const, content: 'Build a scene.' }],
  };
  const initial = await provider.complete(input);

  await assert.rejects(
    parseAnimationSpecWithRepairs({ provider, input, result: initial }),
    /invalid JSON/
  );
  assert.deepEqual(attempts, [
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'grok-4-5',
    'grok-4-5',
    'grok-4-5',
  ]);
});

test('an explicitly selected model never switches after invalid structured output', async () => {
  const attempts: string[] = [];
  const provider: ChatProvider = {
    name: 'kie',
    async complete(input) {
      attempts.push(input.model);
      return {
        content: 'not-json',
        model: input.model,
        provider: 'kie',
      };
    },
  };
  const input = {
    model: 'gemini-3.6-flash',
    messages: [{ role: 'user' as const, content: 'Build a scene.' }],
  };
  const initial = await provider.complete(input);

  await assert.rejects(
    parseAnimationSpecWithRepairs({ provider, input, result: initial }),
    /invalid JSON/
  );
  assert.deepEqual(attempts, [
    'gemini-3.6-flash',
    'gemini-3.6-flash',
    'gemini-3.6-flash',
  ]);
});

test('math-audit repair can add explicit geometry instead of looping on prose', async () => {
  const repairedSpec = auditedGeometrySpec();
  const initialSpec = structuredClone(repairedSpec);
  initialSpec.objects = initialSpec.objects?.filter(
    (object) => object.id !== 'angle-arc' && object.id !== 'projection-line'
  );
  initialSpec.timeline = initialSpec.timeline?.filter(
    (event) => event.ref !== 'angle-arc' && event.ref !== 'projection-line'
  );
  const rejectedReview = {
    status: 'needs_revision',
    summary:
      'The proof is missing an angle marker and an explicit projection line.',
    checkedClaims: ['The unit-circle coordinate identity is correct.'],
    issues: [
      {
        severity: 'major',
        claim: 'The point height equals sin(theta).',
        problem:
          'The angle parameter and the transferred height are not visibly linked.',
        correction:
          'Add an angle arc and a horizontal projection line as explicit timed geometry.',
      },
    ],
  } as const;
  const approvedReview = {
    status: 'approved',
    summary: 'The visible geometry now establishes the projection identity.',
    checkedClaims: [
      'The angle, point height and sine ordinate use the same theta.',
    ],
    issues: [],
  } as const;
  const outputs = [initialSpec, rejectedReview, repairedSpec, approvedReview];
  const requests: string[] = [];
  const provider = {
    name: 'test-provider',
    async complete(input: { messages: Array<{ content: string }> }) {
      requests.push(input.messages.at(-1)?.content || '');
      const output = outputs.shift();
      if (!output) throw new Error('Unexpected provider call');
      return {
        content: JSON.stringify(output),
        model: 'gemini-3.6-flash',
        provider: 'test-provider',
      };
    },
  };

  const result = await generateAnimationSpec({
    provider,
    model: 'gemini-3.6-flash',
    prompt: '把正弦波逐步还原为单位圆上的投影。',
    subject: 'math',
    deadlineAt: Date.now() + 60_000,
  });

  assert.equal(outputs.length, 0);
  assert.match(requests[2], /circle, point, line, arrow and arc geometry/);
  assert.ok(
    result.spec.objects?.some((object) => object.id === 'projection-line')
  );
  assert.ok(result.spec.objects?.some((object) => object.id === 'angle-arc'));
  assert.ok(result.spec.timeline?.some((event) => event.op === 'move_along'));
});

test('Gemini code composition streams and deterministically recovers two empty code envelopes', async () => {
  let streamCalls = 0;
  const provider = {
    name: 'test-provider',
    async complete() {
      throw new Error('Gemini 3.6 code composition should use streaming');
    },
    async stream() {
      streamCalls += 1;
      return {
        content: '{"code":""}',
        model: 'gemini-3.6-flash',
        provider: 'test-provider',
      };
    },
  };

  const result = await composeAnimationCode({
    provider,
    model: 'gemini-3.6-flash',
    prompt: '把正弦波逐步还原为单位圆上的投影。',
    spec: auditedGeometrySpec(),
  });

  assert.equal(streamCalls, 2);
  assert.match(result.code, /from manim import/);
  assert.match(result.code, /class CurvGScene\(Scene\)/);
  assert.ok(result.code.length > 100);
});

test('Gemini repairs an add_updater scene before it reaches the renderer', async () => {
  const invalid = `
from manim import *

class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        dot.add_updater(lambda mob: mob.shift(RIGHT * 0.01))
        self.add(dot)
        self.wait(1)
`;
  const corrected = `
from manim import *

class CurvGScene(Scene):
    def construct(self):
        tracker = ValueTracker(0)
        dot = always_redraw(lambda: Dot().shift(RIGHT * tracker.get_value()))
        self.add(dot)
        self.play(tracker.animate.set_value(2), run_time=1)
        self.wait(1)
`;
  const outputs = [invalid, corrected];
  const provider: ChatProvider = {
    name: 'kie',
    async complete() {
      throw new Error('Gemini 3.6 code composition should use streaming');
    },
    async stream() {
      const content = outputs.shift();
      if (!content) throw new Error('Unexpected stream call');
      return {
        content,
        model: 'gemini-3.6-flash',
        provider: 'kie',
      };
    },
  };

  const result = await composeAnimationCode({
    provider,
    model: 'gemini-3.6-flash',
    prompt: 'Animate a point moving along a line.',
    spec: auditedGeometrySpec(),
  });

  assert.equal(outputs.length, 0);
  assert.doesNotMatch(result.code, /add_updater/);
  assert.match(result.code, /always_redraw/);
});

test('render payment failures map to the localized insufficient-credit message', () => {
  assert.equal(animationFailureCodeFromHttpStatus(402), 'INSUFFICIENT_CREDITS');
  assert.equal(animationFailureCodeFromHttpStatus(403), 'PRO_REQUIRED');
  assert.equal(animationFailureCodeFromHttpStatus(500), undefined);
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

test('reasoning budget failures surface as timeouts, not provider outages', () => {
  const failure = animationErrorResponse(
    new ChatProviderError('internal reasoning metrics must not leak', {
      code: 'upstream_timeout',
      retryable: true,
      retrySameModel: false,
      provider: 'yunwu',
      model: 'deepseek-v4-pro',
    })
  );
  const init = animationErrorInit(failure);

  assert.equal(failure.status, 503);
  assert.equal(failure.message, 'The AI model timed out. Please retry.');
  assert.equal(new Headers(init.headers).get('retry-after'), '3');
  assert.doesNotMatch(failure.message, /reasoning|deepseek/i);
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
