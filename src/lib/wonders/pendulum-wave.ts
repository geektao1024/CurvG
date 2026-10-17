/**
 * Pendulum wave: a row of independent pendulums whose lengths are chosen so
 * that pendulum k swings exactly BASE + k times per cycle. Nothing couples
 * them; every pattern (the snake, the rows, the return) is the phase gap
 * between neighbours growing steadily with time.
 * Math, story and a Canvas 2D engine for the wonder stage.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { lerp, track } from './timeline';

/** m/s². */
export const G = 9.81;
/** Seconds for the whole show to come back in step. */
export const CYCLE = 60;
/** Swings per cycle of the longest (first) pendulum. */
export const BASE = 51;
export const COUNT = 15;
/** Horizontal release offset, metres (the same for every bob). */
export const AMPLITUDE = 0.07;
/** Width of the row, metres; spacing is ROW / (count − 1). */
export const ROW = 0.7;
/** Height of the bar the pendulums hang from, metres. */
export const BAR_HEIGHT = 0.46;

const TAU = Math.PI * 2;

/** Swings per cycle of pendulum `k` (0 = longest). */
export function swings(k: number): number {
  return BASE + k;
}

/** Hz. */
export function frequency(k: number): number {
  return swings(k) / CYCLE;
}

/** Small-swing length that gives `frequency(k)`: L = g / (2πf)², metres. */
export function pendulumLength(k: number): number {
  return G / (TAU * frequency(k)) ** 2;
}

/** Phase of pendulum `k` at time `tau` (s), radians, unwrapped. */
export function phase(k: number, tau: number): number {
  return (TAU * swings(k) * tau) / CYCLE;
}

/** Horizontal offset of bob `k` at time `tau`, metres (released at +A). */
export function offset(k: number, tau: number): number {
  return AMPLITUDE * Math.cos(phase(k, tau));
}

/** How far each pendulum runs ahead of its neighbour, degrees, unwrapped. */
export function neighbourGap(tau: number): number {
  return (360 * tau) / CYCLE;
}

/** The gap the eye sees, wrapped to (−180°, 180°]. */
export function apparentGap(tau: number): number {
  const g = neighbourGap(tau) % 360;
  const w = g > 180 ? g - 360 : g <= -180 ? g + 360 : g;
  return w === -180 ? 180 : w;
}

/** Each bob's phase relative to the first, in [0, 1) of a turn. */
export function relativePhases(tau: number, count = COUNT): number[] {
  const step = tau / CYCLE;
  return Array.from({ length: count }, (_, k) => {
    const x = (k * step) % 1;
    return x < 0 ? x + 1 : x;
  });
}

/**
 * Groups of bobs swinging exactly in step at time `tau`: distinct relative
 * phases. At τ = (p/q)·CYCLE there are q groups (when q ≤ count).
 */
export function groups(tau: number, count = COUNT): number {
  const seen = new Set<number>();
  for (const x of relativePhases(tau, count)) {
    // Round to 1e-6 of a turn; 1 and 0 are the same phase.
    seen.add(Math.round(x * 1e6) % 1e6);
  }
  return seen.size;
}

/**
 * Rows the eye sees near time `tau`: the smallest q ≤ 6 for which bobs of
 * the same group (k, k + q, …) stay within `share` of the 360°/q between
 * groups, accumulated along the row. `null` while it reads as a wave.
 */
export function visibleRows(
  tau: number,
  count = COUNT,
  share = 0.4
): number | null {
  const x = (((tau / CYCLE) % 1) + 1) % 1;
  for (let q = 1; q <= Math.min(count, 6); q++) {
    const p = Math.round(x * q);
    const drift = Math.abs(x - p / q) * (count - 1) * 360;
    if (drift < (share * 360) / q) return q;
  }
  return null;
}

/**
 * The wave through the bobs, as a function of a continuous position `s`
 * along the row (bob k sits at s = k): A·cos(φ₀ + s·Δ). `alias` swaps Δ
 * for the wrapped gap, the slow wave the eye joins the bobs into; both
 * curves pass through every bob.
 */
