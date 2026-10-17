/**
 * Buffon's needle: needles of length l dropped on a floor ruled with
 * parallel lines d apart cross a line with probability 2l/(πd), so counting
 * crossings estimates π. Buffon's noodle explains the 2/π: for any rigid
 * curve the expected number of crossings is 2L/(πd), and a circle of
 * diameter d always crosses exactly twice. Math, story and a 2D engine.
 *
 * Story needles are pure functions of their index (hashed position and
 * angle), so the running estimate at any moment is fixed.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { hash01 } from './galton';
import { clamp01, lerp, track } from './timeline';

/** Line spacing; lengths are in these units. */
export const D = 1;

/** P(a needle of length l ≤ d crosses a line) = 2l / (πd). */
export function crossChance(l: number): number {
  return (2 * l) / (Math.PI * D);
}

/** π estimated from N needles of length l with C crossings: 2lN / (dC). */
export function estimate(l: number, n: number, c: number): number {
  return c > 0 ? (2 * l * n) / (D * c) : NaN;
}

/** Standard deviation of the estimate after n needles (delta method). */
export function estimateSd(l: number, n: number): number {
  const p = crossChance(l);
  return Math.PI * Math.sqrt((1 - p) / (n * p));
}

/** log of the binomial probability P(C = c) for n trials of chance p. */
export function logBinomialPmf(n: number, c: number, p: number): number {
  let s = 0;
  for (let i = 1; i <= c; i++) s += Math.log((n - c + i) / i);
  return s + c * Math.log(p) + (n - c) * Math.log(1 - p);
}

export type Needle = { x: number; y: number; angle: number };

/**
 * Needle `i` of a seed: centre spread over a floor `width` × `height`
 * (in line spacings), any angle.
 */
export function needleAt(
  seed: number,
  i: number,
  width: number,
  height: number
): Needle {
  return {
    x: (hash01(seed, i, 0) - 0.5) * width,
    y: (hash01(seed, i, 1) - 0.5) * height,
    angle: hash01(seed, i, 2) * Math.PI,
  };
}

/** Lines are y = k·D: a needle crosses when its ends straddle one. */
export function crosses(n: Needle, l: number): boolean {
  const dy = (l / 2) * Math.sin(n.angle);
  return Math.floor((n.y - dy) / D) !== Math.floor((n.y + dy) / D);
}

/** Running crossing counts for needles 0 … n − 1 of a seed. */
export function crossCounts(seed: number, l: number, n: number): Uint32Array {
  const out = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) {
    out[i + 1] =
      out[i] + (crosses(needleAt(seed, i, FLOOR_W, FLOOR_H), l) ? 1 : 0);
  }
  return out;
}

/** Visible floor, in line spacings. */
export const FLOOR_W = 11;
export const FLOOR_H = 6;

/** A noodle: a bent needle of length l as a polyline (unit-speed). */
export function noodle(
  seed: number,
  i: number,
  l: number,
  steps = 40
): { x: number; y: number }[] {
  const n = needleAt(seed, i, FLOOR_W - 1, FLOOR_H - 1);
  const bend = 0.6 + 1.2 * hash01(seed, i, 3);
  const wiggle = 0.5 + 0.9 * hash01(seed, i, 4);
  const ds = l / steps;
  let x = n.x;
  let y = n.y;
  const pts = [{ x, y }];
  for (let s = 0; s < steps; s++) {
    const u = (s + 0.5) / steps;
    const h = n.angle * 2 + bend * Math.sin(2 * Math.PI * wiggle * u);
    x += ds * Math.cos(h);
    y += ds * Math.sin(h);
    pts.push({ x, y });
  }
  return pts;
}

/** Points where a polyline meets the lines y = k·D. */
export function lineHits(
  pts: readonly { x: number; y: number }[]
): { x: number; y: number }[] {
  const hits: { x: number; y: number }[] = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const ka = Math.floor(a.y / D);
    const kb = Math.floor(b.y / D);
    if (ka === kb) continue;
    for (let k = Math.min(ka, kb) + 1; k <= Math.max(ka, kb); k++) {
      const u = (k * D - a.y) / (b.y - a.y);
      hits.push({ x: lerp(a.x, b.x, u), y: k * D });
    }
  }
  return hits;
}

// ── Story ─────────────────────────────────────────────────────────────────

export const BUFFON_BEATS = [0, 8, 16, 25, 33, 40, 48, 55] as const;
export const BUFFON_STORY_LENGTH = 60;
export const STORY_SEED = 3;
export const STORY_NEEDLES = 20_000;
/** Lazzarini (1901): 3408 needles of 5/6 the spacing, 1808 crossings. */
export const LAZZARINI = { n: 3408, c: 1808, l: 5 / 6 };

