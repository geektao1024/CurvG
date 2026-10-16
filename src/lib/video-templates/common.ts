import { checkExpression, fn1, toLatex, toNumpy, toPlain } from './expr';
import {
  ManimScript,
  niceRange,
  plotSegments,
  yWindow,
  type AxisRange,
} from './manim';
import type {
  ExpressionParam,
  NumberParam,
  TemplateParamValues,
} from './types';

/** The checked source and evaluator of an expression parameter. */
export function expressionOf(
  params: TemplateParamValues,
  key: string,
  variables: readonly string[] = ['x']
) {
  const check = checkExpression(String(params[key]), variables);
  if (!check.ok) throw new Error(`${key}: ${check.error}`);
  const source = check.source;
  return {
    source,
    f: fn1(source, variables[0]),
    latex: toLatex(source),
    plain: toPlain(source),
  };
}

export const functionParam = (
  overrides: Partial<ExpressionParam> & Pick<ExpressionParam, 'default'>
): ExpressionParam => ({
  key: 'f',
  type: 'expression',
  variables: ['x'],
  label: { en: 'Function f(x)', zh: '函数 f(x)' },
  help: { en: 'Use * for products: 3*x^2 - 1', zh: '乘号写成 *：3*x^2 - 1' },
  ...overrides,
});

export const numberParam = (param: Omit<NumberParam, 'type'>): NumberParam => ({
  type: 'number',
  ...param,
});

/**
 * Axes, grid and the curve of f over [xmin, xmax], with a y window fitted to
 * the curve (poles trimmed). Declares `f` in the module and returns the
 * Python names and ranges.
 */
export function functionStage(
  s: ManimScript,
  options: {
    source: string;
    f: (x: number) => number;
    xmin: number;
    xmax: number;
    /** Extra y values that must be visible (a point, an area's top). */
    include?: number[];
    /**
     * The y values the film is about (zeros, extrema). When given, the window
     * is fitted around them instead of the whole curve, so x³ - 3x on [-3, 3]
     * shows its bumps at ±2 rather than a range of ±18.
     */
    focus?: number[];
    color?: string;
    fnName?: string;
  }
): {
  axes: string;
  grid: string;
  labels: string;
  curve: string;
  x: AxisRange;
  y: AxisRange;
} {
  const fnName = options.fnName ?? 'f';
  s.define(fnName, 'x', toNumpy(options.source, { x: 'x' }));
  const x = niceRange(options.xmin, options.xmax);
  let window = yWindow(options.f, x.min, x.max);
  if (options.focus?.length) {
    const lo = Math.min(0, ...options.focus);
    const hi = Math.max(0, ...options.focus);
    const span = Math.max(hi - lo, 1);
    window = {
      min: Math.max(window.min, lo - span * 1.2),
      max: Math.min(window.max, hi + span * 1.2),
    };
  }
  const extra = options.include ?? [];
  const y = niceRange(
    Math.min(window.min, ...extra),
    Math.max(window.max, ...extra)
  );
  const names = s.axes({ name: 'axes', x, y });
  const curve = s.plot(
    `${fnName}_curve`,
    names.axes,
    `${fnName}(x)`,
    plotSegments(options.f, x.min, x.max, { min: y.min, max: y.max }),
    options.color ?? 'AMBER'
  );
  return { ...names, curve, x, y };
}
