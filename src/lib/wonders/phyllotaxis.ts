/**
 * Phyllotaxis: seed n sits at angle n·α and radius √n (Vogel's model).
 * Math, story and a Canvas 2D engine for the wonder stage.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { lerp, linear, track } from './timeline';

export const PHI = (1 + Math.sqrt(5)) / 2;
/** 360° · (2 − φ) ≈ 137.508°. */
export const GOLDEN_ANGLE = 360 * (2 - PHI);

export type Seed = { x: number; y: number };

/** Seed `n` (0-based) for a turn of `angle` degrees; radius √(n + 0.5). */
export function seedAt(n: number, angle: number): Seed {
  const a = (n * angle * Math.PI) / 180;
  const r = Math.sqrt(n + 0.5);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

export function seeds(count: number, angle: number): Seed[] {
  return Array.from({ length: count }, (_, n) => seedAt(n, angle));
}

/**
 * The simple fraction p/q (q ≤ maxQ) a turn of `angle` degrees is closest
 * to, from the continued-fraction convergents of angle/360. A turn of p/q
 * lines seeds up in q spokes.
 */
export function nearestFraction(
  angle: number,
  maxQ = 100
): { p: number; q: number; error: number } {
  const x = angle / 360;
  let best = { p: 0, q: 1, error: Math.abs(x) };
  let h0 = 1;
  let h1 = 0;
  let k0 = 0;
  let k1 = 1;
  let v = x;
  for (let i = 0; i < 24; i++) {
    const a = Math.floor(v);
    const h = a * h0 + h1;
    const k = a * k0 + k1;
    if (k > maxQ) break;
    const error = Math.abs(x - h / k);
    if (k > 0) best = { p: h, q: k, error };
    h1 = h0;
    h0 = h;
    k1 = k0;
    k0 = k;
    const frac = v - a;
    if (frac < 1e-12) break;
    v = 1 / frac;
  }
  return best;
}

/**
 * Smallest distance between any two seeds, a measure of how evenly they
 * pack (gaps and spokes squeeze some pairs together). Grid-hashed, O(n).
 */
export function minSpacing(points: readonly Seed[]): number {
  const cell = 1.2;
  const grid = new Map<string, number[]>();
  points.forEach((p, i) => {
    const key = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
    const list = grid.get(key);
    if (list) list.push(i);
    else grid.set(key, [i]);
  });
  let best = Infinity;
  points.forEach((p, i) => {
    const gx = Math.floor(p.x / cell);
    const gy = Math.floor(p.y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
          if (j <= i) continue;
          const d = Math.hypot(points[j].x - p.x, points[j].y - p.y);
          if (d < best) best = d;
        }
      }
    }
  });
  return best;
}

/**
 * Index gaps to each outer seed's nearest neighbour: for the golden angle
 * they are Fibonacci numbers, which is why the visible spirals come in
 * Fibonacci counts.
 */
export function neighbourGaps(
  count: number,
  angle: number,
  from: number,
  neighbours = 1
): number[] {
  const pts = seeds(count, angle);
  const gaps: number[] = [];
  for (let i = from; i < count; i++) {
    // The `neighbours` closest earlier seeds (within 160 places).
    const near: { d: number; gap: number }[] = [];
    for (let j = Math.max(0, i - 160); j < i; j++) {
      const d = Math.hypot(pts[j].x - pts[i].x, pts[j].y - pts[i].y);
      near.push({ d, gap: i - j });
    }
    near.sort((a, b) => a.d - b.d);
    for (const n of near.slice(0, neighbours)) gaps.push(n.gap);
  }
  return gaps;
}

/**
 * The two spiral families you see on the outer ring: the two most common
 * index gaps to a seed's nearest neighbour. For the golden angle and 1000
 * seeds these are 55 and 89, consecutive Fibonacci numbers.
 */
export function spiralPair(count: number, angle: number): [number, number] {
  const from = Math.floor(count * 0.6);
  const tally = new Map<number, number>();
  for (const gap of neighbourGaps(count, angle, from, 2)) {
    tally.set(gap, (tally.get(gap) ?? 0) + 1);
  }
  const [a = 1, b = 2] = [...tally.entries()]
    .sort((x, y) => y[1] - x[1])
    .map(([gap]) => gap);
  return a < b ? [a, b] : [b, a];
}

// ── Story ─────────────────────────────────────────────────────────────────