export function waveAt(s: number, tau: number, alias = false): number {
  const gap = (alias ? apparentGap(tau) : neighbourGap(tau)) * (Math.PI / 180);
  return AMPLITUDE * Math.cos(phase(0, tau) + s * gap);
}

// ── Story ─────────────────────────────────────────────────────────────────

/**
 * Story time → pendulum time. A cubic Hermite through waypoints
 * `[t, τ, dτ/dt]`, so the bobs slow down near each pattern and fast-forward
 * between them without a jump in position or speed.
 */
export type Waypoint = readonly [number, number, number];

export function clockThrough(ways: readonly Waypoint[]): (t: number) => number {
  return (t) => {
    const first = ways[0];
    if (t <= first[0]) return first[1] + Math.min(0, t - first[0]) * first[2];
    for (let i = 1; i < ways.length; i++) {
      const [t1, p1, m1] = ways[i];
      if (t <= t1) {
        const [t0, p0, m0] = ways[i - 1];
        const h = t1 - t0;
        const u = (t - t0) / h;
        const u2 = u * u;
        const u3 = u2 * u;
        return (
          (2 * u3 - 3 * u2 + 1) * p0 +
          (u3 - 2 * u2 + u) * h * m0 +
          (-2 * u3 + 3 * u2) * p1 +
          (u3 - u2) * h * m1
        );
      }
    }
    const [tl, pl, ml] = ways[ways.length - 1];
    return pl + (t - tl) * ml;
  };
}

export const PENDULUM_BEATS = [
  0, 6.5, 12, 17.5, 22.5, 29.5, 37.5, 46, 51.5,
] as const;
export const PENDULUM_STORY_LENGTH = 57;
/** Story time the bobs are let go (held at +A before it). */
const RELEASE = 0.8;

/**
 * Where each pattern is centred in the story: [story time, pendulum time].
 * Pinned by tests/wonders.test.ts against the captions.
 */
export const STORY_MOMENTS = {
  quarter: [13.8, 15],
  third: [19.4, 20],
  half: [26, 30],
  thirdAgain: [31.6, 40],
  quarterAgain: [35.6, 45],
  alias: [42, 53],
  whole: [48.6, 60],
} as const;

const STORY_WAYS: readonly Waypoint[] = [
  [RELEASE, 0, 1],
  [6.5, 5.7, 1],
  [12.6, 14.5, 0.42],
  [15, 15.5, 0.42],
  [18.2, 19.5, 0.42],
  [20.6, 20.5, 0.42],
  [24, 29.3, 0.35],
  [28, 30.7, 0.35],
  [31, 39.7, 0.5],
  [32.2, 40.3, 0.5],
  [35, 44.7, 0.5],
  [36.2, 45.3, 0.5],
  [38.5, 50, 0.75],
  [45, 55.6, 0.8],
  [47.6, 59.6, 0.4],
  [49.6, 60.4, 0.4],
  [PENDULUM_STORY_LENGTH, 66.4, 1],
];

const storyClock = clockThrough(STORY_WAYS);

/** Pendulum time at story time `t` (held at 0 before the release). */
export function storyTau(t: number): number {
  return t <= RELEASE ? 0 : storyClock(t);
}

const waveIn = track([
  [38, 0],
  [39.4, 1],
  [45.2, 1],
  [46.4, 0],
]);
/** Camera elevation, radians: a three-quarter view, overhead for the wave. */
const pitchAt = track([
  [0, 0.42],
  [6, 0.62],
  [22, 0.74],
  [28, 0.8],
  [37, 0.7],
  [39.4, 1.3],
  [45.2, 1.3],
  [47.4, 0.72],
  [57, 0.5],
]);
const zoomAt = track([
  [0, 1.12],
  [8, 1],
  [37, 1],
  [39.4, 1.12],
  [45.2, 1.12],
  [47.4, 1],
]);

