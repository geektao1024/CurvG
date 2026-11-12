#!/usr/bin/env node
// Push new or changed URLs to IndexNow (Bing, Yandex, Seznam, Naver…).
// ChatGPT search leans on Bing's index, so after a release push the pages
// that changed instead of waiting for a crawl.
//
// Usage:
//   pnpm indexnow /manim-alternative /blog/best-math-video-apps
//       → those paths in every language (/zh/… included)
//   pnpm indexnow --all          → every <loc> in the live sitemap
//   pnpm indexnow --dry-run /…   → print the URLs, send nothing
//
// Paths are matched against the live sitemap, so a typo or an unlisted page
// fails loudly instead of being submitted. The key file is
// public/<KEY>.txt and must stay deployed: IndexNow fetches it to verify.

const HOST = 'curvg.com';
const KEY = '6485bfde1f61740eaebca5315ff6f3d6';
const ORIGIN = `https://${HOST}`;
const LOCALE_PREFIX = /^\/zh(?=\/|$)/;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');
const paths = args
  .filter((arg) => arg.startsWith('/'))
  .map((path) => (path.length > 1 ? path.replace(/\/+$/, '') : path));

if (!all && paths.length === 0) {
  console.error('Give one or more paths (e.g. /pricing) or --all.');
  process.exit(1);
}

const keyRes = await fetch(`${ORIGIN}/${KEY}.txt`);
const keyBody = keyRes.ok ? (await keyRes.text()).trim() : '';
if (keyBody !== KEY) {
  console.error(
    `Key file ${ORIGIN}/${KEY}.txt is not live (HTTP ${keyRes.status}). Deploy first.`
  );
  process.exit(1);
}

const sitemapRes = await fetch(`${ORIGIN}/sitemap.xml`);
if (!sitemapRes.ok) {
  console.error(`sitemap.xml: HTTP ${sitemapRes.status}`);
  process.exit(1);
}
const sitemap = await sitemapRes.text();
const listed = [
  ...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])),
].filter((url) => new URL(url).host === HOST);

const basePath = (url) =>
  new URL(url).pathname.replace(LOCALE_PREFIX, '') || '/';

let urls = listed;
if (!all) {
  const missing = paths.filter(
    (path) => !listed.some((url) => basePath(url) === path)
  );
  if (missing.length) {
    console.error(`Not in the sitemap: ${missing.join(', ')}`);
    process.exit(1);
  }
  urls = listed.filter((url) => paths.includes(basePath(url)));
}

console.log(`${urls.length} URLs${dryRun ? ' (dry run)' : ''}`);
console.log(urls.join('\n'));
if (dryRun) process.exit(0);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `${ORIGIN}/${KEY}.txt`,
    urlList: urls,
  }),
});
// 200 = accepted; 202 = accepted, key still being verified.
console.log(`IndexNow: ${res.status} ${res.statusText}`);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
