import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { ChatProvider } from '../src/core/ai/chat';
import { validateAnimationSpec } from '../src/lib/animation-schema';
import {
  buildVideoTemplate,
  getVideoTemplate,
  resolveTemplateContext,
  resolveTemplateParams,
  TemplateParamError,
  VIDEO_TEMPLATES,
} from '../src/lib/video-templates';
import {
  checkExpression,
  normalizeExpressionInput,
  toLatex,
  toNumpy,
  toPlain,
} from '../src/lib/video-templates/expr';
import {
  niceRange,
  plotSegments,
  seconds,
} from '../src/lib/video-templates/manim';
import {
  equalsLatex,
  extrema,
  integrate,
  roots,
  valueLatex,
} from '../src/lib/video-templates/numeric';
import { publicVideoTemplates } from '../src/lib/video-templates/public';
import { templateDescriptorSpec } from '../src/lib/video-templates/spec';
import { matchVideoTemplate } from '../src/modules/animations/template-match';

const validator = join(process.cwd(), 'renderer', 'validate_scene.py');
const contexts = [
  resolveTemplateContext({ locale: 'zh', frame: '16:9', theme: 'paper' }),
  resolveTemplateContext({ locale: 'en', frame: '9:16', theme: 'studio' }),
];

function validate(source: string) {
  const directory = mkdtempSync(join(tmpdir(), 'curvg-template-'));
  const path = join(directory, 'scene.py');
  writeFileSync(path, source, 'utf8');
  const result = spawnSync('python3', [validator, path], { encoding: 'utf8' });
  rmSync(directory, { recursive: true, force: true });
  return result;
}

test('expressions normalize what people type', () => {
  assert.equal(normalizeExpressionInput('y = 3x² − 2'), '3*x^2 - 2');
  assert.equal(normalizeExpressionInput('2(x+1)(x-1)'), '2*(x+1)*(x-1)');
  assert.equal(normalizeExpressionInput('f(x) = sin(2πx)'), 'sin(2*(pi)*x)');
  assert.equal(
    toLatex(normalizeExpressionInput('sin(2πx)')),
    '\\sin\\left(2\\pi x\\right)'
  );
  assert.equal(normalizeExpressionInput('x**3'), 'x^3');
});

test('expressions reject unknown names and never-finite values', () => {
  assert.equal(checkExpression('x^2 + y', ['x']).ok, false);
  assert.equal(checkExpression('__import__(x)', ['x']).ok, false);
  assert.equal(checkExpression('foo(x)', ['x']).ok, false);
  assert.equal(checkExpression('1/0', ['x']).ok, false);
  assert.equal(checkExpression('ln(x)', ['x']).ok, true);
});

test('expressions print the same tree as NumPy, LaTeX and plain text', () => {
  assert.equal(toNumpy('3x^2 - 1', { x: 'x' }), '((3 * (x ** 2)) - 1)');
  assert.equal(toNumpy('-x^2', { x: 'x' }), '(-(x ** 2))');
  assert.equal(
    toNumpy('max(x, 0, 1)', { x: 'x' }),
    'np.maximum(np.maximum(x, 0), 1)'
  );
  assert.equal(toNumpy('sin(t)', { t: 'tt' }), 'np.sin(tt)');
  assert.equal(toLatex('3x^2 - 1'), '3x^{2} - 1');
  assert.equal(toLatex('2*pi*x'), '2\\pi x');
  assert.equal(
    toLatex('(x-1)*(x+2)'),
    '\\left(x - 1\\right)\\left(x + 2\\right)'
  );
  assert.equal(toLatex('1/(1+x^2)'), '\\frac{1}{1 + x^{2}}');
  assert.equal(toLatex('-2*x'), '-2x');
  assert.equal(toPlain('x^3 - 3*x'), 'x³ - 3x');
  assert.equal(toPlain('sqrt(x+1)'), '√(x + 1)');
});

