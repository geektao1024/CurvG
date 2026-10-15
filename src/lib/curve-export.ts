/**
 * Free exports from a curve page: the shape the reader has dialled in, as a
 * standalone SVG, a 2× PNG, or CSV points. Browser-only (Blob, canvas,
 * clipboard); call from event handlers, never during render.
 *
 * Colours match the static graphs from `pnpm og:curves`
 * (scripts/curve-images.ts): bright amber curve, warm grey axes.
 */

import type { CurvePoints } from '@/content/curves/types';

export const EXPORT_W = 720;
export const EXPORT_H = 540;
const CURVE = '#c9800f';
const AXES = '#bdb6a8';
const CREDIT = '#8a8478';

/** A self-contained SVG: no CSS variables, no external fonts. */
export function curveSvg({
  paths,
  origin,
  guideLines = 0,
  credit,
  background,
}: {
  paths: readonly string[];
  origin: [number, number];
  /** Leading paths that are construction, drawn thin and faint. */
  guideLines?: number;
  credit: string;
  background?: string;
}): string {
  const [ox, oy] = origin;
  const axes = [
    ox > 0 && ox < EXPORT_W ? `M${ox.toFixed(1)} 0V${EXPORT_H}` : '',
    oy > 0 && oy < EXPORT_H ? `M0 ${oy.toFixed(1)}H${EXPORT_W}` : '',
  ].join('');
  const strokes = paths
    .map((d, index) => {
      const guide = index < guideLines;
      return `<path d="${d}" fill="none" stroke="${CURVE}" stroke-width="${guide ? 1.6 : 2.6}"${guide ? ' stroke-opacity="0.45"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${EXPORT_W}" height="${EXPORT_H}" viewBox="0 0 ${EXPORT_W} ${EXPORT_H}">`,
    background
      ? `<rect width="${EXPORT_W}" height="${EXPORT_H}" fill="${background}"/>`
      : '',
    axes ? `<path d="${axes}" stroke="${AXES}" stroke-width="1"/>` : '',
    strokes,
    `<text x="${EXPORT_W - 14}" y="${EXPORT_H - 12}" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="${CREDIT}">${credit}</text>`,
    '</svg>',
  ].join('');
}

/** One row per sampled point; `path` numbers the separate strokes. */
export function curveCsv(polylines: CurvePoints): string {
  const rows = ['path,x,y'];
  polylines.forEach((line, index) => {
    for (const [x, y] of line) {
      rows.push(`${index + 1},${x.toFixed(6)},${y.toFixed(6)}`);
    }
  });
  return `${rows.join('\n')}\n`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, type: string, filename: string) {
  downloadBlob(new Blob([text], { type }), filename);
}

/** Rasterises an SVG string (which should carry its own background). */
export function downloadPng(svg: string, filename: string, scale = 2) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_W * scale;
      canvas.height = EXPORT_H * scale;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Canvas is not available'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('PNG encoding failed'));
        downloadBlob(blob, filename);
        resolve();
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('SVG could not be drawn'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