export const PHYLLO_BEATS = [0, 8, 17, 27, 36, 44] as const;
export const PHYLLO_STORY_LENGTH = 50;
export const STORY_SEEDS = 1000;
/** The "off by 0.1°" angle of beat 4. */
export const NEAR_GOLDEN = 137.6;

const angleAt = track([
  [0, 90],
  [9, 90],
  [11, 120, linear],
  [12.6, 120],
  [14.6, 144, linear],
  [17.5, 144],
  [24.5, GOLDEN_ANGLE],
  [37, GOLDEN_ANGLE],
  [38.5, NEAR_GOLDEN],
  [42.5, NEAR_GOLDEN],
  [44, GOLDEN_ANGLE],
]);
const countAt = track([
  [0.4, 0],
  [7, 140, linear],
  [17, 420],
  [24, STORY_SEEDS],
]);
const spiralsAt = track([
  [27.5, 0],
  [29, 1],
  [35.5, 1],
  [36.5, 0],
]);
const zoomAt = track([
  [0, 2.4],
  [7, 1.6],
  [17, 1.15],
  [24, 1],
]);

export type PhylloScene = {
  angle: number;
  /** Seeds shown; fractional while the newest one grows in. */
  count: number;
  /** 0–1, colours the two Fibonacci spiral families. */
  spirals: number;
  zoom: number;
};

