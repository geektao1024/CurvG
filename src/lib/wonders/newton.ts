/**
 * Newton's method in the complex plane: every starting point slides,
 * tangent by tangent, towards a root; colour each point by the root it
 * reaches and the borders between the roots' territories are fractal.
 * Math, story and a WebGL2 engine (2D layer for roots, tangents, paths).
 *
 * For p(z) = ∏(z − r_k) the Newton step is z − p/p′ = z − 1 / Σ 1/(z − r_k),
 * so a polynomial is just its list of roots and the reader can drag them.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { clamp01, easeSine, lerp, track } from './timeline';

export type C = { re: number; im: number };

const add = (a: C, b: C): C => ({ re: a.re + b.re, im: a.im + b.im });
const sub = (a: C, b: C): C => ({ re: a.re - b.re, im: a.im - b.im });
const inv = (a: C): C => {
  const d = a.re * a.re + a.im * a.im;
  return { re: a.re / d, im: -a.im / d };
};

/** One Newton step for the polynomial with these roots. */
export function newtonStep(z: C, roots: readonly C[]): C {
  let s: C = { re: 0, im: 0 };
  for (const r of roots) s = add(s, inv(sub(z, r)));
  return sub(z, inv(s));
}

/** Converged when this close to a root. */
export const EPS = 1e-6;

/**
 * Which root a start reaches (index, or −1 if none within `max` steps) and
 * after how many steps.
 */
export function basinOf(
  z: C,
  roots: readonly C[],
  max = 120
): { root: number; steps: number } {
  for (let n = 0; n <= max; n++) {
    for (let k = 0; k < roots.length; k++) {
      if (Math.hypot(z.re - roots[k].re, z.im - roots[k].im) < EPS) {
        return { root: k, steps: n };
      }
    }
    z = newtonStep(z, roots);
    if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) break;
  }
  return { root: -1, steps: max };
}

/** The path from a start: z₀, z₁, … until it lands (at most `max` steps). */
export function newtonPath(z: C, roots: readonly C[], max = 40): C[] {
  const path = [z];
  for (let n = 0; n < max; n++) {
    if (roots.some((r) => Math.hypot(z.re - r.re, z.im - r.im) < 1e-4)) break;
    z = newtonStep(z, roots);
    if (!Number.isFinite(z.re) || Math.hypot(z.re, z.im) > 1e6) break;
    path.push(z);
  }
  return path;
}

/** Newton for √2 on the real line, from x₀: x ← x − (x² − 2)/(2x). */
export function sqrt2Steps(x0 = 1, steps = 4): number[] {
  const out: number[] = [];
  let x = x0;
  for (let i = 0; i < steps; i++) {
    x = x - (x * x - 2) / (2 * x);
    out.push(x);
  }
  return out;
}

/** Correct decimal places of an approximation of √2. */
export function correctPlaces(x: number): number {
  return Math.floor(-Math.log10(Math.abs(x - Math.SQRT2)));
}

const unity = (n: number, turn = 0): C[] =>
  Array.from({ length: n }, (_, k) => ({
    re: Math.cos((2 * Math.PI * k) / n + turn),
    im: Math.sin((2 * Math.PI * k) / n + turn),
  }));

/** Roots of z³ − 2z + 2 (one real, a complex pair), found by Newton. */
function cycleRoots(): C[] {
  const solve = (seed: C): C => {
    let x = seed;
    for (let i = 0; i < 80; i++) {
      // z ← z − (z³ − 2z + 2)/(3z² − 2)
      const z2 = { re: x.re * x.re - x.im * x.im, im: 2 * x.re * x.im };
      const z3 = {
        re: z2.re * x.re - z2.im * x.im,
        im: z2.re * x.im + z2.im * x.re,
      };
      const f = { re: z3.re - 2 * x.re + 2, im: z3.im - 2 * x.im };
      const d = { re: 3 * z2.re - 2, im: 3 * z2.im };
      const dd = d.re * d.re + d.im * d.im;
      x = {
        re: x.re - (f.re * d.re + f.im * d.im) / dd,
        im: x.im - (f.im * d.re - f.re * d.im) / dd,
      };
    }
    return x;
  };
  return [
    solve({ re: -2, im: 0 }),
    solve({ re: 1, im: 1 }),
    solve({ re: 1, im: -1 }),
  ];
}

