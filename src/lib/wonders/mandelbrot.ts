/**
 * The Mandelbrot set: math, story and camera. Pure; the WebGL painter lives
 * in `mandelbrot-gl.ts`.
 *
 * The GPU only has 32-bit floats, which run out of precision near a 10⁴×
 * zoom. So the picture is drawn by perturbation: one reference orbit at the
 * view centre is computed here in 64-bit, and each pixel iterates only its
 * small difference δ from it (δ ← (2Z + δ)·δ + δc), rebasing to the start of
 * the reference whenever |z| < |δ| or the reference runs out.
 */

import {
  clamp01,
  easeInOut,
  easeSine,
  lerp,
  track,
  type Key,
} from './timeline';

export type Complex = { re: number; im: number };

/** Squared escape radius. Large, for smooth colouring. */
export const BAILOUT2 = 256;

/** Iterates of z → z² + c from z₀ = 0, stopping after escape. */
export function orbit(c: Complex, maxIter: number, bail2 = 4): Complex[] {
  const out: Complex[] = [{ re: 0, im: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 0; i < maxIter; i++) {
    const nx = x * x - y * y + c.re;
    y = 2 * x * y + c.im;
    x = nx;
    out.push({ re: x, im: y });
    if (x * x + y * y > bail2) break;
  }
  return out;
}

/**
 * Number of steps before |z| > 2, or `maxIter` if it never escapes (the
 * point counts as in the set).
 */
export function escapeTime(c: Complex, maxIter: number): number {
  let x = 0;
  let y = 0;
  for (let i = 0; i < maxIter; i++) {
    const nx = x * x - y * y + c.re;
    y = 2 * x * y + c.im;
    x = nx;
    if (x * x + y * y > 4) return i + 1;
  }
  return maxIter;
}

/**
 * Reference orbit at the view centre, as float pairs for the GPU texture:
 * index 0 is z₀ = 0, index k is z_k. Stops after escaping the bailout.
 */
export function referenceOrbit(
  c: Complex,
  maxIter: number
): { data: Float32Array; length: number } {
  const data = new Float32Array((maxIter + 2) * 2);
  let x = 0;
  let y = 0;
  let n = 1;
  for (let i = 0; i < maxIter; i++) {
    const nx = x * x - y * y + c.re;
    y = 2 * x * y + c.im;
    x = nx;
    data[n * 2] = x;
    data[n * 2 + 1] = y;
    n++;
    if (x * x + y * y > BAILOUT2) break;
  }
  return { data, length: n };
}

/**
 * The perturbed iteration the shader runs, in 64-bit here so tests can
 * check it against direct iteration. Returns the escape step (or maxIter).
 */
export function perturbedEscape(
  centre: Complex,
  dc: Complex,
  maxIter: number
): number {
  const ref = referenceOrbit(centre, maxIter);
  const R = (m: number) => ({ re: ref.data[m * 2], im: ref.data[m * 2 + 1] });
  let dx = 0;
  let dy = 0;
  let m = 0;
  for (let i = 0; i < maxIter; i++) {
    const Z = R(m);
    const ax = 2 * Z.re + dx;
    const ay = 2 * Z.im + dy;
    const nx = ax * dx - ay * dy + dc.re;
    dy = ax * dy + ay * dx + dc.im;
    dx = nx;
    m++;
    const Zm = R(m);
    const zx = Zm.re + dx;
    const zy = Zm.im + dy;
    const r2 = zx * zx + zy * zy;
    if (r2 > 4) return i + 1;
    if (r2 < dx * dx + dy * dy || m >= ref.length - 1) {
      dx = zx;
      dy = zy;
      m = 0;
    }
  }
  return maxIter;
}

/** Iteration budget that keeps edges crisp as the view narrows. */
export function iterationsFor(width: number, detail = 1): number {
  const depth = Math.max(0, Math.log10(FULL.width / width));
  return Math.round(Math.min(6000, (200 + 320 * depth) * detail));
}

// ── Places ────────────────────────────────────────────────────────────────

export type MandelView = { re: number; im: number; width: number };

/** Narrowest view: below this, 64-bit reference orbits run out of digits. */
export const MIN_WIDTH = 2e-13;

/** The whole set, centred. */
export const FULL: MandelView = { re: -0.62, im: 0, width: 3.3 };

/** Wide enough for the circle |z| = 2 the first orbits are judged by. */
export const ORBIT_VIEW: MandelView = { re: -0.2, im: 0.15, width: 5.4 };

/**
 * Seahorse valley, the classic deep-zoom point between the main cardioid
 * and the period-2 bulb (coordinates good far beyond 64-bit).
 */
export const SEAHORSE = {
  re: -0.7436438870371587,
  im: 0.131825904205312,
};

/**
 * A small copy deep in seahorse valley, about 1.1 × 10⁻⁶ across: the
 * nucleus of a period-78 component (found by Newton's method on
 * f_c^78(0) = 0 near SEAHORSE).
 */
export const DEEP_COPY = {
  re: -0.7436441720129633,
  im: 0.13182539739503274,
};
export const DEEP_COPY_PERIOD = 78;

/** Nucleus of the period-3 copy on the main antenna. */
export const ANTENNA_COPY = { re: -1.7548776662466927, im: 0 };

/** The rabbit: a period-3 nucleus, so the orbit of 0 is an exact triangle. */
export const RABBIT: Complex = {
  re: -0.12256116687665362,
  im: 0.7448617666197442,
};

/** Just outside the neck between the cardioid and the period-2 bulb. */
export const NECK: Complex = { re: -0.75, im: 0.1 };

export type MandelPreset = 'full' | 'seahorse' | 'deep' | 'antenna';

const PRESETS_DEEP_WIDTH = 8.8e-6;

export const PRESETS: Record<MandelPreset, MandelView> = {
  full: FULL,
  seahorse: { ...SEAHORSE, width: 0.012 },
  deep: { ...DEEP_COPY, width: PRESETS_DEEP_WIDTH },
  antenna: { ...ANTENNA_COPY, width: 0.075 },
};

// ── Story ─────────────────────────────────────────────────────────────────

export const MANDEL_BEATS = [0, 8, 15, 24, 36, 47] as const;
export const MANDEL_STORY_LENGTH = 55;

/** Deepest width the story reaches: the copy in seahorse valley, framed. */
export const STORY_DEEP_WIDTH = PRESETS_DEEP_WIDTH;

export type MandelScene = {
  view: MandelView;
  /** Iteration cap for the picture. */
  maxIter: number;
  /** Opacity of the fractal layer. */
  fractal: number;
  /** Opacity of axes, the |z| = 2 circle and orbit drawings. */
  guides: number;
  /** Steps of the rabbit orbit shown, and its opacity. */
  rabbit: number;
  rabbitAlpha: number;
  /** Steps of the escaping orbit shown, and its opacity. */
  neck: number;
  neckAlpha: number;
};

const logW = (w: number) => Math.log(w);

/**
 * Zooming towards a point keeps it at the same place on screen: the
 * offset from the target shrinks with the width.
 */
function zoomTowards(
  from: MandelView,
  target: Complex,
  width: number
): MandelView {
  const f = width / from.width;
  // Also drift the target to the centre as the zoom deepens, so it ends
  // framed in the middle rather than wherever it started on screen.
  const settle = f ** 0.18;
  return {
    re: target.re + (from.re - target.re) * f * settle,
    im: target.im + (from.im - target.im) * f * settle,
    width,
  };
}

/** Log-width keyframes (seconds → ln width). */
const logWidthAt = track([
  [0, logW(FULL.width)],
  [24.5, logW(FULL.width)],
  [35.5, logW(PRESETS.seahorse.width / 40)],
  [44, logW(STORY_DEEP_WIDTH)],
  [47.6, logW(STORY_DEEP_WIDTH)],
  [53.4, logW(FULL.width), easeSine],
] as readonly Key[]);

// Iteration ramp while the set first appears: the outline tightens step by
// step, as each extra iteration rules out more points.
const revealIterAt = track([
  [15.5, 1],
  [22.5, 220],
]);
const fractalAt = track([
  [15, 0],
  [16.5, 1],
]);
const guidesAt = track([
  [0, 0],
  [1, 1],
  [16, 1],
  [19, 0],
]);
const rabbitAlphaAt = track([
  [0, 1],
  [8.6, 1],
  [9.6, 0.25],
  [16, 0],
]);
const neckAlphaAt = track([
  [8.2, 0],
  [8.8, 1],
  [16, 0.6],
  [18, 0],
]);

/** The rabbit orbit's step count over beat 0 (it cycles every 3 steps). */
const rabbitSteps = (t: number) => Math.max(0, Math.floor((t - 1.2) * 1.6));
/** The escaping orbit's step count over beat 1. */
const neckSteps = (t: number) => Math.max(0, Math.floor((t - 8.8) * 5.5));

const openingAt = track([
  [15.2, 0],
  [17.4, 1],
]);

export function mandelStory(t: number): MandelScene {
  const width = Math.exp(logWidthAt(t));
  // Orbits first, framed round |z| = 2; then the whole set; then down
  // through seahorse valley to the small copy at its heart, and back out.
  const view =
    t < 17.4
      ? easeView(ORBIT_VIEW, FULL, openingAt(t))
      : zoomTowards(FULL, DEEP_COPY, width);
  const zoomIter = iterationsFor(width);
  const maxIter =
    t < 22.5 ? Math.round(revealIterAt(t)) : Math.max(220, zoomIter);
  return {
    view,
    maxIter,
    fractal: fractalAt(t),
    guides: guidesAt(t),
    rabbit: rabbitSteps(t),
    rabbitAlpha: rabbitAlphaAt(t),
    neck: neckSteps(t),
    neckAlpha: neckAlphaAt(t),
  };
}

/** Smoothly move a free view towards a target (log space for width). */
export function easeView(
  from: MandelView,
  to: MandelView,
  f: number
): MandelView {
  const width = Math.exp(lerp(Math.log(from.width), Math.log(to.width), f));
  const k = clamp01(f);
  return {
    re: lerp(from.re, to.re, easeInOut(k)),
    im: lerp(from.im, to.im, easeInOut(k)),
    width,
  };
}

/** Palette stops: night blue → violet → cyan → amber, cycled. */
const STOPS: readonly [number, number, number][] = [
  [0.05, 0.07, 0.2],
  [0.42, 0.36, 0.84],
  [0.43, 0.91, 1.0],
  [1.0, 0.72, 0.3],
];

const smooth = (x: number) => x * x * (3 - 2 * x);

/**
 * Colour of a smooth escape value `mu` (iterations, fractional), shared by
 * the shader (as GLSL) and the CPU poster: the CurvG night palette, cycled
 * slowly, fading to the background far from the set. Returns 0–1 RGB.
 */
export function mandelColor(mu: number): [number, number, number] {
  const x = ((((Math.sqrt(Math.max(0, mu)) * 0.21) % 1) + 1) % 1) * 4;
  const i = Math.floor(x);
  const f = smooth(x - i);
  const a = STOPS[i];
  const b = STOPS[(i + 1) % 4];
  const glow = (1 - Math.exp(-mu * 0.03)) ** 2;
  return [0, 1, 2].map((k) => (a[k] + (b[k] - a[k]) * f) * glow) as [
    number,
    number,
    number,
  ];
}

/** GLSL twin of `mandelColor`. Keep the two in step. */
export const MANDEL_COLOR_GLSL = /* glsl */ `
vec3 mandelColor(float mu) {
  vec3 s0 = vec3(0.05, 0.07, 0.2);
  vec3 s1 = vec3(0.42, 0.36, 0.84);
  vec3 s2 = vec3(0.43, 0.91, 1.0);
  vec3 s3 = vec3(1.0, 0.72, 0.3);
  float x = fract(sqrt(max(0.0, mu)) * 0.21) * 4.0;
  float f = smoothstep(0.0, 1.0, fract(x));
  vec3 c;
  if (x < 1.0) c = mix(s0, s1, f);
  else if (x < 2.0) c = mix(s1, s2, f);
  else if (x < 3.0) c = mix(s2, s3, f);
  else c = mix(s3, s0, f);
  float glow = 1.0 - exp(-mu * 0.03);
  return c * glow * glow;
}`;

/** Smooth escape value for a point, or -1 inside (CPU, for posters). */
export function smoothEscape(c: Complex, maxIter: number): number {
  let x = 0;
  let y = 0;
  for (let i = 0; i < maxIter; i++) {
    const nx = x * x - y * y + c.re;
    y = 2 * x * y + c.im;
    x = nx;
    const r2 = x * x + y * y;
    if (r2 > BAILOUT2) return i + 2 - Math.log2(0.5 * Math.log(r2));
  }
  return -1;
}
