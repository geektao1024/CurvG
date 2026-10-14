import type { ComponentType } from 'react';
import { notFound, useLoaderData } from '@tanstack/react-router';

import {
  breadcrumbJsonLd,
  localizedLinks,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { baseLocale, getLocale } from '@/paraglide/runtime.js';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';

type PageMeta = {
  title: string;
  description: string;
  updated_at: string;
};

type PageModule = {
  default: ComponentType;
  meta: PageMeta;
};

// Eagerly bundle the static content pages (small legal/info MDX files).
// Keys are absolute from the project root.
const pages = import.meta.glob<PageModule>('/src/content/pages/*.mdx', {
  eager: true,
});

function loadPage(slug: string, locale: string): PageModule | null {
  return (
    pages[`/src/content/pages/${slug}.${locale}.mdx`] ??
    pages[`/src/content/pages/${slug}.${baseLocale}.mdx`] ??
    null
  );
}

type LoaderData = { meta: PageMeta; slug: string; locale: string };

/** Page titles carry the brand ("… | CurvG"); breadcrumbs do not. */
function pageName(title: string): string {
  return title.replace(/\s*[|｜].*$/, '');
}

// Shared route options for static MDX pages. Each page gets its own
// explicit route file (e.g. privacy-policy.tsx) so static segments
// always outrank dynamic ones — add a new page by creating the MDX
// content plus a thin route file using this factory.
export function staticPageRouteOptions(slug: string) {
  return {
    loader: (): LoaderData => {
      const locale = getLocale();
      const page = loadPage(slug, locale);
      if (!page) throw notFound();
      return { meta: page.meta, slug, locale };
    },
    head: ({ loaderData }: { loaderData?: LoaderData }) => {
      if (!loaderData) return {};
      const { meta, locale } = loaderData;
      const seoLinks = localizedLinks({ path: `/${slug}`, locale });
      return {
        meta: [
          { title: meta.title },
          { name: 'description', content: meta.description },
          ...socialMeta({
            title: meta.title,
            description: meta.description,
            url: seoLinks.canonical,
          }),
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
                  { name: pageName(meta.title), path: `/${slug}` },
                ],
                locale
              )
            ),
          },
        ],
      };
    },
    component: StaticPage,
  };
}

function StaticPage() {
  const { meta, slug, locale } = useLoaderData({
    strict: false,
  }) as LoaderData;

  const page = loadPage(slug, locale)!;
  const Content = page.default;

  return (
    <article>
      <PageBreadcrumbs
        label={m['common.nav.breadcrumb']()}
        items={[
          { href: '/', label: m['common.nav.home']() },
          { href: `/${slug}`, label: pageName(meta.title) },
        ]}
      />
      <header className="border-border mt-8 mb-6 border-b pb-5">
        <h1 className="curvg-heading text-foreground text-3xl md:text-4xl">
          {meta.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{meta.description}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          {m['common.pages.last_updated']()}: {meta.updated_at}
        </p>
      </header>
      <div className="text-foreground/90 text-[15px] leading-7">
        <Content />
      </div>
    </article>
  );
}
