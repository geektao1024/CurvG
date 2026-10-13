import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BoardSpecError,
  compileBoard,
  defaultParamValues,
  dragTargets,
  evaluateBoard,
} from '../src/lib/board/evaluate';
import { compileExpr, ExprError } from '../src/lib/board/expr';
import { parseBoardSpec } from '../src/lib/board/spec';

const run = (source: string, vars: Record<string, number> = {}) =>
  compileExpr(source).evaluate({ vars });

describe('board expressions', () => {
  it('follows conventional precedence', () => {
    assert.equal(run('1 + 2 * 3'), 7);
    assert.equal(run('-2^2'), -4);
    assert.equal(run('2^3^2'), 512);
    assert.equal(run('(1 + 2) * 3'), 9);
    assert.equal(run('10 % 4'), 2);
    assert.equal(run('2 * -3'), -6);
    assert.equal(run('1.5e2'), 150);
  });

  it('supports builtins, constants, comparisons and conditionals', () => {
    assert.equal(run('sin(pi / 2)'), 1);
    assert.equal(run('max(1, 5, 3)'), 5);
    assert.equal(run('clamp(9, 0, 4)'), 4);
    assert.equal(run('x < 0 ? -x : x', { x: -3 }), 3);
    assert.equal(run('x >= 2', { x: 2 }), 1);
  });

  it('lets scope variables shadow constants', () => {
    assert.equal(run('e', { e: 0.5 }), 0.5);
    assert.equal(run('e'), Math.E);
  });

  it('rejects anything that is not arithmetic', () => {
    for (const source of [
      'constructor',
      'x.constructor',
      'alert("x")',
      '[1]',
      'a = 1',
      '1 +',
      'sin(1, 2)',
      '',
    ]) {
      assert.throws(
        () => compileExpr(source).evaluate({ vars: {} }),
        ExprError,
        source
      );
    }
  });

  it('does not resolve prototype properties as variables', () => {
    assert.throws(() => run('toString'), ExprError);
    assert.throws(() => run('__proto__'), ExprError);
  });

  it('reports free variables and user calls', () => {
    const expr = compileExpr('a * f(x) + sin(t) + pi');
    assert.deepEqual([...expr.variables].sort(), ['a', 'pi', 't', 'x']);
    assert.deepEqual([...expr.calls], ['f']);
  });
});

const tangentSpec = () =>
  parseBoardSpec({
    view: { x: [-1, 3], y: [-1, 5] },
    params: [{ id: 'h', label: 'h', min: 0.01, max: 2, step: 0.01, value: 1 }],
    functions: [{ id: 'f', expr: 'x^2' }],
    scalars: [
      { id: 'm', expr: '(f(1 + h) - f(1)) / h' },
      { id: 'big', expr: 'h > 0.5' },
    ],
    objects: [
      { type: 'function', fn: 'f' },
      { type: 'line', through: [1, 'f(1)'], slope: 'm', label: 'm = {m}' },
      { type: 'point', at: ['1 + h', 'f(1 + h)'], visible: 'big' },
      { type: 'riemann', fn: 'f', from: 0, to: 2, n: 4 },
    ],
    readouts: [{ label: 'm', expr: 'm', digits: 3 }],
  });