export type PolyKey = 'z2' | 'z3' | 'z4' | 'z5' | 'cycle';

export const POLYS: Record<PolyKey, { label: string; roots: C[] }> = {
  z2: { label: 'z² − 1', roots: unity(2) },
  z3: { label: 'z³ − 1', roots: unity(3) },
  z4: { label: 'z⁴ − 1', roots: unity(4) },
  z5: { label: 'z⁵ − 1', roots: unity(5) },
  cycle: { label: 'z³ − 2z + 2', roots: cycleRoots() },
};

/** −2^(−1/3): on the real axis, its first step lands exactly on 0. */
export const CUBE_BOUNDARY: C = { re: -Math.pow(2, -1 / 3), im: 0 };

/**
 * A point on the border between two roots' territories: bisect the segment
 * from root `a` to root `b` for where the reached root changes.
 */
export function boundaryPoint(roots: readonly C[], a = 0, b = 1): C {
  let lo = roots[a];
  let hi = roots[b];
  const label = (z: C) => basinOf(z, roots, 80).root;
  const l0 = label(lo);
  for (let i = 0; i < 48; i++) {
    const mid = { re: (lo.re + hi.re) / 2, im: (lo.im + hi.im) / 2 };
    if (label(mid) === l0) lo = mid;
    else hi = mid;
  }
  return { re: (lo.re + hi.re) / 2, im: (lo.im + hi.im) / 2 };
}

// ── Views ─────────────────────────────────────────────────────────────────

export type NewtonView = { re: number; im: number; width: number };

export const FULL: NewtonView = { re: 0, im: 0, width: 4.8 };
/** Narrowest view: single-precision floats in the shader run out below. */
export const MIN_WIDTH = 2e-4;
export const MAX_WIDTH = 14;

/**
 * Between two views at a steady rate in log-width, the target staying put
 * on screen (so a zoom dives straight into it).
 */
export function zoomPath(
  from: NewtonView,
  to: NewtonView,
  u: number
): NewtonView {
  if (u <= 0) return { ...from };
  if (u >= 1) return { ...to };
  const width = Math.exp(lerp(Math.log(from.width), Math.log(to.width), u));
  const k =
    Math.abs(from.width - to.width) < 1e-12
      ? 1 - u
      : (width - to.width) / (from.width - to.width);
  return {
    re: to.re + (from.re - to.re) * k,
    im: to.im + (from.im - to.im) * k,
    width,
  };
}

// ── Story ─────────────────────────────────────────────────────────────────

export const NEWTON_BEATS = [0, 8, 15, 21, 28, 36, 43, 50] as const;
export const NEWTON_STORY_LENGTH = 55;

/** Story views (pinned by tests against the captions). */
export const TANGENT_VIEW: NewtonView = { re: 1.1, im: -0.14, width: 2.6 };
export const ZOOM_VIEW: NewtonView = { ...CUBE_BOUNDARY, width: 0.004 };
export const CYCLE_VIEW: NewtonView = { re: 0.45, im: 0, width: 2.4 };

const VIEW_KEYS: readonly [number, NewtonView][] = [
  [0, TANGENT_VIEW],
  [8.2, TANGENT_VIEW],
  [10.4, FULL],
  [28.6, FULL],
  [34.6, ZOOM_VIEW],
  [36.4, ZOOM_VIEW],
  [39.4, FULL],
  [43.2, FULL],
  [45.2, CYCLE_VIEW],
];

function storyView(t: number): NewtonView {
  if (t <= VIEW_KEYS[0][0]) return { ...VIEW_KEYS[0][1] };
  for (let i = 1; i < VIEW_KEYS.length; i++) {
    const [t1, v1] = VIEW_KEYS[i];
    if (t < t1) {
      const [t0, v0] = VIEW_KEYS[i - 1];
      return zoomPath(v0, v1, easeSine(clamp01((t - t0) / (t1 - t0))));
    }
  }
  return { ...VIEW_KEYS[VIEW_KEYS.length - 1][1] };
}

