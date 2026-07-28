import { createServerFn } from '@tanstack/react-start';

import { baseLocale } from '@/paraglide/runtime.js';

import {
  getLocalPostLocales,
  getLocalPosts,
  loadLocalPost,
  mergePosts,
  type BlogPost,
  type BlogPostDetail,
} from './index';

// Database access stays behind server functions (dynamic import keeps
// drizzle out of the client bundle), mirroring the analytics pattern.

async function getDbPosts(): Promise<BlogPost[]> {
  try {
    const { listPublishedArticles } = await import('@/modules/posts/service');
    const rows = await listPublishedArticles();
    return rows.map((row) => ({
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
      source: 'db' as const,
    }));
  } catch {
    // Database not configured/reachable — local posts still render.
    return [];
  }
}

/**
 * All blog posts: database posts merged with local MDX posts,
 * deduped by slug (database wins), newest first.
 */
export const getBlogPostsFn = createServerFn()
  .validator((data: { locale: string; limit?: number }) => data)
  .handler(async ({ data }) => {
    const dbPosts = data.locale === baseLocale ? await getDbPosts() : [];
    const localPosts = getLocalPosts(data.locale).filter((post) =>
      post.availableLocales.includes(data.locale)
    );
    return mergePosts(dbPosts, localPosts, {
      limit: data.limit,
    });
  });

/**
 * Single blog post by slug: database first, local MDX as fallback.
 * Local posts return meta only — the route component resolves the MDX
 * Content from the bundled glob map (components don't serialize).
 */
export const getBlogPostFn = createServerFn()
  .validator((data: { slug: string; locale: string }) => data)
  .handler(async ({ data }): Promise<BlogPostDetail | null> => {
    const localPostLocales = getLocalPostLocales(data.slug);
    const hasExactLocalVariant = localPostLocales.includes(data.locale);

    if (data.locale === baseLocale || !hasExactLocalVariant) {
      try {
        const { findPublishedBySlug } = await import('@/modules/posts/service');
        const row = await findPublishedBySlug(data.slug);
        if (row) {
          return {
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            image: row.image || undefined,
            createdAt: new Date(row.createdAt).toISOString(),
            updatedAt: new Date(row.updatedAt).toISOString(),
            authorName: row.authorName || undefined,
            authorType: undefined,
            authorImage: row.authorImage || undefined,
            availableLocales: [...new Set([baseLocale, ...localPostLocales])],
            source: 'db',
            content: row.content || '',
          };
        }
      } catch {
        // Database not configured/reachable — fall through to local posts.
      }
    }

    const mod = loadLocalPost(data.slug, data.locale);
    if (!mod) return null;
    const meta = mod.meta;
    return {
      slug: data.slug,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      createdAt: new Date(meta.created_at).toISOString(),
      updatedAt: meta.updated_at
        ? new Date(meta.updated_at).toISOString()
        : undefined,
      authorName: meta.author_name,
      authorType: meta.author_type,
      authorImage: meta.author_image,
      availableLocales: getLocalPostLocales(data.slug),
      source: 'local',
    };
  });
