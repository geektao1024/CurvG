/**
 * Curve → video template, so "make it a video" on a curve page opens a
 * verified template with the curve's own equations (at the page's current
 * slider values) instead of a free-text brief. Curves that a template
 * cannot draw exactly (fractals, implicit curves, integrals) fall back to
 * the brief. Every mapping is built and validated in tests.
 */

const n = (value: number) => String(Number(value.toFixed(6)));
/** A coefficient and its `*`, or nothing when it is 1. */
const k = (value: number) =>
  Number(value.toFixed(6)) === 1 ? '' : `${n(value)}*`;
const TAU = 6.283185;

type Values = Record<string, number>;
type Mapping = (v: Values) => {
  templateId: string;
  params: Record<string, string | number>;
};

const parametric = (x: string, y: string, t0: number, t1: number) => ({
  templateId: 'parametric-curve',
  params: { x, y, t0: Number(t0.toFixed(6)), t1: Number(t1.toFixed(6)) },
});
const polar = (r: string, t0: number, t1: number) => ({
  templateId: 'polar-curve',
  params: { r, t0: Number(t0.toFixed(6)), t1: Number(t1.toFixed(6)) },
});
const graph = (f: string, xmin: number, xmax: number) => ({
  templateId: 'function-graph',
  params: { f, xmin, xmax },
});
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

