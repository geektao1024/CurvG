import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

type Entry = {
  path: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
};

const STATIC_ENTRIES: Entry[] = [
  {
    path: '',
    lastModified: '2026-07-23',
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/creator',
    lastModified: '2026-07-23',
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/pricing',
    lastModified: '2026-07-23',
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/privacy-policy',
    lastModified: '2026-07-23',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/terms-of-service',
    lastModified: '2026-07-23',
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

function urlFor(path: string, locale: string): string {
  return localizeUrl(`${envConfigs.app_url}${path || '/'}`, {
    locale: locale as (typeof locales)[number],
  }).href;
}

function entryXml(e: Entry): string {
  const alternates = locales
    .map(
      (loc) =>
        `    <xhtml:link rel="alternate" hreflang="${loc}" href="${urlFor(e.path, loc)}"/>`
    )
    .join('\n');
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor(e.path, baseLocale)}"/>`;
  return [
    '  <url>',
    `    <loc>${urlFor(e.path, baseLocale)}</loc>`,
    alternates,
    xDefault,
    e.lastModified ? `    <lastmod>${e.lastModified}</lastmod>` : null,
    `    <changefreq>${e.changeFrequency}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [...STATIC_ENTRIES];
        let posts = getLocalPosts(baseLocale);

        // Blog posts: db posts merged with local MDX posts.
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            source: 'db' as const,
          }));
          posts = mergePosts(dbPosts, posts);
        } catch {
          // Database unreachable — local posts still listed.
        }

        if (posts.length > 0) {
          entries.push({
            path: '/blog',
            lastModified: posts[0]?.createdAt,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
          for (const post of posts) {
            entries.push({
              path: `/blog/${post.slug}`,
              lastModified: post.createdAt,
              changeFrequency: 'monthly',
              priority: 0.6,
            });
          }
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.map(entryXml),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