/** Needles thrown by story time t (log-like ramp). */
const logThrown = track([
  [0.6, 0],
  [7.5, Math.log10(25)],
  [15.5, Math.log10(600)],
  [24.5, Math.log10(10_000)],
  [32, Math.log10(STORY_NEEDLES)],
]);
export function storyThrown(t: number): number {
  return t < 0.6 ? 0 : Math.min(STORY_NEEDLES, Math.floor(10 ** logThrown(t)));
}

const graphAt = track([
  [16.2, 0],
  [17.4, 1],
  [32.6, 1],
  [33.4, 0],
  [48.2, 0],
  [49, 1],
]);
const funnelAt = track([
  [25.4, 0],
  [26.6, 1],
  [32.6, 1],
  [33.4, 0],
  [48.6, 0],
  [49.4, 1],
]);
const needlesAt = track([
  [0, 1],
  [33, 1],
  [33.8, 0.12],
  [47.4, 0.12],
  [48.2, 0.5],
]);
const noodlesAt = track([
  [33.4, 0],
  [34.4, 1],
  [39.4, 1],
  [40.2, 0],
]);
const ringsAt = track([
  [40, 0],
  [41, 1],
  [47.4, 1],
  [48.2, 0],
]);
const lazzariniAt = track([
  [49.2, 0],
  [50, 1],
]);

export type BuffonScene = {
  thrown: number;
  needles: number;
  graph: number;
  funnel: number;
  noodles: number;
  rings: number;
  lazzarini: number;
};

