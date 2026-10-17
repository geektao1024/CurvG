/**
 * Prime spirals: every whole number n drawn at polar point (r = n, θ = n
 * radians). Zooming out, the integers fall into 6 arms, then 44 spirals,
 * then 710 rays: 6, 44/7 and 710/113 are best fractions for 2π. Primes
 * only pick which arms they sit on (residues coprime to the count) and
 * share those arms evenly (Dirichlet). Math, story and a Canvas 2D engine.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { lerp, linear, track } from './timeline';

/** Largest number drawn. */
export const N_MAX = 1_000_000;

let sieveCache: Uint8Array | null = null;
let countCache: Uint32Array | null = null;

/** `sieve()[n] === 1` when n is prime, n ≤ N_MAX. */
export function sieve(): Uint8Array {
  if (sieveCache) return sieveCache;
  const s = new Uint8Array(N_MAX + 1).fill(1);
  s[0] = 0;
  s[1] = 0;
  for (let i = 2; i * i <= N_MAX; i++) {
    if (s[i]) for (let j = i * i; j <= N_MAX; j += i) s[j] = 0;
  }
  sieveCache = s;
  return s;
}

/** π(n): primes ≤ n (n ≤ N_MAX). */
export function primeCount(n: number): number {
  if (!countCache) {
    const s = sieve();
    const c = new Uint32Array(N_MAX + 1);
    for (let i = 1; i <= N_MAX; i++) c[i] = c[i - 1] + s[i];
    countCache = c;
  }
  return countCache[Math.max(0, Math.min(N_MAX, Math.floor(n)))];
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

/** Euler's φ(m): residues mod m with no common factor with m. */
export function totient(m: number): number {
  let count = 0;
  for (let r = 1; r <= m; r++) if (gcd(r, m) === 1) count++;
  return count;
}

/** Continued-fraction convergents p/q of `x` (2π by default). */
export function convergents(
  x = 2 * Math.PI,
  terms = 7
): { p: number; q: number }[] {
  const out: { p: number; q: number }[] = [];
  let [h0, h1, k0, k1] = [1, 0, 0, 1];
  let v = x;
  for (let i = 0; i < terms; i++) {
    const a = Math.floor(v);
    const h = a * h0 + h1;
    const k = a * k0 + k1;
    out.push({ p: h, q: k });
    [h1, h0, k1, k0] = [h0, h, k0, k];
    v = 1 / (v - a);
  }
  return out;
}

/** How far `m` radians is from a whole number of turns, radians (signed). */
export function turnGap(m: number): number {
  const turns = Math.round(m / (2 * Math.PI));
  return m - turns * 2 * Math.PI;
}

/**
 * Primes ≤ `limit` on each arm (residue mod `m`), for the residues that hold
 * more than a couple (2, 3, 5, 11, 71 sit alone on their arms).
 */
export function primesPerArm(m: number, limit = N_MAX): Map<number, number> {
  const s = sieve();
  const tally = new Map<number, number>();
  for (let n = 2; n <= limit; n++) {
    if (s[n]) tally.set(n % m, (tally.get(n % m) ?? 0) + 1);
  }
  for (const [r, c] of tally) if (c <= 2) tally.delete(r);
  return tally;
}

/**
 * Arms named for a view showing numbers up to `R` (the readout): the 2π
 * convergent whose arms make about one or two turns there. `null` while the
 * picture is still one loose spiral.
 */
export function visibleArms(R: number): number | null {
  if (R < 80) return null;
  if (R < 1000) return 6;
  if (R < 60_000) return 44;
  return 710;
}

/**
 * Radius over which arm `m` turns once round the centre: each step of m
 * moves out m and turns by `turnGap(m)`. Arms read as arms while the view
 * holds about one to two turns of them.
 */
export function armTurnRadius(m: number): number {
  return (2 * Math.PI * m) / Math.abs(turnGap(m));
}

// ── Story ─────────────────────────────────────────────────────────────────

export const PRIME_BEATS = [0, 7, 13, 21, 27, 36, 46, 52, 57] as const;
export const PRIME_STORY_LENGTH = 62;

/** View radius in numbers at each pattern of the story (pinned by tests). */
export const STORY_VIEWS = {
  first: [5, 34],
  six: [18, 150],
  fortyFour: [32.5, 5000],
  rays: [43, 600_000],
} as const;

const logR = track([
  [0, Math.log10(34)],
  [7, Math.log10(34)],
  [13, Math.log10(70)],
  [16.5, Math.log10(150)],
  [27, Math.log10(200)],
  [31.5, Math.log10(5000)],
  [36, Math.log10(7000)],
  [41.5, Math.log10(600_000)],
  [62, Math.log10(900_000)],
]);
/** Integers that are not prime: shown, dimmed, hidden. */
const intsAt = track([
  [0, 1],
  [8, 1],
  [10, 0.18],
  [13, 0.18],
  [14.5, 1],
  [19, 1],
  [20.5, 0.12],
  [27, 0.12],
  [28.5, 1],
  [30, 1],
  [32, 0],
]);
/** Strength of the colour-by-arm tint (its modulus from `modAt`). */
const tintAt = track([
  [15, 0],
  [16, 1],
  [26.5, 1],
  [27.5, 0],
  [29.5, 0],
  [30.5, 1],
  [35.5, 1],
  [36.5, 0],
  [41, 0],
  [42.5, 1],
]);
const modAt = (t: number) => (t < 28.5 ? 6 : t < 38 ? 44 : 710);
/** Numbers revealed one by one at the start. */
const revealAt = track([
  [0.4, 0],
  [5, 34, linear],
  [6.5, N_MAX],
]);

export type PrimeScene = {
  /** Numbers up to R fit the view (radius). */
  R: number;
  /** 0–1, visibility of the non-primes. */
  ints: number;
  /** Colour by residue mod `mod`, 0–1. */
  tint: number;
  mod: number;
  /** Numbers drawn: 1 … reveal. */
  reveal: number;
  /** Slow turn of the whole picture, radians (a view, not part of the rule). */
  spin: number;
};

export function primeStory(t: number): PrimeScene {
  return {
    R: 10 ** logR(t),
    ints: intsAt(t),
    tint: tintAt(t),
    mod: modAt(t),
    reveal: revealAt(t),
    spin: t * 0.012,
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number];

const INT: RGB = [120, 150, 230];
const PRIME: RGB = [255, 200, 110];
/** Six well-separated colours: residues mod 6 hit each one exactly. */
const ARM_RAMP: readonly RGB[] = [
  [80, 220, 255],
  [170, 140, 255],
  [255, 100, 170],
  [255, 180, 60],
  [120, 240, 150],
  [90, 140, 255],
];

/** Colour of residue `r` of `m` around a cyclic ramp. */
export function armColor(r: number, m: number): RGB {
  const n = ARM_RAMP.length;
  const f = ((r % m) / m) * n;
  const i = Math.floor(f) % n;
  const k = f - Math.floor(f);
  const a = ARM_RAMP[i];
  const b = ARM_RAMP[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

/** Above this many numbers on screen, draw into a pixel buffer. */
const VECTOR_LIMIT = 9000;

let trigCache: { cos: Float32Array; sin: Float32Array } | null = null;
function trig() {
  if (trigCache) return trigCache;
  const cos = new Float32Array(N_MAX + 1);
  const sin = new Float32Array(N_MAX + 1);
  for (let n = 0; n <= N_MAX; n++) {
    cos[n] = Math.cos(n);
    sin[n] = Math.sin(n);
  }
  trigCache = { cos, sin };
  return trigCache;
}

export const MIN_LOG = Math.log10(20);
export const MAX_LOG = Math.log10(N_MAX * 0.95);
export type Modulus = 0 | 6 | 44 | 710;

export type PrimeSettings = {
  /** log10 of the view radius. */
  logR: number;
  primesOnly: boolean;
  mod: Modulus;
};

export class PrimeSpiralEngine implements WonderEngine {
  readonly beats = PRIME_BEATS;
  readonly length = PRIME_STORY_LENGTH;
  /** Cold open: the 710 rays lighting up in colour by remainder. */
  readonly teaser = [41, 45] as const;
  readonly glow = 0.75;
  scene: PrimeScene = primeStory(0);
  settings: PrimeSettings = {
    logR: Math.log10(STORY_VIEWS.rays[1]),
    primesOnly: true,
    mod: 0,
  };

  private film: { t: number; from: number; to: number; length: number } | null =
    null;
  private buffer: {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    w: number;
    h: number;
    acc: Float32Array;
    image: ImageData;
  } | null = null;

  attach() {}

  leaveStory() {
    const s = this.scene;
    this.settings = {
      logR: Math.log10(s.R),
      primesOnly: s.ints < 0.5,
      mod: s.tint > 0.5 ? (s.mod as Modulus) : 0,
    };
  }

  replay() {
    this.film = null;
    this.settings = {
      logR: Math.log10(STORY_VIEWS.rays[1]),
      primesOnly: true,
      mod: 0,
    };
  }

  clone(): PrimeSpiralEngine {
    const e = new PrimeSpiralEngine();
    e.settings = { ...this.settings };
    e.scene = { ...this.scene };
    return e;
  }

  /**
   * "My version": zoom out from the first numbers to the reader's view at a
   * steady rate in log scale (to the 710 rays when the view is close in).
   */
  freeFilm(): number {
    const from = Math.log10(30);
    const to =
      this.settings.logR < Math.log10(1000)
        ? Math.log10(STORY_VIEWS.rays[1])
        : this.settings.logR;
    const length = Math.min(20, Math.max(8, 2 + 3.2 * (to - from)));
    this.film = { t: 0, from, to, length };
    this.scene = { ...this.scene, R: 10 ** from, reveal: N_MAX };
    return length + 2;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = primeStory(f.t);
    } else {
      const s = this.scene;
      const e = 1 - Math.exp(-f.dt * 5);
      let log = Math.log10(s.R);
      if (this.film) {
        const film = this.film;
        film.t += f.dt;
        const u = Math.min(1, film.t / film.length);
        log = lerp(film.from, film.to, u * u * (3 - 2 * u));
      } else {
        log = lerp(log, this.settings.logR, e);
      }
      const mod = this.settings.mod;
      this.scene = {
        R: 10 ** log,
        ints: lerp(s.ints, this.settings.primesOnly ? 0 : 1, e),
        // Fade out before switching modulus, then back in.
        tint:
          mod === 0 || mod !== s.mod
            ? lerp(s.tint, 0, e * 1.5)
            : lerp(s.tint, 1, e),
        mod: mod !== 0 && (s.tint < 0.05 || s.mod === 0) ? mod : s.mod,
        reveal: N_MAX,
        spin: s.spin + (f.playing ? f.dt * 0.012 : 0),
      };
    }
    this.draw(ctx, f);
  }

  private draw(ctx: CanvasRenderingContext2D, f: WonderFrame) {
    const s = this.scene;
    const area = safeArea(f.width, f.height, f.insets);
    const k = ((Math.min(area.w, area.h) / 2) * 0.94) / s.R;
    // Numbers reaching the corners of the stage.
    const reach = Math.hypot(f.width, f.height) / k;
    const last = Math.min(N_MAX, Math.floor(Math.min(reach, s.reveal)));

    // Soft light at the centre.
    const R = s.R * k;
    const halo = ctx.createRadialGradient(
      area.cx,
      area.cy,
      0,
      area.cx,
      area.cy,
      R
    );
    halo.addColorStop(0, 'rgba(120,140,255,0.08)');
    halo.addColorStop(1, 'rgba(120,140,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, f.width, f.height);

    // Count what will actually be drawn: primes alone are far fewer.
    const drawn = s.ints > 0.01 ? last : primeCount(last);
    if (drawn > VECTOR_LIMIT) this.raster(ctx, f, area.cx, area.cy, k, last);
    else this.vector(ctx, area.cx, area.cy, k, last);
  }

  private colour(n: number, prime: boolean): RGB {
    const s = this.scene;
    const base = prime ? PRIME : INT;
    if (s.tint < 0.01 || s.mod === 0) return base;
    const arm = armColor(n % s.mod, s.mod);
    const t = s.tint * (prime ? 0.9 : 0.95);
    return [
      lerp(base[0], arm[0], t),
      lerp(base[1], arm[1], t),
      lerp(base[2], arm[2], t),
    ];
  }

  /** Close in: each number a dot, the first ones labelled. */
  private vector(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    k: number,
    last: number
  ) {
    const s = this.scene;
    const isPrime = sieve();
    // About a tenth of the typical gap between drawn dots: √(πR²/count).
    const shown = s.ints > 0.5 ? s.R : Math.max(2, primeCount(s.R));
    const dot = Math.max(
      1,
      Math.min(4.5, 0.1 * k * s.R * Math.sqrt(Math.PI / shown))
    );
    const cs = Math.cos(s.spin);
    const ss = Math.sin(s.spin);
    const labels = Math.max(0, Math.min(1, (90 - s.R) / 40));
    const whole = Math.floor(s.reveal);
    const tinted = s.tint > 0.01 && s.mod > 0;
    // One path per colour: [prime][residue] when tinted, else [prime][0].
    const groups = new Map<
      number,
      { path: Path2D; n: number; prime: boolean }
    >();
    const text: { n: number; x: number; y: number; r: number; g: number }[] =
      [];
    for (let n = 1; n <= last; n++) {
      const prime = isPrime[n] === 1;
      if (!prime && s.ints < 0.01) continue;
      // Each new number grows in.
      const g = n <= whole ? 1 : Math.max(0, s.reveal - whole);
      if (g <= 0) break;
      const x = cx + n * k * (Math.cos(n) * cs - Math.sin(n) * ss);
      const y = cy - n * k * (Math.sin(n) * cs + Math.cos(n) * ss);
      const r = dot * (prime ? 1 : 0.8) * (0.4 + 0.6 * g);
      const key = (prime ? 1e6 : 0) + (tinted ? n % s.mod : 0);
      let group = groups.get(key);
      if (!group) {
        group = { path: new Path2D(), n, prime };
        groups.set(key, group);
      }
      group.path.moveTo(x + r, y);
      group.path.arc(x, y, r, 0, Math.PI * 2);
      if (labels > 0.01 && n <= 40) text.push({ n, x, y, r, g });
    }
    // Arm guides while colouring by remainder: n, n + m, n + 2m, … joined.
    if (tinted && s.mod <= 44) this.arms(ctx, cx, cy, k, Math.min(last, whole));
    for (const group of groups.values()) {
      ctx.fillStyle = rgba(
        this.colour(group.n, group.prime),
        group.prime ? 1 : 0.75 * s.ints
      );
      ctx.fill(group.path);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const { n, x, y, r, g } of text) {
      const prime = isPrime[n] === 1;
      ctx.fillStyle = rgba(
        prime ? PRIME : [200, 210, 240],
        labels * g * (prime ? 1 : 0.4 + 0.6 * s.ints)
      );
      ctx.font = `${prime ? 600 : 400} ${Math.round(Math.max(11, dot * 2.6))}px ui-monospace, monospace`;
      ctx.fillText(String(n), x, y - r - Math.max(8, dot * 1.8));
    }
  }

  private arms(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    k: number,
    last: number
  ) {
    const s = this.scene;
    const cs = Math.cos(s.spin);
    const ss = Math.sin(s.spin);
    ctx.lineWidth = 1.2;
    for (let r = 0; r < s.mod; r++) {
      const c = armColor(r, s.mod);
      // Arms sharing a factor with m hold no primes: they go with the integers.
      const empty = gcd(r, s.mod) > 1;
      ctx.strokeStyle = rgba(c, 0.32 * s.tint * (empty ? s.ints : 1));
      ctx.beginPath();
      for (let n = r === 0 ? s.mod : r; n <= last; n += s.mod) {
        const x = cx + n * k * (Math.cos(n) * cs - Math.sin(n) * ss);
        const y = cy - n * k * (Math.sin(n) * cs + Math.cos(n) * ss);
        if (n === r || n === s.mod) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /**
   * Far out: up to a million numbers splatted into a light buffer (each
   * dot shared bilinearly between four pixels), then tone-mapped.
   */
  private raster(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    cx: number,
    cy: number,
    k: number,
    last: number
  ) {
    if (typeof document === 'undefined') return;
    const scale = Math.min(1.5, Math.max(1, ctx.getTransform().a || 1));
    const w = Math.ceil(f.width * scale);
    const h = Math.ceil(f.height * scale);
    let b = this.buffer;
    if (!b || b.w !== w || b.h !== h) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c2 = canvas.getContext('2d');
      if (!c2) return;
      b = {
        canvas,
        ctx: c2,
        w,
        h,
        acc: new Float32Array(w * h * 3),
        image: c2.createImageData(w, h),
      };
      this.buffer = b;
    }
    const { acc, image } = b;
    acc.fill(0);
    const s = this.scene;
    const isPrime = sieve();
    const { cos, sin } = trig();
    const cs = Math.cos(s.spin);
    const ss = Math.sin(s.spin);
    const ks = k * scale;
    const ox = cx * scale;
    const oy = cy * scale;
    // Sparse views get brighter dots: 1/(πR·ks²) numbers per pixel.
    const density = 1 / (Math.PI * s.R * ks * ks);
    const boost = Math.max(1, Math.min(4, 0.45 / Math.sqrt(density)));
    const intW = 0.6 * s.ints * boost;
    const primeW = 1.2 * boost;
    const tinted = s.tint > 0.01 && s.mod > 0;
    // Colour per residue, computed once per frame.
    const table = tinted
      ? Array.from({ length: s.mod }, (_, r) => [
          this.colour(r === 0 ? s.mod : r, false),
          this.colour(r === 0 ? s.mod : r, true),
        ])
      : null;
    for (let n = 1; n <= last; n++) {
      const prime = isPrime[n] === 1;
      const wgt = prime ? primeW : intW;
      if (wgt < 0.004) continue;
      const c = cos[n];
      const sn = sin[n];
      const x = ox + n * ks * (c * cs - sn * ss);
      const y = oy - n * ks * (sn * cs + c * ss);
      if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) continue;
      const col = table ? table[n % s.mod][prime ? 1 : 0] : prime ? PRIME : INT;
      const xi = x | 0;
      const yi = y | 0;
      const fx = x - xi;
      const fy = y - yi;
      const i00 = (yi * w + xi) * 3;
      const i10 = i00 + 3;
      const i01 = i00 + w * 3;
      const i11 = i01 + 3;
      const w00 = (1 - fx) * (1 - fy) * wgt;
      const w10 = fx * (1 - fy) * wgt;
      const w01 = (1 - fx) * fy * wgt;
      const w11 = fx * fy * wgt;
      for (let ch = 0; ch < 3; ch++) {
        const v = col[ch] / 255;
        acc[i00 + ch] += v * w00;
        acc[i10 + ch] += v * w10;
        acc[i01 + ch] += v * w01;
        acc[i11 + ch] += v * w11;
      }
    }
    const data = image.data;
    for (let p = 0, q = 0; p < w * h; p++, q += 3) {
      const r = 1 - Math.exp(-acc[q] * 1.8);
      const g = 1 - Math.exp(-acc[q + 1] * 1.8);
      const bl = 1 - Math.exp(-acc[q + 2] * 1.8);
      const m = Math.max(r, g, bl);
      const o = p * 4;
      if (m < 0.002) {
        data[o + 3] = 0;
        continue;
      }
      data[o] = (r / m) * 255;
      data[o + 1] = (g / m) * 255;
      data[o + 2] = (bl / m) * 255;
      data[o + 3] = m * 255;
    }
    b.ctx.putImageData(image, 0, 0);
    ctx.drawImage(b.canvas, 0, 0, f.width, f.height);
  }
}
