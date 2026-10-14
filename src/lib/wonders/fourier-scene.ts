/**
 * The Fourier wonder as a scene: what is on screen at a moment (`FourierScene`),
 * the scripted story that produces it from time, and a Canvas 2D painter.
 * Nothing here touches React or the DOM beyond the canvas context, so the
 * same story can later be captured frame by frame for a film.
 */

import {
  NO_INSETS,
  type StageInsets,
  type WonderEngine,
  type WonderFrame,
} from './engine';
import {
  chain,
  normalizeStroke,
  partialSum,
  pathEpicycles,
  pathPoint,
  piSamples,
  squareOvershoot,
  WAVES,
  waveTerms,
  waveValue,
  type Epicycle,
  type Point,
  type Wave,
} from './fourier';
import {
  beatAt,
  clamp01,
  easeOut,
  integrate,
  lerp,
  linear,
  track,
} from './timeline';

export type FourierShape = Wave | 'pi' | 'custom';

export type FourierScene = {
  /** Rotation angle of the first circle in the wave scene (radians). */
  theta: number;
  /** Progress around the closed path, in turns (fraction is what counts). */
  tau: number;
  wave: Wave;
  /** Circles in the wave scene; fractional while one is growing in. */
  waveCount: number;
  /** Circles in the path scene, centre excluded; fractional while growing. */
  pathCount: number;
  path: 'pi' | 'custom';
  /** 0 = wave scene, 1 = path scene; in between both fade. */
  mix: number;
  /** Draw-on of the first circle (story opening). */
  reveal: number;
  /** Share of the wave's length drawn so far. */
  reach: number;
  /** Share of a full turn of the path trail drawn (1 = the closed shape). */
  trail: number;
  /** Alpha of the exact target shape drawn faintly behind. */
  ghost: number;
  /** Alpha of the overshoot annotation. */
  gibbs: number;
  /** Alpha of the "×n" labels on the first circles. */
  tags: number;
  showCircles: boolean;
  camera: { x: number; y: number; zoom: number };
};

/** Most circles the page offers; also what the tables are built for. */
export const MAX_WAVE_CIRCLES = 60;
export const MAX_PATH_CIRCLES = 128;

/** Precomputed circles, built once per page (and once per hand drawing). */
export type FourierData = {
  waves: Record<Wave, Epicycle[]>;
  pi: { samples: Point[]; cycles: Epicycle[] };
  custom: { samples: Point[]; cycles: Epicycle[] } | null;
};

export function fourierData(): FourierData {
  const waves = Object.fromEntries(
    WAVES.map((wave) => [wave, waveTerms(wave, MAX_WAVE_CIRCLES)])
  ) as Record<Wave, Epicycle[]>;
  const samples = piSamples();
  return {
    waves,
    pi: { samples, cycles: pathEpicycles(samples) },
    custom: null,
  };
}

// ── Layout (world units, y up) ────────────────────────────────────────────

/** Centre of the first circle in the wave scene. */
export const WAVE_CENTRE = { x: -2.75, y: 0 };
/** Where the plotted wave starts, and how far one radian of history spans. */
export const WAVE_X0 = -0.85;
export const WAVE_UNIT = 0.6;
/** Radians of history shown to the right of the circles. */
export const WAVE_SPAN = 2 * Math.PI * 1.25;
/** The closed path is drawn at this scale around the origin. */
export const PATH_SCALE = 1.55;

/** World extents each scene is framed to at zoom 1. */
const WAVE_FRAME = { width: 9.2, height: 4.4 };
const PATH_FRAME = { width: 3.9, height: 3.6 };

// ── The story ─────────────────────────────────────────────────────────────

/** Start of each narrated beat, in seconds; the copy has one caption each. */
export const FOURIER_BEATS = [0, 6, 12, 21, 29, 39, 47, 53] as const;
export const FOURIER_STORY_LENGTH = 59;

/** Wave-scene rotation speed while it runs freely (rad/s). */
const SPIN = 1.25;
/** Path progress while it runs freely (turns per second). */
const TRACE = 1 / 8;

const thetaAt = integrate(
  track([
    [0, SPIN],
    [21.5, SPIN],
    [23, 0],
    [27.5, 0],
    [29, SPIN],
  ]),
  FOURIER_STORY_LENGTH + 1
);

