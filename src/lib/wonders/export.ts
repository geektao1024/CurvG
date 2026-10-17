/**
 * Wonder exports, made in the reader's browser: a PNG of what is on screen,
 * or an MP4 drawn frame by frame from a cloned engine (story frames are pure
 * functions of `t`, so the video matches the page exactly) and encoded with
 * WebCodecs through Mediabunny. Nothing is uploaded; the server only charges
 * credits for the HD tier (`/api/wonders/export`). See docs/WONDERS_PLAN.md §4.
 */

import { Bloom } from './bloom';
import {
  storyClock,
  teaserCut,
  teaserLength,
  type StageInsets,
  type WonderEngine,
} from './engine';
import { beatAt, clamp01 } from './timeline';

export type ExportAspect = 'landscape' | 'portrait';
/** `preview`: free, 720p, watermark and end card. `hd`: credits, 1080p60. */
export type ExportQuality = 'preview' | 'hd';
/** The narrated story, or the reader's own settings in free play. */
export type ExportKind = 'story' | 'free';

export const EXPORT_SIZE: Record<
  ExportQuality,
  Record<ExportAspect, { width: number; height: number }>
> = {
  preview: {
    landscape: { width: 1280, height: 720 },
    portrait: { width: 720, height: 1280 },
  },
  hd: {
    landscape: { width: 1920, height: 1080 },
    portrait: { width: 1080, height: 1920 },
  },
};

export const EXPORT_FPS: Record<ExportQuality, number> = {
  preview: 30,
  hd: 60,
};

/** Seconds of end card after the picture. */
export const END_CARD = 2.6;

/**
 * Pictures are laid out on a design canvas of the page's size (the stage is
 * tuned for ~1280 px) and scaled up, so strokes keep their on-page weight.
 */
const DESIGN: Record<ExportAspect, { width: number; height: number }> = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
};

/** Room kept for the title (top) and the caption (bottom), design px. */
const INSETS: Record<ExportAspect, StageInsets> = {
  landscape: { top: 104, right: 40, bottom: 96, left: 40 },
  portrait: { top: 300, right: 24, bottom: 330, left: 24 },
};

export type ExportText = {
  /** "CurvG · 数学奇观 · 第 3 个" */
  eyebrow: string;
  /** The wonder's question (H1). */
  title: string;
  /** One caption per story beat. */
  captions: readonly string[];
  /** Shown under the free-play film, and on the end card. */
  takeaway: string;
  /** "curvg.com/zh/wonders/lorenz-attractor" */
  url: string;
  /** End-card line under the URL. */
  cta: string;
};

const SERIF = '"Noto Serif SC", "Songti SC", serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const INK = '#eceaf4';
const BG = '#06070c';

/** The stage background (wonders.css `.wonder-stage`), painted. */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const glow = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(0.7, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  };
  glow(w * 0.3, h * 0.45, w * 0.6, h * 0.55, 'rgba(120,92,255,0.13)');
  glow(w * 0.78, h * 0.6, w * 0.45, h * 0.45, 'rgba(40,170,220,0.08)');
}

/** Break text into lines that fit `max` px; CJK may break anywhere. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number
): string[] {
  const tokens =
    text.match(
      /[　-〿㐀-鿿＀-￯][，。、；：？！」』）]*|[^\s　-〿㐀-鿿＀-￯]+|\s+/g
    ) ?? [];
  const lines: string[] = [];
  let line = '';
  for (const token of tokens) {
    const next = line + token;
    if (line && ctx.measureText(next.trimEnd()).width > max) {
      lines.push(line.trim());
      line = token.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** "Curv" + amber "G", then a mono URL: the mark burned into exports. */
function drawMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  url: string | null,
  align: 'left' | 'right',
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${size}px ${SERIF}`;
  const curv = ctx.measureText('Curv').width;
  const g = ctx.measureText('G').width;
  const urlFont = `500 ${Math.round(size * 0.52)}px ${MONO}`;
  ctx.font = urlFont;
  const urlWidth = url ? ctx.measureText(url).width + size * 0.5 : 0;
  const total = curv + g + urlWidth;
  let left = align === 'left' ? x : x - total;
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.4;
  ctx.font = `400 ${size}px ${SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText('Curv', left, y);
  left += curv;
  ctx.fillStyle = '#ffb84d';
  ctx.fillText('G', left, y);
  left += g;
  if (url) {
    ctx.font = urlFont;
    ctx.fillStyle = 'rgba(236,234,244,0.78)';
    ctx.fillText(url, left + size * 0.5, y);
  }
  ctx.restore();
}

