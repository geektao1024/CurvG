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
import { LabSuiteCard } from '@/components/lab-card';
import { LabSearch } from '@/components/lab-search';
import {
  chapterPath,
  labSearchEntries,
  publicLabs,
  publicSubjects,
  subjectPath,
  suitesForSubject,
} from '@/content/labs';
import { libraryText } from '@/content/library';

import { libraryLocale, LibraryShell } from '../library/-library-page';

/**
 * /labs hub: subjects (math now, physics reserved), then one card per
 * suite listing its chapters. Chapter pages are the indexable units.
 */
function LabsIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = libraryLocale(locale);
  const subjects = publicSubjects();

  return (
    <LibraryShell>
      <section className="curvg-stage curvg-frame border-b px-6 py-14 sm:px-10">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
          {m['labs.index.eyebrow']()}
        </p>
        <h1 className="curvg-heading mt-4 max-w-3xl text-4xl text-balance sm:text-6xl">
          {m['labs.index.title']()}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          {m['labs.index.description']()}
        </p>
        <div className="mt-8 max-w-xl">
          <LabSearch
            items={labSearchEntries(lang)}
            label={m['home.hero.search_label']()}
            placeholder={m['home.hero.search_placeholder']()}
            emptyLabel={m['home.hero.search_empty']()}
          />
        </div>
        <p className="text-muted-foreground mt-6 font-mono text-xs tracking-[0.14em] uppercase">
          {m['labs.index.count']({ count: publicLabs().length })}
        </p>
      </section>

      {subjects.map((subject) => (
        <section
          key={subject.id}
          id={subject.id}
          className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
        >
          <span className="bg-primary block h-0.5 w-10" aria-hidden />
          <h2 className="curvg-heading mt-4 text-2xl sm:text-3xl">
            <Link
              href={subjectPath(subject.id)}
              className="hover:text-primary transition-colors"
            >
              {libraryText(subject.name, lang)}
            </Link>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {libraryText(subject.description, lang)}
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suitesForSubject(subject.id).map((suite) => (
              <LabSuiteCard
                key={suite.slug}
                suite={suite}
                locale={lang}
                chaptersLabel={m['labs.index.chapters']({
                  count: suite.chapters.length,
                })}
                startLabel={m['labs.index.start']()}
                boardAria={m['labs.board.aria']({
                  title: libraryText(suite.name, lang),
                })}
              />
            ))}
          </div>
        </section>
      ))}
    </LibraryShell>
  );
}

export const Route = createFileRoute('/labs/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale } = loaderData;
    const lang = libraryLocale(locale);
    const opts = { locale: locale as never };
    const title = m['labs.index.meta_title']({}, opts);
    const description = m['labs.index.meta_description']({}, opts);
    const seoLinks = localizedLinks({ path: '/labs', locale });
    // Every chapter, grouped the way the page groups them.
    const items = publicSubjects().flatMap((subject) =>
      suitesForSubject(subject.id).flatMap((suite) =>
        suite.chapters.map((chapter) => ({
          name: `${libraryText(suite.name, lang)} · ${libraryText(chapter.chapterTitle, lang)}`,
          url: localizedUrl(chapterPath(suite, chapter), locale),
        }))
      )
    );
    const structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: seoLinks.canonical,
        inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
        mainEntity: {
          '@type': 'ItemList',
          name: m['labs.index.eyebrow']({}, opts),
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            url: item.url,
          })),
        },
      },
    ];
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
  component: LabsIndexPage,
});