export function buffonStory(t: number): BuffonScene {
  return {
    thrown: storyThrown(t),
    needles: needlesAt(t),
    graph: graphAt(t),
    funnel: funnelAt(t),
    noodles: noodlesAt(t),
    rings: ringsAt(t),
    lazzarini: lazzariniAt(t),
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

const AMBER = [255, 196, 110] as const;
const CYAN = [110, 231, 255] as const;
const VIOLET = [178, 160, 255] as const;
const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

/** Most needles drawn at once (older ones are counted, not drawn). */
const SHOWN = 1500;
export const BUFFON_FREE_FILM = 18;
const FILM_NEEDLES = 30_000;
/** Free play stops counting here (the estimate barely moves by then). */
export const MAX_THROWN = 200_000;

export type BuffonSettings = {
  /** Needle length as a share of the spacing, 0.2–1. */
  length: number;
  /** Needles per second. */
  rate: number;
  graph: boolean;
};

export class BuffonEngine implements WonderEngine {
  readonly beats = BUFFON_BEATS;
  readonly length = BUFFON_STORY_LENGTH;
  /** Cold open: thousands of needles raining down, the estimate closing in. */
  readonly teaser = [20, 24] as const;
  readonly glow = 0.55;

  scene: BuffonScene = buffonStory(0);
  settings: BuffonSettings = { length: 1, rate: 200, graph: true };
  /** What is on the floor now, for the readouts. */
  shown = { thrown: 0, crossed: 0, length: 1 };

  /** Free play: seed, needles thrown, crossings, history of the estimate. */
  private free = { seed: 1000, thrown: 0, crossed: 0, debt: 0, queue: 0 };
  private history: { n: number; est: number }[] = [];
  private cache: { seed: number; l: number; counts: Uint32Array } | null = null;
  private film: { t: number } | null = null;

  attach() {}

  /** Running crossing counts for (seed, l), grown as more are thrown. */
  private counts(seed: number, l: number, n: number): Uint32Array {
    const c = this.cache;
    if (!c || c.seed !== seed || c.l !== l || c.counts.length < n + 1) {
      const size = Math.max(
        n + 1,
        seed === STORY_SEED ? STORY_NEEDLES : 4000,
        (c?.counts.length ?? 0) * 2
      );
      this.cache = {
        seed,
        l,
        counts: crossCounts(seed, l, Math.min(MAX_THROWN, size)),
      };
    }
    return this.cache!.counts;
  }

  leaveStory() {
    this.settings = { ...this.settings, length: 1 };
    this.reset();
    // Keep the story's floor: hand over its count.
    this.free.seed = STORY_SEED;
    this.free.thrown = this.scene.thrown;
  }

  replay() {
    this.settings = { length: 1, rate: 200, graph: true };
    this.reset();
    this.film = null;
  }

  reset() {
    this.free = {
      seed: this.free.seed + 1,
      thrown: 0,
      crossed: 0,
      debt: 0,
      queue: 0,
    };
    this.history = [];
  }

  /** Throw `n` more needles quickly. */
  throwMore(n: number) {
    this.free.queue += n;
  }

  clone(): BuffonEngine {
    const e = new BuffonEngine();
    e.settings = { ...this.settings };
    e.scene = { ...this.scene };
    return e;
  }

  /** "My version": 30,000 needles of the reader's length, graph and funnel. */
  freeFilm(): number {
    this.film = { t: 0 };
    this.free = { seed: 77, thrown: 0, crossed: 0, debt: 0, queue: 0 };
    return BUFFON_FREE_FILM;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    let seed: number;
    let l: number;
    let thrown: number;
    if (f.mode === 'story') {
      this.scene = buffonStory(f.t);
      seed = STORY_SEED;
      l = 1;
      thrown = this.scene.thrown;
    } else if (this.film) {
      this.film.t += f.dt;
      const u = clamp01((this.film.t - 0.5) / (BUFFON_FREE_FILM - 3));
      seed = this.free.seed;
      l = this.settings.length;
      thrown = Math.floor(10 ** (u * Math.log10(FILM_NEEDLES)));
      if (u <= 0) thrown = 0;
      this.scene = {
        thrown,
        needles: 1,
        graph: clamp01((this.film.t - 2) / 1),
        funnel: clamp01((this.film.t - 5) / 1),
        noodles: 0,
        rings: 0,
        lazzarini: 0,
      };
    } else {
      const fr = this.free;
      seed = fr.seed;
      l = this.settings.length;
      if (f.playing) {
        const burst = fr.queue > 0 ? Math.min(fr.queue, 4000 * f.dt) : 0;
        fr.queue -= burst;
        fr.debt += this.settings.rate * f.dt + burst;
        const add = Math.floor(fr.debt);
        fr.debt -= add;
        fr.thrown = Math.min(MAX_THROWN, fr.thrown + add);
      }
      thrown = fr.thrown;
      const g = this.settings.graph ? 1 : 0;
      this.scene = {
        thrown,
        needles: 1,
        graph: g,
        funnel: g,
        noodles: 0,
        rings: 0,
        lazzarini: 0,
      };
    }
    const counts = this.counts(seed, l, thrown);
    const crossed = counts[Math.min(thrown, counts.length - 1)];
    this.shown = { thrown, crossed, length: l };
    this.draw(ctx, f, seed, l, thrown, counts);
  }

  private draw(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    seed: number,
    l: number,
    thrown: number,
    counts: Uint32Array
  ) {
    const s = this.scene;
    const area = safeArea(f.width, f.height, f.insets);
    // Floor on top, graph below while it is shown.
    // Keep a margin above the caption, which can run to three lines.
    const margin = Math.min(70, area.h * 0.1) * s.graph;
    const graphH = area.h * 0.28 * s.graph;
    const floorH = area.h - graphH - margin - (s.graph > 0.01 ? 16 : 0);
    const unit = Math.min(area.w / FLOOR_W, floorH / FLOOR_H);
    const fx = area.cx;
    const fy = area.cy - area.h / 2 + floorH / 2;
    const X = (x: number) => fx + x * unit;
    const Y = (y: number) => fy - y * unit;
    const half = { w: (FLOOR_W / 2) * unit, h: (FLOOR_H / 2) * unit };

    // The ruled floor.
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx - half.w, fy - half.h, half.w * 2, half.h * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(200,210,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = -Math.ceil(FLOOR_H / 2); k <= Math.ceil(FLOOR_H / 2); k++) {
      ctx.moveTo(fx - half.w, Y(k));
      ctx.lineTo(fx + half.w, Y(k));
    }
    ctx.stroke();

    // Needles: the latest ones, newer brighter; crossings amber.
    if (s.needles > 0.01) {
      const from = Math.max(0, thrown - SHOWN);
      const crossPath = new Path2D();
      const missPath = new Path2D();
      for (let i = from; i < thrown; i++) {
        const n = needleAt(seed, i, FLOOR_W, FLOOR_H);
        const dx = (l / 2) * Math.cos(n.angle);
        const dy = (l / 2) * Math.sin(n.angle);
        const p = crosses(n, l) ? crossPath : missPath;
        p.moveTo(X(n.x - dx), Y(n.y - dy));
        p.lineTo(X(n.x + dx), Y(n.y + dy));
      }
      const fade = s.needles * (thrown > 300 ? 0.55 : 1);
      ctx.lineWidth = thrown > 300 ? 1 : 2;
      ctx.strokeStyle = rgba([150, 170, 230], 0.5 * fade);
      ctx.stroke(missPath);
      ctx.strokeStyle = rgba(AMBER, 0.95 * fade);
      ctx.stroke(crossPath);
      // The newest needle glows while they are few.
      if (thrown > 0 && thrown < 60) {
        const n = needleAt(seed, thrown - 1, FLOOR_W, FLOOR_H);
        const g = ctx.createRadialGradient(
          X(n.x),
          Y(n.y),
          0,
          X(n.x),
          Y(n.y),
          unit * 0.7
        );
        g.addColorStop(0, rgba(crosses(n, l) ? AMBER : CYAN, 0.35));
        g.addColorStop(1, rgba(CYAN, 0));
        ctx.fillStyle = g;
        ctx.fillRect(X(n.x) - unit, Y(n.y) - unit, unit * 2, unit * 2);
      }
    }

    // Noodles and rings: bent needles, their crossings marked.
    const bent = (shape: 'noodle' | 'ring', alpha: number) => {
      if (alpha < 0.01) return;
      for (let i = 0; i < 14; i++) {
        let pts: { x: number; y: number }[];
        if (shape === 'noodle') pts = noodle(41, i, 2.4);
        else {
          const c = needleAt(59, i, FLOOR_W - 1.4, FLOOR_H - 1.2);
          pts = Array.from({ length: 65 }, (_, k) => ({
            x: c.x + 0.5 * Math.cos((2 * Math.PI * k) / 64),
            y: c.y + 0.5 * Math.sin((2 * Math.PI * k) / 64),
          }));
        }
        ctx.strokeStyle = rgba(shape === 'ring' ? CYAN : VIOLET, 0.9 * alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        pts.forEach((p, k) =>
          k ? ctx.lineTo(X(p.x), Y(p.y)) : ctx.moveTo(X(p.x), Y(p.y))
        );
        ctx.stroke();
        ctx.fillStyle = rgba(AMBER, alpha);
        for (const h of lineHits(pts)) {
          ctx.beginPath();
          ctx.arc(X(h.x), Y(h.y), 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };
    bent('noodle', s.noodles);
    bent('ring', s.rings);
    ctx.restore();

    if (s.graph > 0.01)
      this.graph(ctx, area, fy + half.h + 16, graphH, l, thrown, counts);
  }

  /** Running estimate of π against needles thrown, log scale. */
  private graph(
    ctx: CanvasRenderingContext2D,
    area: { cx: number; w: number },
    top: number,
    h: number,
    l: number,
    thrown: number,
    counts: Uint32Array
  ) {
    const s = this.scene;
    const a = s.graph;
    const w = Math.min(area.w, 900);
    const left = area.cx - w / 2;
    const maxN = Math.max(STORY_NEEDLES, thrown, 100);
    const GX = (n: number) =>
      left + (Math.log10(Math.max(1, n)) / Math.log10(maxN)) * w;
    const span = 0.6;
    const GY = (v: number) => top + h / 2 - ((v - Math.PI) / span) * (h / 2);
    const clip = (v: number) => Math.max(top, Math.min(top + h, v));

    // π, and the ±2 sd funnel.
    ctx.strokeStyle = rgba([255, 255, 255], 0.25 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, GY(Math.PI));
    ctx.lineTo(left + w, GY(Math.PI));
    ctx.stroke();
    ctx.fillStyle = rgba([255, 255, 255], 0.55 * a);
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('π = 3.14159…', left + 4, GY(Math.PI) - 4);
    if (s.funnel > 0.01) {
      ctx.fillStyle = rgba(CYAN, 0.1 * s.funnel);
      ctx.strokeStyle = rgba(CYAN, 0.5 * s.funnel);
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const n = 10 ** ((i / 120) * Math.log10(maxN));
        const y = clip(GY(Math.PI + 2 * estimateSd(l, n)));
        if (i === 0) ctx.moveTo(GX(n), y);
        else ctx.lineTo(GX(n), y);
      }
      for (let i = 120; i >= 0; i--) {
        const n = 10 ** ((i / 120) * Math.log10(maxN));
        ctx.lineTo(GX(n), clip(GY(Math.PI - 2 * estimateSd(l, n))));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // The estimate so far, sampled on a log grid.
    ctx.strokeStyle = rgba(AMBER, 0.95 * a);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let started = false;
    const last = Math.min(thrown, counts.length - 1);
    for (let i = 0; i <= 400; i++) {
      const n = Math.floor(10 ** ((i / 400) * Math.log10(Math.max(1, last))));
      if (n < 1 || counts[n] === 0) continue;
      const y = clip(GY(estimate(l, n, counts[n])));
      if (!started) ctx.moveTo(GX(n), y);
      else ctx.lineTo(GX(n), y);
      started = true;
    }
    ctx.stroke();

    // Lazzarini's suspiciously perfect 355/113 at 3408 needles.
    if (s.lazzarini > 0.01) {
      const x = GX(LAZZARINI.n);
      const y = GY(estimate(LAZZARINI.l, LAZZARINI.n, LAZZARINI.c));
      ctx.fillStyle = rgba(VIOLET, s.lazzarini);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('1901 · 3408 · 355/113', x, y + 9);
    }
  }
}
