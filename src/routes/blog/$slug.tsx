import { createFileRoute, notFound } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { Calendar } from 'lucide-react';

import { envConfigs } from '@/config';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  DEFAULT_SOCIAL_IMAGE_PATH,
  localizedLinks,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SitePage } from '@/blocks/site-page';
import { MarkdownContent } from '@/components/markdown-content';
import { mdxComponents } from '@/components/mdx-components';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { formatPostDate, loadLocalPost } from '@/content/posts';
import { getBlogPostFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const locale = getLocale();
    const post = await getBlogPostFn({
      data: { slug: params.slug, locale },
    });
    if (!post) throw notFound();
    return { locale, post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, post } = loaderData;
    const path = `/blog/${post.slug}`;
    const seoLinks = localizedLinks({
      path,
      locale,
      availableLocales: post.availableLocales,
    });
    const isLocalizedVariant = post.availableLocales.includes(locale);
    const title = `${post.title} | ${envConfigs.app_name}`;
    const image = post.image || DEFAULT_SOCIAL_IMAGE_PATH;
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      image: [absoluteUrl(image)],
      datePublished: post.createdAt,
      dateModified: post.updatedAt || post.createdAt,
      inLanguage: seoLinks.canonicalLocale,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': seoLinks.canonical,
      },
      ...(post.authorName
        ? {
            author: {
              '@type': post.authorType || 'Person',
              name: post.authorName,
            },
          }
        : {}),
      publisher: {
        '@type': 'Organization',
        name: envConfigs.app_name,
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(envConfigs.app_logo),
        },
      },
    };
    return {
      meta: [
        { title },
        { name: 'description', content: post.description },
        ...socialMeta({
          title,
          description: post.description,
          url: seoLinks.canonical,
          type: 'article',
          image,
          imageAlt: post.title,
        }),
        { property: 'article:published_time', content: post.createdAt },
        {
          property: 'article:modified_time',
          content: post.updatedAt || post.createdAt,
        },
        ...(!isLocalizedVariant
          ? [{ name: 'robots', content: 'noindex, follow' }]
          : []),
      ],
      links: seoLinks.links,
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd([
            breadcrumbJsonLd(
              [
                {
                  name: m['common.nav.home']({}, { locale: locale as never }),
                  path: '/',
                },
                {
                  name: m['blog.breadcrumb']({}, { locale: locale as never }),
                  path: '/blog',
                },
                { name: post.title, path },
              ],
              locale
            ),
            structuredData,
          ]),
        },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { locale, post } = Route.useLoaderData();

  // Local posts render their bundled MDX component; database posts render
  // raw markdown through MarkdownContent.
  const LocalContent =
    post.source === 'local' ? loadLocalPost(post.slug, locale)?.default : null;

  return (
    <SitePage mainClassName="curvg-stage curvg-frame px-6 py-12 md:px-8 md:py-16">
      <article className="mx-auto max-w-3xl">
        <PageBreadcrumbs
          label={m['common.nav.breadcrumb']()}
          items={[
            { href: '/', label: m['common.nav.home']() },
            { href: '/blog', label: m['blog.breadcrumb']() },
            { href: `/blog/${post.slug}`, label: post.title },
          ]}
        />

        <header className="border-border mt-8 mb-6 border-b pb-6">
          <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {post.title}
          </h1>
          {post.description && (
            <p className="text-muted-foreground mt-3">{post.description}</p>
          )}
          <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formatPostDate(post.createdAt, locale)}
            </span>
            {(post.authorName || post.authorImage) && (
              <span className="inline-flex items-center gap-2">
                {post.authorImage && (
                  <img
                    src={post.authorImage}
                    alt={post.authorName || ''}
                    width={20}
                    height={20}
                    className="size-5 rounded-full object-cover"
                  />
                )}
                {post.authorName}
              </span>
            )}
          </div>
        </header>

        {post.image && (
          <img
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            fetchPriority="high"
            className="border-border mb-8 aspect-[40/21] w-full rounded-2xl border object-cover"
          />
        )}

        {LocalContent ? (
          <div className="text-foreground/90 text-[15px] leading-7">
            <MDXProvider components={mdxComponents}>
              <LocalContent />
            </MDXProvider>
          </div>
        ) : (
          <MarkdownContent content={post.content || ''} />
        )}
      </article>
    </SitePage>
  );
}
