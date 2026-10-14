/**
 * Mandelbrot engine for the wonder stage: a WebGL2 fragment shader paints the
 * set by perturbation around a 64-bit reference orbit (see `mandelbrot.ts`),
 * and the 2D layer draws axes, the |z| = 2 circle and orbits on top.
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import {
  easeView,
  FULL,
  iterationsFor,
  MANDEL_BEATS,
  MANDEL_COLOR_GLSL,
  MANDEL_STORY_LENGTH,
  mandelStory,
  MIN_WIDTH,
  NECK,
  orbit,
  RABBIT,
  referenceOrbit,
  type Complex,
  type MandelScene,
  type MandelView,
} from './mandelbrot';

const REF_ROW = 1024;

const VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_ref;
uniform int u_refLen;
uniform int u_maxIter;
uniform vec2 u_origin;   // CSS px of the view centre
uniform float u_scale;   // complex units per CSS px
uniform float u_ratio;   // device px per CSS px on this canvas
uniform float u_hdev;    // canvas height in device px
uniform float u_alpha;
out vec4 o;
${MANDEL_COLOR_GLSL}
vec2 refAt(int m) {
  return texelFetch(u_ref, ivec2(m % ${REF_ROW}, m / ${REF_ROW}), 0).xy;
}
void main() {
  vec2 css = vec2(gl_FragCoord.x, u_hdev - gl_FragCoord.y) / u_ratio;
  vec2 dc = vec2(css.x - u_origin.x, u_origin.y - css.y) * u_scale;
  vec2 d = vec2(0.0);
  vec2 z = vec2(0.0);
  int m = 0;
  float r2 = 0.0;
  int n = 0;
  bool escaped = false;
  for (int i = 0; i < 8000; i++) {
    if (i >= u_maxIter) break;
    vec2 Z = refAt(m);
    vec2 a = 2.0 * Z + d;
    d = vec2(a.x * d.x - a.y * d.y, a.x * d.y + a.y * d.x) + dc;
    m++;
    z = refAt(m) + d;
    r2 = dot(z, z);
    n = i;
    if (r2 > 256.0) { escaped = true; break; }
    if (r2 < dot(d, d) || m >= u_refLen - 1) { d = z; m = 0; }
  }
  vec3 col = vec3(0.012, 0.012, 0.03);
  if (escaped) {
    float mu = float(n) + 2.0 - log2(0.5 * log(r2));
    col = mandelColor(mu);
  }
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

export type MandelText = {
  /** Shown when WebGL2 is not available. */
  noWebgl: string;
  escaped: (steps: number) => string;
  stays: string;
};

export class MandelbrotEngine implements WonderEngine {
  readonly beats = MANDEL_BEATS;
  readonly length = MANDEL_STORY_LENGTH;
  readonly gl = true;

  /** Free-play view and where it is easing to. */
  view: MandelView = FULL;
  target: MandelView | null = null;
  detail = 1;
  /** A point the reader clicked, with its orbit. */
  probe: { c: Complex; orbit: Complex[] } | null = null;
  scene: MandelScene = mandelStory(0);
  failed = false;

  private ctx: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private program: WebGLProgram | null = null;
  private tex: WebGLTexture | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private lastKey = '';
  private ratio = 1;
  private easeFrom: MandelView | null = null;
  private easeT = 0;
  /** Last frame's geometry, for pointer → plane conversion. */
  private frameGeom = { cx: 0, cy: 0, scale: 1 };

  /** Called when the reader takes over (wheel, drag, tap). */
  onInteract: () => void = () => {};
  private ui: HTMLCanvasElement | null = null;

  constructor(private text: MandelText) {}

