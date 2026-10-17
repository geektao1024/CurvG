/**
 * Collatz: halve an even number, triple an odd one and add 1. Every number
 * tried so far falls to 1. Drawn three ways: one number's hailstone path,
 * the steps for every n (a scatter), and all paths run backwards from 1 as
 * one tree, turning one way at even numbers and the other at odd ones.
 * Math, story and a Canvas 2D engine.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { clamp01, easeSine, lerp, track } from './timeline';

export const next = (n: number) => (n % 2 === 0 ? n / 2 : 3 * n + 1);

/** The path from n down to 1, both included. */
export function hailstone(n: number): number[] {
  const out = [n];
  while (n !== 1) {
    n = next(n);
    out.push(n);
  }
  return out;
}

/** Steps to reach 1 and the highest value on the way. */
export function stoppingTime(n: number): { steps: number; peak: number } {
  let steps = 0;
  let peak = n;
  while (n !== 1) {
    n = next(n);
    steps++;
    if (n > peak) peak = n;
  }
  return { steps, peak };
}

/** Steps for 1 … n, memoised in one table. */
export function stepsTable(n: number): Uint16Array {
  const out = new Uint16Array(n + 1);
  for (let i = 2; i <= n; i++) {
    let m = i;
    let s = 0;
    while (m >= i) {
      m = next(m);
      s++;
    }
    out[i] = s + out[m];
  }
  return out;
}

// ── The tree ──────────────────────────────────────────────────────────────

export type CollatzTree = {
  /** Every number on a path from 1 … N down to 1. */
  nodes: number[];
  /** World position (x right, y up) and depth (steps from the node to 1). */
  x: Float64Array;
  y: Float64Array;
  depth: Uint16Array;
  /** Parent index (the next number), −1 for the root 1. */
  parent: Int32Array;
  /** How many of 1 … N pass through each node. */
  traffic: Uint32Array;
  maxDepth: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

/**
 * Lay out the paths of 1 … N as one tree from the root 1 (pointing up).
 * Going from a number to the one before it on a path (n → m with
 * next(m) = n), turn by `even` radians if m is even and by −`odd` if odd.
 */
export function buildTree(N: number, even: number, odd: number): CollatzTree {
  const index = new Map<number, number>();
  const nodes: number[] = [];
  const add = (n: number) => {
    index.set(n, nodes.length);
    nodes.push(n);
  };
  add(1);
  for (let n = 2; n <= N; n++) {
    let m = n;
    while (!index.has(m)) {
      add(m);
      m = next(m);
    }
  }
  const count = nodes.length;
  const parent = new Int32Array(count).fill(-1);
  for (let i = 1; i < count; i++) parent[i] = index.get(next(nodes[i]))!;
  // Depth by walking up (memoised).
  const depth = new Uint16Array(count);
  const known = new Uint8Array(count);
  known[0] = 1;
  for (let i = 1; i < count; i++) {
    const stack: number[] = [];
    let j = i;
    while (!known[j]) {
      stack.push(j);
      j = parent[j];
    }
    let d = depth[j];
    while (stack.length) {
      const k = stack.pop()!;
      depth[k] = ++d;
      known[k] = 1;
    }
  }
  // Positions in order of depth: each child from its parent.
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => depth[a] - depth[b]
  );
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const heading = new Float64Array(count);
  heading[0] = Math.PI / 2;
  const bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  for (const i of order) {
    if (i === 0) continue;
    const p = parent[i];
    const h = heading[p] + (nodes[i] % 2 === 0 ? even : -odd);
    heading[i] = h;
    x[i] = x[p] + Math.cos(h);
    y[i] = y[p] + Math.sin(h);
    bounds.minX = Math.min(bounds.minX, x[i]);
    bounds.maxX = Math.max(bounds.maxX, x[i]);
    bounds.minY = Math.min(bounds.minY, y[i]);
    bounds.maxY = Math.max(bounds.maxY, y[i]);
  }
  const traffic = new Uint32Array(count);
  for (let n = 1; n <= N; n++) {
    let i = index.get(n)!;
    while (i >= 0) {
      traffic[i]++;
      i = parent[i];
    }
  }
  let maxDepth = 0;
  for (let i = 0; i < count; i++) maxDepth = Math.max(maxDepth, depth[i]);
  return { nodes, x, y, depth, parent, traffic, maxDepth, bounds };
}