describe('board evaluation', () => {
  it('computes scalars, readouts and interpolated labels', () => {
    const board = compileBoard(tangentSpec());
    const frame = evaluateBoard(board, { h: 1 });
    assert.equal(frame.values.m, 3);
    assert.equal(frame.readouts[0].text, '3.000');
    const line = frame.shapes.find((shape) =>
      shape.style.label?.startsWith('m =')
    );
    assert.equal(line?.style.label, 'm = 3');
  });

  it('trims label zeros without touching integers', () => {
    const spec = parseBoardSpec({
      view: { x: [0, 1], y: [0, 1] },
      params: [{ id: 'v', label: 'v', min: 0, max: 100, step: 0.5, value: 10 }],
      objects: [{ type: 'text', at: [0, 0], text: '{v}' }],
    });
    const board = compileBoard(spec);
    const label = (v: number) => {
      const shape = evaluateBoard(board, { v }).shapes[0];
      return shape.kind === 'text' ? shape.text : '';
    };
    assert.equal(label(10), '10');
    assert.equal(label(1.5), '1.5');
    assert.equal(label(0), '0');
  });

  it('hides objects whose visibility expression is zero', () => {
    const board = compileBoard(tangentSpec());
    const points = (h: number) =>
      evaluateBoard(board, { h }).shapes.filter(
        (shape) => shape.kind === 'point'
      ).length;
    assert.equal(points(1), 1);
    assert.equal(points(0.2), 0);
  });

  it('clamps params to their range and falls back to defaults', () => {
    const spec = tangentSpec();
    const board = compileBoard(spec);
    assert.equal(evaluateBoard(board, { h: 99 }).values.h, 2);
    assert.equal(evaluateBoard(board, {}).values.h, defaultParamValues(spec).h);
  });

  it('builds one rectangle per Riemann slice', () => {
    const frame = evaluateBoard(compileBoard(tangentSpec()), { h: 1 });
    const riemann = frame.shapes.find(
      (shape) => shape.kind === 'path' && shape.fill && shape.lines.length === 4
    );
    assert.ok(riemann);
  });

  it('breaks curves at asymptotes instead of drawing a vertical seam', () => {
    const spec = parseBoardSpec({
      view: { x: [-3, 3], y: [-3, 3] },
      functions: [{ id: 'g', expr: '1 / x' }],
      objects: [{ type: 'function', fn: 'g', samples: 241 }],
    });
    const frame = evaluateBoard(compileBoard(spec), {});
    const shape = frame.shapes[0];
    assert.equal(shape.kind, 'path');
    if (shape.kind === 'path') assert.ok(shape.lines.length >= 2);
  });

  it('rejects unknown names with a path', () => {
    const spec = parseBoardSpec({
      view: { x: [0, 1], y: [0, 1] },
      objects: [{ type: 'point', at: ['q', 0] }],
    });
    assert.throws(
      () => compileBoard(spec),
      (error: unknown) => {
        assert.ok(error instanceof BoardSpecError);
        assert.match(error.message, /objects\[0\]\.at\[0\]/);
        return true;
      }
    );
  });

  it('rejects scalars that call a function needing a later scalar', () => {
    const spec = parseBoardSpec({
      view: { x: [0, 1], y: [0, 1] },
      functions: [{ id: 'f', expr: 'k * x' }],
      scalars: [
        { id: 'early', expr: 'f(1)' },
        { id: 'k', expr: '2' },
      ],
      objects: [{ type: 'function', fn: 'f' }],
    });
    assert.throws(() => compileBoard(spec), BoardSpecError);
  });

  it('rejects recursive and duplicate definitions', () => {
    assert.throws(
      () =>
        compileBoard(
          parseBoardSpec({
            view: { x: [0, 1], y: [0, 1] },
            functions: [{ id: 'f', expr: 'f(x)' }],
            objects: [{ type: 'function', fn: 'f' }],
          })
        ),
      BoardSpecError
    );
    assert.throws(
      () =>
        compileBoard(
          parseBoardSpec({
            view: { x: [0, 1], y: [0, 1] },
            params: [
              { id: 'a', label: 'a', min: 0, max: 1, step: 0.1, value: 0 },
            ],
            scalars: [{ id: 'a', expr: '1' }],
            objects: [{ type: 'point', at: [0, 0] }],
          })
        ),
      BoardSpecError
    );
  });

  it('reads status readouts as words and keeps highlight flags', () => {
    const board = compileBoard(
      parseBoardSpec({
        view: { x: [0, 1], y: [0, 1] },
        params: [
          { id: 'a', label: 'a', min: -1, max: 1, step: 0.1, value: 0.5 },
        ],
        objects: [{ type: 'point', at: ['a', 0] }],
        readouts: [
          { label: 'a', expr: 'a', highlight: true },
          {
            kind: 'status',
            label: 'positive',
            expr: 'a > 0',
            ok: 'yes',
            bad: 'no',
          },
        ],
      })
    );
    const [value, status] = evaluateBoard(board, {}).readouts;
    assert.deepEqual(value, {
      kind: 'value',
      label: 'a',
      value: 0.5,
      text: '0.50',
      highlight: true,
    });
    assert.deepEqual(status, {
      kind: 'status',
      label: 'positive',
      ok: true,
      text: 'yes',
    });
    const after = evaluateBoard(board, { a: -0.5 }).readouts[1];
    assert.equal(after.kind === 'status' && after.text, 'no');
  });

  it('checks drag targets and answer bands', () => {
    const base = {
      view: { x: [0, 1], y: [0, 1] },
      params: [{ id: 'a', label: 'a', min: 0, max: 1, step: 0.1, value: 0 }],
    };
    assert.throws(
      () =>
        compileBoard(
          parseBoardSpec({
            ...base,
            objects: [{ type: 'point', at: [0, 0], drag: { x: 'b' } }],
          })
        ),
      BoardSpecError
    );
    assert.throws(() =>
      parseBoardSpec({
        ...base,
        params: [
          { ...base.params[0], bands: [{ from: 0.5, to: 2, label: 'out' }] },
        ],
        objects: [{ type: 'point', at: [0, 0] }],
      })
    );
  });

  it('maps a drag back onto params, wrapping angles into range', () => {
    const spec = parseBoardSpec({
      view: { x: [-2, 2], y: [-2, 2] },
      params: [
        { id: 'th', label: 't', min: 0, max: 6.3, step: 0.01, value: 1 },
      ],
      objects: [
        { type: 'point', at: ['cos(th)', 'sin(th)'], drag: { angle: 'th' } },
      ],
    });
    const out = dragTargets({ angle: 'th' }, [0, -1], spec);
    assert.ok(Math.abs(out.th - (3 * Math.PI) / 2) < 1e-9);
    assert.deepEqual(dragTargets({ x: 'u', y: 'v' }, [1, 2], spec), {
      u: 1,
      v: 2,
    });
  });

  it('samples functions across a panned viewport', () => {
    const board = compileBoard(
      parseBoardSpec({
        view: { x: [0, 1], y: [0, 1] },
        functions: [{ id: 'f', expr: 'x' }],
        objects: [{ type: 'function', fn: 'f' }],
      })
    );
    const frame = evaluateBoard(board, {}, { x: [5, 6], y: [5, 6] });
    const shape = frame.shapes[0];
    assert.ok(shape.kind === 'path');
    assert.equal(shape.lines[0][0][0], 5);
  });
});