// ── Share card ────────────────────────────────────────────────────────────

/** Portrait 4:5, the size 小红书 and Instagram show without cropping. */
export const CARD_SIZE = { width: 1080, height: 1350 };

/**
 * The picture someone actually posts: the question on top, this frame of the
 * stage in the middle (cropped to fill), the one-line answer and the URL at
 * the bottom. A bare screenshot loses the question; the card keeps it.
 */
/** The picture's safe area on the stage canvas, in its pixels. */
export type CardFocus = { cx: number; cy: number; w: number; h: number };

export async function shareCardPng(
  layers: {
    gl: HTMLCanvasElement | null;
    ui: HTMLCanvasElement;
    focus?: CardFocus | null;
  },
  text: ExportText
): Promise<Blob> {
  const { ui, gl, focus } = layers;
  const { width: W, height: H } = CARD_SIZE;
  const out = document.createElement('canvas');
  out.width = W;
  out.height = H;
  const ctx = out.getContext('2d')!;
  drawBackdrop(ctx, W, H);

  // The stage, cropped to fill the middle band, centred on the picture
  // (not the canvas: the panel pushes the picture aside in free play).
  const top = 300;
  const bottom = 1120;
  const bandH = bottom - top;
  const aspect = W / bandH;
  const sw = ui.width;
  const sh = ui.height;
  const f = focus ?? { cx: sw / 2, cy: sh / 2, w: sw, h: sh };
  let ch = Math.min(sh, f.h * 1.1);
  let cw = ch * aspect;
  if (cw < f.w * 1.04) {
    cw = f.w * 1.04;
    ch = cw / aspect;
  }
  if (cw > sw) {
    cw = sw;
    ch = cw / aspect;
  }
  if (ch > sh) {
    ch = sh;
    cw = ch * aspect;
  }
  const sx = Math.max(0, Math.min(sw - cw, f.cx - cw / 2));
  const sy = Math.max(0, Math.min(sh - ch, f.cy - ch / 2));
  if (gl)
    ctx.drawImage(
      gl,
      sx * (gl.width / sw),
      sy * (gl.height / sh),
      cw * (gl.width / sw),
      ch * (gl.height / sh),
      0,
      top,
      W,
      bandH
    );
  ctx.drawImage(ui, sx, sy, cw, ch, 0, top, W, bandH);
  // Soften the band's edges into the page.
  for (const [y0, y1] of [
    [top, top + 120],
    [bottom, bottom - 140],
  ] as const) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, BG);
    g.addColorStop(1, 'rgba(6,7,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 22px ${MONO}`;
  ctx.fillStyle = '#b2a0ff';
  ctx.fillText(text.eyebrow.toUpperCase(), 72, 110);
  ctx.font = `600 54px ${SERIF}`;
  ctx.fillStyle = INK;
  let y = 186;
  for (const line of wrapText(ctx, text.title, W - 144).slice(0, 3)) {
    ctx.fillText(line, 72, y);
    y += 68;
  }

  ctx.font = `400 30px ${SERIF}`;
  ctx.fillStyle = 'rgba(236,234,244,0.86)';
  y = 1176;
  for (const line of wrapText(ctx, text.takeaway, W - 144).slice(0, 2)) {
    ctx.fillText(line, 72, y);
    y += 44;
  }
  drawMark(ctx, 72, H - 56, 40, text.url, 'left', 0.95);
  return new Promise((resolve, reject) =>
    out.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png'
    )
  );
}

// ── Video ─────────────────────────────────────────────────────────────────

