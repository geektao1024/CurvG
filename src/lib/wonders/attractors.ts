/**
 * Clifford attractors: x′ = sin(a·y) + c·cos(a·x), y′ = sin(b·x) + d·cos(b·y).
 * Iterate millions of times and the density of the landing points is the
 * picture. The largest Lyapunov exponent tells chaos (> 0, a strange
 * attractor) from a cycle (< 0, a few points) or a closed curve (≈ 0).
 * Math, story and a Canvas 2D engine (density buffer + 2D overlay).
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { clamp01, easeSine, lerp, track } from './timeline';

export type Params = readonly [number, number, number, number];

export function step(p: Params, x: number, y: number): [number, number] {
  const [a, b, c, d] = p;
  return [
    Math.sin(a * y) + c * Math.cos(a * x),
    Math.sin(b * x) + d * Math.cos(b * y),
  ];
}

/** Every orbit stays in |x| ≤ 1 + |c|, |y| ≤ 1 + |d|. */
export function bounds(p: Params): { x: number; y: number } {
  return { x: 1 + Math.abs(p[2]), y: 1 + Math.abs(p[3]) };
}

/** Largest Lyapunov exponent, by carrying a tangent vector along. */
export function lyapunov(p: Params, n = 20_000, burn = 500): number {
  const [a, b, c, d] = p;
  let x = 0.1;
  let y = 0.1;
  let vx = 1;
  let vy = 0;
  let sum = 0;
  for (let i = 0; i < n + burn; i++) {
    const j11 = -a * c * Math.sin(a * x);
    const j12 = a * Math.cos(a * y);
    const j21 = b * Math.cos(b * x);
    const j22 = -b * d * Math.sin(b * y);
    const wx = j11 * vx + j12 * vy;
    const wy = j21 * vx + j22 * vy;
    const len = Math.hypot(wx, wy) || 1e-300;
    if (i >= burn) sum += Math.log(len);
    vx = wx / len;
    vy = wy / len;
    [x, y] = step(p, x, y);
  }
  return sum / n;
}

export type Kind = 'chaos' | 'curve' | 'cycle';

export function kindOf(lambda: number): Kind {
  return lambda > 0.02 ? 'chaos' : lambda < -0.02 ? 'cycle' : 'curve';
}

/** Distinct points (to 1e-6) of the settled orbit: 3 for a 3-cycle. */
export function cyclePoints(p: Params, burn = 5000, look = 64): number {
  let x = 0.1;
  let y = 0.1;
  for (let i = 0; i < burn; i++) [x, y] = step(p, x, y);
  const seen = new Set<string>();
  for (let i = 0; i < look; i++) {
    [x, y] = step(p, x, y);
    seen.add(`${x.toFixed(6)},${y.toFixed(6)}`);
  }
  return seen.size;
}

/** Cells of a 64 × 64 grid over the bounds hit by 20 000 points. */
export function spread(p: Params, n = 20_000): number {
  const b = bounds(p);
  const seen = new Set<number>();
  let x = 0.1;
  let y = 0.1;
  for (let i = 0; i < n; i++) {
    [x, y] = step(p, x, y);
    if (i < 100) continue;
    const cx = Math.min(63, Math.floor(((x + b.x) / (2 * b.x)) * 64));
    const cy = Math.min(63, Math.floor(((y + b.y) / (2 * b.y)) * 64));
    seen.add(cy * 64 + cx);
  }
  return seen.size;
}

/**
 * A random chaotic picture: four numbers in [−2.5, 2.5], kept only when
 * λ > 0.1 and the points cover at least 400 of 4096 cells.
 */
export function randomChaotic(random: () => number = Math.random): Params {
  for (let tries = 0; tries < 200; tries++) {
    const p = [0, 0, 0, 0].map(
      () => Math.round((random() * 5 - 2.5) * 100) / 100
    ) as unknown as Params;
    if (lyapunov(p, 8000) > 0.1 && spread(p) >= 400) return p;
  }
  return START;
}

/** The gallery: chaotic parameter sets (λ > 0), pinned by tests. */
export const GALLERY: readonly { id: string; p: Params }[] = [
  { id: 'wings', p: [-1.4, 1.6, 1.0, 0.7] },
  { id: 'veil', p: [1.1, -1.32, -1.03, 1.77] },
  { id: 'storm', p: [1.5, -1.8, 1.6, 0.9] },
  { id: 'shell', p: [-1.3, -1.3, -1.8, -1.9] },
  { id: 'ribbon', p: [-1.8, -2.0, -0.5, -0.9] },
  { id: 'comet', p: [1.7, 1.7, 0.06, 1.2] },
];
export const START: Params = GALLERY[0].p;
/** Beat 5: a slid from −1.4 to −0.95 and the chaos collapses to a 3-cycle. */
export const CYCLE_A = -0.95;

