/**
 * Curve encyclopedia registry.
 *
 * 30 editorial curve entries (bilingual, with LaTeX equations, interactive
 * parameters, and pure sampling functions). Isomorphic — imported by the
 * /curves routes, the sitemap, and llms.txt alike.
 */

import { cartesianCurves } from './data/cartesian';
import { conicCurves } from './data/conics';
import { parametricCurves } from './data/parametric';
import { polarCurves } from './data/polar';
import { rouletteCurves } from './data/roulettes';
import { spiralCurves } from './data/spirals';
import type { CurveCategory, CurveDef } from './types';

export type { CurveCategory, CurveDef, CurveParam } from './types';
export { defaultValues } from './types';

export const CURVE_CATEGORY_ORDER: CurveCategory[] = [
  'parametric',
  'polar',
  'roulette',
  'spiral',
  'conic',
  'cartesian',
];

export const CURVES: CurveDef[] = [
  ...parametricCurves,
  ...polarCurves,
  ...rouletteCurves,
  ...spiralCurves,
  ...conicCurves,
  ...cartesianCurves,
];

const bySlug = new Map(CURVES.map((curve) => [curve.slug, curve]));

export function getCurve(slug: string): CurveDef | undefined {
  return bySlug.get(slug);
}

export function getCurvesByCategory(category: CurveCategory): CurveDef[] {
  return CURVES.filter((curve) => curve.category === category);
}

export function getRelatedCurves(curve: CurveDef): CurveDef[] {
  return curve.related
    .map((slug) => bySlug.get(slug))
    .filter((related): related is CurveDef => related !== undefined);
}