export type PendulumScene = {
  tau: number;
  /** 0–1: the true wave and its alias drawn through the bobs. */
  wave: number;
  yaw: number;
  pitch: number;
  zoom: number;
};

export function pendulumStory(t: number): PendulumScene {
  return {
    tau: storyTau(t),
    wave: waveIn(t),
    // A slow drift round the row, never past the end-on view.
    yaw: -0.5 + 0.22 * Math.sin(t * 0.09),
    pitch: pitchAt(t),
    zoom: zoomAt(t),
  };
}

/** "My version": the whole cycle with the reader's row, slowing at each pattern. */
const FILM_WAYS: readonly Waypoint[] = [
  [0.6, 0, 1],
  [3, 2.4, 1],
  [6, 14.6, 0.4],
  [7, 15.4, 0.4],
  [9.5, 19.6, 0.4],
  [10.5, 20.4, 0.4],
  [13, 29.5, 0.35],
  [15.6, 30.4, 0.35],
  [18.6, 39.6, 0.4],
  [19.6, 40.4, 0.4],
  [21.6, 44.6, 0.4],
  [22.6, 45.4, 0.4],
  [25.4, 59.6, 0.35],
  [27.6, 60.4, 0.35],
];
export const PENDULUM_FREE_FILM = 29;
const filmClock = clockThrough(FILM_WAYS);
export function filmTau(t: number): number {
  return t <= FILM_WAYS[0][0] ? 0 : filmClock(t);
}

// ── Projection ────────────────────────────────────────────────────────────

export type Vec3 = readonly [number, number, number];
export type Camera = { yaw: number; pitch: number };

/** Centre of the scene the camera turns about. */
const CENTRE: Vec3 = [0, 0.27, 0];
/** Camera distance, metres: a mild perspective. */
const DISTANCE = 2.4;

/**
 * World (x along the row, y up, z the swing direction, towards the viewer
 * at yaw 0) to view space: x right, y up, depth towards the camera (+).
 */
export function view(
  p: Vec3,
  cam: Camera
): { x: number; y: number; d: number } {
  const x = p[0] - CENTRE[0];
  const y = p[1] - CENTRE[1];
  const z = p[2] - CENTRE[2];
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const y2 = y * cp - z1 * sp;
  const d = y * sp + z1 * cp;
  const persp = DISTANCE / (DISTANCE - d);
  return { x: x1 * persp, y: y2 * persp, d };
}