const polyAt = (t: number): PolyKey =>
  t < 14.6 ? 'z2' : t < 43.1 ? 'z3' : 'cycle';
/** The coloured territories: z² − 1, hidden for the guess, z³ − 1, the cycle. */
const fractalAt = track([
  [8.6, 0],
  [10, 1],
  [14, 1],
  [14.6, 0],
  [21.4, 0],
  [23.4, 1],
  [42.4, 1],
  [43.1, 0],
  [43.6, 0],
  [44.8, 1],
]);
/** Newton on the real line, steps shown so far (0–4). */
const tangentAt = track([
  [0.8, 0],
  [2.6, 1],
  [3.6, 1],
  [5, 2],
  [5.6, 2],
  [6.6, 3],
  [7, 3],
  [7.6, 4],
]);
const tangentAlpha = track([
  [0, 1],
  [8.2, 1],
  [9.2, 0],
]);
/** Dashed three-sector guess of beat 2. */
const guessAt = track([
  [15.4, 0],
  [16.4, 1],
  [21.6, 1],
  [23, 0],
]);
const rootsAt = track([
  [8.6, 0],
  [9.6, 1],
]);

export type StoryPath = { start: C; t0: number; t1: number };

/** Starts near the guessed sector lines that end somewhere surprising. */
export const GUESS_STARTS: readonly C[] = [
  { re: 0.32, im: 0.62 },
  { re: -0.68, im: 0.03 },
  { re: 0.3, im: -0.6 },
];
/** Beat 5: a start near 0, where the tangent is flat, thrown far away. */
export const NEAR_POLE: C = { re: 0.14, im: 0.05 };

export type NewtonScene = {
  view: NewtonView;
  poly: PolyKey;
  fractal: number;
  tangent: { steps: number; alpha: number };
  guess: number;
  roots: number;
  /** Paths drawn now: start, steps shown, alpha. */
  paths: { start: C; steps: number; alpha: number }[];
  /** The 0 ↔ 1 cycle of z³ − 2z + 2, 0–1. */
  cycle: number;
};

const pathsIn = (t: number, from: number, to: number, fade = 0.8) =>
  Math.min(clamp01((t - from) / fade), clamp01((to - t) / fade));

