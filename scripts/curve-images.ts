/**
 * Static images for the curve encyclopedia, drawn from each curve's own
 * sample function at its default parameters:
 *
 * - public/curves/<slug>.svg      the graph alone (paper, grid, amber curve);
 *                                 shown on the page with alt text, so image
 *                                 search can index it (inline <svg> is not).
 * - public/og/curves/<slug>.<lang>.png   1200×630 share image: the graph
 *                                 plus name, equations (KaTeX) and blurb.
 *
 * Rerun after adding or changing a curve:  pnpm og:curves
 * Uses the system Chrome (CHROME_PATH overrides the macOS default).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import katex from 'katex';
import { chromium } from 'playwright-core';

import { CURVES } from '../src/content/curves';
import type { CurveDef, CurvePoints } from '../src/content/curves/types';
import { plainMath } from '../src/lib/plain-math';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = new URL('../public/', import.meta.url);
const ONLY = new Set(process.argv.slice(2));

const defaults = (curve: CurveDef) =>
  Object.fromEntries(curve.params.map((p) => [p.key, p.defaultValue]));

/** The curve fitted into a w×h box (y up → SVG y down), as path data. */
function graphPaths(curve: CurveDef, w: number, h: number, pad: number) {
  const lines: CurvePoints = curve.sample(defaults(curve));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const line of lines) {
    for (const [x, y] of line) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const k = Math.min(
    (w - 2 * pad) / (maxX - minX || 1),
    (h - 2 * pad) / (maxY - minY || 1)
  );
  const ox = (w - (maxX - minX) * k) / 2 - minX * k;
  const oy = (h + (maxY - minY) * k) / 2 + minY * k;
  const X = (x: number) => (ox + x * k).toFixed(1);
  const Y = (y: number) => (oy - y * k).toFixed(1);
  const paths = lines
    .filter((line) => line.length > 1)
    .map((line) => `M${line.map(([x, y]) => `${X(x)},${Y(y)}`).join('L')}`);
  return { paths, origin: { x: +X(0), y: +Y(0) } };
}

function graphSvg(curve: CurveDef, w = 800, h = 600) {
  const { paths, origin } = graphPaths(curve, w, h, 56);
  const grid: string[] = [];
  for (let x = 0; x <= w; x += 40) grid.push(`M${x},0V${h}`);
  for (let y = 0; y <= h; y += 40) grid.push(`M0,${y}H${w}`);
  const axes: string[] = [];
  if (origin.y > 0 && origin.y < h) axes.push(`M0,${origin.y}H${w}`);
  if (origin.x > 0 && origin.x < w) axes.push(`M${origin.x},0V${h}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<title>${curve.name.en} graph</title>
<rect width="${w}" height="${h}" fill="#fbf9f4"/>
<path d="${grid.join('')}" stroke="#e7e2d8" stroke-width="1" fill="none"/>
<path d="${axes.join('')}" stroke="#bdb6a8" stroke-width="1.2" fill="none"/>
<path d="${paths.join('')}" stroke="#c9800f" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
</svg>
`;
}

function ogHtml(curve: CurveDef, lang: 'en' | 'zh', svg: string) {
  const eq = curve.equations
    .slice(0, 2)
    .map((tex) =>
      katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
        output: 'html',
      })
    )
    .join('');
  const brand =
    lang === 'zh' ? 'CurvG · 曲线百科' : 'CurvG · Curve encyclopedia';
  const serif =
    lang === 'zh'
      ? "'Songti SC','Noto Serif SC',serif"
      : "Georgia,'Times New Roman',serif";
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://${process.cwd()}/node_modules/katex/dist/katex.min.css">
<style>
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;display:grid;grid-template-columns:630px 1fr;background:#f6f4ef;color:#1d2321;font-family:${serif}}
.g{border-right:1px solid #e2ddd2}.g svg{width:630px;height:630px;display:block}
.t{padding:64px 56px;display:flex;flex-direction:column}
.b{font:600 15px/1 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:#9a5f08}
h1{margin-top:28px;font-size:${lang === 'zh' ? 60 : 56}px;line-height:1.1;font-weight:600}
.e{margin-top:22px;font-size:20px}.e .katex-display{margin:.35em 0;text-align:left}
p{margin-top:auto;font:22px/1.5 ${lang === 'zh' ? "'PingFang SC',sans-serif" : 'Inter,Helvetica,sans-serif'};color:#5f6763}
</style></head><body><div class="g">${svg.replace(/width="800" height="600"/, '')}</div>
<div class="t"><div class="b">${brand}</div><h1>${curve.name[lang]}</h1><div class="e">${eq}</div><p>${plainMath(curve.short[lang])}</p></div></body></html>`;
}

await mkdir(new URL('curves/', ROOT), { recursive: true });
await mkdir(new URL('og/curves/', ROOT), { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const curve of CURVES) {
  if (ONLY.size && !ONLY.has(curve.slug)) continue;
  const svg = graphSvg(curve);
  await writeFile(new URL(`curves/${curve.slug}.svg`, ROOT), svg);
  for (const lang of ['en', 'zh'] as const) {
    // Loaded from a file so the page may read KaTeX's CSS and fonts.
    const file = join(tmpdir(), 'curvg-curve-og.html');
    await writeFile(file, ogHtml(curve, lang, graphSvg(curve, 630, 630)));
    await page.goto(`file://${file}`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: new URL(`og/curves/${curve.slug}.${lang}.png`, ROOT).pathname,
    });
  }
  console.log(curve.slug);
}
await browser.close();