// ── Story ─────────────────────────────────────────────────────────────────

export const ATTRACTOR_BEATS = [0, 8, 14, 22, 29, 40, 48, 55] as const;
export const ATTRACTOR_STORY_LENGTH = 60;
export const STORY_POINTS = 3_000_000;
/** Points per frame while the parameters move. */
export const MORPH_POINTS = 350_000;

/** Points iterated by story time t (log ramp), then held. */
const logPoints = track([
  [0.5, 0],
  [7.8, Math.log10(40)],
  [13.8, Math.log10(5000)],
  [21.5, Math.log10(STORY_POINTS)],
]);

/**
 * Beat 4: the picture morphs as d moves through 0.58 … 1.25, an interval
 * with no periodic window (λ > 0 all along, pinned by tests). Beat 5: a
 * slides from −1.4 to −0.95 into a 3-cycle and back.
 */
const MORPH: readonly [number, Params][] = [
  [29.4, START],
  [33.2, [-1.4, 1.6, 1.0, 1.25]],
  [37, [-1.4, 1.6, 1.0, 0.58]],
  [39.6, START],
  [43.4, [CYCLE_A, 1.6, 1.0, 0.7]],
  [46.4, [CYCLE_A, 1.6, 1.0, 0.7]],
  [47.6, START],
];
/** Beat 6: the gallery, one picture at a time, with a dip to black between. */
export const GALLERY_CUTS: readonly [number, number][] = [
  [48, 1],
  [49.7, 2],
  [51.4, 3],
  [53.1, 4],
  [54.8, 5],
];
const GALLERY_DIP = 0.25;

export function storyParams(t: number): {
  p: Params;
  moving: boolean;
  /** Story time this picture was cut to (gallery), else null. */
  cut: number | null;
} {
  if (t >= GALLERY_CUTS[0][0]) {
    let cut = GALLERY_CUTS[0];
    for (const c of GALLERY_CUTS) if (t >= c[0]) cut = c;
    return { p: GALLERY[cut[1]].p, moving: false, cut: cut[0] };
  }
  if (t <= MORPH[0][0]) return { p: START, moving: false, cut: null };
  for (let i = 1; i < MORPH.length; i++) {
    const [t1, p1] = MORPH[i];
    if (t < t1) {
      const [t0, p0] = MORPH[i - 1];
      if (p0.every((v, k) => v === p1[k])) {
        return { p: p0, moving: false, cut: null };
      }
      const u = easeSine(clamp01((t - t0) / (t1 - t0)));
      return {
        p: [0, 1, 2, 3].map((k) => lerp(p0[k], p1[k], u)) as unknown as Params,
        moving: true,
        cut: null,
      };
    }
  }
  return { p: START, moving: false, cut: null };
}

/** 0 at each gallery cut, 1 between (a quick dip to black). */
export function galleryFade(t: number): number {
  let f = 1;
  for (const [c] of GALLERY_CUTS) {
    f = Math.min(f, clamp01(Math.abs(t - c) / GALLERY_DIP));
  }
  return t >= GALLERY_CUTS[0][0] - GALLERY_DIP ? f : 1;
}

/** Beat 0: the hops joined by lines; later the last points as glowing dots. */
const hopsAt = track([
  [0, 1],
  [9, 1],
  [11, 0],
]);
const dotsAt = track([
  [40.6, 0],
  [42, 1],
  [46.8, 1],
  [47.6, 0],
]);

export type AttractorScene = {
  p: Params;
  /** Points accumulated for the picture. */
  points: number;
  hops: number;
  dots: number;
  /** Picture opacity (gallery cuts). */
  fade: number;
};

export function attractorStory(t: number): AttractorScene {
  const { p, moving, cut } = storyParams(t);
  const ramp = t < 0.5 ? 0 : Math.floor(10 ** logPoints(t));
  // After a cut the new picture sharpens from 350 000 points upward.
  const points =
    cut !== null
      ? Math.min(
          STORY_POINTS,
          Math.floor(MORPH_POINTS * 10 ** ((t - cut) * 0.8))
        )
      : moving
        ? MORPH_POINTS
        : Math.min(STORY_POINTS, ramp);
  return { p, points, hops: hopsAt(t), dots: dotsAt(t), fade: galleryFade(t) };
}

// ── Engine ────────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number];
const RAMP: readonly RGB[] = [
  [40, 24, 110],
  [150, 70, 200],
  [255, 100, 170],
  [255, 184, 77],
  [255, 248, 230],
];

