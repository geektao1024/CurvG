import { redirect } from '@tanstack/react-router';

import { getLab, labPath } from '@/content/labs';

/**
 * /library was retired on 2026-10-15 (docs/POSITIONING.md §8). Its hubs and
 * topics are now covered by the curve encyclopedia and the labs, so every
 * old URL moves permanently to the page that serves the same intent.
 */
export const LIBRARY_REDIRECTS: Record<string, string> = {
  '': '/labs',
  scenes: '/labs',
  'scenes/permutations-vs-combinations': 'lab:permutations-combinations',
  'scenes/parabola-rise': 'lab:quadratic-transformations',
  'geometry-curves': '/curves',
  'geometry-curves/parametric': '/curves#parametric',
  'geometry-curves/polar': '/curves#polar',
  'geometry-curves/roulette': '/curves#roulette',
  'geometry-curves/spiral': '/curves#spiral',
  'geometry-curves/conic': '/curves#conic',
  'geometry-curves/cartesian': '/curves#cartesian',
  'geometry-curves/visual-proofs': '/labs/geometry',
  'algebra-functions': '/labs/functions',
  'algebra-functions/maps-graphs': '/labs/functions',
  'algebra-functions/numbers-structure': '/labs/probability',
  'algebra-functions/series-limits': '/labs/probability',
  calculus: '/labs/functions',
  'calculus/rates': 'lab:derivative-tangent-slope',
  'calculus/accumulation': 'lab:riemann-sum-area',
  'waves-signals': '/labs/waves',
  'waves-signals/harmonic': '/labs/waves',
};

export function libraryRedirectTarget(rest: string): string {
  const target = LIBRARY_REDIRECTS[rest.replace(/^\/+|\/+$/g, '')] ?? '/labs';
  if (!target.startsWith('lab:')) return target;
  const lab = getLab(target.slice(4));
  return lab ? labPath(lab) : '/labs';
}

export function redirectFromLibrary(rest: string): never {
  const [to, hash] = libraryRedirectTarget(rest).split('#');
  throw redirect({ to: to as never, hash, statusCode: 301 });
}
