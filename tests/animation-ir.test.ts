import assert from 'node:assert/strict';
import test from 'node:test';

import type { AnimationSpec } from '../src/lib/animation';
import { validateAnimationSpec } from '../src/lib/animation-schema';
import { compileAnimationSpec } from '../src/lib/manim-compiler';
import {
  detectMathObjectType,
  evaluateMathExpression,
  integralParts,
  parseMatrix,
  seriesParts,
} from '../src/lib/math-preview';

function validSpec(): AnimationSpec {
  return {
    schemaVersion: 2 as const,
    title: 'Parabola area',
    summary: 'Draw a parabola and its area.',
    durationSeconds: 6,
    assumptions: [],
    style: {
      background: '#0B1020',
      palette: ['BLUE', 'TEAL'],
      camera: 'Static 16:9 camera',
    },
    objects: [
      { id: 'axes', kind: 'axes' as const, region: 'graph' as const },
      {
        id: 'formula',
        kind: 'formula' as const,
        region: 'formula' as const,
        expr: 'y=x^2',
        color: 'WHITE',
      },
      {
        id: 'curve',
        kind: 'curve' as const,
        region: 'graph' as const,
        expr: 'x^2',
        domain: [-2, 2] as [number, number],
        color: 'BLUE',
      },
    ],
    timeline: [
      {
        id: 'draw-axes',
        at: 0,
        op: 'draw' as const,
        ref: 'axes',
        runTime: 1,
        ease: 'smooth' as const,
      },
      {
        id: 'draw-curve',
        at: 1,
        op: 'draw' as const,
        ref: 'curve',
        runTime: 2,
        ease: 'linear' as const,
      },
      {
        id: 'write-formula',
        at: 3,
        op: 'write' as const,
        ref: 'formula',
        runTime: 1,
        ease: 'smooth' as const,
      },
    ],
    layout: { regions: 'left|right' as const },
    dependencies: [],
    notes: [],
  };
}

test('v2 IR validates and compiles deterministically', () => {
  const spec = validateAnimationSpec(validSpec());
  const first = compileAnimationSpec(spec);
  const second = compileAnimationSpec(spec);

  assert.equal(first, second);
  assert.match(first, /class CurvGScene\(Scene\):/);
  assert.match(first, /lambda x: x\*\*2/);
  assert.match(first, /run_time=2, rate_func=linear/);
  assert.doesNotMatch(first, /eval\(|exec\(|subprocess/);
});

test('IR rejects missing references, overlapping events, and invalid domains', () => {
  assert.throws(() =>
    validateAnimationSpec({
      ...validSpec(),
      objects: [
        {
          id: 'curve',
          kind: 'curve',
          region: 'graph',
          expr: 'x',
          domain: [2, -2],
        },
      ],
      timeline: [
        {
          id: 'a',
          at: 0,
          op: 'draw',
          ref: 'missing',
          runTime: 2,
          ease: 'smooth',
        },
        {
          id: 'b',
          at: 1,
          op: 'draw',
          ref: 'curve',
          runTime: 1,
          ease: 'smooth',
        },
      ],
    })
  );
});

test('compiler rejects expression injection instead of emitting Python', () => {
  const spec = validSpec();
  if (!spec.objects) throw new Error('test spec must have objects');
  spec.objects[2] = {
    ...spec.objects[2],
    expr: '__import__(os).system(x)',
  };
  assert.throws(() => compileAnimationSpec(spec), /not supported|unsupported/);
});

test('browser math preview detects and evaluates supported inputs', () => {
  assert.equal(detectMathObjectType('sin(x) + x^2'), 'function');
  assert.equal(detectMathObjectType('int(x^2, x, 0, 1)'), 'integral');
  assert.equal(detectMathObjectType('sum(1/n^2, n, 1, 12)'), 'series');
  assert.equal(detectMathObjectType('[[1, 0], [0, 1]]'), 'matrix');
  assert.ok(
    Math.abs(evaluateMathExpression('sin(pi / 2) + 2x', { x: 2 }) - 5) < 1e-9
  );
  assert.deepEqual(integralParts('int(x^2, x, 0, 2)'), {
    expression: 'x^2',
    from: 0,
    to: 2,
  });
  assert.deepEqual(seriesParts('sum(1/n^2, n, 1, 20)'), {
    expression: '1/n^2',
    from: 1,
    to: 20,
  });
  assert.deepEqual(parseMatrix('[[1, 2], [3, 4]]'), [
    [1, 2],
    [3, 4],
  ]);
});
