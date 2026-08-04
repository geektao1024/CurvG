import { createFileRoute } from '@tanstack/react-router';

import { localizedUrl } from '@/lib/seo';
import { baseLocale, locales } from '@/paraglide/runtime.js';
import { CURVES } from '@/content/curves';
import {
  getLocalPostLocales,
  getLocalPosts,
  type BlogPost,
} from '@/content/posts';

type Entry = {
  path: string;
  availableLocales: readonly string[];
  lastModified?: string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

const ALL_LOCALES = [...locales];

const STATIC_ENTRIES: Entry[] = [
  {
    path: '',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/creator',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/math-animation-tool',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/free-math-video-creator',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    path: '/manim-alternative',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/curves',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  ...CURVES.map(
    (curve): Entry => ({
      path: `/curves/${curve.slug}`,
      availableLocales: ALL_LOCALES,
      changeFrequency: 'monthly',
      priority: 0.6,
    })
  ),
  {
    path: '/pricing',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    path: '/privacy-policy',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
  {
    path: '/terms-of-service',
    availableLocales: ALL_LOCALES,
    changeFrequency: 'yearly',
    priority: 0.3,
  },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function entryXml(entry: Entry): string[] {
  const availableLocales = locales.filter((locale) =>
    entry.availableLocales.includes(locale)
  );
  if (availableLocales.length === 0) return [];

  const defaultLocale = availableLocales.includes(baseLocale)
    ? baseLocale
    : availableLocales[0];
  const alternates = availableLocales
    .map(
      (locale) =>
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(localizedUrl(entry.path, locale))}"/>`
    )
    .join('\n');
  const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(entry.path, defaultLocale))}"/>`;

  return availableLocales.map((locale) =>
    [
      '  <url>',
      `    <loc>${escapeXml(localizedUrl(entry.path, locale))}</loc>`,
      alternates,
      xDefault,
      entry.lastModified
        ? `    <lastmod>${escapeXml(entry.lastModified)}</lastmod>`
        : null,
      `    <changefreq>${entry.changeFrequency}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

function getLocalPostIndex(): Map<string, BlogPost> {
  const posts = new Map<string, BlogPost>();

  for (const locale of locales) {
    for (const post of getLocalPosts(locale)) {
      if (!post.availableLocales.includes(locale)) continue;
      const current = posts.get(post.slug);
      posts.set(
        post.slug,
        current
          ? {
              ...current,
              availableLocales: [
                ...new Set([
                  ...current.availableLocales,
                  ...post.availableLocales,
                ]),
              ],
            }
          : post
      );
    }
  }

  return posts;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const entries: Entry[] = [...STATIC_ENTRIES];
        const postsBySlug = getLocalPostIndex();

        // Database posts currently have no locale column, so they are treated
        // as base-locale content. Exact local translations extend that set.
        try {
          const { listPublishedArticles } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          for (const row of rows) {
            postsBySlug.set(row.slug, {
              slug: row.slug,
              title: row.title || row.slug,
              description: row.description || '',
              image: row.image || undefined,
              createdAt: new Date(row.createdAt).toISOString(),
              updatedAt: new Date(row.updatedAt).toISOString(),
              authorName: row.authorName || undefined,
              authorType: undefined,
              authorImage: row.authorImage || undefined,
              availableLocales: [
                ...new Set([baseLocale, ...getLocalPostLocales(row.slug)]),
              ],
              source: 'db',
            });
          }
        } catch {
          // Database unreachable — local posts still remain in the sitemap.
        }

        const posts = [...postsBySlug.values()].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
        );

        if (posts.length > 0) {
          entries.push({
            path: '/blog',
            availableLocales: [
              ...new Set(posts.flatMap((post) => post.availableLocales)),
            ],
            lastModified: posts[0].updatedAt || posts[0].createdAt,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
          for (const post of posts) {
            entries.push({
              path: `/blog/${post.slug}`,
              availableLocales: post.availableLocales,
              lastModified: post.updatedAt || post.createdAt,
              changeFrequency: 'monthly',
              priority: 0.6,
            });
          }
        }

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
          ...entries.flatMap(entryXml),
          '</urlset>',
          '',
        ].join('\n');

        return new Response(xml, {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=3600',
          },
        });
      },
    },
  },
});