// The path starts tracing when it fades in, so the shape is drawn from its
// first sample.
const PATH_START = 30.5;
const tauAt = (t: number) => Math.max(0, t - PATH_START) * TRACE;

/** The angle the wave stops at for the close-up on the corner. */
const FREEZE_THETA = thetaAt(25);

/**
 * Where on the wave (as history radians) the upward jump sits while the
 * rotation is frozen: θ − u is a multiple of 2π there. Pick the one closest
 * to a third of the way along so the close-up has room on both sides.
 */
function frozenJump(): number {
  const candidates: number[] = [];
  for (let k = -4; k <= 8; k++) {
    const u = FREEZE_THETA - 2 * Math.PI * k;
    if (u > 0.6 && u < WAVE_SPAN - 0.6) candidates.push(u);
  }
  const want = WAVE_SPAN * 0.32;
  return candidates.sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
}
const JUMP_U = frozenJump();
/** World x of the frozen jump. */
export const GIBBS_X = WAVE_X0 + JUMP_U * WAVE_UNIT;

const waveCountAt = track([
  [0, 1],
  [6.4, 1],
  [8.2, 2],
  [12.4, 2],
  [19.5, 12],
  [23.5, 12],
  [27.2, 60, linear],
  [28.4, 60],
  [29.6, 12],
]);

// Path circle counts move in log space: going from 3 to 100 should feel even.
const logPathCountAt = track([
  [0, Math.log(100)],
  [39.2, Math.log(100)],
  [40.6, Math.log(3)],
  [42, Math.log(3)],
  [46.5, Math.log(100), linear],
  [48, Math.log(100)],
  [49.5, Math.log(30)],
]);

const mixAt = track([
  [29, 0],
  [31.5, 1],
]);
const revealAt = track([
  [0.2, 0],
  [1.8, 1, easeOut],
]);
const reachAt = track([
  [0.8, 0],
  [6, 1, linear],
]);
const trailAt = (t: number) => clamp01((t - PATH_START) * TRACE);
const ghostAt = track([
  [12, 0],
  [14, 0.45],
  [28.6, 0.45],
  [29.4, 0],
  [40, 0],
  [41.2, 0.4],
  [52, 0.4],
  [53.5, 0],
]);
const gibbsAt = track([
  [24, 0],
  [25, 1],
  [28, 1],
  [28.6, 0],
]);
const tagsAt = track([
  [2, 0],
  [3, 1],
  [12.6, 1],
  [13.6, 0],
]);

const camXAt = track([
  [0, 0],
  [22.2, 0],
  [24.4, GIBBS_X - 0.35],
  [27.6, GIBBS_X - 0.35],
  [29.4, 0],
]);
const camYAt = track([
  [0, 0],
  [22.2, 0],
  [24.4, 0.95],
  [27.6, 0.95],
  [29.4, 0],
]);
const camZoomAt = track([
  [0, 1],
  [22.2, 1],
  [24.4, 3.4],
  [27.6, 3.4],
  [29.4, 1],
  [47, 1],
  [48.5, 0.92],
  [53, 0.92],
  [54.5, 1],
]);

/** The scripted story at time `t` (seconds). */
export function fourierStory(t: number): FourierScene {
  return {
    theta: thetaAt(t),
    tau: tauAt(t),
    wave: 'square',
    waveCount: waveCountAt(t),
    pathCount: Math.exp(logPathCountAt(t)),
    path: 'pi',
    mix: mixAt(t),
    reveal: revealAt(t),
    reach: reachAt(t),
    trail: trailAt(t),
    ghost: ghostAt(t),
    gibbs: gibbsAt(t),
    tags: tagsAt(t),
    showCircles: true,
    camera: { x: camXAt(t), y: camYAt(t), zoom: camZoomAt(t) },
  };
}

export function fourierBeat(t: number): number {
  return beatAt(FOURIER_BEATS, t);
}

// ── Painting ──────────────────────────────────────────────────────────────

export type FourierPaintText = {
  /** Annotation next to the overshoot, e.g. "+9% overshoot". */
  overshoot: (percent: string) => string;
};

const COLORS = {
  circle: [178, 160, 255],
  arm: [236, 236, 255],
  stroke: [110, 231, 255],
  tip: [255, 184, 77],
  ghost: [255, 255, 255],
  axis: [255, 255, 255],
} as const;

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;

/** Weight of circle `i` when `count` circles (fractional) are shown. */
const grow = (count: number) => (i: number) => clamp01(count - i);

