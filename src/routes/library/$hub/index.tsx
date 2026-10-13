import { createFileRoute, notFound } from '@tanstack/react-router';

import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { LabCard } from '@/components/lab-card';
import { labsForHub } from '@/content/labs';
import {
  categoryCurveCount,
  childCategories,
  getCategory,
  getPrimaryTrail,
  hubPreviewCurves,
  isPublicHub,
  libraryText,
} from '@/content/library';

import {
  ChildCategoryGrid,
  LibraryBreadcrumb,
  LibraryCurveGrid,
  libraryLocale,
  LibraryShell,
} from '../-library-page';
import { labCardLabels } from '../../labs/-labs-page';

function LibraryHubPage() {
  const { locale, hubId } = Route.useLoaderData();
  const lang = libraryLocale(locale);
  const hub = getCategory(hubId);
  if (!hub) return null;
  const children = childCategories(hub.id);
  const labs = labsForHub(hub.id);
  const curves = hubPreviewCurves(hub.id, 6);
  const curveCount = categoryCurveCount(hub.id);

  return (
    <LibraryShell>
      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <LibraryBreadcrumb trail={getPrimaryTrail(hub.id)} locale={lang} />
        <span
          className={`${hub.accentClass} mt-8 block h-0.5 w-10`}
          aria-hidden
        />
        <h1 className="curvg-heading mt-5 max-w-3xl text-4xl text-balance sm:text-5xl">
          {libraryText(hub.title, lang)}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
          {libraryText(hub.description, lang)}
        </p>
        <p className="text-muted-foreground mt-4 font-mono text-xs tracking-[0.14em] uppercase">
          {[
            curveCount > 0 ? m['library.count']({ count: curveCount }) : null,
            labs.length > 0
              ? m['labs.index.count']({ count: labs.length })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>

      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <h2 className="curvg-heading text-2xl sm:text-3xl">
          {m['library.child_heading']()}
        </h2>
        <ChildCategoryGrid categories={children} locale={lang} />
      </section>

      {labs.length > 0 ? (
        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <h2 className="curvg-heading text-2xl sm:text-3xl">
            {m['labs.topic.heading']()}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((lab) => (
              <LabCard
                key={lab.slug}
                lab={lab}
                locale={lang}
                {...labCardLabels(lab, lang)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {curves.length > 0 ? (
        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <h2 className="curvg-heading text-2xl sm:text-3xl">
            {m['library.index.featured']()}
          </h2>
          <LibraryCurveGrid
            curves={curves}
            locale={lang}
            badgeFor={() => m['library.object_badge']()}
          />
        </section>
      ) : null}
    </LibraryShell>
  );
}

export const Route = createFileRoute('/library/$hub/')({
  loader: ({ params }) => {
    if (!isPublicHub(params.hub)) throw notFound();
    return { locale: getLocale(), hubId: params.hub };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const hub = getCategory(loaderData.hubId);
    if (!hub) return {};
    const { locale } = loaderData;
    const lang = libraryLocale(locale);
    const name = libraryText(hub.title, lang);
    const title = m['library.hub.meta_title'](
      { name },
      { locale: locale as never }
    );
    const description = libraryText(hub.description, lang);
    const seoLinks = localizedLinks({
      path: `/library/${hub.id}`,
      locale,
    });
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: m['library.breadcrumb']({}, { locale: locale as never }),
          item: localizedUrl('/library', locale),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name,
          item: seoLinks.canonical,
        },
      ],
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
          children: serializeJsonLd(structuredData),
        },
      ],
    };
  },
  component: LibraryHubPage,
});
