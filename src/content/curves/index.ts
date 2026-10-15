/**
 * Curve encyclopedia registry.
 *
 * Editorial curve entries (bilingual, with LaTeX equations, interactive
 * parameters, and pure sampling functions). Isomorphic — imported by the
 * /curves routes, the sitemap, and llms.txt alike.
 */

import { cartesianCurves } from './data/cartesian';
import { conicCurves } from './data/conics';
import { fractalCurves } from './data/fractals';
import { parametricCurves } from './data/parametric';
import { polarCurves } from './data/polar';
import { rouletteCurves } from './data/roulettes';
import { spiralCurves } from './data/spirals';
import { CURVE_FACTS } from './facts';
import type { CurveCategory, CurveDef, CurveFact, CurveFacts } from './types';

export type { CurveCategory, CurveDef, CurveParam } from './types';
export type { CurveFact, CurveFactKind, CurveFacts } from './types';
export { defaultValues } from './types';
export { CURVE_FACTS } from './facts';
export { CURVE_PRESETS, type CurvePreset } from './presets';
export {
  CURVE_TRACES,
  traceExtent,
  traceFrame,
  type CurveTrace,
  type TraceFrame,
  type TraceGuide,
} from './traces';

export const CURVE_CATEGORY_ORDER: CurveCategory[] = [
  'parametric',
  'polar',
  'roulette',
  'spiral',
  'conic',
  'cartesian',
  'fractal',
];

export const CURVES: CurveDef[] = [
  ...parametricCurves,
  ...polarCurves,
  ...rouletteCurves,
  ...spiralCurves,
  ...conicCurves,
  ...cartesianCurves,
  ...fractalCurves,
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

/** Static graph (public/curves) and share image (public/og/curves), from `pnpm og:curves`. */
export function curveGraphImage(slug: string): string {
  return `/curves/${slug}.svg`;
}
export function curveOgImage(slug: string, lang: 'en' | 'zh'): string {
  return `/og/curves/${slug}.${lang}.png`;
}

/**
 * Curves the homepage leads with: the ones search already finds
 * (docs/SEO_CONTENT_STRATEGY.md, 2026-10-14 GSC baseline).
 */
export const FEATURED_CURVE_SLUGS = [
  'epicycloid',
  'astroid',
  'cycloid',
  'heart-curve',
  'cardioid',
  'lissajous-curve',
] as const;

export function featuredCurves(): CurveDef[] {
  return FEATURED_CURVE_SLUGS.map((slug) => getCurve(slug)).filter(
    (curve): curve is CurveDef => curve !== undefined
  );
}

export function getCurveFacts(slug: string): CurveFacts | undefined {
  return CURVE_FACTS[slug];
}

/** A fact's TeX as lines; a pair like x = …, y = … is two lines. */
export function factLines(fact: CurveFact): readonly string[] {
  if (fact.tex === undefined) return [];
  return typeof fact.tex === 'string' ? [fact.tex] : fact.tex;
}