test('numeric helpers compute what the films state', () => {
  assert.ok(Math.abs(integrate((x) => x * x, 0, 1) - 1 / 3) < 1e-12);
  assert.deepEqual(
    roots((x) => x * x * x - 3 * x, -3, 3).map((x) => Number(x.toFixed(6))),
    [-1.732051, 0, 1.732051]
  );
  assert.deepEqual(
    extrema((x) => x * x * x - 3 * x, -3, 3).map((p) => [
      p.kind,
      Number(p.x.toFixed(4)),
    ]),
    [
      ['max', -1],
      ['min', 1],
    ]
  );
  // A pole is not a root.
  assert.deepEqual(
    roots((x) => 1 / x, -2, 2),
    []
  );
  assert.equal(valueLatex(1 / 3).latex, '\\frac{1}{3}');
  assert.equal(valueLatex(Math.PI / 2).latex, '\\frac{\\pi}{2}');
  assert.equal(valueLatex(-3e-7).latex, '0');
  assert.equal(equalsLatex(2), '= 2');
  assert.equal(seconds(0.333), 0.3);
  assert.deepEqual(niceRange(-2.4, 4.6), { min: -4, max: 6, step: 2 });
  assert.deepEqual(niceRange(0, 1), { min: 0, max: 1, step: 0.2 });
  assert.deepEqual(
    plotSegments((x) => 1 / x, -2, 2, { min: -5, max: 5 }).length,
    2
  );
});

test('every template builds, validates and states the right numbers', () => {
  assert.equal(VIDEO_TEMPLATES.length, 12);
  for (const template of VIDEO_TEMPLATES) {
    const variants = [
      undefined,
      ...template.examples.map((example) => example.params),
    ];
    for (const params of variants) {
      for (const context of contexts) {
        const built = buildVideoTemplate({ id: template.id, params, context });
        assert.ok(
          built.durationSeconds >= 15 && built.durationSeconds <= 90,
          `${template.id} length ${built.durationSeconds}`
        );
        // Every play and wait sits on the 0.1 s grid, so the MP4 lands on
        // the planned length to the frame (the renderer checks it).
        assert.ok(
          Math.abs(
            built.durationSeconds * 10 - Math.round(built.durationSeconds * 10)
          ) < 1e-6
        );
        assert.ok(built.code.includes('class CurvGScene(Scene):'));
        assert.ok(built.code.length < 60_000, `${template.id} source too long`);
        assert.ok(built.beats.length > 0);
        validateAnimationSpec(templateDescriptorSpec(built));
      }
    }
  }
});

test('template sources pass the renderer scene validator', () => {
  for (const template of VIDEO_TEMPLATES) {
    for (const context of contexts) {
      const built = buildVideoTemplate({ id: template.id, context });
      const result = validate(built.code);
      assert.equal(
        result.status,
        0,
        `${template.id} ${context.frame}: ${result.stderr}`
      );
    }
  }
});

test('templates pin their computed facts', () => {
  const zh = contexts[0];
  const fact = (id: string, params: Record<string, unknown>, label: string) =>
    buildVideoTemplate({ id, params, context: zh }).facts.find(
      (item) => item.label === label
    )?.value;
  assert.equal(fact('derivative-tangent', { f: 'x^2', a: 1 }, "f'(a)"), '2');
  assert.equal(fact('derivative-tangent', { f: 'sin(x)', a: 0 }, "f'(a)"), '1');
  assert.equal(
    fact(
      'riemann-sum',
      { f: 'x^2', a: 0, b: 1, n: 32, rule: 'right' },
      '∫ f dx'
    ),
    '1/3'
  );
  assert.equal(
    fact('riemann-sum', { f: 'x^2', a: 0, b: 1, n: 32, rule: 'right' }, 'S_4'),
    '0.4688'
  );
  assert.equal(
    fact('quadratic-function', { a: 1, b: -4, c: 3 }, '顶点'),
    '(2, -1)'
  );
  assert.equal(fact('quadratic-function', { a: 1, b: -4, c: 3 }, '根'), '1, 3');
  assert.equal(
    fact('linear-transformation', { a: 2, b: 1, c: 0.5, d: 1.5 }, 'det A'),
    '2.5'
  );
  assert.equal(
    fact('integral-accumulation', { f: 'cos(x)', a: 0, b: 3.141593 }, 'A(b)'),
    '0'
  );
});

test('parameters pass one gate whoever fills them', () => {
  const template = getVideoTemplate('derivative-tangent')!;
  assert.deepEqual(resolveTemplateParams(template, undefined), {
    f: 'x^2',
    a: 1,
  });
  assert.deepEqual(
    resolveTemplateParams(template, { f: '3x²', a: '2', extra: 'dropped' }),
    { f: '3*x^2', a: 2 }
  );
  assert.throws(
    () => resolveTemplateParams(template, { a: 99 }),
    TemplateParamError
  );
  assert.throws(
    () => resolveTemplateParams(template, { f: 'x + y' }),
    TemplateParamError
  );
  // abs(x) has no tangent at 0: the template's own check refuses it.
  assert.throws(
    () => resolveTemplateParams(template, { f: 'abs(x)', a: 0 }),
    TemplateParamError
  );
  assert.throws(
    () =>
      resolveTemplateParams(getVideoTemplate('riemann-sum')!, {
        f: 'x',
        a: 2,
        b: 1,
      }),
    TemplateParamError
  );
  assert.throws(
    () =>
      resolveTemplateParams(getVideoTemplate('unit-circle-trig')!, {
        fn: 'tan',
      }),
    TemplateParamError
  );
});