export function newtonStory(t: number): NewtonScene {
  const guessPaths = GUESS_STARTS.map((start, i) => ({
    start,
    steps: Math.max(0, (t - 17 - i * 1.1) * 2.4),
    alpha: pathsIn(t, 16.6 + i * 1.1, 27.6),
  }));
  const pole = {
    start: NEAR_POLE,
    steps: Math.max(0, (t - 37.6) * 2),
    alpha: pathsIn(t, 37.2, 42.6),
  };
  return {
    view: storyView(t),
    poly: polyAt(t),
    fractal: fractalAt(t),
    tangent: { steps: tangentAt(t), alpha: tangentAlpha(t) },
    guess: guessAt(t),
    roots: rootsAt(t),
    paths: [...guessPaths, pole].filter((p) => p.alpha > 0.001),
    cycle: pathsIn(t, 45.4, NEWTON_STORY_LENGTH + 1),
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

const MAX_ROOTS = 6;

export const ROOT_COLORS: readonly (readonly [number, number, number])[] = [
  [80, 220, 255],
  [255, 100, 170],
  [255, 184, 77],
  [170, 140, 255],
  [120, 240, 150],
  [90, 140, 255],
];

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_roots[${MAX_ROOTS}];
uniform vec3 u_cols[${MAX_ROOTS}];
uniform int u_n;
uniform int u_maxIter;
uniform vec2 u_origin;   // CSS px of the view centre
uniform vec2 u_centre;   // plane point at the view centre
uniform float u_scale;   // plane units per CSS px
uniform float u_ratio;   // device px per CSS px
uniform float u_hdev;
uniform float u_alpha;
out vec4 o;

// Colour of a start, and the root it reaches in .w (−1: none).
vec4 shade(vec2 z) {
  const float LOG_EPS = log(1e-3);
  for (int i = 0; i < 400; i++) {
    if (i >= u_maxIter) break;
    vec2 s = vec2(0.0);
    for (int k = 0; k < ${MAX_ROOTS}; k++) {
      if (k >= u_n) break;
      vec2 d = z - u_roots[k];
      float q = dot(d, d);
      if (q < 1e-6) {
        // Landed: a little brighter the more steps it took (smoothed), so
        // each territory is dark at its root with rings of equal steps.
        float sm = float(i) - log2(max(1.0, 0.5 * log(max(q, 1e-30)) / LOG_EPS));
        float lit = 1.0 - exp(-0.13 * max(sm, 0.0));
        float ring = 0.88 + 0.12 * cos(sm * 3.14159);
        return vec4(u_cols[k] * (0.1 + 0.55 * lit) * ring, float(k));
      }
      s += vec2(d.x, -d.y) / q;
    }
    float ss = dot(s, s);
    if (ss < 1e-30) break;
    z -= vec2(s.x, -s.y) / ss;
  }
  return vec4(0.012, 0.012, 0.03, -1.0);
}

void main() {
  vec3 col = vec3(0.0);
  float first = -2.0;
  float edge = 0.0;
  // 2×2 samples per pixel; where they reach different roots the pixel sits
  // on a border, and the border is drawn as light.
  for (int sy = 0; sy < 2; sy++) {
    for (int sx = 0; sx < 2; sx++) {
      vec2 dev = gl_FragCoord.xy + (vec2(float(sx), float(sy)) - 0.5) * 0.5;
      vec2 css = vec2(dev.x, u_hdev - dev.y) / u_ratio;
      vec2 z = u_centre + vec2(css.x - u_origin.x, u_origin.y - css.y) * u_scale;
      vec4 c = shade(z);
      col += c.rgb;
      if (first < -1.5) first = c.w;
      else if (c.w != first) edge = 1.0;
    }
  }
  col = mix(col * 0.25, vec3(1.0, 0.96, 0.9), 0.75 * edge);
  o = vec4(col * u_alpha, u_alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader');
  }
  return sh;
}

export type NewtonText = {
  noWebgl: string;
  /** Path label: reached a root after n steps. */
  reached: (steps: number) => string;
  never: string;
  /** Beat 2 label on the dashed sectors. */
  guess: string;
};

export const NEWTON_FREE_FILM_MIN = 10;

export class NewtonEngine implements WonderEngine {
  readonly beats = NEWTON_BEATS;
  readonly length = NEWTON_STORY_LENGTH;
  readonly gl = true;
  /** Cold open: the dive into the border at −2^(−1/3). */
  readonly teaser = [31, 35] as const;
  readonly glow = 0.5;

  scene: NewtonScene = newtonStory(0);
  view: NewtonView = FULL;
  roots: C[] = POLYS.z3.roots.map((r) => ({ ...r }));
  preset: PolyKey | null = 'z3';
  probe: C[] | null = null;
  failed = false;
  /** Device px per CSS px cap; exports raise it. */
  maxRatio = 1.25;
  /** Called when the reader takes over (wheel). */
  onInteract: () => void = () => {};

  private ctx: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ui: HTMLCanvasElement | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private ratio = 1;
  private lastKey = '';
  private geom = { cx: 0, cy: 0, scale: 1 };
  private target: { from: NewtonView; to: NewtonView; t: number } | null = null;
  private film: {
    from: NewtonView;
    to: NewtonView;
    seconds: number;
    t: number;
  } | null = null;

  constructor(private text: NewtonText) {}

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    this.onInteract();
    this.zoomAt(
      e.clientX - r.left,
      e.clientY - r.top,
      Math.exp(e.deltaY * 0.0015)
    );
  };

  attach({ gl, ui }: { gl: HTMLCanvasElement | null; ui: HTMLCanvasElement }) {
    this.ui = ui;
    ui.addEventListener('wheel', this.onWheel, { passive: false });
    if (!gl) return;
    this.canvas = gl;
    const ctx = gl.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: true,
    });
    if (!ctx) {
      this.failed = true;
      return;
    }
    try {
      const prog = ctx.createProgram()!;
      ctx.attachShader(prog, compile(ctx, ctx.VERTEX_SHADER, VERT));
      ctx.attachShader(prog, compile(ctx, ctx.FRAGMENT_SHADER, FRAG));
      ctx.linkProgram(prog);
      if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
        throw new Error(ctx.getProgramInfoLog(prog) ?? 'link');
      }
      ctx.useProgram(prog);
      const buf = ctx.createBuffer();
      ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
      ctx.bufferData(
        ctx.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        ctx.STATIC_DRAW
      );
      const loc = ctx.getAttribLocation(prog, 'a_pos');
      ctx.enableVertexAttribArray(loc);
      ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
      for (const name of [
        'u_roots',
        'u_cols',
        'u_n',
        'u_maxIter',
        'u_origin',
        'u_centre',
        'u_scale',
        'u_ratio',
        'u_hdev',
        'u_alpha',
      ]) {
        this.u[name] = ctx.getUniformLocation(prog, name);
      }
      this.ctx = ctx;
    } catch {
      this.failed = true;
    }
  }

  detach() {
    this.ui?.removeEventListener('wheel', this.onWheel);
    this.ctx?.getExtension('WEBGL_lose_context')?.loseContext();
    this.ctx = null;
  }

  resize(width: number, height: number, dpr: number) {
    if (!this.canvas) return;
    this.ratio = Math.min(dpr, this.maxRatio);
    this.canvas.width = Math.round(width * this.ratio);
    this.canvas.height = Math.round(height * this.ratio);
    this.lastKey = '';
  }

  leaveStory() {
    this.view = { ...this.scene.view };
    this.preset = this.scene.poly;
    this.roots = POLYS[this.scene.poly].roots.map((r) => ({ ...r }));
    this.target = null;
    this.probe = null;
  }

  replay() {
    this.probe = null;
    this.target = null;
    this.film = null;
  }

  clone(): NewtonEngine {
    const e = new NewtonEngine(this.text);
    e.view = { ...this.view };
    e.roots = this.roots.map((r) => ({ ...r }));
    e.preset = this.preset;
    e.scene = { ...this.scene };
    e.maxRatio = 2;
    return e;
  }

  /** Overview framing all the roots. */
  overview(): NewtonView {
    const n = this.roots.length;
    const re = this.roots.reduce((s, r) => s + r.re, 0) / n;
    const im = this.roots.reduce((s, r) => s + r.im, 0) / n;
    const spread = Math.max(
      ...this.roots.map((r) => Math.hypot(r.re - re, r.im - im))
    );
    return { re, im, width: Math.max(FULL.width, spread * 4.2) };
  }

  /**
   * "My version": dive from the overview into the reader's view at a steady
   * rate in log-width; from an overview, into a border point instead.
   */
  freeFilm(): number {
    const from = this.overview();
    const to =
      this.view.width > 1.2
        ? { ...boundaryPoint(this.roots), width: 0.004 }
        : { ...this.view };
    const depth = Math.log2(from.width / to.width);
    const seconds = Math.min(
      24,
      Math.max(NEWTON_FREE_FILM_MIN, 3 + depth * 1.1)
    );
    this.film = { from, to, seconds, t: 0 };
    this.view = from;
    this.target = null;
    this.probe = null;
    return seconds + 2;
  }

  flyTo(view: NewtonView) {
    this.target = { from: { ...this.view }, to: view, t: 0 };
  }

  setRoots(roots: C[], preset: PolyKey | null) {
    this.roots = roots.slice(0, MAX_ROOTS).map((r) => ({ ...r }));
    this.preset = preset;
    this.probe = null;
  }

  pointAt(x: number, y: number): C {
    const { cx, cy, scale } = this.geom;
    return {
      re: this.view.re + (x - cx) * scale,
      im: this.view.im - (y - cy) * scale,
    };
  }

  /** Root under a CSS pixel (within `radius` px), or −1. */
  rootNear(x: number, y: number, radius = 18): number {
    const { cx, cy, scale } = this.geom;
    let best = -1;
    let bestD = radius;
    this.roots.forEach((r, i) => {
      const d = Math.hypot(
        cx + (r.re - this.view.re) / scale - x,
        cy - (r.im - this.view.im) / scale - y
      );
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  moveRoot(i: number, x: number, y: number) {
    const p = this.pointAt(x, y);
    this.roots[i] = {
      re: Math.max(-4, Math.min(4, p.re)),
      im: Math.max(-4, Math.min(4, p.im)),
    };
    this.preset = null;
    if (this.probe) this.probe = newtonPath(this.probe[0], this.roots);
  }

  pan(dx: number, dy: number) {
    const { scale } = this.geom;
    this.target = null;
    this.view = {
      ...this.view,
      re: this.view.re - dx * scale,
      im: this.view.im + dy * scale,
    };
  }

  zoomAt(x: number, y: number, factor: number) {
    const p = this.pointAt(x, y);
    const width = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, this.view.width * factor)
    );
    const f = width / this.view.width;
    this.target = null;
    this.view = {
      re: p.re + (this.view.re - p.re) * f,
      im: p.im + (this.view.im - p.im) * f,
      width,
    };
  }

  probeAt(x: number, y: number) {
    this.probe = newtonPath(this.pointAt(x, y), this.roots);
  }

  frame(f: WonderFrame, ui: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = newtonStory(f.t);
      this.view = this.scene.view;
    } else {
      if (this.film) {
        const film = this.film;
        film.t += f.dt;
        this.view = zoomPath(
          film.from,
          film.to,
          easeSine(clamp01(film.t / film.seconds))
        );
      } else if (this.target) {
        const tg = this.target;
        tg.t = Math.min(1, tg.t + f.dt / 2);
        this.view = zoomPath(tg.from, tg.to, easeSine(tg.t));
        if (tg.t >= 1) this.target = null;
      }
      this.scene = {
        ...this.scene,
        view: this.view,
        fractal: 1,
        tangent: { steps: 0, alpha: 0 },
        guess: 0,
        roots: 1,
        paths: [],
        cycle: 0,
      };
    }
    const roots =
      f.mode === 'story' ? POLYS[this.scene.poly].roots : this.roots;
    const area = safeArea(f.width, f.height, f.insets);
    const scale = this.view.width / area.w;
    this.geom = { cx: area.cx, cy: area.cy, scale };
    if (this.failed) {
      ui.fillStyle = 'rgba(236,234,244,0.7)';
      ui.font = '15px system-ui, sans-serif';
      ui.textAlign = 'center';
      ui.fillText(this.text.noWebgl, area.cx, area.cy);
    } else {
      this.paintGl(roots, area.cx, area.cy, scale);
    }
    this.paintOverlay(ui, f, roots, area.cx, area.cy, scale);
  }

  private paintGl(roots: readonly C[], cx: number, cy: number, scale: number) {
    const gl = this.ctx;
    if (!gl || !this.canvas) return;
    const s = this.scene;
    const key = [
      this.view.re,
      this.view.im,
      this.view.width,
      s.fractal,
      ...roots.flatMap((r) => [r.re, r.im]),
      cx,
      cy,
      this.canvas.width,
      this.canvas.height,
    ].join();
    if (key === this.lastKey) return;
    this.lastKey = key;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (s.fractal < 0.002) return;
    const flat = new Float32Array(MAX_ROOTS * 2);
    const cols = new Float32Array(MAX_ROOTS * 3);
    roots.forEach((r, i) => {
      flat[i * 2] = r.re;
      flat[i * 2 + 1] = r.im;
      const c = ROOT_COLORS[i % ROOT_COLORS.length];
      cols[i * 3] = c[0] / 255;
      cols[i * 3 + 1] = c[1] / 255;
      cols[i * 3 + 2] = c[2] / 255;
    });
    gl.uniform2fv(this.u.u_roots, flat);
    gl.uniform3fv(this.u.u_cols, cols);
    gl.uniform1i(this.u.u_n, roots.length);
    gl.uniform1i(this.u.u_maxIter, 160);
    gl.uniform2f(this.u.u_origin, cx, cy);
    gl.uniform2f(this.u.u_centre, this.view.re, this.view.im);
    gl.uniform1f(this.u.u_scale, scale);
    gl.uniform1f(this.u.u_ratio, this.ratio);
    gl.uniform1f(this.u.u_hdev, this.canvas.height);
    gl.uniform1f(this.u.u_alpha, s.fractal);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private paintOverlay(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    roots: readonly C[],
    cx: number,
    cy: number,
    scale: number
  ) {
    const s = this.scene;
    const v = this.view;
    const X = (re: number) => cx + (re - v.re) / scale;
    const Y = (im: number) => cy - (im - v.im) / scale;
    const mono = '500 12px "JetBrains Mono", ui-monospace, monospace';

    // Axes, faint (stronger while the real-line demo runs).
    const axes = 0.1 + 0.25 * s.tangent.alpha;
    ctx.strokeStyle = `rgba(255,255,255,${axes})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, Y(0));
    ctx.lineTo(f.width, Y(0));
    ctx.moveTo(X(0), 0);
    ctx.lineTo(X(0), f.height);
    ctx.stroke();

    if (s.tangent.alpha > 0.01) this.paintTangents(ctx, f, X, Y, scale);

    // The guess: three tidy sectors split at 60°, 180° and 300°.
    if (s.guess > 0.01) {
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * s.guess})`;
      ctx.lineWidth = 1.4;
      const R = Math.hypot(f.width, f.height);
      for (const a of [Math.PI / 3, Math.PI, (5 * Math.PI) / 3]) {
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        ctx.lineTo(X(0) + Math.cos(a) * R, Y(0) - Math.sin(a) * R);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,255,255,${0.7 * s.guess})`;
      ctx.font = mono;
      ctx.textAlign = 'left';
      ctx.fillText(this.text.guess, X(0) + 14, Y(0) + 26);
      // Faint sector tints in each root's colour.
      roots.forEach((r, i) => {
        const a = Math.atan2(r.im, r.re);
        const c = ROOT_COLORS[i];
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.08 * s.guess})`;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        ctx.arc(X(0), Y(0), R, -a - Math.PI / 3, -a + Math.PI / 3);
        ctx.closePath();
        ctx.fill();
      });
    }

    for (const p of s.paths) {
      const path = newtonPath(p.start, roots);
      drawPath(ctx, path, X, Y, p.alpha, p.steps, roots);
    }
    if (s.cycle > 0.01) {
      // 0 → 1 → 0 → …: Newton never settles.
      const pts = [0, 1, 0, 1].map((re) => ({ re, im: 0 }));
      drawPath(ctx, pts, X, Y, s.cycle, 3, roots, [255, 255, 255]);
      ctx.fillStyle = `rgba(255,255,255,${0.85 * s.cycle})`;
      ctx.font = mono;
      ctx.textAlign = 'center';
      ctx.fillText('0', X(0), Y(0) + 22);
      ctx.fillText('1', X(1), Y(0) + 22);
    }
    if (f.mode === 'free' && this.probe) {
      const path = this.probe;
      drawPath(ctx, path, X, Y, 1, path.length, roots);
      const end = basinOf(path[0], roots, 200);
      ctx.fillStyle = 'rgba(236,234,244,0.9)';
      ctx.font = mono;
      ctx.textAlign = 'left';
      ctx.fillText(
        end.root < 0 ? this.text.never : this.text.reached(end.steps),
        X(path[0].re) + 12,
        Y(path[0].im) - 12
      );
    }

    // Roots: white rings in their colour, draggable in free play.
    if (s.roots > 0.01) {
      roots.forEach((r, i) => {
        const x = X(r.re);
        const y = Y(r.im);
        if (x < -20 || y < -20 || x > f.width + 20 || y > f.height + 20) return;
        const c = ROOT_COLORS[i % ROOT_COLORS.length];
        const g = ctx.createRadialGradient(x, y, 0, x, y, 20);
        g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.5 * s.roots})`);
        g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * s.roots})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${s.roots})`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /**
   * Beat 0: Newton for √2 on the real line, drawn on y = (x² − 2)/4 (a
   * flatter copy of x² − 2 with the same root and the same steps).
   */
  private paintTangents(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    X: (re: number) => number,
    Y: (im: number) => number,
    scale: number
  ) {
    const s = this.scene;
    const a = s.tangent.alpha;
    const g = (x: number) => (x * x - 2) / 4;
    ctx.strokeStyle = `rgba(110,231,255,${0.9 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const x0 = this.view.re - (f.width / 2) * scale;
    const x1 = this.view.re + (f.width / 2) * scale;
    for (let i = 0; i <= 200; i++) {
      const x = lerp(x0, x1, i / 200);
      if (i === 0) ctx.moveTo(X(x), Y(g(x)));
      else ctx.lineTo(X(x), Y(g(x)));
    }
    ctx.stroke();
    const xs = [1, ...sqrt2Steps(1, 4)];
    const shown = s.tangent.steps;
    ctx.font = '500 13px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < 4; i++) {
      const u = clamp01(shown - i);
      if (u <= 0) break;
      const x = xs[i];
      const next = xs[i + 1];
      // Up to the curve, then along the tangent down to the axis.
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * a})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(X(x), Y(0));
      ctx.lineTo(X(x), Y(g(x)));
      ctx.stroke();
      ctx.setLineDash([]);
      const tx = lerp(x, next, u);
      ctx.strokeStyle = `rgba(255,184,77,${0.95 * a})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(g(x)));
      ctx.lineTo(X(tx), Y(g(x) + (x / 2) * (tx - x)));
      ctx.stroke();
      ctx.fillStyle = `rgba(255,184,77,${a})`;
      ctx.beginPath();
      ctx.arc(X(x), Y(0), 4, 0, Math.PI * 2);
      ctx.fill();
      if (u >= 1) {
        // A column below the axis, right of the root, where the curve is not.
        ctx.fillStyle = `rgba(236,234,244,${0.9 * a})`;
        ctx.fillText(
          `x${'₁₂₃₄'[i]} = ${next.toFixed([1, 4, 7, 12][i])}`,
          X(Math.SQRT2) + 36,
          Y(0) + 30 + i * 22
        );
      }
    }
  }
}

