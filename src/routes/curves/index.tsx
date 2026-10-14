import { createFileRoute } from '@tanstack/react-router';

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
import { CurveThumb } from '@/components/curve-preview';
import { PageHero } from '@/components/page-hero';
import {
  CURVE_CATEGORY_ORDER,
  CURVES,
  getCurvesByCategory,
} from '@/content/curves';

const CATEGORY_LABEL = {
  parametric: () => m['curves.category.parametric'](),
  polar: () => m['curves.category.polar'](),
  roulette: () => m['curves.category.roulette'](),
  spiral: () => m['curves.category.spiral'](),
  conic: () => m['curves.category.conic'](),
  cartesian: () => m['curves.category.cartesian'](),
} as const;

function CurvesIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = locale === 'zh' ? 'zh' : 'en';

  return (
    <SitePage>
      <PageHero
        crumbs={[
          { href: '/', label: m['common.nav.home']() },
          { href: '/curves', label: m['curves.breadcrumb']() },
        ]}
        crumbLabel={m['common.nav.breadcrumb']()}
        eyebrow={m['curves.index.eyebrow']()}
        title={m['curves.index.h1']()}
        lead={m['curves.index.intro']({ count: CURVES.length })}
      />

      {CURVE_CATEGORY_ORDER.map((category) => {
        const curves = getCurvesByCategory(category);
        if (curves.length === 0) return null;
        return (
          <section
            key={category}
            className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
            aria-labelledby={`curves-${category}`}
          >
            <h2
              id={`curves-${category}`}
              className="curvg-heading text-2xl sm:text-3xl"
            >
              {CATEGORY_LABEL[category]()}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {curves.map((curve) => (
                <Link
                  key={curve.slug}
                  href={`/curves/${curve.slug}`}
                  className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-colors"
                >
                  <div className="bg-muted/20 aspect-[4/3] border-b">
                    <CurveThumb
                      curve={curve}
                      ariaLabel={m['curves.detail.preview_aria']({
                        name: curve.name[lang],
                      })}
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="group-hover:text-primary text-lg font-semibold tracking-tight transition-colors">
                      {curve.name[lang]}
                    </h3>
                    <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                      {curve.short[lang]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </SitePage>
  );
}

export const Route = createFileRoute('/curves/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const lang = locale === 'zh' ? 'zh' : 'en';
    const title = m['curves.meta.title']({}, { locale: locale as never });
    const description = m['curves.meta.description'](
      { count: CURVES.length },
      { locale: locale as never }
    );
    const seoLinks = localizedLinks({ path: '/curves', locale });
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${seoLinks.canonical}#curves`,
      name: title,
      numberOfItems: CURVES.length,
      itemListElement: CURVES.map((curve, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: curve.name[lang],
        url: localizedUrl(`/curves/${curve.slug}`, locale),
      })),
    };
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({ title, description, url: seoLinks.canonical }),
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
                  name: m['curves.breadcrumb']({}, { locale: locale as never }),
                  path: '/curves',
                },
              ],
              locale
            ),
            structuredData,
          ]),
        },
      ],
    };
  },
  component: CurvesIndexPage,
});
