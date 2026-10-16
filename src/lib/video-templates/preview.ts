/**
 * Geometry helpers for template previews (`VideoTemplate.preview`). They
 * reuse the same evaluators and windows as the films, so the sketch and the
 * render agree on what is drawn.
 */

import { niceRange, plotSegments, yWindow } from './manim';
import type { PreviewShape, PreviewTone } from './types';

export type Fn = (x: number) => number;
export type Window = { min: number; max: number };

/** Sample f on each finite piece of [a, b] inside the window. */
export function curve(
  f: Fn,
  a: number,
  b: number,
  window: Window,
  tone: PreviewTone,
  options: { width?: number; dashed?: boolean; samples?: number } = {}
): PreviewShape[] {
  return plotSegments(f, a, b, window).map(([lo, hi]) => {
    const n = options.samples ?? 160;
    const points: Array<[number, number]> = [];
    for (let i = 0; i <= n; i += 1) {
      const x = lo + ((hi - lo) * i) / n;
      const y = f(x);
      if (Number.isFinite(y)) points.push([x, y]);
    }
    return {
      kind: 'line',
      points,
      tone,
      width: options.width,
      dashed: options.dashed,
    };
  });
}

/** A parametric path, split where it leaves the finite plane. */
export function path(
  X: Fn,
  Y: Fn,
  t0: number,
  t1: number,
  tone: PreviewTone,
  samples = 600
): PreviewShape[] {
  const shapes: PreviewShape[] = [];
  let points: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = t0 + ((t1 - t0) * i) / samples;
    const x = X(t);
    const y = Y(t);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    else if (points.length) {
      shapes.push({ kind: 'line', points, tone });
      points = [];
    }
  }
  if (points.length) shapes.push({ kind: 'line', points, tone });
  return shapes;
}

/** The straight line through (px, py) with this slope, across the x range. */
export function lineThrough(
  px: number,
  py: number,
  slope: number,
  x: [number, number],
  tone: PreviewTone,
  options: { dashed?: boolean; width?: number } = {}
): PreviewShape {
  return {
    kind: 'line',
    points: [
      [x[0], py + slope * (x[0] - px)],
      [x[1], py + slope * (x[1] - px)],
    ],
    tone,
    ...options,
  };
}

/** The y window a film uses for f on [xmin, xmax], optionally fitted to focus values. */
export function functionWindow(
  f: Fn,
  xmin: number,
  xmax: number,
  options: { include?: number[]; focus?: number[] } = {}
): { x: [number, number]; y: [number, number]; window: Window } {
  const x = niceRange(xmin, xmax);
  let window = yWindow(f, x.min, x.max);
  if (options.focus?.length) {
    const lo = Math.min(0, ...options.focus);
    const hi = Math.max(0, ...options.focus);
    const span = Math.max(hi - lo, 1);
    window = {
      min: Math.max(window.min, lo - span * 1.2),
      max: Math.min(window.max, hi + span * 1.2),
    };
  }
  const extra = options.include ?? [];
  const y = niceRange(
    Math.min(window.min, ...extra),
    Math.max(window.max, ...extra)
  );
  return {
    x: [x.min, x.max],
    y: [y.min, y.max],
    window: { min: y.min, max: y.max },
  };
}
