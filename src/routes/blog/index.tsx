import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SitePage } from '@/blocks/site-page';
import { BlogCard } from '@/components/blog-card';
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
    };
  },
  component: BlogPage,
});

function BlogPage() {
  const { locale, posts } = Route.useLoaderData();

  return (
    <SitePage mainClassName="px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h1 className="font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {m['blog.title']()}
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-lg">
            {m['blog.description']()}
          </p>
        </div>
        {posts.length === 0 ? (
          <p className="text-muted-foreground text-center">
            {m['blog.no_posts']()}
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <BlogCard
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
