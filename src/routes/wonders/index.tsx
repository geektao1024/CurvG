import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  breadcrumbJsonLd,
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SitePage } from '@/blocks/site-page';
import { PageHero } from '@/components/page-hero';
import { WonderCard } from '@/components/wonder-card';
import { libraryText } from '@/content/library';
import { publicWonders, wonderPath } from '@/content/wonders';

/**
 * /wonders hub. The whole page sits under `.dark` so the section reads as a
 * different place from the paper labs, header and footer included.
 */
function WondersIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = locale === 'zh' ? 'zh' : 'en';
  const wonders = publicWonders();

  return (
    <div className="dark wonder-page">
      <SitePage>
        <PageHero
          tone="dark"
          crumbs={[
            { href: '/', label: m['common.nav.home']() },
            { href: '/wonders', label: m['wonders.breadcrumb']() },
          ]}
          crumbLabel={m['common.nav.breadcrumb']()}
          eyebrow={m['wonders.index.eyebrow']()}
          title={m['wonders.index.title']()}
          lead={m['wonders.index.description']()}
        >
          <p className="text-muted-foreground font-mono text-xs tracking-[0.14em] uppercase">
            {m['wonders.index.count']({ count: wonders.length })}
          </p>
        </PageHero>

        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wonders.map((wonder) => (
              <WonderCard
                heading="h2"
                key={wonder.slug}
                slug={wonder.slug}
                href={wonderPath(wonder)}
                meta={`${m['wonders.page.no']({ number: wonder.number })} · ${libraryText(wonder.field, lang)}`}
                title={libraryText(wonder.question, lang)}
                body={libraryText(wonder.takeaway, lang)}
              />
            ))}
          </div>
          <p className="mt-6 text-sm text-[rgba(236,234,244,0.45)]">
            {m['wonders.index.more']()}
          </p>
        </section>

        <section className="curvg-stage curvg-frame px-6 py-12 sm:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="curvg-heading text-2xl">
                {m['wonders.index.labs_title']()}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[rgba(236,234,244,0.6)]">
                {m['wonders.index.labs_body']()}
              </p>
            </div>
            <Link
              href="/labs"
              className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5"
            >
              {m['wonders.index.labs_cta']()}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </SitePage>
    </div>
  );
}

export const Route = createFileRoute('/wonders/')({
  loader: () => {
    const locale = getLocale();
    const opts = { locale: locale as never };
    return {
      locale,
      title: m['wonders.index.meta_title']({}, opts),
      description: m['wonders.index.meta_description']({}, opts),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, title, description } = loaderData;
    const seo = localizedLinks({ path: '/wonders', locale });
    const lang = locale === 'zh' ? 'zh' : 'en';
    const collection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: seo.canonical,
      hasPart: publicWonders().map((wonder) => ({
        '@type': 'LearningResource',
        name: libraryText(wonder.question, lang),
        url: localizedUrl(wonderPath(wonder), locale),
      })),
    };
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({ title, description, url: seo.canonical }),
      ],
      links: seo.links,
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
                  name: m['wonders.breadcrumb'](
                    {},
                    { locale: locale as never }
                  ),
                  path: '/wonders',
                },
              ],
              locale
            ),
            collection,
          ]),
        },
      ],
    };
  },
  component: WondersIndexPage,
});
