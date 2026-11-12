/**
 * When each page's content last changed (YYYY-MM-DD), for sitemap <lastmod>.
 *
 * Labs, wonders and blog posts carry their own date (`updated`, `updated_at`);
 * hubs take the newest date among their children. Pages without their own
 * content file are listed here: bump the date when the page's copy changes in
 * a way a reader would notice, not on every refactor, so search engines keep
 * trusting it.
 */
export const PAGE_UPDATED = {
  '': '2026-11-12',
  '/creator': '2026-10-16',
  '/math-animation-tool': '2026-11-12',
  '/free-math-video-creator': '2026-10-16',
  '/manim-alternative': '2026-11-12',
  '/pricing': '2026-11-12',
} as const;

/** Every curve page and the /curves hub (last content change). */
export const CURVES_UPDATED = '2026-10-17';

/** The newest of several YYYY-MM-DD (or ISO) dates. */
export function newestDate(dates: readonly string[]): string | undefined {
  return dates.reduce<string | undefined>(
    (newest, date) => (!newest || date > newest ? date : newest),
    undefined
  );
}