test('the public catalog is localized and carries defaults', () => {
  const zh = publicVideoTemplates('zh');
  const en = publicVideoTemplates('en');
  assert.equal(zh.length, VIDEO_TEMPLATES.length);
  assert.equal(zh[0].id, en[0].id);
  assert.notEqual(zh[0].title, en[0].title);
  for (const template of zh) {
    assert.deepEqual(
      Object.keys(template.defaults).sort(),
      template.params.map((param) => param.key).sort()
    );
  }
});

function scriptedProvider(replies: string[]): ChatProvider & { calls: number } {
  const provider = {
    name: 'scripted',
    calls: 0,
    async complete() {
      const content = replies[Math.min(provider.calls, replies.length - 1)];
      provider.calls += 1;
      return { content, model: 'test', provider: 'scripted' };
    },
  };
  return provider;
}

test('the matcher returns a validated template and parameters', async () => {
  const provider = scriptedProvider([
    JSON.stringify({
      templateId: 'riemann-sum',
      params: { f: 'x^2', a: 0, b: 1, n: 16, rule: 'left' },
      confidence: 'high',
      reason: 'ok',
      alternatives: ['integral-accumulation', 'nope'],
    }),
  ]);
  const result = await matchVideoTemplate({
    provider,
    model: 'm',
    prompt: 'Riemann sums of x^2',
    locale: 'en',
  });
  assert.equal(result.match?.templateId, 'riemann-sum');
  assert.deepEqual(result.match?.params, {
    f: 'x^2',
    a: 0,
    b: 1,
    n: 16,
    rule: 'left',
  });
  assert.deepEqual(result.alternatives, ['integral-accumulation']);
});

test('the matcher repairs rejected parameters once', async () => {
  const provider = scriptedProvider([
    JSON.stringify({
      templateId: 'derivative-tangent',
      params: { f: 'x^2', a: 40 },
      confidence: 'high',
      reason: '',
    }),
    JSON.stringify({
      templateId: 'derivative-tangent',
      params: { f: 'x^2', a: 4 },
      confidence: 'high',
      reason: '',
    }),
  ]);
  const result = await matchVideoTemplate({
    provider,
    model: 'm',
    prompt: 'tangent of x^2 at 40',
    locale: 'en',
  });
  assert.equal(provider.calls, 2);
  assert.equal(result.match?.params.a, 4);
});

test('the matcher passes no-match through for the beta generator', async () => {
  const provider = scriptedProvider([
    JSON.stringify({
      templateId: null,
      params: {},
      confidence: 'low',
      reason: '不在模板库里',
      alternatives: ['function-graph'],
    }),
  ]);
  const result = await matchVideoTemplate({
    provider,
    model: 'm',
    prompt: '证明勾股定理',
    locale: 'zh',
  });
  assert.equal(result.match, null);
  assert.equal(result.reason, '不在模板库里');
  assert.deepEqual(result.alternatives, ['function-graph']);
});

test('curve and lab pages open templates that build', async () => {
  const { CURVES, defaultValues } = await import('../src/content/curves');
  const { CURVE_VIDEO_TEMPLATES } = await import('../src/content/curves/video');
  const { LAB_VIDEO_TEMPLATES } = await import('../src/content/labs/video');
  const zh = contexts[0];
  let mapped = 0;
  for (const curve of CURVES) {
    const mapping = CURVE_VIDEO_TEMPLATES[curve.slug];
    if (!mapping) continue;
    mapped += 1;
    const target = mapping(defaultValues(curve));
    assert.doesNotThrow(
      () =>
        buildVideoTemplate({
          id: target.templateId,
          params: target.params,
          context: zh,
        }),
      curve.slug
    );
  }
  assert.ok(mapped >= 40, `only ${mapped} curves mapped`);
  for (const [slug, target] of Object.entries(LAB_VIDEO_TEMPLATES)) {
    assert.doesNotThrow(
      () =>
        buildVideoTemplate({
          id: target.templateId,
          params: target.params,
          context: zh,
        }),
      slug
    );
  }
});