// ── Story ─────────────────────────────────────────────────────────────────

export const COLLATZ_BEATS = [0, 8, 16, 24, 32, 42, 50, 56] as const;
export const COLLATZ_STORY_LENGTH = 61;
export const STORY_N = 10_000;
export const STORY_EVEN = 0.16;
export const STORY_ODD = 0.29;
/** The small tree of beat 3: paths of 1 … 100 (27's included). */
export const SMALL_N = 100;

const hailAt = track([
  [0, 0],
  [0.4, 1],
  [15, 1],
  [16, 0],
]);
/** 0 → 1: the path of 6 drawn; 1 → 2: the path of 27 drawn. */
const hailProgress = track([
  [0.6, 0],
  [6.5, 1],
  [8.4, 1],
  [14.4, 2],
]);
const scatterAt = track([
  [15.6, 0],
  [16.6, 1],
  [23.2, 1],
  [24, 0],
]);
const scatterProgress = track([
  [16.4, 0],
  [21, 1],
]);
const treeAt = track([
  [23.6, 0],
  [24.4, 1],
]);
/** Which tree: 0 small (1 … 30), 1 full (1 … 10 000). */
const treeFull = track([
  [31.6, 0],
  [32.4, 1],
]);
/** Depth revealed, as a share of the tree's depth. */
const growSmall = track([
  [24.4, 0],
  [30.5, 1],
]);
const growFull = track([
  [32.4, 0],
  [41, 1],
]);
/** Highlight of 27's path in the tree. */
const highlightAt = track([
  [26, 0],
  [27, 1],
  [31.4, 1],
  [32, 0],
]);
const spinAt = (t: number) => (t < 24 ? 0 : (t - 24) * 0.006);

export type CollatzScene = {
  hail: number;
  hailProgress: number;
  scatter: number;
  scatterProgress: number;
  tree: number;
  full: number;
  grow: number;
  highlight: number;
  spin: number;
};

