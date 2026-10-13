/**
 * Brand raster images, rendered in Chrome with the site's own fonts:
 *
 * - public/og/curvg-social.png   default share image, from curvg-social.svg
 * - public/og/posts/<slug>.<lang>.png   one cover per blog post (title + a
 *   curve picked from the slug), referenced by the post's `meta.image`
 *
 *   node scripts/brand-images.mjs
 *
 * Rerun after editing the SVG or adding / retitling a post. Uses the system
 * Chrome (CHROME_PATH overrides the macOS default). Lab chapter images have
 * their own script: scripts/lab-og-images.mjs.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FONTS = [
  'noto-serif-sc/600.css',
  'instrument-serif/400-italic.css',
  'jetbrains-mono/500.css',
  'jetbrains-mono/600.css',
]
  .map(
    (file) =>
      `<link rel="stylesheet" href="file://${ROOT}node_modules/@fontsource/${file}">`
  )
  .join('');

const LOGO = `<svg viewBox="0 0 64 64" width="44" height="44" fill="none">
  <rect width="64" height="64" rx="15" fill="#1d2321"/>
  <path d="M10 33H54M32 10V56" stroke="#f6f4ef" stroke-opacity=".12" stroke-width="1.4"/>
  <path d="M42.71 21.11A16 16 0 1 0 48 33H36" stroke="#f6f4ef" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="42.71" cy="21.11" r="7.2" fill="#c9800f" fill-opacity=".28"/>
  <circle cx="42.71" cy="21.11" r="4.1" fill="#1d2321" stroke="#f2a93b" stroke-width="2.6"/>
</svg>`;

const escape = (text) =>
  text.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/** A Lissajous figure whose frequencies come from the slug, so covers differ. */
function curveFor(slug) {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const pairs = [
    [3, 2],
    [5, 4],
    [3, 4],
    [5, 2],
    [1, 2],
    [4, 3],
  ];
  const [a, b] = pairs[hash % pairs.length];
  const delta = ((hash >> 4) % 8) * (Math.PI / 16) + Math.PI / 4;
  const points = [];
  for (let i = 0; i <= 900; i += 1) {
    const t = (i / 900) * Math.PI * 2;
    points.push(
      `${(210 + 170 * Math.sin(a * t + delta)).toFixed(1)},${(210 - 170 * Math.sin(b * t)).toFixed(1)}`
    );
  }
  const t0 = 0.7;
  const hx = 210 + 170 * Math.sin(a * t0 + delta);
  const hy = 210 - 170 * Math.sin(b * t0);
  return `<svg viewBox="0 0 420 420" width="420" height="420" fill="none">
    <path d="M20 210H400M210 20V400" stroke="#4a5058" stroke-opacity=".35" stroke-width="1.2"/>
    <polyline points="${points.join(' ')}" stroke="#c9800f" stroke-width="2.4" stroke-linejoin="round"/>
    <circle cx="${hx}" cy="${hy}" r="13" fill="#c9800f" fill-opacity=".18"/>
    <circle cx="${hx}" cy="${hy}" r="7" fill="#fffefb" stroke="#c9800f" stroke-width="3"/>
  </svg>`;
}

function postCover({ title, lang, slug }) {
  const label =
    lang === 'zh' ? 'CurvG · 数学动画指南' : 'CurvG · Math animation guide';
  return `<!doctype html><html><head>${FONTS}<style>
    body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:'Noto Serif SC',serif;
      background:radial-gradient(80% 70% at 30% 35%,#fffefb,#f6f3ec 60%,#ece7dc)}
    .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(29,35,33,.05) 1px,transparent 1px),
      linear-gradient(90deg,rgba(29,35,33,.05) 1px,transparent 1px);background-size:44px 44px}
    .copy{position:absolute;left:72px;top:72px;width:600px;height:486px;display:flex;flex-direction:column}
    .eyebrow{font:600 15px 'JetBrains Mono',monospace;letter-spacing:.24em;color:#9a5f08;text-transform:uppercase}
    h1{margin:28px 0 0;font-weight:600;font-size:${title.length > 26 ? 50 : 58}px;line-height:1.22;color:#1d2321;
      letter-spacing:.01em;text-wrap:balance}
    .brand{margin-top:auto;display:flex;align-items:center;gap:14px;font:600 26px 'Noto Serif SC',serif;color:#1d2321}
    .panel{position:absolute;right:72px;top:105px;width:420px;height:420px;border-radius:16px;background:#fffefb;
      border:1px solid rgba(29,35,33,.12);box-shadow:0 1px 2px rgba(29,35,33,.04),0 18px 40px -24px rgba(29,35,33,.35)}
  </style></head><body><div class="grid"></div>
    <div class="copy"><div class="eyebrow">${escape(label)}</div><h1>${escape(title)}</h1>
      <div class="brand">${LOGO}CurvG</div></div>
    <div class="panel">${curveFor(slug)}</div>
  </body></html>`;
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
// Pages must load from file:// to reach the font files in node_modules.
const TEMP = join(tmpdir(), 'curvg-brand-image.html');
const shoot = async (html, out) => {
  await writeFile(TEMP, html);
  await page.goto(`file://${TEMP}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out });
  console.log('wrote', out.replace(ROOT, ''));
};

// Default share image.
const social = await readFile(`${ROOT}public/og/curvg-social.svg`, 'utf8');
await shoot(
  `<!doctype html><html><head>${FONTS}<style>body{margin:0}</style></head><body>${social}</body></html>`,
  `${ROOT}public/og/curvg-social.png`
);

// Post covers.
const POSTS = `${ROOT}src/content/posts/`;
await mkdir(`${ROOT}public/og/posts`, { recursive: true });
for (const file of (await readdir(POSTS)).filter((name) =>
  name.endsWith('.mdx')
)) {
  const [, slug, lang] = /^(.+)\.(en|zh)\.mdx$/.exec(file) ?? [];
  if (!slug) continue;
  const source = await readFile(POSTS + file, 'utf8');
  const title = /title:\s*'([^']+)'/.exec(source)?.[1];
  if (!title) throw new Error(`No title in ${file}`);
  const image = `/og/posts/${slug}.${lang}.png`;
  await shoot(postCover({ title, lang, slug }), `${ROOT}public${image}`);
  const updated = source.replace(/image:\s*'[^']*'/, `image: '${image}'`);
  if (updated !== source) await writeFile(POSTS + file, updated);
}
await browser.close();
