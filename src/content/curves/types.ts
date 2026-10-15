/**
 * Curve encyclopedia — shared types and sampling helpers.
 *
 * This module is isomorphic: curve definitions are plain data plus pure
 * sampling functions, safe to import from routes, loaders, the sitemap,
 * and client components alike.
 */

import type { LocaleText } from '../text';

export type { LocaleText };
export type LocaleList = { en: string[]; zh: string[] };

export type CurveParam = {
  key: string;
  label: LocaleText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
};

export type CurveCategory =
  | 'parametric'
  | 'polar'
  | 'spiral'
  | 'roulette'
  | 'conic'
  | 'cartesian'
  | 'fractal';

export type CurvePoints = Array<Array<[number, number]>>;

export type CurveDef = {
  slug: string;
  category: CurveCategory;
  name: LocaleText;
  /** Card blurb; also the base of the meta description. */
  short: LocaleText;
  /** Display-mode LaTeX lines (locale independent). */
  equations: string[];
  params: CurveParam[];
  /**
   * 'fixed'  — viewBox is fitted once to the default-parameter shape, so
   *            size/amplitude parameters stay visible when they change.
   * 'refit'  — viewBox refits on every change; use when parameters change
   *            the shape or extent dramatically (spirals, frequency ratios).
   */
  fitMode: 'fixed' | 'refit';
  /**
   * How many leading polylines of `sample()` are construction, not the
   * curve: a fixed circle, a control polygon. They are drawn thin and faint.
   * Default 0 — every polyline is the curve (hyperbola branches, spiral arms).
   */
  guideLines?: number;
  /** Returns one or more polylines in curve space. */
  sample: (values: Record<string, number>) => CurvePoints;
  intro: LocaleList;
  properties: LocaleList;
  seenIn: LocaleText;
  /** Prefills the Creator brief via /creator?prompt=… */
  prompt: LocaleText;
  related: string[];
};

/**
 * One row of the formula card at the top of a curve page, and the source of
 * its FAQ. `kind` picks the row label; `other` needs its own `label`.
 */
export type CurveFactKind =
  | 'cartesian'
  | 'parametric'
  | 'polar'
  | 'arc_length'
  | 'perimeter'
  | 'area'
  | 'foci'
  | 'eccentricity'
  | 'asymptote'
  | 'period'
  | 'cusps'
  | 'rule'
  | 'other';

export type CurveFact = {
  kind: CurveFactKind;
  /** Display-mode LaTeX; several lines for a pair like x = …, y = …. */
  tex?: string | readonly string[];
  /** Words instead of a formula, for curves defined by a rule (fractals). */
  text?: LocaleText;
  label?: LocaleText;
  /** Qualifier after the label: "one arch", "inside the loop". */
  note?: LocaleText;
  /** The quantity in the units of `sample`, for the current slider values. */
  value?: (values: Record<string, number>) => number;
  /**
   * The test checks `value` at the default parameters against the last
   * polyline `sample` draws: its length, the area it sweeps around the
   * origin (`area`, for shapes seen whole from the origin), or the area
   * it encloses (`enclosed`, any simple closed curve). Set only when that polyline is exactly what the fact measures.
   */
  measure?: 'length' | 'area' | 'enclosed';
};

export type CurveFacts = {
  /** What the letters in the formulas stand for. */
  where: LocaleText;
  facts: readonly CurveFact[];
};

export const TAU = Math.PI * 2;

/** Sample fn over [from, to] with n+1 points, dropping non-finite values. */
export function sweep(
  from: number,
  to: number,
  n: number,
  fn: (t: number) => [number, number]
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let index = 0; index <= n; index += 1) {
    const t = from + ((to - from) * index) / n;
    const [x, y] = fn(t);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
  }
  return points;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

/**
 * Polar curves given as r² = f(θ): every stretch where f ≥ 0 and r stays
 * within `rMax` becomes its own polyline (the curve breaks at asymptotes
 * and where r² < 0). Negative r is covered by sweeping θ over a full turn.
 */
export function polarPieces(
  r2: (theta: number) => number,
  rMax: number,
  n = 2400
): CurvePoints {
  const pieces: CurvePoints = [];
  let current: Array<[number, number]> = [];
  for (let index = 0; index <= n; index += 1) {
    const theta = (TAU * index) / n;
    const value = r2(theta);
    const r = value >= 0 ? Math.sqrt(value) : Number.NaN;
    if (Number.isFinite(r) && r <= rMax) {
      current.push([r * Math.cos(theta), r * Math.sin(theta)]);
    } else if (current.length > 0) {
      if (current.length > 1) pieces.push(current);
      current = [];
    }
  }
  if (current.length > 1) pieces.push(current);
  return pieces;
}

/** Lanczos approximation (g = 7), ~15 significant digits for x > 0. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];
export function gamma(x: number): number {
  if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
  const z = x - 1;
  let sum = LANCZOS[0];
  for (let index = 1; index < LANCZOS.length; index += 1) {
    sum += LANCZOS[index] / (z + index);
  }
  const t = z + 7.5;
  return Math.sqrt(TAU) * t ** (z + 0.5) * Math.exp(-t) * sum;
}

export function defaultValues(curve: CurveDef): Record<string, number> {
  return Object.fromEntries(
    curve.params.map((param) => [param.key, param.defaultValue])
  );
}