export function collatzStory(t: number): CollatzScene {
  const full = treeFull(t);
  return {
    hail: hailAt(t),
    hailProgress: hailProgress(t),
    scatter: scatterAt(t),
    scatterProgress: scatterProgress(t),
    tree: treeAt(t),
    full,
    grow: full > 0.5 ? growFull(t) : growSmall(t),
    highlight: highlightAt(t),
    spin: spinAt(t),
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number];
/** Root to tips: amber, rose, violet, cyan. */
const DEPTH_RAMP: readonly RGB[] = [
  [255, 196, 110],
  [255, 120, 170],
  [170, 140, 255],
  [110, 231, 255],
];
const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

export function depthColor(u: number): RGB {
  const f = clamp01(u) * (DEPTH_RAMP.length - 1);
  const i = Math.min(DEPTH_RAMP.length - 2, Math.floor(f));
  const k = f - i;
  const a = DEPTH_RAMP[i];
  const b = DEPTH_RAMP[i + 1];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
}

export const MIN_N = 100;
export const MAX_N = 30_000;
export const COLLATZ_FREE_FILM = 15;

export type CollatzSettings = {
  N: number;
  even: number;
  odd: number;
  /** Number whose path is highlighted, 0 for none. */
  highlight: number;
};

/** Width classes by traffic: trunk, branches, twigs. */
const widthClass = (traffic: number) =>
  traffic >= 200 ? 2 : traffic >= 12 ? 1 : 0;
const WIDTHS = [0.9, 1.6, 2.8];

type Drawn = {
  key: string;
  tree: CollatzTree;
  /** Path2D per (depth, width class), in world units. */
  paths: Map<number, Path2D>;
};

export class CollatzEngine implements WonderEngine {
  readonly beats = COLLATZ_BEATS;
  readonly length = COLLATZ_STORY_LENGTH;
  /** Cold open: the coral of 1 … 10 000 growing from the root. */
  readonly teaser = [36, 40] as const;
  readonly glow = 0.65;

  scene: CollatzScene = collatzStory(0);
  settings: CollatzSettings = {
    N: STORY_N,
    even: STORY_EVEN,
    odd: STORY_ODD,
    highlight: 27,
  };

  private cache = new Map<string, Drawn>();
  private stepsCache: Uint16Array | null = null;
  private film: { t: number } | null = null;
  /** Free play: the tree regrows when the settings change. */
  private grown = 1;
  private lastKey = '';
  private view: { cx: number; cy: number; size: number } | null = null;

  attach() {}

  leaveStory() {
    this.settings = {
      ...this.settings,
      N: this.scene.full > 0.5 ? STORY_N : 1000,
    };
    this.grown = 1;
  }

  replay() {
    this.settings = {
      N: STORY_N,
      even: STORY_EVEN,
      odd: STORY_ODD,
      highlight: 27,
    };
    this.film = null;
  }

  clone(): CollatzEngine {
    const e = new CollatzEngine();
    e.settings = { ...this.settings };
    e.scene = { ...this.scene };
    return e;
  }

  /** "My version": the reader's tree growing from 1, depth by depth. */
  freeFilm(): number {
    this.film = { t: 0 };
    this.grown = 0;
    return COLLATZ_FREE_FILM;
  }

  /** The tree and its cached paths for (N, even, odd). */
  drawn(N: number, even: number, odd: number): Drawn {
    const key = `${N}:${even.toFixed(4)}:${odd.toFixed(4)}`;
    let d = this.cache.get(key);
    if (!d) {
      const tree = buildTree(N, even, odd);
      const paths = new Map<number, Path2D>();
      if (typeof Path2D !== 'undefined') {
        for (let i = 1; i < tree.nodes.length; i++) {
          const k = tree.depth[i] * 3 + widthClass(tree.traffic[i]);
          let p = paths.get(k);
          if (!p) {
            p = new Path2D();
            paths.set(k, p);
          }
          const q = tree.parent[i];
          p.moveTo(tree.x[q], tree.y[q]);
          p.lineTo(tree.x[i], tree.y[i]);
        }
      }
      d = { key, tree, paths };
      // Keep a few: the story switches between two trees.
      if (this.cache.size > 4)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, d);
    }
    return d;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    const area = safeArea(f.width, f.height, f.insets);
    if (f.mode === 'story') {
      this.scene = collatzStory(f.t);
      const s = this.scene;
      if (s.hail > 0.01) this.paintHail(ctx, area, s);
      if (s.scatter > 0.01) this.paintScatter(ctx, area, s);
      if (s.tree > 0.01) {
        const small = this.drawn(SMALL_N, STORY_EVEN, STORY_ODD);
        const big = this.drawn(STORY_N, STORY_EVEN, STORY_ODD);
        const d = s.full > 0.5 ? big : small;
        // Frame the small tree, then pull back to the whole coral.
        const u = easeSine(clamp01((f.t - 31.6) / 3));
        const a = this.fit(small.tree, area);
        const b = this.fit(big.tree, area);
        const view = {
          cx: lerp(a.cx, b.cx, u),
          cy: lerp(a.cy, b.cy, u),
          size: Math.exp(lerp(Math.log(a.size), Math.log(b.size), u)),
        };
        this.paintTree(
          ctx,
          area,
          d,
          view,
          s.grow,
          s.tree,
          s.highlight > 0.01 ? 27 : 0,
          s.highlight,
          s.spin
        );
      }
      return;
    }
    const { N, even, odd, highlight } = this.settings;
    const d = this.drawn(N, even, odd);
    // Regrow when the reader changes how many numbers are drawn (turning
    // the angles bends the grown tree in place).
    const key = String(N);
    if (key !== this.lastKey) {
      if (this.lastKey && !this.film) this.grown = 0.35;
      this.lastKey = key;
    }
    if (this.film) {
      this.film.t += f.dt;
      this.grown = easeSine(
        clamp01((this.film.t - 0.5) / (COLLATZ_FREE_FILM - 3))
      );
    } else if (f.playing) {
      this.grown = Math.min(1, this.grown + f.dt / 2.5);
    }
    this.scene = {
      ...this.scene,
      hail: 0,
      scatter: 0,
      tree: 1,
      full: 1,
      grow: this.grown,
      highlight: highlight ? 1 : 0,
      spin: this.scene.spin + (f.playing ? f.dt * 0.006 : 0),
    };
    // Ease the framing towards the new tree's bounds.
    const target = this.fit(d.tree, area);
    const e = 1 - Math.exp(-f.dt * 3);
    const v = this.view ?? target;
    this.view = {
      cx: lerp(v.cx, target.cx, e),
      cy: lerp(v.cy, target.cy, e),
      size: Math.exp(lerp(Math.log(v.size), Math.log(target.size), e)),
    };
    this.paintTree(
      ctx,
      area,
      d,
      this.view,
      this.grown,
      1,
      highlight,
      1,
      this.scene.spin
    );
  }

  /** Centre and scale (px per world unit) that frame a tree. */
  private fit(
    tree: CollatzTree,
    area: { cx: number; cy: number; w: number; h: number }
  ) {
    const b = tree.bounds;
    const w = Math.max(1, b.maxX - b.minX);
    const h = Math.max(1, b.maxY - b.minY);
    return {
      cx: (b.minX + b.maxX) / 2,
      cy: (b.minY + b.maxY) / 2,
      size: Math.min(area.w / w, area.h / h) * 0.92,
    };
  }

  private paintTree(
    ctx: CanvasRenderingContext2D,
    area: { cx: number; cy: number; w: number; h: number },
    d: Drawn,
    view: { cx: number; cy: number; size: number },
    grow: number,
    alpha: number,
    highlight: number,
    highlightAlpha: number,
    spin: number
  ) {
    const { tree, paths } = d;
    const k = view.size;
    const shownDepth = grow * tree.maxDepth;
    // A slight sway: the tree turns a little about its root.
    const sway = 0.04 * Math.sin(spin * 3);
    ctx.save();
    ctx.translate(area.cx, area.cy);
    ctx.scale(k, -k);
    ctx.translate(-view.cx, -view.cy);
    ctx.rotate(sway);
    ctx.lineCap = 'round';
    for (const [key, path] of paths) {
      const depth = Math.floor(key / 3);
      if (depth > shownDepth + 1) continue;
      const tip = clamp01(shownDepth + 1 - depth);
      const cls = key % 3;
      const c = depthColor(depth / Math.max(1, tree.maxDepth));
      ctx.strokeStyle = rgba(c, (0.35 + 0.25 * cls) * alpha * tip);
      ctx.lineWidth = WIDTHS[cls] / k;
      ctx.stroke(path);
    }
    // One number's path back to the root, in white, as far as it has grown.
    if (highlight > 1 && highlightAlpha > 0.01) {
      let i = tree.nodes.indexOf(highlight);
      if (i >= 0) {
        ctx.strokeStyle = rgba([255, 255, 255], 0.95 * highlightAlpha * alpha);
        ctx.lineWidth = 2.4 / k;
        ctx.beginPath();
        while (tree.parent[i] >= 0) {
          const p = tree.parent[i];
          if (tree.depth[i] <= shownDepth + 1) {
            ctx.moveTo(tree.x[p], tree.y[p]);
            ctx.lineTo(tree.x[i], tree.y[i]);
          }
          i = p;
        }
        ctx.stroke();
      }
    }
    // The root.
    ctx.fillStyle = rgba([255, 230, 180], alpha);
    ctx.beginPath();
    ctx.arc(0, 0, 4 / k, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Beats 0–1: the hailstone paths of 6 and of 27 (value against step). */
  private paintHail(
    ctx: CanvasRenderingContext2D,
    area: { cx: number; cy: number; w: number; h: number },
    s: CollatzScene
  ) {
    const second = s.hailProgress > 1;
    const path = hailstone(second ? 27 : 6);
    const u = second ? s.hailProgress - 1 : s.hailProgress;
    const steps = path.length - 1;
    const shown = u * steps;
    const peak = Math.max(...path);
    const w = Math.min(area.w * 0.9, 1000);
    const h = area.h * 0.72;
    const left = area.cx - w / 2;
    const bottom = area.cy + h / 2;
    const X = (i: number) => left + (i / steps) * w;
    const Y = (v: number) => bottom - (v / peak) * h;
    const a = s.hail;
    ctx.strokeStyle = rgba([255, 255, 255], 0.18 * a);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left + w, bottom);
    ctx.stroke();
    ctx.strokeStyle = rgba([255, 196, 110], 0.95 * a);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= Math.min(steps, Math.floor(shown)); i++) {
      if (i === 0) ctx.moveTo(X(i), Y(path[i]));
      else ctx.lineTo(X(i), Y(path[i]));
    }
    const i0 = Math.floor(shown);
    if (i0 < steps) {
      const fr = shown - i0;
      ctx.lineTo(
        lerp(X(i0), X(i0 + 1), fr),
        lerp(Y(path[i0]), Y(path[i0 + 1]), fr)
      );
    }
    ctx.stroke();
    const mono = '500 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.font = mono;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let i = 0; i <= Math.min(steps, i0); i++) {
      const odd = path[i] % 2 === 1;
      ctx.fillStyle = rgba(odd ? [255, 120, 170] : [110, 231, 255], a);
      ctx.beginPath();
      ctx.arc(X(i), Y(path[i]), second ? 2.4 : 5, 0, Math.PI * 2);
      ctx.fill();
      if (!second || path[i] === peak) {
        ctx.fillStyle = rgba([236, 234, 244], 0.9 * a);
        ctx.fillText(String(path[i]), X(i), Y(path[i]) - 9);
      }
    }
  }

  /** Beat 2: steps to reach 1 for every n up to 10 000. */
  private paintScatter(
    ctx: CanvasRenderingContext2D,
    area: { cx: number; cy: number; w: number; h: number },
    s: CollatzScene
  ) {
    this.stepsCache ??= stepsTable(STORY_N);
    const table = this.stepsCache;
    const shownN = Math.floor(s.scatterProgress * STORY_N);
    const w = Math.min(area.w * 0.9, 1000);
    const h = area.h * 0.72;
    const left = area.cx - w / 2;
    const bottom = area.cy + h / 2;
    const top = 270;
    ctx.fillStyle = rgba([110, 231, 255], 0.75 * s.scatter);
    for (let n = 1; n <= shownN; n++) {
      ctx.fillRect(
        left + (n / STORY_N) * w - 0.75,
        bottom - (table[n] / top) * h - 0.75,
        1.5,
        1.5
      );
    }
    ctx.strokeStyle = rgba([255, 255, 255], 0.18 * s.scatter);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, bottom);
    ctx.lineTo(left + w, bottom);
    ctx.moveTo(left, bottom);
    ctx.lineTo(left, bottom - h);
    ctx.stroke();
    ctx.fillStyle = rgba([236, 234, 244], 0.7 * s.scatter);
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('n → 10 000', left + w - 90, bottom + 6);
    ctx.textBaseline = 'bottom';
    ctx.fillText('steps', left + 6, bottom - h);
  }
}
