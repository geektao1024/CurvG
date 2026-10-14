import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  breadcrumbJsonLd,
  localizedLinks,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SitePage } from '@/blocks/site-page';
import { BlogCard } from '@/components/blog-card';
import { PageHero } from '@/components/page-hero';
import { formatPostDate } from '@/content/posts';
import { getBlogPostsFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/')({
  loader: async () => {
    const locale = getLocale();
    const posts = await getBlogPostsFn({ data: { locale } });
    return { locale, posts };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale;
    const title = `${m['blog.title']({}, { locale: locale as any })} | ${envConfigs.app_name}`;
    const description = m['blog.description']({}, { locale: locale as any });
    const currentLocale = locale ?? 'en';
    const availableLocales = loaderData?.posts.length
      ? [...new Set(loaderData.posts.flatMap((post) => post.availableLocales))]
      : [currentLocale];
    const seoLinks = localizedLinks({
      path: '/blog',
      locale: currentLocale,
      availableLocales,
    });
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({
          title,
          description,
          url: seoLinks.canonical,
        }),
        ...(loaderData?.posts.length === 0
          ? [{ name: 'robots', content: 'noindex, follow' }]
          : []),
      ],
      links: seoLinks.links,
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd(
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
              ],
              currentLocale
            )
          ),
        },
      ],
    };
  },
  component: BlogPage,
});

function BlogPage() {
  const { locale, posts } = Route.useLoaderData();

  return (
    <SitePage>
      <PageHero
        crumbs={[
          { href: '/', label: m['common.nav.home']() },
          { href: '/blog', label: m['blog.breadcrumb']() },
        ]}
        crumbLabel={m['common.nav.breadcrumb']()}
        title={m['blog.title']()}
        lead={m['blog.description']()}
      />
      <div className="curvg-stage curvg-frame px-6 py-12 sm:px-10">
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center">
            {m['blog.no_posts']()}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard
                heading="h2"
                key={post.slug}
                href={`/blog/${post.slug}`}
                title={post.title}
                description={post.description}
                image={post.image}
                date={formatPostDate(post.createdAt, locale)}
                authorName={post.authorName}
                authorImage={post.authorImage}
              />
            ))}
          </div>
        )}
      </div>
    </SitePage>
  );
}