export type VideoJob = {
  /** A clone (`engine.clone()`), never the one on the page. */
  engine: WonderEngine;
  kind: ExportKind;
  quality: ExportQuality;
  aspect: ExportAspect;
  text: ExportText;
  /** End card with brand and URL (always on for previews). */
  endCard: boolean;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/** Whether this browser can encode video at all (WebCodecs). */
export function canExportVideo(): boolean {
  return typeof window !== 'undefined' && 'VideoEncoder' in window;
}

export class ExportUnsupportedError extends Error {
  constructor() {
    super('This browser cannot encode video');
    this.name = 'ExportUnsupportedError';
  }
}

/**
 * Length in seconds of the picture part: the story with its cold open, or
 * the free-play film.
 */
function pictureLength(engine: WonderEngine, kind: ExportKind): number {
  if (kind === 'story') return teaserLength(engine) + engine.length;
  return engine.freeFilm?.() ?? 12;
}

/** Draw an MP4 of the wonder; resolves with the file. */
export async function renderWonderVideo(job: VideoJob): Promise<Blob> {
  const { engine, kind, quality, aspect, text, signal } = job;
  const watermark = quality === 'preview';
  const endCard = watermark || job.endCard;
  const size = EXPORT_SIZE[quality][aspect];
  const design = DESIGN[aspect];
  const scale = size.width / design.width;
  const fps = EXPORT_FPS[quality];

  const mb = await import('mediabunny');
  const codec = await mb.getFirstEncodableVideoCodec(['avc', 'vp9', 'av1'], {
    width: size.width,
    height: size.height,
  });
  if (!codec) throw new ExportUnsupportedError();

  // Layers: WebGL (if the engine wants one), the engine's 2D layer, and the
  // output canvas that gets encoded.
  const make = () => {
    const c = document.createElement('canvas');
    c.width = size.width;
    c.height = size.height;
    return c;
  };
  const glCanvas = engine.gl ? make() : null;
  const uiCanvas = make();
  const outCanvas = make();
  const ui = uiCanvas.getContext('2d')!;
  const out = outCanvas.getContext('2d', { alpha: false })!;
  engine.attach({ gl: glCanvas, ui: uiCanvas });
  engine.resize?.(design.width, design.height, scale);
  const picture = pictureLength(engine, kind);
  const total = picture + (endCard ? END_CARD : 0);
  const frames = Math.round(total * fps);
  const bloom = engine.glow ? new Bloom() : null;

  const output = new mb.Output({
    format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new mb.BufferTarget(),
  });
  const source = new mb.CanvasSource(outCanvas, {
    codec,
    // Fixed bitrates keep files shareable (fractals would otherwise balloon):
    // ~5 Mbps for the 720p preview, ~16 Mbps for 1080p60.
    quality: new mb.Quality({ bitrate: quality === 'hd' ? 16e6 : 5e6 }),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();

  const insets: StageInsets = INSETS[aspect];
  // Story clock: negative while the cold open plays.
  const lead = kind === 'story' ? teaserLength(engine) : 0;
  try {
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const time = i / fps;
      const t = Math.min(time, picture);
      const clock = Math.min(t - lead, engine.length - 1e-3);

      // Picture.
      ui.setTransform(1, 0, 0, 1, 0, 0);
      ui.clearRect(0, 0, size.width, size.height);
      ui.setTransform(scale, 0, 0, scale, 0, 0);
      ui.lineCap = 'round';
      ui.lineJoin = 'round';
      const free = kind === 'free';
      engine.frame(
        {
          mode: free ? 'free' : 'story',
          t: free ? 0 : storyClock(engine, clock),
          dt: time <= picture ? 1 / fps : 0,
          playing: time <= picture,
          width: design.width,
          height: design.height,
          insets,
        },
        ui
      );
      bloom?.apply(ui, uiCanvas, engine.glow ?? 0);

      out.setTransform(1, 0, 0, 1, 0, 0);
      drawBackdrop(out, size.width, size.height);
      if (glCanvas) out.drawImage(glCanvas, 0, 0, size.width, size.height);
      out.drawImage(uiCanvas, 0, 0);
      const cut = lead > 0 ? teaserCut(t - lead) : 0;
      if (cut > 0) {
        out.fillStyle = `rgba(6,7,12,${cut})`;
        out.fillRect(0, 0, size.width, size.height);
      }

      // Words, on the design grid.
      out.setTransform(scale, 0, 0, scale, 0, 0);
      drawScrims(out, design.width, design.height, aspect);
      drawTitle(out, text, design.width, aspect);
      const caption =
        kind === 'story'
          ? clock < 0
            ? { text: '', alpha: 0 }
            : captionAt(engine, text.captions, clock)
          : { text: text.takeaway, alpha: clamp01((time - 0.8) / 0.6) };
      if (caption.text) {
        drawCaption(out, caption.text, caption.alpha, design, aspect);
      }
      if (watermark) {
        const s = aspect === 'landscape' ? 22 : 26;
        drawMark(
          out,
          design.width - 24,
          design.height - 24,
          s,
          null,
          'right',
          0.85
        );
      }
      if (endCard && time > picture) {
        drawEndCard(out, text, clamp01((time - picture) / 0.6), design);
      }

      await source.add(time, 1 / fps);
      if (i % 6 === 0) {
        job.onProgress?.(i / frames);
        // Let the page breathe: progress bar, cancel button.
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    source.close();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => {});
    throw error;
  } finally {
    engine.detach?.();
  }
  job.onProgress?.(1);
  const buffer = (output.target as InstanceType<typeof mb.BufferTarget>)
    .buffer!;
  return new Blob([buffer], { type: 'video/mp4' });
}

/** The caption of the beat at `t`, fading in at each beat. */
function captionAt(
  engine: WonderEngine,
  captions: readonly string[],
  t: number
): { text: string; alpha: number } {
  const beat = beatAt(engine.beats, t);
  const start = engine.beats[beat] ?? 0;
  return { text: captions[beat] ?? '', alpha: clamp01((t - start) / 0.45) };
}

function drawScrims(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  aspect: ExportAspect
) {
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.3);
  top.addColorStop(0, 'rgba(6,7,12,0.82)');
  top.addColorStop(1, 'rgba(6,7,12,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h * 0.3);
  const fromY = aspect === 'landscape' ? h * 0.72 : h * 0.7;
  const bottom = ctx.createLinearGradient(0, fromY, 0, h);
  bottom.addColorStop(0, 'rgba(6,7,12,0)');
  bottom.addColorStop(1, 'rgba(6,7,12,0.86)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, fromY, w, h - fromY);
}

function drawTitle(
  ctx: CanvasRenderingContext2D,
  text: ExportText,
  w: number,
  aspect: ExportAspect
) {
  const land = aspect === 'landscape';
  const x = land ? 40 : 36;
  let y = land ? 46 : 120;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${land ? 12 : 15}px ${MONO}`;
  ctx.fillStyle = '#b2a0ff';
  ctx.fillText(text.eyebrow.toUpperCase(), x, y);
  const size = land ? 28 : 40;
  ctx.font = `600 ${size}px ${SERIF}`;
  ctx.fillStyle = INK;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  y += size * 1.35;
  for (const line of wrapText(ctx, text.title, w - x * 2).slice(0, 3)) {
    ctx.fillText(line, x, y);
    y += size * 1.3;
  }
  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  caption: string,
  alpha: number,
  design: { width: number; height: number },
  aspect: ExportAspect
) {
  const land = aspect === 'landscape';
  const size = land ? 24 : 30;
  const max = land ? 920 : design.width - 72;
  ctx.save();
  ctx.font = `400 ${size}px ${SERIF}`;
  const lines = wrapText(ctx, caption, max).slice(0, 3);
  const lineH = size * 1.55;
  const bottom = land ? design.height - 52 : design.height - 210;
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 14;
  lines.forEach((line, i) => {
    const y = bottom - (lines.length - 1 - i) * lineH;
    ctx.fillText(line, design.width / 2, y);
  });
  ctx.restore();
}

function drawEndCard(
  ctx: CanvasRenderingContext2D,
  text: ExportText,
  alpha: number,
  design: { width: number; height: number }
) {
  const { width: w, height: h } = design;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(6,7,12,0.8)';
  ctx.fillRect(0, 0, w, h);
  const cx = w / 2;
  const land = w > h;
  let y = h / 2 - (land ? 70 : 120);
  const brand = land ? 76 : 88;
  ctx.font = `400 ${brand}px ${SERIF}`;
  const curv = ctx.measureText('Curv').width;
  const g = ctx.measureText('G').width;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = INK;
  ctx.fillText('Curv', cx - (curv + g) / 2, y);
  ctx.fillStyle = '#ffb84d';
  ctx.fillText('G', cx - (curv + g) / 2 + curv, y);
  ctx.textAlign = 'center';
  const body = land ? 24 : 28;
  ctx.font = `400 ${body}px ${SERIF}`;
  ctx.fillStyle = 'rgba(236,234,244,0.86)';
  y += body * 2.2;
  for (const line of wrapText(ctx, text.takeaway, w - (land ? 280 : 96)).slice(
    0,
    4
  )) {
    ctx.fillText(line, cx, y);
    y += body * 1.5;
  }
  y += body * 0.9;
  ctx.font = `500 ${land ? 22 : 24}px ${MONO}`;
  ctx.fillStyle = '#6ee7ff';
  ctx.fillText(text.url, cx, y);
  y += land ? 38 : 44;
  ctx.font = `400 ${land ? 17 : 20}px ${SERIF}`;
  ctx.fillStyle = 'rgba(236,234,244,0.62)';
  ctx.fillText(text.cta, cx, y);
  ctx.restore();
}

/** Save a blob under a file name (an object URL and a click). */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
