/**
 * The contract between the shared wonder stage and one wonder's drawing.
 * The stage owns time (story clock, play/pause, free play) and the canvases;
 * an engine turns a frame description into pixels. Story frames must depend
 * only on `t`, so replaying, scrubbing and a future film capture all agree.
 */

export type WonderMode = 'story' | 'free';

/** Pixels kept clear of the picture on each side (title, panel, captions). */
export type StageInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const NO_INSETS: StageInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export type WonderFrame = {
  mode: WonderMode;
  /** Story time in seconds (meaningful in story mode). */
  t: number;
  /** Seconds since the last frame, capped; for free-play motion. */
  dt: number;
  playing: boolean;
  /** CSS pixels. */
  width: number;
  height: number;
  insets: StageInsets;
};

export interface WonderEngine {
  /** Start time of each narrated beat; one caption each. */
  readonly beats: readonly number[];
  /** Story length in seconds. */
  readonly length: number;
  /** Ask the stage for a WebGL canvas under the 2D one. */
  readonly gl?: boolean;
  /**
   * Cold open: a window of story time `[from, to]` (≤ 4 s) played before the
   * story starts, so the first seconds show the payoff, not a blank board.
   */
  readonly teaser?: readonly [number, number];
  /** Bloom over the 2D layer, 0–1 (see `bloom.ts`). Glowing strokes only. */
  readonly glow?: number;
  /**
   * A fresh engine holding the reader's current free-play settings, not yet
   * attached. Exports draw it frame by frame on their own canvases, so the
   * page keeps playing while a video is made.
   */
  clone?(): WonderEngine;
  /**
   * Set a clone up for a free-play film ("export my version") and return its
   * length in seconds; frames then run in free mode with a fixed `dt`.
   */
  freeFilm?(): number;
  attach(layers: { gl: HTMLCanvasElement | null; ui: HTMLCanvasElement }): void;
  detach?(): void;
  resize?(width: number, height: number, dpr: number): void;
  /** Draw one frame. `ui` is already cleared and scaled to CSS pixels. */
  frame(frame: WonderFrame, ui: CanvasRenderingContext2D): void;
  /** The story is handing over to free play at time `t`: keep the picture. */
  leaveStory?(t: number): void;
  /** The story restarts from 0. */
  replay?(): void;
}

/** Centre and size of the safe area, for framing a picture. */
export function safeArea(
  width: number,
  height: number,
  insets: StageInsets
): { cx: number; cy: number; w: number; h: number } {
  const w = Math.max(80, width - insets.left - insets.right);
  const h = Math.max(80, height - insets.top - insets.bottom);
  return { cx: insets.left + w / 2, cy: insets.top + h / 2, w, h };
}

/** Seconds of cold open before the story (0 without a teaser). */
export function teaserLength(engine: Pick<WonderEngine, 'teaser'>): number {
  if (!engine.teaser) return 0;
  const [from, to] = engine.teaser;
  return Math.max(0, Math.min(4, to - from));
}

/**
 * Story time to draw at clock time `t`, where the clock starts at
 * `-teaserLength`: negative times play the teaser window.
 */
export function storyClock(
  engine: Pick<WonderEngine, 'teaser'>,
  t: number
): number {
  if (t >= 0 || !engine.teaser) return Math.max(0, t);
  return engine.teaser[0] + teaserLength(engine) + t;
}

/** Dip to black around the cut from teaser to story (t = 0), 0–1. */
export function teaserCut(t: number, half = 0.35): number {
  const x = 1 - Math.abs(t) / half;
  return x <= 0 ? 0 : x * x * (3 - 2 * x);
}