type View = {
  toX: (x: number) => number;
  toY: (y: number) => number;
  /** Pixels per world unit. */
  k: number;
};

function view(
  scene: FourierScene,
  width: number,
  height: number,
  insets: StageInsets
): View {
  const w = Math.max(80, width - insets.left - insets.right);
  const h = Math.max(80, height - insets.top - insets.bottom);
  const waveK = Math.min(w / WAVE_FRAME.width, h / WAVE_FRAME.height);
  const pathK = Math.min(w / PATH_FRAME.width, h / PATH_FRAME.height);
  const k = lerp(waveK, pathK, scene.mix) * scene.camera.zoom;
  // Close-ups centre on the whole canvas; the framed shot on the safe area.
  const focus = clamp01(scene.camera.zoom - 1);
  const cx = lerp(insets.left + w / 2, width / 2, focus);
  const cy = lerp(insets.top + h / 2, height / 2, focus);
  return {
    k,
    toX: (x) => cx + (x - scene.camera.x) * k,
    toY: (y) => cy - (y - scene.camera.y) * k,
  };
}

function drawCircles(
  ctx: CanvasRenderingContext2D,
  v: View,
  joints: readonly Point[],
  radii: readonly number[],
  alpha: number,
  reveal: number
) {
  const count = radii.length;
  for (let i = 0; i < count; i++) {
    const r = radii[i] * v.k;
    if (r < 0.75) continue;
    const fade = 1 - i / (count + 6);
    ctx.strokeStyle = rgba(COLORS.circle, alpha * (0.22 + 0.4 * fade));
    ctx.lineWidth = i === 0 ? 1.4 : 1;
    ctx.beginPath();
    // The first circle draws on clockwise from the top, like a pen stroke.
    const sweep = i === 0 ? reveal * Math.PI * 2 : Math.PI * 2;
    ctx.arc(
      v.toX(joints[i].x),
      v.toY(joints[i].y),
      r,
      -Math.PI / 2,
      -Math.PI / 2 + sweep
    );
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(COLORS.arm, alpha * 0.75 * reveal);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(v.toX(joints[0].x), v.toY(joints[0].y));
  for (let i = 1; i < joints.length; i++) {
    ctx.lineTo(v.toX(joints[i].x), v.toY(joints[i].y));
  }
  ctx.stroke();
  for (let i = 0; i < joints.length - 1; i++) {
    if (radii[i] * v.k < 3) continue;
    ctx.fillStyle = rgba(COLORS.arm, alpha * 0.6 * reveal);
    ctx.beginPath();
    ctx.arc(v.toX(joints[i].x), v.toY(joints[i].y), 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  alpha: number
) {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, 16);
  halo.addColorStop(0, rgba(COLORS.tip, 0.55 * alpha));
  halo.addColorStop(1, rgba(COLORS.tip, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba(COLORS.tip, alpha);
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

/** A glowing polyline: a wide faint pass under a thin bright one. */
function glowLine(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  color: readonly number[],
  alpha: number,
  width = 2.4
) {
  if (points.length < 2) return;
  for (const [w, a] of [
    [width * 4, 0.12],
    [width * 2, 0.22],
    [width, 1],
  ] as const) {
    ctx.strokeStyle = rgba(color, alpha * a);
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++)
      ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
}

function paintWave(
  ctx: CanvasRenderingContext2D,
  v: View,
  scene: FourierScene,
  data: FourierData,
  text: FourierPaintText,
  alpha: number
) {
  const all = data.waves[scene.wave];
  const shown = Math.min(all.length, Math.ceil(scene.waveCount));
  const terms = all.slice(0, shown);
  const weight = grow(scene.waveCount);
  const centre = WAVE_CENTRE;

  // Axis and the ±1 guides.
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(COLORS.axis, alpha * 0.1);
  ctx.beginPath();
  ctx.moveTo(v.toX(centre.x - 1.6), v.toY(0));
  ctx.lineTo(v.toX(WAVE_X0 + WAVE_SPAN * WAVE_UNIT), v.toY(0));
  ctx.stroke();
  ctx.setLineDash([3, 6]);
  for (const y of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(v.toX(WAVE_X0), v.toY(y));
    ctx.lineTo(v.toX(WAVE_X0 + WAVE_SPAN * WAVE_UNIT), v.toY(y));
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // The exact wave, faintly, so the reader sees what the circles chase.
  const steps = 720;
  const reachU = WAVE_SPAN * scene.reach;
  if (scene.ghost > 0) {
    const ghost: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const u = (reachU * i) / steps;
      ghost.push({
        x: v.toX(WAVE_X0 + u * WAVE_UNIT),
        y: v.toY(waveValue(scene.wave, scene.theta - u)),
      });
    }
    ctx.strokeStyle = rgba(COLORS.ghost, alpha * scene.ghost * 0.5);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ghost.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The plotted partial sum: history to the right of the circles.
  const curve: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const u = (reachU * i) / steps;
    curve.push({
      x: v.toX(WAVE_X0 + u * WAVE_UNIT),
      y: v.toY(partialSum(terms, scene.theta - u, weight)),
    });
  }

  const joints = chain(terms, scene.theta, weight).map((p) => ({
    x: p.x + centre.x,
    y: p.y + centre.y,
  }));
  const tip = joints[joints.length - 1];

  if (scene.showCircles) {
    drawCircles(
      ctx,
      v,
      joints,
      terms.map((term, i) => term.amp * weight(i)),
      alpha,
      scene.reveal
    );
  }

  // "×n" tags on the first circles while the idea is introduced.
  if (scene.tags > 0) {
    ctx.font = `500 ${Math.round(13 * Math.min(1.4, v.k / 90))}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    terms.forEach((term, i) => {
      const w = weight(i);
      if (w <= 0 || i > 2) return;
      const j = joints[i];
      ctx.fillStyle = rgba(COLORS.circle, alpha * scene.tags * w);
      ctx.fillText(`×${term.freq}`, v.toX(j.x), v.toY(j.y + term.amp * w) - 8);
    });
  }

  // Connector from the tip to where the wave is being written.
  if (scene.reach > 0) {
    ctx.strokeStyle = rgba(COLORS.tip, alpha * 0.45 * scene.reveal);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(v.toX(tip.x), v.toY(tip.y));
    ctx.lineTo(v.toX(WAVE_X0), v.toY(tip.y));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  glowLine(ctx, curve, COLORS.stroke, alpha * Math.min(1, scene.reach * 4));
  if (scene.reach > 0) {
    drawTip(ctx, v.toX(WAVE_X0), v.toY(tip.y), alpha * 0.9);
  }
  drawTip(ctx, v.toX(tip.x), v.toY(tip.y), alpha * scene.reveal);

  // Overshoot annotation at the frozen jump.
  if (scene.gibbs > 0 && scene.wave === 'square') {
    const count = Math.max(1, Math.round(scene.waveCount));
    const over = squareOvershoot(count);
    const peak = 1 + 2 * over;
    const x0 = v.toX(GIBBS_X);
    // The peak sits just left of the jump (history runs to the right).
    const x1 = v.toX(GIBBS_X - 0.9);
    const yOne = v.toY(1);
    const yPeak = v.toY(peak);
    const a = alpha * scene.gibbs;
    ctx.strokeStyle = rgba(COLORS.tip, a * 0.9);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x0, yPeak);
    ctx.lineTo(x1, yPeak);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, yOne);
    ctx.lineTo(x1, yPeak);
    ctx.moveTo(x1 - 4, yOne);
    ctx.lineTo(x1 + 4, yOne);
    ctx.moveTo(x1 - 4, yPeak);
    ctx.lineTo(x1 + 4, yPeak);
    ctx.stroke();
    ctx.fillStyle = rgba(COLORS.tip, a);
    ctx.font = `600 14px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(
      text.overshoot((over * 100).toFixed(1)),
      x1 - 10,
      (yOne + yPeak) / 2 + 5
    );
  }
}

function paintPath(
  ctx: CanvasRenderingContext2D,
  v: View,
  scene: FourierScene,
  data: FourierData,
  alpha: number
) {
  const source = scene.path === 'custom' && data.custom ? data.custom : data.pi;
  const all = source.cycles;
  // Index 0 is the centre; `pathCount` counts the circles after it.
  const shown = Math.min(all.length, Math.ceil(scene.pathCount) + 1);
  const cycles = all.slice(0, shown);
  const weight = (i: number) =>
    i === 0 ? 1 : clamp01(scene.pathCount - i + 1);
  const s = PATH_SCALE;
  const at = (p: Point) => ({ x: v.toX(p.x * s), y: v.toY(p.y * s) });

  if (scene.ghost > 0) {
    ctx.strokeStyle = rgba(COLORS.ghost, alpha * scene.ghost * 0.45);
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    source.samples.forEach((p, i) => {
      const q = at(p);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const head = scene.tau;
  const span = scene.trail;
  const steps = Math.max(2, Math.round(560 * span));
  const trail: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    trail.push(at(pathPoint(cycles, head - span + (span * i) / steps, weight)));
  }
  // Older parts of the trail fade so the pen's direction reads.
  const chunks = 24;
  for (let c = 0; c < chunks; c++) {
    const from = Math.floor((trail.length - 1) * (c / chunks));
    const to = Math.floor((trail.length - 1) * ((c + 1) / chunks)) + 1;
    const age = (c + 1) / chunks;
    glowLine(
      ctx,
      trail.slice(from, to),
      COLORS.stroke,
      alpha * (span < 1 ? 1 : 0.38 + 0.62 * age)
    );
  }

  // Circles: rotating vectors chained from the centre term.
  const theta = 2 * Math.PI * head;
  const joints: Point[] = [];
  let x = 0;
  let y = 0;
  const radii: number[] = [];
  for (let i = 0; i < cycles.length; i++) {
    const w = weight(i);
    const { freq, amp, phase } = cycles[i];
    const a = freq * theta + phase;
    if (i === 0) {
      x = amp * Math.cos(a);
      y = amp * Math.sin(a);
      joints.push({ x: x * s, y: y * s });
      continue;
    }
    radii.push(amp * w * s);
    x += amp * w * Math.cos(a);
    y += amp * w * Math.sin(a);
    joints.push({ x: x * s, y: y * s });
  }
  if (scene.showCircles) drawCircles(ctx, v, joints, radii, alpha, 1);
  const tip = joints[joints.length - 1];
  drawTip(ctx, v.toX(tip.x), v.toY(tip.y), alpha);
}

/**
 * Paint one frame. `width`/`height` are CSS pixels; the caller has already
 * scaled the context for the device pixel ratio and cleared it.
 */
export function paintFourier(
  ctx: CanvasRenderingContext2D,
  scene: FourierScene,
  data: FourierData,
  width: number,
  height: number,
  text: FourierPaintText,
  insets: StageInsets = NO_INSETS
) {
  const v = view(scene, width, height, insets);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (scene.mix < 1) paintWave(ctx, v, scene, data, text, 1 - scene.mix);
  if (scene.mix > 0) paintPath(ctx, v, scene, data, scene.mix);
}

/**
 * The π drawn by its largest `circles` circles as an SVG path in path-scene
 * units (y down), for static posters. Server-renderable.
 */
export function fourierPosterPath(circles = 40): string {
  const cycles = pathEpicycles(piSamples()).slice(0, circles + 1);
  const pts: string[] = [];
  const steps = 360;
  for (let i = 0; i < steps; i++) {
    const p = pathPoint(cycles, i / steps, () => 1);
    pts.push(
      `${(p.x * PATH_SCALE).toFixed(3)},${(-p.y * PATH_SCALE).toFixed(3)}`
    );
  }
  return `M${pts.join('L')}Z`;
}

/** The first circles of the π chain at progress `tau`, for static posters. */
export function fourierPosterCircles(
  count = 7,
  tau = 0.32
): { cx: number; cy: number; r: number }[] {
  const cycles = pathEpicycles(piSamples()).slice(0, count + 1);
  const theta = 2 * Math.PI * tau;
  const out: { cx: number; cy: number; r: number }[] = [];
  let x = 0;
  let y = 0;
  cycles.forEach(({ freq, amp, phase }, i) => {
    const a = freq * theta + phase;
    if (i > 0)
      out.push({
        cx: x * PATH_SCALE,
        cy: -y * PATH_SCALE,
        r: amp * PATH_SCALE,
      });
    x += amp * Math.cos(a);
    y += amp * Math.sin(a);
  });
  return out;
}

// ── Engine ────────────────────────────────────────────────────────────────

const FREE_SPIN = SPIN;
const FREE_TRACE = TRACE;

export const isWaveShape = (shape: FourierShape): shape is Wave =>
  shape !== 'pi' && shape !== 'custom';

export type FourierTarget = {
  shape: FourierShape;
  count: number;
  showCircles: boolean;
};

/**
 * The Fourier wonder for the shared stage. Story frames come straight from
 * `fourierStory(t)`; free play eases the live scene towards `target`, and a
 * free-hand stroke is collected while `drawing` is on.
 */
export class FourierEngine implements WonderEngine {
  readonly beats = FOURIER_BEATS;
  readonly length = FOURIER_STORY_LENGTH;
  readonly data: FourierData = fourierData();
  scene: FourierScene = fourierStory(0);
  target: FourierTarget = { shape: 'pi', count: 30, showCircles: true };
  drawing = false;
  stroke: Point[] = [];
  private height = 0;

  constructor(private text: FourierPaintText) {}

  attach() {}

  resize(_width: number, height: number) {
    this.height = height;
  }

  /** The shape on screen, for leaving the story where it is. */
  onScreen(): FourierShape {
    return this.scene.mix > 0.5 ? this.scene.path : this.scene.wave;
  }

  /** Circles on screen right now (centre excluded on paths). */
  circles(): number {
    const s = this.scene;
    return Math.round(s.mix > 0.5 ? s.pathCount : s.waveCount);
  }

  leaveStory() {
    const shape = this.onScreen();
    this.scene = { ...this.scene, gibbs: 0, tags: 0, reveal: 1, reach: 1 };
    this.target = {
      ...this.target,
      shape,
      count: Math.min(
        isWaveShape(shape) ? MAX_WAVE_CIRCLES : MAX_PATH_CIRCLES,
        this.circles()
      ),
    };
  }

  replay() {
    this.drawing = false;
    this.stroke = [];
    this.target = {
      shape: 'pi',
      count: 30,
      showCircles: this.target.showCircles,
    };
  }

  /** Use a finished free-hand stroke (in CSS pixels, y down). */
  finishStroke(): boolean {
    const samples = normalizeStroke(
      this.stroke.map((p) => ({ x: p.x, y: this.height - p.y }))
    );
    this.stroke = [];
    if (!samples) return false;
    this.data.custom = { samples, cycles: pathEpicycles(samples) };
    this.drawing = false;
    // Start from a couple of circles so the drawing visibly assembles.
    this.scene = {
      ...this.scene,
      path: 'custom',
      pathCount: 2,
      tau: 0,
      mix: 1,
    };
    this.target = { ...this.target, shape: 'custom', count: 80 };
    return true;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = {
        ...fourierStory(f.t),
        showCircles: this.target.showCircles,
      };
    } else {
      this.scene = this.stepFree(f.dt, f.playing && !this.drawing);
    }
    if (this.drawing) {
      paintStroke(ctx, this.stroke);
      return;
    }
    paintFourier(
      ctx,
      this.scene,
      this.data,
      f.width,
      f.height,
      this.text,
      f.insets
    );
  }

  private stepFree(dt: number, moving: boolean): FourierScene {
    const s = this.scene;
    const { shape, count: n, showCircles } = this.target;
    const wave = isWaveShape(shape);
    const ease = 1 - Math.exp(-dt * 6);
    const spin = moving ? 1 : 0;
    return {
      ...s,
      theta: s.theta + FREE_SPIN * dt * spin,
      tau: s.tau + FREE_TRACE * dt * spin,
      wave: wave ? shape : s.wave,
      path: shape === 'custom' ? 'custom' : shape === 'pi' ? 'pi' : s.path,
      waveCount: wave ? s.waveCount + (n - s.waveCount) * ease : s.waveCount,
      pathCount: wave ? s.pathCount : s.pathCount + (n - s.pathCount) * ease,
      mix: s.mix + ((wave ? 0 : 1) - s.mix) * ease,
      trail: 1,
      reach: 1,
      reveal: 1,
      ghost: s.ghost + (0.4 - s.ghost) * ease,
      gibbs: s.gibbs * (1 - ease),
      tags: 0,
      showCircles,
      camera: {
        x: s.camera.x * (1 - ease),
        y: s.camera.y * (1 - ease),
        zoom: s.camera.zoom + (1 - s.camera.zoom) * ease,
      },
    };
  }
}

/** The free-hand stroke while it is being drawn (CSS pixels, y down). */
function paintStroke(ctx: CanvasRenderingContext2D, stroke: readonly Point[]) {
  if (stroke.length < 2) return;
  for (const [w, a] of [
    [10, 0.12],
    [5, 0.22],
    [2.4, 1],
  ] as const) {
    ctx.strokeStyle = `rgba(110,231,255,${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    stroke.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
}
