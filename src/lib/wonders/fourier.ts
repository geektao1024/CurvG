/**
 * Fourier epicycles: the math behind the "rotating circles draw any curve"
 * wonder. Pure and deterministic, so the live page, a future film render and
 * the tests all agree on every number.
 *
 * A circle is a rotating vector `amp · e^{i(freq·θ + phase)}`. Chaining them
 * tip to tail and reading the last tip gives a partial Fourier sum.
 */

export type Epicycle = { freq: number; amp: number; phase: number };

export type Point = { x: number; y: number };

export type Wave = 'square' | 'sawtooth' | 'triangle';

export const WAVES: readonly Wave[] = ['square', 'sawtooth', 'triangle'];

/**
 * The first `count` non-zero sine terms of a period-2π wave of amplitude 1.
 * A negative coefficient becomes a phase of π so every radius is positive.
 *
 * - square:   (4/π) Σ_{n odd} sin(nθ)/n
 * - sawtooth: (2/π) Σ_{n≥1} (-1)^{n+1} sin(nθ)/n      (θ/π on (-π, π))
 * - triangle: (8/π²) Σ_{n odd} (-1)^{(n-1)/2} sin(nθ)/n²
 */
export function waveTerms(wave: Wave, count: number): Epicycle[] {
  const terms: Epicycle[] = [];
  for (let i = 0; terms.length < count; i++) {
    let n: number;
    let b: number;
    if (wave === 'square') {
      n = 2 * i + 1;
      b = 4 / (Math.PI * n);
    } else if (wave === 'sawtooth') {
      n = i + 1;
      b = ((n % 2 === 1 ? 1 : -1) * 2) / (Math.PI * n);
    } else {
      n = 2 * i + 1;
      b = ((i % 2 === 0 ? 1 : -1) * 8) / (Math.PI * Math.PI * n * n);
    }
    terms.push({ freq: n, amp: Math.abs(b), phase: b < 0 ? Math.PI : 0 });
  }
  return terms;
}

/** The exact wave the series converges to, for ghost outlines and checks. */
export function waveValue(wave: Wave, theta: number): number {
  // Wrap into (-π, π].
  const t = theta - 2 * Math.PI * Math.round(theta / (2 * Math.PI));
  if (wave === 'square')
    return t === 0 || Math.abs(t) === Math.PI ? 0 : Math.sign(t);
  if (wave === 'sawtooth') return Math.abs(t) === Math.PI ? 0 : t / Math.PI;
  // Triangle: rises 0 → 1 on [0, π/2], falls to -1 at -π/2 … odd and periodic.
  const a = Math.abs(t);
  const up = a <= Math.PI / 2 ? (2 * a) / Math.PI : 2 - (2 * a) / Math.PI;
  return Math.sign(t) * up;
}

/** Mean of f² over one period: the denominator of the relative error. */
const WAVE_POWER: Record<Wave, number> = {
  square: 1,
  sawtooth: 1 / 3,
  triangle: 1 / 3,
};

/**
 * Relative RMS error of a partial sum, exactly, by Parseval: the power a
 * sine term carries is amp²/2, so what is missing is what the dropped terms
 * would have carried.
 */
export function waveError(wave: Wave, terms: readonly Epicycle[]): number {
  const kept = terms.reduce((sum, term) => sum + (term.amp * term.amp) / 2, 0);
  const power = WAVE_POWER[wave];
  return Math.sqrt(Math.max(0, power - kept) / power);
}

/**
 * Sum of rotating vectors at angle θ. `weights` fades terms in: term i
 * counts `weight(i)` of its radius (1 for whole circles).
 */
export function chain(
  terms: readonly Epicycle[],
  theta: number,
  weight: (i: number) => number = () => 1
): Point[] {
  const joints: Point[] = [{ x: 0, y: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 0; i < terms.length; i++) {
    const { freq, amp, phase } = terms[i];
    const r = amp * weight(i);
    const a = freq * theta + phase;
    x += r * Math.cos(a);
    y += r * Math.sin(a);
    joints.push({ x, y });
  }
  return joints;
}

/** Vertical position of the chain tip: the partial sum Σ amp·sin(nθ + φ). */
export function partialSum(
  terms: readonly Epicycle[],
  theta: number,
  weight: (i: number) => number = () => 1
): number {
  let y = 0;
  for (let i = 0; i < terms.length; i++) {
    const { freq, amp, phase } = terms[i];
    y += amp * weight(i) * Math.sin(freq * theta + phase);
  }
  return y;
}

/**
 * Peak of the square-wave partial sum just after the jump at 0, sampled
 * finely over the first lobe. The overshoot above 1, as a share of the jump
 * height 2, tends to ≈ 8.95% (Gibbs) however many terms are added.
 */
export function squareOvershoot(count: number): number {
  const terms = waveTerms('square', count);
  const n = 2 * count - 1;
  // The first peak sits near θ = π/(n+1); scan the lobe around it.
  let peak = -Infinity;
  const end = (3 * Math.PI) / (n + 1);
  for (let i = 1; i <= 600; i++) {
    peak = Math.max(peak, partialSum(terms, (end * i) / 600));
  }
  return (peak - 1) / 2;
}

/** Fixed number of samples a closed path is resampled to before the DFT. */
export const PATH_SAMPLES = 256;

/** Resample a polyline to `count` points evenly spaced by arc length. */
export function resample(
  points: readonly Point[],
  count: number,
  closed = true
): Point[] {
  const pts = closed ? [...points, points[0]] : [...points];
  const cumulative = [0];
  for (let i = 1; i < pts.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    );
  }
  const total = cumulative[cumulative.length - 1];
  if (total === 0) return Array.from({ length: count }, () => ({ ...pts[0] }));
  const out: Point[] = [];
  let seg = 1;
  // A closed path's last sample stops one step short of the start.
  const steps = closed ? count : count - 1;
  for (let i = 0; i < count; i++) {
    const d = (total * i) / steps;
    while (seg < cumulative.length - 1 && cumulative[seg] < d) seg++;
    const d0 = cumulative[seg - 1];
    const d1 = cumulative[seg];
    const f = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
    out.push({
      x: pts[seg - 1].x + (pts[seg].x - pts[seg - 1].x) * f,
      y: pts[seg - 1].y + (pts[seg].y - pts[seg - 1].y) * f,
    });
  }
  return out;
}

