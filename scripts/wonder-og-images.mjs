/**
 * Share images for math wonders: public/og/wonders/<slug>.<lang>.png,
 * 1200×630.
 *
 * Captures each wonder's real stage at its most striking story beat (title
 * kept, controls and captions hidden) from a running server. Rerun after
 * changing a wonder's story or adding one:
 *
 *   pnpm dev                          # in another terminal
 *   node scripts/wonder-og-images.mjs [baseUrl] [slug …]
 *
 * Uses the system Chrome (CHROME_PATH overrides the macOS default) with the
 * GPU enabled, since the Mandelbrot stage is drawn with WebGL2.
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = new URL('../public/og/wonders/', import.meta.url);
const ONLY = new Set(process.argv.slice(3));

// Which story beat to jump to, and how long to let it play from there.
const MOMENTS = {
  // π fully traced by 100 circles, just before they are cut back to 3.
  'fourier-epicycles': { beat: 5, wait: 300 },
  'mandelbrot-set': { beat: 4, wait: 6500 },
  // The swarm has spread over the whole butterfly.
  'lorenz-attractor': { beat: 5, wait: 4500 },
  'sunflower-golden-angle': { beat: 3, wait: 3000 },
};
const BRAND = { en: 'CurvG · Math wonders', zh: 'CurvG · 数学奇观' };

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const slugs = [
  ...new Set(
    [...sitemap.matchAll(/<loc>[^<]*?\/wonders\/([a-z0-9-]+)<\/loc>/g)].map(
      (m) => m[1]
    )
  ),
].filter((slug) => ONLY.size === 0 || ONLY.has(slug));
if (slugs.length === 0) throw new Error(`No wonders in ${BASE}/sitemap.xml`);

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

for (const slug of slugs) {
  const moment = MOMENTS[slug] ?? { beat: 2, wait: 3000 };
  for (const lang of ['en', 'zh']) {
    await page.goto(`${BASE}${lang === 'zh' ? '/zh' : ''}/wonders/${slug}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('.wonder-tick');
    await page.waitForTimeout(1200);
    await page.locator('.wonder-tick').nth(moment.beat).click();
    // Hide the controls, captions and summary; keep the question as title.
    await page.addStyleTag({
      content: `.wonder-panel,.wonder-bar,.wonder-caption,.wonder-top,
        .wonder-head p:not(.wonder-eyebrow),.wonder-why{display:none!important}
        .wonder-head{top:2.4rem!important;max-width:34rem!important}
        .wonder-head h1{font-size:2.5rem!important}
        .tsqd-parent-container{display:none!important}`,
    });
    await page.evaluate((brand) => {
      const eyebrow = document.querySelector('.wonder-eyebrow');
      if (eyebrow) eyebrow.textContent = brand;
    }, BRAND[lang]);
    await page.waitForTimeout(moment.wait);
    const file = new URL(`${slug}.${lang}.png`, OUT);
    await page.screenshot({ path: file.pathname });
    console.log(file.pathname);
  }
}
await browser.close();
