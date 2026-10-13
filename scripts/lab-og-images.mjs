/**
 * Share images for lab chapters: public/og/labs/<slug>.<lang>.png, 1200×630.
 *
 * Captures each chapter's board stage (title overlay included, toolbars
 * hidden) from a running server, so the image is the real board, not a
 * drawing of it. Rerun after changing a board or adding a chapter:
 *
 *   pnpm dev                       # in another terminal
 *   node scripts/lab-og-images.mjs [baseUrl] [slug …]
 *
 * Uses the system Chrome (CHROME_PATH overrides the macOS default).
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../public/og/labs/', import.meta.url);

// Rail 232 + stage 1200 + panel 372; top bar 60 + stage 630.
const VIEWPORT = { width: 1804, height: 690 };
const BRAND = {
  en: 'CurvG · Interactive lab',
  zh: 'CurvG · 交互实验',
};
// Subject pages (/labs/math) share the prefix but are not workspaces.
const SUBJECTS = new Set(['/labs/math', '/labs/physics']);
// Only these slugs, e.g. `node scripts/lab-og-images.mjs <base> derivative-tangent-slope`.
const ONLY = new Set(process.argv.slice(3));

const llms = await (await fetch(`${BASE}/llms.txt`)).text();
const paths = [
  ...llms.matchAll(/\]\((?:https?:\/\/[^/)]+)?(\/labs\/[^)\s]+)\)/g),
]
  .map((m) => m[1])
  .filter((path) => !SUBJECTS.has(path));
if (paths.length === 0)
  throw new Error(`No lab URLs found in ${BASE}/llms.txt`);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: VIEWPORT });

for (const path of [...new Set(paths)]) {
  for (const lang of ['en', 'zh']) {
    await page.goto(`${BASE}${lang === 'zh' ? '/zh' : ''}${path}`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => document.fonts.ready);
    const slug = await page.evaluate((brand) => {
      document
        .querySelectorAll('.lw-pen, .lw-stagebar')
        .forEach((el) => el.remove());
      const tag = document.createElement('div');
      tag.textContent = brand;
      tag.style.cssText =
        'position:absolute;left:28px;bottom:24px;font:600 15px var(--lw-sans);letter-spacing:.04em;color:var(--lw-accent2);';
      document.querySelector('.lw-stage')?.appendChild(tag);
      // The opening chapter lives at the suite URL, so read the slug from the page.
      return document
        .querySelector('[data-lab-slug]')
        ?.getAttribute('data-lab-slug');
    }, BRAND[lang]);
    if (!slug) throw new Error(`No lab on ${path}`);
    if (ONLY.size && !ONLY.has(slug)) continue;
    await page.waitForTimeout(300);
    const file = `${slug}.${lang}.png`;
    await page
      .locator('.lw-stage')
      .screenshot({ path: new URL(file, OUT).pathname });
    console.log('wrote', file);
  }
}
await browser.close();
