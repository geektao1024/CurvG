import { createFileRoute } from '@tanstack/react-router';

import { Link } from '@/core/i18n/navigation';
import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import {
  hubPreviewCurves,
  libraryText,
  pathCurves,
  primaryScenesForHub,
  publicPaths,
  rootCategories,
} from '@/content/library';

import { LibraryCurveGrid, libraryLocale, LibraryShell } from './-library-page';

function LibraryIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = libraryLocale(locale);

  return (
    <LibraryShell>
      <section className="curvg-stage curvg-frame relative border-b px-6 py-16 sm:px-10">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
          {m['library.index.eyebrow']()}
        </p>
        <h1 className="curvg-heading mt-5 max-w-3xl text-4xl text-balance sm:text-5xl">
          {m['library.index.h1']()}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          {m['library.index.intro']()}
        </p>
        <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
          {m['library.index.object_note']()}
        </p>
      </section>

      {rootCategories.map((hub) => {
        const preview = hubPreviewCurves(hub.id, 3);
        return (
          <section
            key={hub.id}
            className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
            aria-labelledby={`library-hub-${hub.id}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <span
                  className={`${hub.accentClass} mb-4 block h-0.5 w-10`}
                  aria-hidden
                />
                <h2
                  id={`library-hub-${hub.id}`}
                  className="curvg-heading text-2xl sm:text-3xl"
                >
                  {libraryText(hub.title, lang)}
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed sm:text-base">
                  {libraryText(hub.description, lang)}
                </p>
              </div>
              <Link
                href={`/library/${hub.id}`}
                className="text-primary text-sm font-medium underline underline-offset-4"
              >
                {m['library.index.enter']({
                  name: libraryText(hub.title, lang),
                })}
              </Link>
            </div>
            {primaryScenesForHub(hub.id).length > 0 ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {primaryScenesForHub(hub.id).map((scene) => (
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
                        {m['library.scene.duration']({
                          seconds: scene.durationSeconds,
                        })}
                      </p>
                      <h3 className="group-hover:text-primary mt-2 text-lg font-semibold tracking-tight">
                        {libraryText(scene.title, lang)}
                      </h3>
                      <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                        {libraryText(scene.question, lang)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
            <LibraryCurveGrid curves={preview} locale={lang} />
          </section>
        );
      })}

      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <h2 className="curvg-heading text-2xl sm:text-3xl">
          {m['library.index.paths']()}
        </h2>
        <div className="mt-8 space-y-3">
          {publicPaths.map((path, index) => (
            <details
              key={path.id}
              className="curvg-disclosure bg-card rounded-2xl border px-5 py-4"
              open={index === 0}
            >
              <summary className="cursor-pointer text-lg font-semibold tracking-tight">
                <span className="text-muted-foreground mr-3 font-mono text-xs">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {libraryText(path.title, lang)}
              </summary>
              <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed">
                {libraryText(path.description, lang)}
              </p>
              <LibraryCurveGrid curves={pathCurves(path)} locale={lang} />
            </details>
          ))}
        </div>
      </section>
    </LibraryShell>
  );
}

export const Route = createFileRoute('/library/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['library.meta.title']({}, { locale: locale as never });
    const description = m['library.meta.description'](
      {},
      { locale: locale as never }
    );
    const seoLinks = localizedLinks({ path: '/library', locale });
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      '@id': `${seoLinks.canonical}#library`,
      name: title,
      numberOfItems: rootCategories.length,
      itemListElement: rootCategories.map((hub, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: libraryText(hub.title, libraryLocale(locale)),
        url: localizedUrl(`/library/${hub.id}`, locale),
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
          children: serializeJsonLd(structuredData),
        },
      ],
    };
  },
  component: LibraryIndexPage,
});
