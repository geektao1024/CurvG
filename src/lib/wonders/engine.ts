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
