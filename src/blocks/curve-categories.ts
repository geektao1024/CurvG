import { m } from '@/paraglide/messages.js';
import type { CurveCategory } from '@/content/curves';

const LABELS: Record<CurveCategory, () => string> = {
  parametric: () => m['curves.category.parametric'](),
  polar: () => m['curves.category.polar'](),
  roulette: () => m['curves.category.roulette'](),
  spiral: () => m['curves.category.spiral'](),
  conic: () => m['curves.category.conic'](),
  cartesian: () => m['curves.category.cartesian'](),
  fractal: () => m['curves.category.fractal'](),
};

export function curveCategoryLabel(category: CurveCategory): string {
  return LABELS[category]();
}

/** Each category is a section of /curves; the nav and footer jump to it. */
export function curveCategoryHref(category: CurveCategory): string {
  return `/curves#${category}`;
}
