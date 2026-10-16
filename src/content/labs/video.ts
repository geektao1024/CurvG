/**
 * Lab chapter → video template, for chapters a template films exactly.
 * Other chapters keep the free-text brief (`videoPrompt`), which the creator
 * matches against the template library first.
 */
export const LAB_VIDEO_TEMPLATES: Record<
  string,
  { templateId: string; params: Record<string, string | number> }
> = {
  'derivative-tangent-slope': {
    templateId: 'derivative-tangent',
    params: { f: 'x^2', a: 1 },
  },
  'riemann-sum-area': {
    templateId: 'riemann-sum',
    params: { f: 'x^2/4 + 1/2', a: 0, b: 3, n: 32, rule: 'left' },
  },
  'unit-circle-sine': {
    templateId: 'unit-circle-trig',
    params: { fn: 'sin', turns: 1 },
  },
  'quadratic-transformations': {
    templateId: 'function-transform',
    params: { f: 'x^2', a: 2, b: 1, h: 2, k: -1 },
  },
  'sinusoidal-function': {
    templateId: 'function-transform',
    params: { f: 'sin(x)', a: 2, b: 2, h: -0.523599, k: 0 },
  },
  'monotonicity-extrema': {
    templateId: 'function-graph',
    params: { f: 'x^3 - 3*x', xmin: -2.5, xmax: 2.5 },
  },
  'zeros-bisection': {
    templateId: 'function-graph',
    params: { f: 'x^3 - 3*x + 1', xmin: -2.5, xmax: 2.5 },
  },
  'ellipse-definition': {
    templateId: 'parametric-curve',
    params: { x: '4*cos(t)', y: '3.2*sin(t)', t0: 0, t1: 6.283185 },
  },
  'parabola-focal-chord': {
    templateId: 'parametric-curve',
    params: { x: 't^2', y: '2*t', t0: -2.5, t1: 2.5 },
  },
  'hyperbola-asymptotes': {
    templateId: 'parametric-curve',
    params: { x: '2*cosh(t)', y: '1.5*sinh(t)', t0: -1.8, t1: 1.8 },
  },
};