  // A native listener: React's wheel handler is passive and cannot stop the
  // page from scrolling while the reader zooms.
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
      this.tex = ctx.createTexture();
      ctx.bindTexture(ctx.TEXTURE_2D, this.tex);
      for (const p of [ctx.TEXTURE_MIN_FILTER, ctx.TEXTURE_MAG_FILTER]) {
        ctx.texParameteri(ctx.TEXTURE_2D, p, ctx.NEAREST);
      }
      for (const name of [
        'u_ref',
        'u_refLen',
        'u_maxIter',
        'u_origin',
        'u_scale',
        'u_ratio',
        'u_hdev',
        'u_alpha',
      ]) {
        this.u[name] = ctx.getUniformLocation(prog, name);
      }
      this.program = prog;
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
    // One device pixel per CSS pixel is plenty for a moving fractal and
    // keeps deep zooms smooth on retina screens.
    this.ratio = Math.min(dpr, 1.25);
    this.canvas.width = Math.round(width * this.ratio);
    this.canvas.height = Math.round(height * this.ratio);
    this.lastKey = '';
  }

  leaveStory() {
    this.view = this.scene.view;
    this.target = null;
  }

  replay() {
    this.probe = null;
    this.target = null;
    this.view = FULL;
  }

  /** Ease to a place; the stage keeps drawing while it moves. */
  flyTo(view: MandelView) {
    this.easeFrom = this.view;
    this.target = view;
    this.easeT = 0;
  }

  /** Plane point under a CSS pixel of the stage. */
  pointAt(x: number, y: number): Complex {
    const { cx, cy, scale } = this.frameGeom;
    return {
      re: this.view.re + (x - cx) * scale,
      im: this.view.im - (y - cy) * scale,
    };
  }

  pan(dx: number, dy: number) {
    const { scale } = this.frameGeom;
    this.target = null;
    this.view = {
      ...this.view,
      re: this.view.re - dx * scale,
      im: this.view.im + dy * scale,
    };
  }

  /** Zoom by `factor` (<1 zooms in) keeping the point under (x, y) fixed. */
  zoomAt(x: number, y: number, factor: number) {
    const p = this.pointAt(x, y);
    const width = Math.min(
      FULL.width * 1.6,
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
    const c = this.pointAt(x, y);
    this.probe = { c, orbit: orbit(c, 120) };
  }

  frame(f: WonderFrame, ui: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = mandelStory(f.t);
      this.view = this.scene.view;
    } else {
      if (this.target && this.easeFrom) {
        this.easeT = Math.min(1, this.easeT + f.dt / 2.2);
        this.view = easeView(this.easeFrom, this.target, this.easeT);
        if (this.easeT >= 1) this.target = null;
      }
      this.scene = {
        ...this.scene,
        view: this.view,
        maxIter: iterationsFor(this.view.width, this.detail),
        fractal: 1,
        guides: this.probe ? 1 : 0,
        rabbitAlpha: 0,
        neckAlpha: 0,
      };
    }

    const area = safeArea(f.width, f.height, f.insets);
    const scale = this.view.width / area.w;
    this.frameGeom = { cx: area.cx, cy: area.cy, scale };

    if (this.failed) {
      ui.fillStyle = 'rgba(236,234,244,0.7)';
      ui.font = '15px system-ui, sans-serif';
      ui.textAlign = 'center';
      ui.fillText(this.text.noWebgl, area.cx, area.cy);
      return;
    }
    this.paintGl(area.cx, area.cy, scale);
    this.paintGuides(ui, f, area.cx, area.cy, scale);
  }

  private paintGl(cx: number, cy: number, scale: number) {
    const gl = this.ctx;
    if (!gl || !this.program || !this.canvas) return;
    const s = this.scene;
    const key = [
      s.view.re,
      s.view.im,
      s.view.width,
      s.maxIter,
      s.fractal,
      cx,
      cy,
      this.canvas.width,
      this.canvas.height,
    ].join();
    if (key === this.lastKey) return;
    this.lastKey = key;

    const ref = referenceOrbit(s.view, s.maxIter);
    const rows = Math.ceil((ref.length + 1) / REF_ROW);
    const data = new Float32Array(REF_ROW * rows * 2);
    data.set(ref.data.subarray(0, Math.min(ref.data.length, data.length)));
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RG32F,
      REF_ROW,
      rows,
      0,
      gl.RG,
      gl.FLOAT,
      data
    );

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform1i(this.u.u_ref, 0);
    gl.uniform1i(this.u.u_refLen, ref.length);
    gl.uniform1i(this.u.u_maxIter, Math.max(1, s.maxIter));
    gl.uniform2f(this.u.u_origin, cx, cy);
    gl.uniform1f(this.u.u_scale, scale);
    gl.uniform1f(this.u.u_ratio, this.ratio);
    gl.uniform1f(this.u.u_hdev, this.canvas.height);
    gl.uniform1f(this.u.u_alpha, s.fractal);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private paintGuides(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    cx: number,
    cy: number,
    scale: number
  ) {
    const s = this.scene;
    const X = (re: number) => cx + (re - s.view.re) / scale;
    const Y = (im: number) => cy - (im - s.view.im) / scale;

    if (s.guides > 0.01) {
      const a = s.guides;
      ctx.strokeStyle = `rgba(255,255,255,${0.12 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Y(0));
      ctx.lineTo(f.width, Y(0));
      ctx.moveTo(X(0), 0);
      ctx.lineTo(X(0), f.height);
      ctx.stroke();
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = `rgba(178,160,255,${0.45 * a})`;
      ctx.beginPath();
      ctx.arc(X(0), Y(0), 2 / scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(178,160,255,${0.7 * a})`;
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        '|z| = 2',
        X(0) + (2 / scale) * 0.72 + 6,
        Y(0) - (2 / scale) * 0.72
      );
    }

    if (s.rabbitAlpha > 0.01 && s.rabbit > 0) {
      const pts = orbit(RABBIT, s.rabbit);
      drawOrbit(ctx, pts, X, Y, s.rabbitAlpha, [110, 231, 255]);
      drawC(ctx, X(RABBIT.re), Y(RABBIT.im), s.rabbitAlpha);
    }
    if (s.neckAlpha > 0.01 && s.neck > 0) {
      // Stop a little after it leaves, before it flies off the page.
      const pts = orbit(NECK, s.neck, 40);
      drawOrbit(ctx, pts, X, Y, s.neckAlpha, [255, 184, 77]);
      drawC(ctx, X(NECK.re), Y(NECK.im), s.neckAlpha);
    }
    if (f.mode === 'free' && this.probe) {
      const { c, orbit: pts } = this.probe;
      const last = pts[pts.length - 1];
      const escaped = Math.hypot(last.re, last.im) > 2;
      drawOrbit(ctx, pts, X, Y, 1, escaped ? [255, 184, 77] : [110, 231, 255]);
      drawC(ctx, X(c.re), Y(c.im), 1);
      ctx.fillStyle = 'rgba(236,234,244,0.85)';
      ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        escaped ? this.text.escaped(pts.length - 1) : this.text.stays,
        X(c.re) + 12,
        Y(c.im) - 12
      );
    }
  }
}