export const CURVE_VIDEO_TEMPLATES: Record<string, Mapping> = {
  'lissajous-curve': (v) =>
    parametric(`sin(${k(v.a)}t + ${n(v.delta)})`, `sin(${k(v.b)}t)`, 0, TAU),
  superellipse: (v) =>
    parametric(
      `${k(v.a)}sign(cos(t))*abs(cos(t))^(2/${n(v.n)})`,
      `sign(sin(t))*abs(sin(t))^(2/${n(v.n)})`,
      0,
      TAU
    ),
  'butterfly-curve': (v) =>
    parametric(
      'sin(t)*(exp(cos(t)) - 2*cos(4*t) - sin(t/12)^5)',
      'cos(t)*(exp(cos(t)) - 2*cos(4*t) - sin(t/12)^5)',
      0,
      Math.min(Math.PI * v.winds, 99)
    ),
  'heart-curve': (v) =>
    parametric(
      `${k(v.s)}16*sin(t)^3`,
      `${k(v.s)}(13*cos(t) - 5*cos(2*t) - 2*cos(3*t) - cos(4*t))`,
      0,
      TAU
    ),
  'lemniscate-of-gerono': (v) =>
    parametric(`${k(v.a)}cos(t)`, `${k(v.a)}sin(t)*cos(t)`, 0, TAU),
  'rose-curve': (v) =>
    polar(
      `cos(${k(v.k)}theta)`,
      0,
      Number.isInteger(v.k) && v.k % 2 === 1 ? Math.PI : TAU
    ),
  cardioid: (v) => polar(`${k(v.a)}(1 + cos(theta))`, 0, TAU),
  limacon: (v) => polar(`${n(v.b)} + cos(theta)`, 0, TAU),
  'lemniscate-of-bernoulli': (v) =>
    parametric(
      `${k(v.a)}cos(t)/(1 + sin(t)^2)`,
      `${k(v.a)}sin(t)*cos(t)/(1 + sin(t)^2)`,
      0,
      TAU
    ),
  'cissoid-of-diocles': (v) =>
    polar(`2*${k(v.a)}sin(theta)*tan(theta)`, -1.1, 1.1),
  'conchoid-of-nicomedes': (v) =>
    polar(`1/cos(theta) + ${n(v.b)}`, -1.25, 1.25),
  strophoid: (v) => polar(`-${k(v.a)}cos(2*theta)/cos(theta)`, -1.25, 1.25),
  superformula: (v) =>
    polar(
      `(abs(cos(${k(v.m)}theta/4))^${n(v.n2)} + abs(sin(${k(v.m)}theta/4))^${n(v.n3)})^(-1/${n(v.n1)})`,
      0,
      TAU
    ),
  cycloid: (v) => parametric('t - sin(t)', '1 - cos(t)', 0, TAU * v.arches),
  epicycloid: (v) =>
    parametric(
      `${k(v.k + 1)}cos(t) - cos(${k(v.k + 1)}t)`,
      `${k(v.k + 1)}sin(t) - sin(${k(v.k + 1)}t)`,
      0,
      TAU
    ),
  hypocycloid: (v) =>
    parametric(
      `${k(v.k - 1)}cos(t) + cos(${k(v.k - 1)}t)`,
      `${k(v.k - 1)}sin(t) - sin(${k(v.k - 1)}t)`,
      0,
      TAU
    ),
  hypotrochoid: (v) =>
    parametric(
      `${k(v.R - v.r)}cos(t) + ${k(v.d)}cos(${n((v.R - v.r) / v.r)}*t)`,
      `${k(v.R - v.r)}sin(t) - ${k(v.d)}sin(${n((v.R - v.r) / v.r)}*t)`,
      0,
      (TAU * v.r) / gcd(Math.round(v.R), Math.round(v.r))
    ),
  epitrochoid: (v) =>
    parametric(
      `${k(v.R + v.r)}cos(t) - ${k(v.d)}cos(${n((v.R + v.r) / v.r)}*t)`,
      `${k(v.R + v.r)}sin(t) - ${k(v.d)}sin(${n((v.R + v.r) / v.r)}*t)`,
      0,
      (TAU * v.r) / gcd(Math.round(v.R), Math.round(v.r))
    ),
  astroid: (v) => parametric(`${k(v.a)}cos(t)^3`, `${k(v.a)}sin(t)^3`, 0, TAU),
  'deltoid-curve': (v) =>
    parametric(
      `${k(v.r)}(2*cos(t) + cos(2*t))`,
      `${k(v.r)}(2*sin(t) - sin(2*t))`,
      0,
      TAU
    ),
  nephroid: (v) =>
    parametric(
      `${k(v.r)}(3*cos(t) - cos(3*t))`,
      `${k(v.r)}(3*sin(t) - sin(3*t))`,
      0,
      TAU
    ),
  trochoid: (v) =>
    parametric(`t - ${k(v.d)}sin(t)`, `1 - ${k(v.d)}cos(t)`, 0, TAU * v.arches),
  'archimedean-spiral': (v) => polar(`${k(v.b)}theta`, 0, TAU * v.turns),
  'logarithmic-spiral': (v) => polar(`exp(${k(v.b)}theta)`, 0, TAU * 3),
  'fermat-spiral': (v) => polar('sqrt(theta)', 0, TAU * v.turns),
  'golden-spiral': (v) =>
    polar('1.618034^(2*theta/pi)', 0, Math.min(TAU * v.turns, 30)),
  'involute-of-a-circle': (v) =>
    parametric('cos(t) + t*sin(t)', 'sin(t) - t*cos(t)', 0, TAU * v.turns),
  'hyperbolic-spiral': (v) => polar('1/theta', 0.4, TAU * v.turns),
  lituus: (v) => polar('1/sqrt(theta)', 0.15, TAU * v.turns),
  parabola: (v) => graph(`x^2/(4*${n(v.p)})`, -4, 4),
  ellipse: (v) => parametric(`${k(v.a)}cos(t)`, `${k(v.b)}sin(t)`, 0, TAU),
  hyperbola: (v) =>
    parametric(`${k(v.a)}cosh(t)`, `${k(v.b)}sinh(t)`, -1.8, 1.8),
  'sine-wave': (v) => graph(`${k(v.A)}sin(${k(v.w)}x)`, -6.28, 6.28),
  catenary: (v) => graph(`${k(v.a)}cosh(x/${n(v.a)})`, -3, 3),
  tractrix: (v) =>
    parametric(`${k(v.a)}(t - tanh(t))`, `${n(v.a)}/cosh(t)`, -3, 3),
  'witch-of-agnesi': (v) => graph(`8*${n(v.a)}^3/(x^2 + 4*${n(v.a)}^2)`, -5, 5),
  'folium-of-descartes': (v) =>
    parametric(`3*${k(v.a)}t/(1 + t^3)`, `3*${k(v.a)}t^2/(1 + t^3)`, -0.6, 6),
  bicorn: (v) =>
    parametric(
      `${k(v.a)}sin(t)`,
      `${k(v.a)}cos(t)^2*(2 + cos(t))/(3 + sin(t)^2)`,
      0,
      TAU
    ),
  'kampyle-of-eudoxus': (v) => polar(`${n(v.a)}/cos(theta)^2`, -1.15, 1.15),
  'piriform-curve': (v) =>
    parametric('1 + sin(t)', `${k(v.b)}cos(t)*(1 + sin(t))`, 0, TAU),
  'serpentine-curve': (v) =>
    graph(`${k(v.a * v.b)}x/(x^2 + ${n(v.a * v.a)})`, -6, 6),
  'tschirnhausen-cubic': (v) => polar(`${n(v.a)}/cos(theta/3)^3`, -3.9, 3.9),
  'semicubical-parabola': (v) =>
    parametric('t^2', `${k(Math.sqrt(v.a))}t^3`, -1.5, 1.5),
  'sigmoid-function': (v) => graph(`1/(1 + exp(-${k(v.k)}x))`, -6, 6),
};

export function curveVideoTemplate(slug: string, values: Values) {
  return CURVE_VIDEO_TEMPLATES[slug]?.(values);
}
