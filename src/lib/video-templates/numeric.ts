/**
 * The numbers a template prints are computed here, never by the renderer,
 * so a film can state them before it draws them (and tests can pin them).
 */

export type RealFn = (x: number) => number;

/** Composite Simpson on 2n panels; NaN if f is not finite on [a, b]. */
export function integrate(f: RealFn, a: number, b: number, n = 2000): number {
  if (a === b) return 0;
  const h = (b - a) / (2 * n);
  let sum = f(a) + f(b);
  for (let i = 1; i < 2 * n; i += 1) sum += (i % 2 ? 4 : 2) * f(a + i * h);
  const value = (sum * h) / 3;
  return Number.isFinite(value) ? value : Number.NaN;
}

export function finiteOn(
  f: RealFn,
  a: number,
  b: number,
  samples = 400
): boolean {
  for (let i = 0; i <= samples; i += 1) {
    if (!Number.isFinite(f(a + ((b - a) * i) / samples))) return false;
  }
  return true;
}

function bisect(f: RealFn, lo: number, hi: number): number {
  let flo = f(lo);
  for (let i = 0; i < 80; i += 1) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);
    if (Math.sign(fmid) === Math.sign(flo)) {
      lo = mid;
      flo = fmid;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Zeros of f on [a, b]: sign changes refined by bisection, plus touching
 * zeros (|f| tiny at a local minimum of |f|). A sign change across a pole
 * (1/x) is rejected because |f| does not shrink there.
 */
export function roots(
  f: RealFn,
  a: number,
  b: number,
  samples = 1200
): number[] {
  const found: number[] = [];
  const step = (b - a) / samples;
  const scale = Math.max(
    1e-9,
    ...Array.from(
      { length: 50 },
      (_, i) => Math.abs(f(a + ((b - a) * i) / 49)) || 0
    )
  );
  let px = a;
  let py = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const x = a + i * step;
    const y = f(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (y === 0) found.push(x);
      else if (py !== 0 && Math.sign(py) !== Math.sign(y)) {
        const root = bisect(f, px, x);
        if (Math.abs(f(root)) < 1e-6 * scale + 1e-9) found.push(root);
      } else if (i >= 2) {
        const ppx = x - 2 * step;
        const ppy = f(ppx);
        if (
          Math.abs(py) < Math.abs(ppy) &&
          Math.abs(py) < Math.abs(y) &&
          Math.abs(py) < 1e-9 * scale
        ) {
          found.push(px);
        }
      }
    }
    px = x;
    py = y;
  }
  return dedupe(found, step * 2);
}

/** Local extrema of f on the open interval (a, b), by sign changes of f'. */
export function extrema(
  f: RealFn,
  a: number,
  b: number
): Array<{ x: number; y: number; kind: 'max' | 'min' }> {
  const h = (b - a) * 1e-5;
  const d: RealFn = (x) => (f(x + h) - f(x - h)) / (2 * h);
  const points: Array<{ x: number; y: number; kind: 'max' | 'min' }> = [];
  for (const x of roots(d, a + (b - a) * 0.01, b - (b - a) * 0.01)) {
    const left = d(x - (b - a) * 0.002);
    const right = d(x + (b - a) * 0.002);
    if (!Number.isFinite(f(x))) continue;
    if (left > 0 && right < 0) points.push({ x, y: f(x), kind: 'max' });
    if (left < 0 && right > 0) points.push({ x, y: f(x), kind: 'min' });
  }
  return points;
}

function dedupe(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((p, q) => p - q);
  return sorted.filter(
    (value, index) => index === 0 || value - sorted[index - 1] > tolerance
  );
}

/** Round for display: at most `places` decimals, trailing zeros dropped, no -0. */
export function round(value: number, places = 4): number {
  const rounded = Number(value.toFixed(places));
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** A value cleaned to a nearby simple number (0.9999999 → 1). */
export function tidy(value: number): number {
  for (const places of [0, 1, 2, 3, 4]) {
    const candidate = Number(value.toFixed(places));
    if (Math.abs(candidate - value) < 1e-7 * Math.max(1, Math.abs(value)))
      return candidate;
  }
  return round(value, 4);
}

function fraction(
  value: number,
  maxDenominator: number
): [number, number] | undefined {
  for (let q = 1; q <= maxDenominator; q += 1) {
    const p = Math.round(value * q);
    if (Math.abs(value * q - p) < 1e-7 * Math.max(1, Math.abs(value * q)))
      return [p, q];
  }
  return undefined;
}

/**
 * LaTeX for a computed value: an integer, a small fraction (1/3), a
 * multiple of π (π/2), or a 4-decimal approximation marked with ≈.
 */
export function valueLatex(value: number): { latex: string; exact: boolean } {
  if (Math.abs(value) < 1e-6) return { latex: '0', exact: true };
  const plainFraction = fraction(value, 12);
  if (plainFraction) {
    const [p, q] = plainFraction;
    if (q === 1) return { latex: String(p), exact: true };
    return {
      latex: `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`,
      exact: true,
    };
  }
  const piFraction = fraction(value / Math.PI, 6);
  if (piFraction) {
    const [p, q] = piFraction;
    const sign = p < 0 ? '-' : '';
    const top = Math.abs(p) === 1 ? '\\pi' : `${Math.abs(p)}\\pi`;
    return {
      latex: q === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${q}}`,
      exact: true,
    };
  }
  return { latex: `\\approx ${String(round(value, 4))}`, exact: false };
}

/** "= 1/3 ≈ 0.3333" style: exact form, plus the decimal when it adds something. */
export function equalsLatex(value: number): string {
  const nice = valueLatex(value);
  if (!nice.exact) return nice.latex;
  return nice.latex.includes('\\frac') || nice.latex.includes('\\pi')
    ? `= ${nice.latex} \\approx ${round(value, 4)}`
    : `= ${nice.latex}`;
}

/** Short plain text for captions: 1/3, π/2, ≈ 0.3333. */
export function valuePlain(value: number): string {
  const nice = valueLatex(value);
  return nice.latex
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/, '$1/$2')
    .replace('\\pi', 'π')
    .replace('\\approx ', '≈ ');
}
