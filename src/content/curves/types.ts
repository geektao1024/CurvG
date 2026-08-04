/**
 * Curve encyclopedia — shared types and sampling helpers.
 *
 * This module is isomorphic: curve definitions are plain data plus pure
 * sampling functions, safe to import from routes, loaders, the sitemap,
 * and client components alike.
 */

export type LocaleText = { en: string; zh: string };
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
  | 'cartesian';

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
  /** Returns one or more polylines in curve space. */
  sample: (values: Record<string, number>) => CurvePoints;
  intro: LocaleList;
  properties: LocaleList;
  seenIn: LocaleText;
  /** Prefills the Creator brief via /creator?prompt=… */
  prompt: LocaleText;
  related: string[];
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

export function defaultValues(curve: CurveDef): Record<string, number> {
  return Object.fromEntries(
    curve.params.map((param) => [param.key, param.defaultValue])
  );
}