export function phylloStory(t: number): PhylloScene {
  return {
    angle: angleAt(t),
    count: countAt(t),
    spirals: spiralsAt(t),
    zoom: zoomAt(t),
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number];

const CYAN: RGB = [110, 231, 255];
const VIOLET: RGB = [178, 160, 255];
/** Seed colour from the centre out: white-gold heart, amber, ember rim. */
const SEED_RAMP: readonly RGB[] = [
  [255, 246, 214],
  [255, 214, 120],
  [255, 170, 64],
  [240, 110, 60],
];

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

function ramp(stops: readonly RGB[], x: number): RGB {
  const f = Math.max(0, Math.min(1, x)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(f));
  const k = f - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/** Radius bands drawn as one path each (seeds share a colour per band). */
const BANDS = 14;

/** Length of the free-play film ("my version"), seconds. */
export const PHYLLO_FREE_FILM = 14;

export class PhyllotaxisEngine implements WonderEngine {
  readonly beats = PHYLLO_BEATS;
  readonly length = PHYLLO_STORY_LENGTH;
  /** Cold open: the angle sweeping into the golden one, spirals forming. */
  readonly teaser = [19.5, 23.5] as const;
  readonly glow = 0.7;
  scene: PhylloScene = phylloStory(0);
  target = { angle: GOLDEN_ANGLE, count: STORY_SEEDS, spirals: false };

  private pairKey = '';
  private pairValue: [number, number] = [55, 89];
  /** Free play: the head turns slowly (a picture, not part of the rule). */
  private turn = 0;
  /** Film: seeds per second while the head grows from nothing. */
  private grow: number | null = null;

  attach() {}

  /** Spiral families, cached: only recounted when the picture changes. */
  private pair(count: number, angle: number): [number, number] {
    const key = `${count}:${angle.toFixed(4)}`;
    if (key !== this.pairKey) {
      this.pairKey = key;
      this.pairValue = spiralPair(count, angle);
    }
    return this.pairValue;
  }

  leaveStory() {
    this.target = {
      angle: this.scene.angle,
      count: Math.round(this.scene.count),
      spirals: false,
    };
  }

  replay() {
    this.target = { angle: GOLDEN_ANGLE, count: STORY_SEEDS, spirals: false };
    this.turn = 0;
  }

  clone(): PhyllotaxisEngine {
    const e = new PhyllotaxisEngine();
    e.target = { ...this.target };
    e.scene = { ...this.scene };
    return e;
  }

  /** "My version": the head grows seed by seed at the reader's angle. */
  freeFilm(): number {
    this.scene = { ...this.scene, angle: this.target.angle, count: 0, zoom: 1 };
    this.grow = this.target.count / (PHYLLO_FREE_FILM - 3.5);
    this.turn = 0;
    return PHYLLO_FREE_FILM;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = phylloStory(f.t);
      this.turn = 0;
    } else {
      const s = this.scene;
      const e = 1 - Math.exp(-f.dt * 5);
      const count =
        this.grow !== null
          ? Math.min(this.target.count, s.count + this.grow * f.dt)
          : lerp(s.count, this.target.count, e);
      this.scene = {
        angle: lerp(s.angle, this.target.angle, e),
        count,
        spirals: lerp(s.spirals, this.target.spirals ? 1 : 0, e),
        zoom: lerp(s.zoom, 1, e),
      };
      if (f.playing) this.turn += f.dt * 0.05;
    }
    const s = this.scene;
    const area = safeArea(f.width, f.height, f.insets);
    const whole = Math.ceil(s.count);
    // Frame the disc of the target count so growth reads as filling in.
    const frameCount =
      f.mode === 'story'
        ? STORY_SEEDS
        : this.grow !== null
          ? this.target.count
          : s.count;
    const radius = Math.sqrt(Math.max(frameCount, 60));
    const k = ((Math.min(area.w, area.h) / 2) * 0.96 * s.zoom) / radius;
    const dot = Math.max(1.2, k * 0.44);
    const [fa, fb] = s.spirals > 0.01 ? this.pair(whole, s.angle) : [1, 2];
    const cos = Math.cos(this.turn);
    const sin = Math.sin(this.turn);
    const at = (n: number): [number, number] => {
      const p = seedAt(n, s.angle);
      return [
        area.cx + (p.x * cos - p.y * sin) * k,
        area.cy - (p.x * sin + p.y * cos) * k,
      ];
    };

    // Warm light behind the head.
    const R = radius * k;
    const halo = ctx.createRadialGradient(
      area.cx,
      area.cy,
      0,
      area.cx,
      area.cy,
      R * 1.25
    );
    halo.addColorStop(0, 'rgba(255,190,90,0.16)');
    halo.addColorStop(0.6, 'rgba(255,140,60,0.06)');
    halo.addColorStop(1, 'rgba(255,120,60,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(area.cx, area.cy, R * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // Seeds, banded by distance from the centre: one path per band.
    const fade = 1 - 0.55 * s.spirals;
    const bodies: Path2D[] = [];
    const cores: Path2D[] = [];
    for (let b = 0; b < BANDS; b++) {
      bodies.push(new Path2D());
      cores.push(new Path2D());
    }
    const span = Math.sqrt(Math.max(whole, 1));
    let newest: { x: number; y: number; r: number } | null = null;
    for (let n = 0; n < whole; n++) {
      const g = Math.min(1, s.count - n);
      const [x, y] = at(n);
      const r = dot * (0.35 + 0.65 * g) * (0.82 + (0.3 * Math.sqrt(n)) / span);
      const band = Math.min(
        BANDS - 1,
        Math.floor((Math.sqrt(n) / span) * BANDS)
      );
      bodies[band].moveTo(x + r, y);
      bodies[band].arc(x, y, r, 0, Math.PI * 2);
      cores[band].moveTo(x + r * 0.42 - r * 0.18, y - r * 0.18);
      cores[band].arc(x - r * 0.18, y - r * 0.18, r * 0.42, 0, Math.PI * 2);
      if (n === whole - 1) newest = { x, y, r };
    }
    for (let b = 0; b < BANDS; b++) {
      const c = ramp(SEED_RAMP, (b + 0.5) / BANDS);
      ctx.fillStyle = rgba(c, (0.92 - 0.25 * (b / BANDS)) * fade);
      ctx.fill(bodies[b]);
      ctx.fillStyle = rgba([255, 252, 240], 0.32 * fade);
      ctx.fill(cores[b]);
    }

    // The newest seed, with the turn it was placed by.
    if (newest && s.count < frameCount - 0.5) {
      const { x, y } = newest;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
      g.addColorStop(0, 'rgba(255,236,190,0.85)');
      g.addColorStop(1, 'rgba(255,184,77,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();
      if (f.mode === 'story') {
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(area.cx, area.cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
    // Draw the spiral arms themselves as glowing guides while highlighted.
    if (s.spirals > 0.01) {
      for (const [family, color] of [
        [fa, CYAN],
        [fb, VIOLET],
      ] as const) {
        ctx.strokeStyle = rgba(color, 0.7 * s.spirals);
        ctx.lineWidth = 1.3;
        for (let r = 0; r < family; r++) {
          ctx.beginPath();
          for (let n = r; n < whole; n += family) {
            const [x, y] = at(n);
            if (n === r) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    }
  }
}
