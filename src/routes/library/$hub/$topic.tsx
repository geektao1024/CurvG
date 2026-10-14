import { createFileRoute, notFound } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import {
  fitTitle,
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { LabCard } from '@/components/lab-card';
import type { CurveDef } from '@/content/curves';
import { labsForCategory } from '@/content/labs';
import {
  curvesForCategory,
  curvesInCategory,
  getCategory,
  getPrimaryTrail,
  libraryText,
  scenesForCategory,
} from '@/content/library';

import {
  contentCount,
  LibraryBreadcrumb,
  libraryBreadcrumbJsonLd,
  LibraryCurveGrid,
  libraryLocale,
  LibraryShell,
} from '../-library-page';
import { labCardLabels } from '../../labs/-labs-page';

function LibraryTopicPage() {
  const { locale, hubId, topicId } = Route.useLoaderData();
  const lang = libraryLocale(locale);
  const hub = getCategory(hubId);
  const topic = getCategory(topicId);
  if (!hub || !topic) return null;
  const { primary, additional } = curvesForCategory(topic.id);
  const additionalIds = new Set(additional.map((curve) => curve.slug));
  const curves = [...primary, ...additional];
  const scenes = scenesForCategory(topic.id);
  const labs = labsForCategory(topic.id);

  return (
    <LibraryShell>
      <article>
        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <LibraryBreadcrumb trail={getPrimaryTrail(topic.id)} locale={lang} />
          <h1 className="curvg-heading mt-8 max-w-3xl text-4xl text-balance sm:text-5xl">
            {libraryText(topic.title, lang)}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {libraryText(topic.description, lang)}
          </p>
          <p className="text-muted-foreground mt-4 font-mono text-xs tracking-[0.14em] uppercase">
            {contentCount(topic.id)}
          </p>
          {labs.length > 0 ? (
            <>
              <h2 className="text-muted-foreground mt-10 font-mono text-[10px] tracking-[0.14em] uppercase">
                {m['labs.topic.heading']()}
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {labs.map((lab) => (
                  <LabCard
                    key={lab.slug}
                    lab={lab}
                    locale={lang}
                    {...labCardLabels(lab, lang)}
                  />
                ))}
              </div>
            </>
          ) : null}
          {scenes.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {scenes.map((scene) => (
                <Link
                  key={scene.slug}
                  href={`/library/scenes/${scene.slug}`}
                  className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-colors"
                >
                  <div className="bg-muted/30 grid aspect-video place-items-center border-b">
                    {scene.video ? (
                      <img
                        src={scene.video.poster}
                        alt=""
                        className="size-full bg-black object-contain"
                      />
                    ) : (
                      <span className="font-heading text-3xl tracking-[0.2em]">
                        ABC
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-primary font-mono text-[10px] tracking-[0.14em] uppercase">
                      {scene.primaryCategoryId === topic.id
                        ? m['library.scene.duration']({
                            seconds: scene.durationSeconds,
                          })
                        : m['library.also_badge']()}
                    </p>
                    <h2 className="group-hover:text-primary mt-2 text-lg font-semibold tracking-tight">
                      {libraryText(scene.title, lang)}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
          <LibraryCurveGrid
            heading="h2"
            curves={curves}
            locale={lang}
            badgeFor={(curve: CurveDef) =>
              additionalIds.has(curve.slug)
                ? m['library.also_badge']()
                : m['library.object_badge']()
            }
          />
        </section>
      </article>
    </LibraryShell>
  );
}

export const Route = createFileRoute('/library/$hub/$topic')({
  loader: ({ params }) => {
    const hub = getCategory(params.hub);
    const topic = getCategory(params.topic);
    if (!hub || hub.primaryParentId) throw notFound();
    if (!topic || topic.primaryParentId !== hub.id) throw notFound();
    return { locale: getLocale(), hubId: hub.id, topicId: topic.id };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const hub = getCategory(loaderData.hubId);
    const topic = getCategory(loaderData.topicId);
    if (!hub || !topic) return {};
    const { locale } = loaderData;
    const lang = libraryLocale(locale);
    const name = libraryText(topic.title, lang);
    const hubName = libraryText(hub.title, lang);
    const title = fitTitle([
      m['library.topic.meta_title'](
        { name, hub: hubName },
        { locale: locale as never }
      ),
      m['library.hub.meta_title']({ name }, { locale: locale as never }),
    ]);
    const path = `/library/${hub.id}/${topic.id}`;
    const seoLinks = localizedLinks({ path, locale });
    const curves = curvesInCategory(topic.id);
    const scenes = scenesForCategory(topic.id);
    const description = m['library.topic.meta_description'](
      {
        description: libraryText(topic.description, lang),
        count: curves.length + scenes.length,
      },
      { locale: locale as never }
    );
    const robots =
      curves.length + scenes.length === 0
        ? [{ name: 'robots', content: 'noindex' }]
        : [];
    // Breadcrumb always; the item list only when there are curves to list.
    const structuredData = [
      libraryBreadcrumbJsonLd(getPrimaryTrail(topic.id), locale),
      ...(curves.length > 0
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: title,
              numberOfItems: curves.length,
              itemListElement: curves.map((curve, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: curve.name[lang],
                url: localizedUrl(`/curves/${curve.slug}`, locale),
              })),
            },
          ]
        : []),
    ];
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...robots,
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
  component: LibraryTopicPage,
});
