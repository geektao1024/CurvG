import { fourierEpicycles } from './data/fourier-epicycles';
import { lorenzAttractor } from './data/lorenz-attractor';
import { mandelbrotSet } from './data/mandelbrot-set';
import { sunflowerGoldenAngle } from './data/sunflower-golden-angle';
import type { Wonder } from './types';

export type { Wonder, WonderFaq, WonderSection, WonderSource } from './types';

/** Every wonder, in running-number order. */
export const WONDERS: readonly Wonder[] = [
  fourierEpicycles,
  mandelbrotSet,
  lorenzAttractor,
  sunflowerGoldenAngle,
];

export function publicWonders(): Wonder[] {
  return WONDERS.filter((wonder) => wonder.publication === 'public');
}

export function getWonder(slug: string): Wonder | undefined {
  const wonder = WONDERS.find((item) => item.slug === slug);
  return wonder?.publication === 'public' ? wonder : undefined;
}

export function wonderPath(wonder: Pick<Wonder, 'slug'>): string {
  return `/wonders/${wonder.slug}`;
}

/** Public wonders that point readers to this lab (`relatedLabs`). */
export function wondersForLab(slug: string): Wonder[] {
  return publicWonders().filter((wonder) => wonder.relatedLabs.includes(slug));
}

/** Share image, from `node scripts/wonder-og-images.mjs`. */
export function wonderOgImage(wonder: Pick<Wonder, 'slug'>, lang: 'en' | 'zh') {
  return `/og/wonders/${wonder.slug}.${lang}.png`;
}

/** Public wonders that draw on this curve (`relatedCurves`). */
export function wondersForCurve(slug: string): Wonder[] {
  return publicWonders().filter((wonder) =>
    wonder.relatedCurves.includes(slug)
  );
}