function drawC(ctx: CanvasRenderingContext2D, x: number, y: number, a: number) {
  ctx.fillStyle = `rgba(255,184,77,${a})`;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,184,77,${0.9 * a})`;
  ctx.font = 'italic 600 15px "Instrument Serif", serif';
  ctx.textAlign = 'left';
  ctx.fillText('c', x + 8, y + 16);
}

/** Orbit as a fading polyline with dots; the newest point glows. */
function drawOrbit(
  ctx: CanvasRenderingContext2D,
  pts: readonly Complex[],
  X: (re: number) => number,
  Y: (im: number) => number,
  alpha: number,
  rgb: readonly number[]
) {
  const col = (a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a * alpha})`;
  const n = pts.length;
  for (let i = 1; i < n; i++) {
    const age = (i / n) ** 0.7;
    ctx.strokeStyle = col(0.15 + 0.6 * age);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(X(pts[i - 1].re), Y(pts[i - 1].im));
    ctx.lineTo(X(pts[i].re), Y(pts[i].im));
    ctx.stroke();
  }
  for (let i = 0; i < n; i++) {
    const x = X(pts[i].re);
    const y = Y(pts[i].im);
    if (x < -50 || y < -50 || x > 1e5 || y > 1e5) continue;
    ctx.fillStyle = col(i === n - 1 ? 1 : 0.55);
    ctx.beginPath();
    ctx.arc(x, y, i === n - 1 ? 4.5 : 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const last = pts[n - 1];
  if (last) {
    const x = X(last.re);
    const y = Y(last.im);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
    g.addColorStop(0, col(0.5));
    g.addColorStop(1, col(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}