function ramp(u: number): RGB {
  const f = clamp01(u) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(f));
  const k = f - i;
  const a = RAMP[i];
  const b = RAMP[i + 1];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

/** The ramp sampled 256 times, for the per-pixel tone map. */
const LUT = (() => {
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const c = ramp(i / 255);
    out.set([c[0], c[1], c[2]], i * 3);
  }
  return out;
})();

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

export const FREE_POINTS = 6_000_000;
/** Points added per frame in free play while the picture refines. */
const FREE_BUDGET = 600_000;
export const ATTRACTOR_FREE_FILM = 16;
/** Seconds for the film's points to ramp to the full picture. */
const FILM_RAMP = 11;

type Buffer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  image: ImageData;
};

/** One accumulation: parameters, frame, points so far and where it is. */
type Acc = {
  key: string;
  grid: Uint32Array;
  w: number;
  h: number;
  n: number;
  x: number;
  y: number;
  max: number;
};

export class AttractorEngine implements WonderEngine {
  readonly beats = ATTRACTOR_BEATS;
  readonly length = ATTRACTOR_STORY_LENGTH;
  /** Cold open: the tour through the gallery. */
  readonly teaser = [30, 34] as const;
  readonly glow = 0.45;

  scene: AttractorScene = attractorStory(0);
  params: Params = START;

  private buffer: Buffer | null = null;
  /** Accumulation last tone-mapped into the buffer. */
  private toned = '';
  private acc: Acc | null = null;
  private film: { t: number; base: Params } | null = null;

  attach() {}

  leaveStory() {
    this.params = this.scene.p;
  }

  replay() {
    this.params = START;
    this.film = null;
  }

  clone(): AttractorEngine {
    const e = new AttractorEngine();
    e.params = [...this.params] as unknown as Params;
    e.scene = { ...this.scene };
    return e;
  }