/** A Newton path: fading segments, dots, its end root highlighted. */
function drawPath(
  ctx: CanvasRenderingContext2D,
  pts: readonly C[],
  X: (re: number) => number,
  Y: (im: number) => number,
  alpha: number,
  steps: number,
  roots: readonly C[],
  rgb?: readonly number[]
) {
  const end = basinOf(pts[0], roots, 200).root;
  const c =
    rgb ?? (end >= 0 ? ROOT_COLORS[end % ROOT_COLORS.length] : [255, 255, 255]);
  const col = (a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a * alpha})`;
  const last = Math.min(pts.length - 1, Math.floor(steps));
  const frac = steps - Math.floor(steps);
  const clip = (v: number) => Math.max(-4000, Math.min(8000, v));
  ctx.lineWidth = 1.6;
  for (let i = 1; i <= Math.min(pts.length - 1, last + 1); i++) {
    const u = i <= last ? 1 : frac;
    if (u <= 0) break;
    const a = pts[i - 1];
    const b = pts[i];
    ctx.strokeStyle = col(0.85);
    ctx.beginPath();
    ctx.moveTo(clip(X(a.re)), clip(Y(a.im)));
    ctx.lineTo(clip(X(lerp(a.re, b.re, u))), clip(Y(lerp(a.im, b.im, u))));
    ctx.stroke();
  }
  for (let i = 0; i <= last; i++) {
    ctx.fillStyle = col(i === 0 ? 1 : 0.8);
    ctx.beginPath();
    ctx.arc(
      clip(X(pts[i].re)),
      clip(Y(pts[i].im)),
      i === 0 ? 5 : 3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}
