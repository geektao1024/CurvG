/**
 * The Lorenz attractor: three equations for rolling convection, integrated
 * with RK4. Math, story and a Canvas 2D engine for the wonder stage.
 * Story frames are deterministic: trajectories are precomputed, and the
 * swarm is re-run from its seed when the story is scrubbed backwards.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { lerp, track } from './timeline';

export type Vec3 = [number, number, number];

export const SIGMA = 10;
export const BETA = 8 / 3;
export const RHO = 28;

/** ρ above which the butterfly is the long-run state (Hopf point). */
export const RHO_CHAOS = 24.74;

export function lorenzStep(p: Vec3, h: number, rho = RHO): Vec3 {
  const f = (x: number, y: number, z: number): Vec3 => [
    SIGMA * (y - x),
    x * (rho - z) - y,
    x * y - BETA * z,
  ];
  const [x, y, z] = p;
  const k1 = f(x, y, z);
  const k2 = f(x + (h / 2) * k1[0], y + (h / 2) * k1[1], z + (h / 2) * k1[2]);
  const k3 = f(x + (h / 2) * k2[0], y + (h / 2) * k2[1], z + (h / 2) * k2[2]);
  const k4 = f(x + h * k3[0], y + h * k3[1], z + h * k3[2]);
  return [
    x + (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y + (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    z + (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
  ];
}

/** `steps` RK4 steps of size `h` from `p`, start included. */
export function trajectory(
  p: Vec3,
  h: number,
  steps: number,
  rho = RHO
): Vec3[] {
  const out: Vec3[] = [p];
  let q = p;
  for (let i = 0; i < steps; i++) {
    q = lorenzStep(q, h, rho);
    out.push(q);
  }
  return out;
}

export const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** The two fixed points C± that exist for ρ > 1. */
export function wingCentres(rho = RHO): [Vec3, Vec3] {
  const r = Math.sqrt(BETA * (rho - 1));
  return [
    [r, r, rho - 1],
    [-r, -r, rho - 1],
  ];
}

// ── Story ─────────────────────────────────────────────────────────────────

export const LORENZ_BEATS = [0, 8, 16, 31, 39, 46] as const;
export const LORENZ_STORY_LENGTH = 52;

/** Integration step used everywhere (Lorenz time units). */
export const H = 0.005;
/**
 * Where the first trajectory starts: (1, 1, 1) run for 20 time units, so
 * it is already on the butterfly (from (1, 1, 1) itself the path circles
 * one wing for over 10 units before it first switches sides).
 */
export const WARMUP = 20;
export const START: Vec3 = (() => {
  let p: Vec3 = [1, 1, 1];
  for (let i = 0; i < WARMUP / 0.005; i++) p = lorenzStep(p, 0.005);
  return p;
})();
/** Story seconds → Lorenz time for the single trajectory (beats 0–1). */
export const MAIN_RATE = 0.6;
/** The twins start on the attractor, this far apart in x. */
export const TWIN_GAP = 1e-5;
export const TWIN_START_T = 16;
export const TWIN_END_T = 31;
export const TWIN_RATE = 1.5;
/** The swarm: a tiny ball of points released at this story time. */
export const SWARM_T = 31;
export const SWARM_RATE = 0.9;
export const SWARM_SIZE = 3000;
export const SWARM_RADIUS = 0.05;
/** Lorenz time on the first path where the swarm's ball is centred. */
export const SWARM_SEED_T = 4.7;

const MAIN_STEPS = Math.ceil((TWIN_START_T * MAIN_RATE) / H) + 1;
const TWIN_STEPS = Math.ceil(((TWIN_END_T - TWIN_START_T) * TWIN_RATE) / H) + 1;

export type LorenzStoryData = {
  main: Vec3[];
  twinA: Vec3[];
  twinB: Vec3[];
  swarmSeed: Vec3[];
};

/** Deterministic pseudo-random numbers (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lorenzStoryData(): LorenzStoryData {
  const main = trajectory(START, H, MAIN_STEPS);
  const a = main[main.length - 1];
  const b: Vec3 = [a[0] + TWIN_GAP, a[1], a[2]];
  const twinA = trajectory(a, H, TWIN_STEPS);
  const twinB = trajectory(b, H, TWIN_STEPS);
  // The swarm starts as a small ball just before the path switches wings,
  // where neighbours are split fastest, so it blooms out of one spot.
  const centre = main[Math.round(SWARM_SEED_T / H)];
  const rand = rng(7);
  const swarmSeed: Vec3[] = [];
  while (swarmSeed.length < SWARM_SIZE) {
    const v: Vec3 = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
    const r = Math.hypot(...v);
    if (r > 1 || r === 0) continue;
    swarmSeed.push([
      centre[0] + v[0] * SWARM_RADIUS,
      centre[1] + v[1] * SWARM_RADIUS,
      centre[2] + v[2] * SWARM_RADIUS,
    ]);
  }
  return { main, twinA, twinB, swarmSeed };
}

/** Index into a precomputed path at story time `t`. */
export const mainIndex = (t: number) =>
  Math.min(MAIN_STEPS, Math.max(0, Math.floor((t * MAIN_RATE) / H)));
export const twinIndex = (t: number) =>
  Math.min(
    TWIN_STEPS,
    Math.max(0, Math.floor(((t - TWIN_START_T) * TWIN_RATE) / H))
  );

export type LorenzScene = {
  /** Camera turn about the vertical axis and tilt (radians), zoom. */
  yaw: number;
  tilt: number;
  zoom: number;
  main: number;
  twins: number;
  swarm: number;
  /** Faint full trajectory behind the twins and the swarm. */
  ghost: number;
};

const mainAlpha = track([
  [0, 1],
  [16, 1],
  [17.5, 0],
]);
const twinsAlpha = track([
  [15.5, 0],
  [16.5, 1],
  [31, 1],
  [32.5, 0],
]);
const swarmAlpha = track([
  [30.5, 0],
  [31.5, 1],
]);
const ghostAlpha = track([
  [15, 0],
  [17, 0.22],
  [31, 0.22],
  [33, 0.1],
]);
const zoomAt = track([
  [0, 1.25],
  [9, 1],
  [16, 1],
  [17.5, 1.08],
  [31, 1.08],
  [33, 1],
]);

export function lorenzStory(t: number): LorenzScene {
  return {
    // The wings lie near the plane x = y; a yaw of +π/4 sees them edge-on,
    // so the camera swings between face-on (−π/4) and the classic view (0).
    yaw: -0.38 + 0.34 * Math.sin(t * 0.11),
    tilt: 0.18 + 0.08 * Math.sin(t * 0.07),
    zoom: zoomAt(t),
    main: mainAlpha(t),
    twins: twinsAlpha(t),
    swarm: swarmAlpha(t),
    ghost: ghostAlpha(t),
  };
}

/** ρ above which the butterfly exists alongside the two resting points. */
export const RHO_BUTTERFLY = 24.06;

export type LongRun = 'origin' | 'wing' | 'mixed' | 'chaos';

/**
 * What happens in the long run for a given ρ (σ = 10, β = 8/3): fall to the
 * origin, settle in one wing's centre, either (depending on the start), or
 * the butterfly.
 */
export function longRun(rho: number): LongRun {
  if (rho < 1) return 'origin';
  if (rho < RHO_BUTTERFLY) return 'wing';
  if (rho < RHO_CHAOS) return 'mixed';
  return 'chaos';
}

// ── Engine ────────────────────────────────────────────────────────────────

const CYAN = [110, 231, 255] as const;
const AMBER = [255, 184, 77] as const;
const VIOLET = [178, 160, 255] as const;

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;

export type LorenzText = {
  /** Distance label between the twins, e.g. "相距 0.00001". */
  gap: (value: string) => string;
};

export class LorenzEngine implements WonderEngine {
  readonly beats = LORENZ_BEATS;
  readonly length = LORENZ_STORY_LENGTH;
  readonly data = lorenzStoryData();
  scene: LorenzScene = lorenzStory(0);

  /** Free play. */
  rho = RHO;
  count = SWARM_SIZE;
  showPath = true;
  /** Twins' current separation, for the readout. */
  gap = TWIN_GAP;

  private swarm: Vec3[] = [];
  private swarmT = -1;
  private free: { a: Vec3; path: Vec3[] } | null = null;
  private drag: { yaw: number; tilt: number } = { yaw: 0, tilt: 0 };

  constructor(private text: LorenzText) {}

  attach() {}

  /** Turn the camera by a pointer drag (CSS px). */
  rotate(dx: number, dy: number) {
    this.drag.yaw += dx * 0.006;
    this.drag.tilt = Math.max(-1.2, Math.min(1.2, this.drag.tilt + dy * 0.004));
  }

  leaveStory(t: number) {
    this.drag = { yaw: this.scene.yaw, tilt: this.scene.tilt };
    // Skipping before the swarm is released: hand over an already-spread
    // swarm so free play opens on the whole butterfly.
    if (t < SWARM_T + 8) this.swarmAt(SWARM_T + 8);
    const last = this.data.main[this.data.main.length - 1];
    this.free = { a: last, path: [last] };
  }

  replay() {
    this.swarm = [];
    this.swarmT = -1;
    this.free = null;
    this.rho = RHO;
  }

  /** Drop a fresh tiny ball of `count` points where the path is now. */
  reseed() {
    const centre = this.free?.a ?? this.data.swarmSeed[0];
    const rand = rng(11);
    const out: Vec3[] = [];
    while (out.length < this.count) {
      const v: Vec3 = [rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1];
      if (Math.hypot(...v) > 1) continue;
      out.push([
        centre[0] + v[0] * SWARM_RADIUS,
        centre[1] + v[1] * SWARM_RADIUS,
        centre[2] + v[2] * SWARM_RADIUS,
      ]);
    }
    this.swarm = out;
  }

  /** Swarm at story time `t`, re-run from the seed if scrubbed back. */
  private swarmAt(t: number) {
    if (t < SWARM_T) return;
    const target = (t - SWARM_T) * SWARM_RATE;
    if (this.swarmT < 0 || target < this.swarmT) {
      this.swarm = this.data.swarmSeed.map((p) => [...p] as Vec3);
      this.swarmT = 0;
    }
    const h = 0.01;
    while (this.swarmT + h <= target) {
      for (let i = 0; i < this.swarm.length; i++) {
        this.swarm[i] = lorenzStep(this.swarm[i], h);
      }
      this.swarmT += h;
    }
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    const { data } = this;
    let yaw: number;
    let tilt: number;
    if (f.mode === 'story') {
      this.scene = lorenzStory(f.t);
      yaw = this.scene.yaw;
      tilt = this.scene.tilt;
      this.swarmAt(f.t);
    } else {
      const s = this.scene;
      const e = 1 - Math.exp(-f.dt * 4);
      this.scene = {
        ...s,
        main: lerp(s.main, 0, e),
        twins: lerp(s.twins, 0, e),
        swarm: lerp(s.swarm, 1, e),
        ghost: lerp(s.ghost, this.showPath ? 1 : 0, e),
        zoom: lerp(s.zoom, 1, e),
      };
      yaw = this.drag.yaw;
      tilt = this.drag.tilt;
      if (f.playing) this.stepFree(f.dt);
    }

    const area = safeArea(f.width, f.height, f.insets);
    const k = Math.min(area.w / 56, area.h / 54) * this.scene.zoom;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    const zc =
      this.rho - 1 > 0 && f.mode === 'free' ? Math.max(this.rho - 3, 1) : 25;
    const proj = (p: Vec3): [number, number] => {
      const x1 = p[0] * cy - p[1] * sy;
      const depth = p[0] * sy + p[1] * cy;
      const y1 = (p[2] - zc) * ct - depth * st;
      return [area.cx + x1 * k, area.cy - y1 * k];
    };

    const s = this.scene;
    // The single trajectory, drawn on as it is computed.
    if (s.main > 0.01) {
      const n = f.mode === 'story' ? mainIndex(f.t) : data.main.length - 1;
      trail(ctx, data.main, 0, n, proj, CYAN, s.main, 8, false, 2);
      head(ctx, proj(data.main[n]), AMBER, s.main);
    }
    if (s.ghost > 0.01) {
      const path = f.mode === 'free' && this.free ? this.free.path : data.main;
      trail(
        ctx,
        path,
        0,
        path.length - 1,
        proj,
        VIOLET,
        s.ghost * 0.6,
        1,
        true
      );
    }
    if (s.twins > 0.01) {
      const n = f.mode === 'story' ? twinIndex(f.t) : data.twinA.length - 1;
      const from = Math.max(0, n - 600);
      trail(ctx, data.twinA, from, n, proj, CYAN, s.twins, 3);
      trail(ctx, data.twinB, from, n, proj, AMBER, s.twins, 3);
      const pa = proj(data.twinA[n]);
      const pb = proj(data.twinB[n]);
      head(ctx, pa, CYAN, s.twins);
      head(ctx, pb, AMBER, s.twins);
      this.gap = dist(data.twinA[n], data.twinB[n]);
      if (this.gap > 0.3) {
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = rgba([255, 255, 255], 0.35 * s.twins);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = rgba([236, 234, 244], 0.85 * s.twins);
      ctx.font = '500 13px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(this.text.gap(formatGap(this.gap)), pa[0] + 14, pa[1] - 12);
    }
    if (s.swarm > 0.01 && this.swarm.length) {
      ctx.globalCompositeOperation = 'lighter';
      const n = this.swarm.length;
      for (let i = 0; i < n; i++) {
        const [x, y] = proj(this.swarm[i]);
        const c = i % 3 === 0 ? AMBER : i % 3 === 1 ? CYAN : VIOLET;
        ctx.fillStyle = rgba(c, 0.55 * s.swarm);
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (f.mode === 'free' && this.free) {
      head(ctx, proj(this.free.a), AMBER, 1);
    }
  }

  private stepFree(dt: number) {
    const h = 0.005;
    const steps = Math.max(1, Math.round((dt * SWARM_RATE) / h));
    if (this.free) {
      let a = this.free.a;
      for (let i = 0; i < steps; i++) {
        a = lorenzStep(a, h, this.rho);
        this.free.path.push(a);
      }
      this.free.a = a;
      if (this.free.path.length > 6000)
        this.free.path.splice(0, this.free.path.length - 6000);
    }
    const hs = Math.min(0.02, dt * SWARM_RATE);
    for (let i = 0; i < this.swarm.length; i++) {
      this.swarm[i] = lorenzStep(this.swarm[i], hs, this.rho);
    }
  }

  /** Change ρ; the path restarts so its shape shows the new long-run state. */
  setRho(rho: number) {
    this.rho = rho;
    if (this.free) this.free.path = [this.free.a];
  }

  setCount(count: number) {
    this.count = count;
    this.reseed();
  }
}

/** A trajectory segment as a glowing line, older parts fading out. */
function trail(
  ctx: CanvasRenderingContext2D,
  pts: readonly Vec3[],
  from: number,
  to: number,
  proj: (p: Vec3) => [number, number],
  color: readonly number[],
  alpha: number,
  glow: number,
  flat = false,
  width = 1.6
) {
  if (to - from < 2) return;
  const chunks = flat ? 1 : 24;
  const span = to - from;
  for (let c = 0; c < chunks; c++) {
    const a = from + Math.floor((span * c) / chunks);
    const b = from + Math.floor((span * (c + 1)) / chunks);
    const age = flat ? 1 : 0.3 + 0.7 * ((c + 1) / chunks) ** 1.2;
    const stroke = (w: number, k: number) => {
      ctx.strokeStyle = rgba(color, alpha * age * k);
      ctx.lineWidth = w;
      ctx.beginPath();
      const p0 = proj(pts[a]);
      ctx.moveTo(p0[0], p0[1]);
      for (let i = a + 1; i <= b; i++) {
        const p = proj(pts[i]);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    };
    if (glow > 1) stroke(glow, 0.12);
    stroke(flat ? 0.8 : width, flat ? 0.5 : 1);
  }
}

function head(
  ctx: CanvasRenderingContext2D,
  [x, y]: [number, number],
  color: readonly number[],
  alpha: number
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
  g.addColorStop(0, rgba(color, 0.6 * alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(color, alpha);
  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  ctx.fill();
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** 3.2 → "3.2", 0.0123 → "0.012", 0.00002 → "2×10⁻⁵". */
export function formatGap(d: number): string {
  if (d >= 1) return d.toFixed(1);
  if (d >= 0.001) return d.toFixed(3);
  const [mant, exp] = d.toExponential(0).split('e-');
  return `${mant}×10⁻${[...exp].map((ch) => SUP[Number(ch)]).join('')}`;
}