  /** "My version": the reader's picture appearing point by point. */
  freeFilm(): number {
    this.film = { t: 0, base: this.params };
    return ATTRACTOR_FREE_FILM;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    let p: Params;
    let points: number;
    let budget = Infinity;
    if (f.mode === 'story') {
      this.scene = attractorStory(f.t);
      p = this.scene.p;
      points = this.scene.points;
    } else if (this.film) {
      // "My version": the reader's picture appears hop by hop, then
      // sharpens to six million points.
      this.film.t += f.dt;
      const t = this.film.t;
      p = this.film.base;
      points =
        t < 0.4
          ? 0
          : Math.min(
              FREE_POINTS,
              Math.floor(
                10 ** ((t - 0.4) * (Math.log10(FREE_POINTS) / FILM_RAMP))
              )
            );
      const hops = t < 3 ? 1 : clamp01(1 - (t - 3) / 1.5);
      this.scene = { p, points, hops, dots: 0, fade: 1 };
    } else {
      p = this.params;
      points = FREE_POINTS;
      budget = FREE_BUDGET;
      this.scene = {
        p,
        points,
        hops: 0,
        dots: kindOf(this.lambda()) === 'cycle' ? 1 : 0,
        fade: 1,
      };
    }
    const area = safeArea(f.width, f.height, f.insets);
    const b = bounds(p);
    const k = Math.min(area.w / (2 * b.x), area.h / (2 * b.y)) * 0.94;
    const X = (x: number) => area.cx + x * k;
    const Y = (y: number) => area.cy - y * k;

    if (points >= 200 && this.scene.hops < 0.99 && this.scene.fade > 0.01) {
      ctx.globalAlpha = this.scene.fade;
      this.paintDensity(ctx, f, p, points, budget, area, k);
      ctx.globalAlpha = 1;
    }
    // The first hops, joined, and the newest points as dots.
    const hopCount = Math.min(points, 5000);
    if (this.scene.hops > 0.01 || points < 200) {
      let x = 0.1;
      let y = 0.1;
      const pts: [number, number][] = [];
      for (let i = 0; i < hopCount; i++) {
        [x, y] = step(p, x, y);
        pts.push([x, y]);
      }
      const lines = Math.min(pts.length, 60);
      ctx.strokeStyle = rgba([178, 160, 255], 0.35 * this.scene.hops);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < lines; i++) {
        if (i === 0) ctx.moveTo(X(pts[i][0]), Y(pts[i][1]));
        else ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
      }
      ctx.stroke();
      ctx.fillStyle = rgba([255, 214, 150], 0.9);
      const r = pts.length > 500 ? 1 : 2.6;
      for (const [px, py] of pts) {
        ctx.beginPath();
        ctx.arc(X(px), Y(py), r, 0, Math.PI * 2);
        ctx.fill();
      }
      const last = pts[pts.length - 1];
      if (last && pts.length < 60) {
        const g = ctx.createRadialGradient(
          X(last[0]),
          Y(last[1]),
          0,
          X(last[0]),
          Y(last[1]),
          16
        );
        g.addColorStop(0, 'rgba(255,236,190,0.9)');
        g.addColorStop(1, 'rgba(255,184,77,0)');
        ctx.fillStyle = g;
        ctx.fillRect(X(last[0]) - 16, Y(last[1]) - 16, 32, 32);
      }
    }
    // A cycle is only a few pixels: mark its points.
    if (this.scene.dots > 0.01) {
      let x = 0.1;
      let y = 0.1;
      for (let i = 0; i < 3000; i++) [x, y] = step(p, x, y);
      for (let i = 0; i < 24; i++) {
        [x, y] = step(p, x, y);
        const g = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), 14);
        g.addColorStop(0, rgba([255, 240, 210], 0.9 * this.scene.dots));
        g.addColorStop(1, rgba([255, 100, 170], 0));
        ctx.fillStyle = g;
        ctx.fillRect(X(x) - 14, Y(y) - 14, 28, 28);
      }
    }
  }

  private lambdaKey = '';
  private lambdaValue = 0;
  /** Lyapunov exponent of the current parameters (cached). */
  lambda(p: Params = this.params): number {
    const key = p.join(',');
    if (key !== this.lambdaKey) {
      this.lambdaKey = key;
      this.lambdaValue = lyapunov(p);
    }
    return this.lambdaValue;
  }

  private paintDensity(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    p: Params,
    points: number,
    budget: number,
    area: { cx: number; cy: number },
    k: number
  ) {
    if (typeof document === 'undefined') return;
    const scale = Math.min(1.5, Math.max(1, ctx.getTransform().a || 1));
    const w = Math.ceil(f.width * scale);
    const h = Math.ceil(f.height * scale);
    let buf = this.buffer;
    if (!buf || buf.w !== w || buf.h !== h) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const c2 = canvas.getContext('2d');
      if (!c2) return;
      buf = { canvas, ctx: c2, w, h, image: c2.createImageData(w, h) };
      this.buffer = buf;
    }
    const key = `${p.join(',')}|${w}x${h}|${area.cx.toFixed(1)},${area.cy.toFixed(1)},${k.toFixed(3)}`;
    let acc = this.acc;
    if (!acc || acc.key !== key || acc.n > points) {
      acc = {
        key,
        grid:
          acc && acc.w === w && acc.h === h
            ? acc.grid.fill(0)
            : new Uint32Array(w * h),
        w,
        h,
        n: 0,
        x: 0.1,
        y: 0.1,
        max: 1,
      };
      this.acc = acc;
    }
    const target = Math.min(points, acc.n + budget);
    if (acc.n < target) {
      const [a, b, c, d] = p;
      let { x, y, max } = acc;
      const grid = acc.grid;
      const ks = k * scale;
      const ox = area.cx * scale;
      const oy = area.cy * scale;
      for (let i = acc.n; i < target; i++) {
        const nx = Math.sin(a * y) + c * Math.cos(a * x);
        y = Math.sin(b * x) + d * Math.cos(b * y);
        x = nx;
        if (i < 100) continue;
        const px = (ox + x * ks) | 0;
        const py = (oy - y * ks) | 0;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const v = ++grid[py * w + px];
        if (v > max) max = v;
      }
      acc.x = x;
      acc.y = y;
      acc.max = max;
      acc.n = target;
    }
    // Tone map (only when the density changed): log density onto the
    // ramp, transparent where empty.
    const stamp = `${acc.key}#${acc.n}`;
    if (stamp === this.toned) {
      ctx.drawImage(buf.canvas, 0, 0, f.width, f.height);
      return;
    }
    this.toned = stamp;
    const data = buf.image.data;
    const grid = acc.grid;
    // Scale by the density of a well-filled pixel, not the single brightest.
    const top = Math.log1p(Math.max(4, acc.max * 0.6));
    for (let i = 0, o = 0; i < grid.length; i++, o += 4) {
      const v = grid[i];
      if (v === 0) {
        data[o + 3] = 0;
        continue;
      }
      const u = Math.min(1, Math.log1p(v) / top);
      const l = ((u * 255) | 0) * 3;
      data[o] = LUT[l];
      data[o + 1] = LUT[l + 1];
      data[o + 2] = LUT[l + 2];
      data[o + 3] = 255 * Math.min(1, 0.25 + u);
    }
    buf.ctx.putImageData(buf.image, 0, 0);
    ctx.drawImage(buf.canvas, 0, 0, f.width, f.height);
  }
}