/**
 * Discrete Fourier transform of a closed path (as complex samples), as
 * epicycles sorted largest first. The constant term (freq 0) is the centre
 * and comes first whatever its size, so the chain is anchored in place.
 * Frequencies are signed (-N/2 … N/2-1): positive turn anticlockwise.
 */
export function pathEpicycles(samples: readonly Point[]): Epicycle[] {
  const n = samples.length;
  const out: Epicycle[] = [];
  for (let k = -Math.floor(n / 2); k < Math.ceil(n / 2); k++) {
    let re = 0;
    let im = 0;
    for (let j = 0; j < n; j++) {
      const a = (-2 * Math.PI * k * j) / n;
      const { x, y } = samples[j];
      re += x * Math.cos(a) - y * Math.sin(a);
      im += x * Math.sin(a) + y * Math.cos(a);
    }
    re /= n;
    im /= n;
    out.push({ freq: k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
  }
  const centre = out.find((term) => term.freq === 0)!;
  const rest = out
    .filter((term) => term.freq !== 0)
    .sort((a, b) => b.amp - a.amp || a.freq - b.freq);
  return [centre, ...rest];
}

/**
 * Relative RMS error of drawing the path with the first `count` circles
 * (centre excluded from the power, so a shifted shape is not "easier").
 */
export function pathError(
  epicycles: readonly Epicycle[],
  count: number
): number {
  let total = 0;
  let kept = 0;
  for (let i = 1; i < epicycles.length; i++) {
    const p = epicycles[i].amp ** 2;
    total += p;
    if (i < count) kept += p;
  }
  return total === 0 ? 0 : Math.sqrt(Math.max(0, total - kept) / total);
}

/** Point on the reconstructed path at τ ∈ [0, 1) with `weight` per circle. */
export function pathPoint(
  epicycles: readonly Epicycle[],
  tau: number,
  weight: (i: number) => number
): Point {
  let x = 0;
  let y = 0;
  const theta = 2 * Math.PI * tau;
  for (let i = 0; i < epicycles.length; i++) {
    const w = weight(i);
    if (w <= 0) continue;
    const { freq, amp, phase } = epicycles[i];
    const a = freq * theta + phase;
    x += amp * w * Math.cos(a);
    y += amp * w * Math.sin(a);
  }
  return { x, y };
}

/**
 * The π drawn as one closed outline (y up, about ±1). Corners are left
 * sharp on purpose: Fourier rounds them off with few circles and rings
 * around them with many, which is half the story.
 */
const PI_OUTLINE: Point[] = [
  { x: -0.9, y: 0.48 },
  { x: -0.84, y: 0.68 },
  { x: 0.95, y: 0.68 },
  { x: 0.95, y: 0.48 },
  { x: 0.44, y: 0.48 },
  { x: 0.44, y: -0.5 },
  { x: 0.48, y: -0.64 },
  { x: 0.6, y: -0.7 },
  { x: 0.74, y: -0.62 },
  { x: 0.76, y: -0.76 },
  { x: 0.6, y: -0.86 },
  { x: 0.4, y: -0.82 },
  { x: 0.27, y: -0.66 },
  { x: 0.24, y: -0.42 },
  { x: 0.24, y: 0.48 },
  { x: -0.3, y: 0.48 },
  { x: -0.33, y: 0.08 },
  { x: -0.42, y: -0.4 },
  { x: -0.55, y: -0.72 },
  { x: -0.66, y: -0.86 },
  { x: -0.82, y: -0.84 },
  { x: -0.72, y: -0.64 },
  { x: -0.58, y: -0.28 },
  { x: -0.52, y: 0.1 },
  { x: -0.5, y: 0.48 },
];

/** π outline resampled for the DFT. */
export function piSamples(): Point[] {
  return resample(PI_OUTLINE, PATH_SAMPLES);
}

/**
 * Turn a free-hand stroke (any scale, y up) into DFT samples: centred,
 * scaled so its larger half-extent is 1, resampled by arc length. Returns
 * null for a stroke too short to draw anything.
 */
export function normalizeStroke(points: readonly Point[]): Point[] | null {
  if (points.length < 8) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const half = Math.max(maxX - minX, maxY - minY) / 2;
  if (half < 1e-6) return null;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return resample(
    points.map((p) => ({ x: (p.x - cx) / half, y: (p.y - cy) / half })),
    PATH_SAMPLES
  );
}