/** Pivot and bob of pendulum `k` of `count` at time `tau`. */
export function pendulumAt(
  k: number,
  count: number,
  tau: number
): { pivot: Vec3; bob: Vec3 } {
  const x = count > 1 ? -ROW / 2 + (ROW * k) / (count - 1) : 0;
  const L = pendulumLength(k);
  const z = offset(k, tau);
  return {
    pivot: [x, BAR_HEIGHT, 0],
    bob: [x, BAR_HEIGHT - Math.sqrt(L * L - z * z), z],
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number];

/** Cyclic palette by phase relative to the first bob: same colour, same step. */
const PHASE_RAMP: readonly RGB[] = [
  [110, 231, 255],
  [178, 160, 255],
  [255, 120, 178],
  [255, 184, 77],
];
const CYAN: RGB = [110, 231, 255];
const AMBER: RGB = [255, 184, 77];

export function phaseColor(x: number): RGB {
  const n = PHASE_RAMP.length;
  const f = ((((x % 1) + 1) % 1) * n) % n;
  const i = Math.floor(f);
  const k = f - i;
  // Smooth between stops so the snake reads as one gradient.
  const s = k * k * (3 - 2 * k);
  const a = PHASE_RAMP[i];
  const b = PHASE_RAMP[(i + 1) % n];
  return [
    a[0] + (b[0] - a[0]) * s,
    a[1] + (b[1] - a[1]) * s,
    a[2] + (b[2] - a[2]) * s,
  ];
}

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

/** Trail behind each bob, in pendulum seconds (about a fifth of a swing). */
const TRAIL = 0.2;
const TRAIL_STEPS = 12;

export const MIN_COUNT = 5;
export const MAX_COUNT = 30;

export type PendulumSettings = {
  count: number;
  /** Pendulum seconds per real second. */
  speed: number;
  wave: boolean;
};

export class PendulumWaveEngine implements WonderEngine {
  readonly beats = PENDULUM_BEATS;
  readonly length = PENDULUM_STORY_LENGTH;
  /** Cold open: the snake folding into two clean rows. */
  readonly teaser = [23.5, 27.5] as const;
  readonly glow = 0.8;
  scene: PendulumScene = pendulumStory(0);
  settings: PendulumSettings = { count: COUNT, speed: 1, wave: false };

  private cam: Camera = { yaw: -0.5, pitch: 0.6 };
  private idle = 0;
  /** Film clock (seconds) while a "my version" film runs. */
  private film: number | null = null;

  attach() {}

  /** Free play: jump to pendulum time `tau`. */
  seek(tau: number) {
    this.scene = { ...this.scene, tau };
  }

  /** Camera angles (radians), for share links. */
  camera(): Camera {
    return { ...this.cam };
  }

  setCamera(yaw: number, pitch: number) {
    this.cam = { yaw, pitch: Math.max(0.05, Math.min(1.45, pitch)) };
  }

  /** Turn the camera by a pointer drag (CSS px). */
  rotate(dx: number, dy: number) {
    this.setCamera(this.cam.yaw + dx * 0.006, this.cam.pitch + dy * 0.004);
    this.idle = 0;
  }

  leaveStory() {
    this.cam = { yaw: this.scene.yaw, pitch: this.scene.pitch };
    this.settings = { ...this.settings, wave: this.scene.wave > 0.5 };
  }

  replay() {
    this.settings = { count: COUNT, speed: 1, wave: false };
    this.film = null;
  }

  clone(): PendulumWaveEngine {
    const e = new PendulumWaveEngine();
    e.settings = { ...this.settings };
    e.scene = { ...this.scene };
    e.cam = { ...this.cam };
    return e;
  }

  /** "My version": one whole cycle of the reader's row, from the release. */
  freeFilm(): number {
    this.film = 0;
    this.scene = { ...this.scene, tau: 0, zoom: 1 };
    return PENDULUM_FREE_FILM;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    let count = COUNT;
    let cam: Camera;
    if (f.mode === 'story') {
      this.scene = pendulumStory(f.t);
      cam = { yaw: this.scene.yaw, pitch: this.scene.pitch };
    } else {
      const s = this.scene;
      const e = 1 - Math.exp(-f.dt * 5);
      count = this.settings.count;
      let tau = s.tau;
      if (this.film !== null) {
        this.film += f.dt;
        tau = filmTau(this.film);
      } else if (f.playing) {
        tau += f.dt * this.settings.speed;
      }
      this.scene = {
        ...s,
        tau,
        wave: lerp(s.wave, this.settings.wave ? 1 : 0, e),
        zoom: lerp(s.zoom, 1, e),
      };
      this.idle += f.dt;
      // Left alone, the camera drifts slowly round the row.
      if (f.playing && this.idle > 3) {
        this.cam.yaw += f.dt * 0.04 * Math.min(1, (this.idle - 3) / 2);
      }
      cam = this.cam;
    }
    this.draw(ctx, f, count, cam);
  }

  private draw(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    count: number,
    cam: Camera
  ) {
    const s = this.scene;
    const area = safeArea(f.width, f.height, f.insets);
    const k = Math.min(area.w / 0.98, area.h / 0.62) * s.zoom;
    const at = (p: Vec3) => {
      const v = view(p, cam);
      return { x: area.cx + v.x * k, y: area.cy - v.y * k, d: v.d };
    };
    const line = (a: Vec3, b: Vec3) => {
      const p = at(a);
      const q = at(b);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    };

    // Floor grid, fading out from under the row.
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i++) {
      const a = 0.07 * (1 - Math.abs(i) / 7);
      ctx.strokeStyle = `rgba(150,170,255,${a})`;
      ctx.beginPath();
      line([i * 0.1, 0, -0.36], [i * 0.1, 0, 0.36]);
      ctx.stroke();
    }
    for (let j = -3; j <= 3; j++) {
      const a = 0.07 * (1 - Math.abs(j) / 4);
      ctx.strokeStyle = `rgba(150,170,255,${a})`;
      ctx.beginPath();
      line([-0.6, 0, j * 0.12], [0.6, 0, j * 0.12]);
      ctx.stroke();
    }

    // Frame: the bar and two legs.
    const half = ROW / 2 + 0.06;
    ctx.strokeStyle = 'rgba(210,220,255,0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    line([-half, BAR_HEIGHT, 0], [half, BAR_HEIGHT, 0]);
    line([-half, BAR_HEIGHT, 0], [-half, 0, 0]);
    line([half, BAR_HEIGHT, 0], [half, 0, 0]);
    line([-half, 0, -0.08], [-half, 0, 0.08]);
    line([half, 0, -0.08], [half, 0, 0.08]);
    ctx.stroke();

    const phases = relativePhases(s.tau, count);
    const rows = Array.from({ length: count }, (_, i) =>
      pendulumAt(i, count, s.tau)
    );
    // Back to front, so nearer bobs cover further ones.
    const order = rows
      .map((r, i) => ({ i, d: view(r.bob, cam).d }))
      .sort((a, b) => a.d - b.d)
      .map((o) => o.i);
    const radius = Math.max(3, k * 0.0125);

    // Reflections on the floor.
    for (const i of order) {
      const b = rows[i].bob;
      const p = at([b[0], -b[1], b[2]]);
      ctx.fillStyle = rgba(phaseColor(phases[i]), 0.06);
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius * 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Strings.
    ctx.strokeStyle = 'rgba(220,228,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of rows) line(r.pivot, r.bob);
    ctx.stroke();

    // The waves through the bobs: true (cyan) and the alias the eye sees.
    if (s.wave > 0.01) {
      const samples = (count - 1) * 24;
      for (const [alias, color, width] of [
        [false, CYAN, 1.4],
        [true, AMBER, 2.2],
      ] as const) {
        ctx.strokeStyle = rgba(color, (alias ? 0.75 : 0.55) * s.wave);
        ctx.lineWidth = width;
        ctx.beginPath();
        for (let j = 0; j <= samples; j++) {
          const u = (j / samples) * (count - 1);
          const x = count > 1 ? -ROW / 2 + (ROW * u) / (count - 1) : 0;
          const z = waveAt(u, s.tau, alias);
          // Bob height interpolated between neighbours' lengths.
          const L = pendulumLength(u);
          const p = at([x, BAR_HEIGHT - Math.sqrt(L * L - z * z), z]);
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
    }

    // Light trails: where each bob was over the last fifth of a swing.
    ctx.lineCap = 'round';
    for (const i of order) {
      const c = phaseColor(phases[i]);
      let prev = at(rows[i].bob);
      for (let j = 1; j <= TRAIL_STEPS; j++) {
        const back = pendulumAt(i, count, s.tau - (TRAIL * j) / TRAIL_STEPS);
        const p = at(back.bob);
        ctx.strokeStyle = rgba(c, 0.55 * (1 - j / (TRAIL_STEPS + 1)));
        ctx.lineWidth = radius * 1.3 * (1 - (0.6 * j) / TRAIL_STEPS);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        prev = p;
      }
    }

    // Bobs: lit spheres, coloured by their step relative to the first.
    for (const i of order) {
      const p = at(rows[i].bob);
      const c = phaseColor(phases[i]);
      const r = radius * (1 + p.d * 0.25);
      const g = ctx.createRadialGradient(
        p.x - r * 0.35,
        p.y - r * 0.35,
        r * 0.1,
        p.x,
        p.y,
        r
      );
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.45, rgba(c, 1));
      g.addColorStop(1, rgba([c[0] * 0.35, c[1] * 0.35, c[2] * 0.45], 1));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
  }
}
