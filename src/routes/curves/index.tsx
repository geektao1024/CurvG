import { createFileRoute } from '@tanstack/react-router';

import {
  breadcrumbJsonLd,
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { curveCategoryLabel } from '@/blocks/curve-categories';
import { SitePage } from '@/blocks/site-page';
import { CurveIndex } from '@/components/curve-index';
import { CurveDrawingLoop } from '@/components/curve-preview';
import { PageHero } from '@/components/page-hero';
import {
  CURVE_CATEGORY_ORDER,
  CURVES,
  getCurve,
  getCurvesByCategory,
} from '@/content/curves';

const CATEGORY_DESCRIPTION = {
  parametric: () => m['curves.category_desc.parametric'](),
  polar: () => m['curves.category_desc.polar'](),
  roulette: () => m['curves.category_desc.roulette'](),
  spiral: () => m['curves.category_desc.spiral'](),
  conic: () => m['curves.category_desc.conic'](),
  cartesian: () => m['curves.category_desc.cartesian'](),
  fractal: () => m['curves.category_desc.fractal'](),
} as const;

/** The curve drawing itself beside the hero: a spirograph pattern. */
const HERO_CURVE = 'hypotrochoid';

function CurvesIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = locale === 'zh' ? 'zh' : 'en';
  const hero = getCurve(HERO_CURVE);
  const groups = CURVE_CATEGORY_ORDER.map((category) => ({
    id: category,
    title: curveCategoryLabel(category),
    description: CATEGORY_DESCRIPTION[category](),
    curves: getCurvesByCategory(category),
  })).filter((group) => group.curves.length > 0);

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
        aside={
          hero ? (
            <div className="aspect-[4/3] w-full">
              <CurveDrawingLoop curve={hero} />
            </div>
          ) : undefined
        }
      />
      <CurveIndex
        groups={groups}
        locale={lang}
        labels={{
          search: m['curves.index.search'](),
          clear: m['curves.index.clear'](),
          results: (count) => m['curves.index.results']({ count }),
          empty: m['curves.index.empty'](),
          jump: m['curves.index.jump'](),
          previewAria: (name) => m['curves.detail.preview_aria']({ name }),
        }}
      />
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
