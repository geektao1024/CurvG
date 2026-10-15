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
import { LabSuiteCard } from '@/components/lab-card';
import { LabSearch } from '@/components/lab-search';
import { PageHero } from '@/components/page-hero';
import {
  chapterPath,
  labSearchEntries,
  publicLabs,
  publicSubjects,
  subjectPath,
  suitesForSubject,
} from '@/content/labs';
import { contentLocale, localeText } from '@/content/text';

/**
 * /labs hub: subjects (math now, physics reserved), then one card per
 * suite listing its chapters. Chapter pages are the indexable units.
 */
function LabsIndexPage() {
  const { locale } = Route.useLoaderData();
  const lang = contentLocale(locale);
  const subjects = publicSubjects();

  return (
    <SitePage>
      <PageHero
        crumbs={[
          { href: '/', label: m['common.nav.home']() },
          { href: '/labs', label: m['labs.breadcrumb']() },
        ]}
        crumbLabel={m['common.nav.breadcrumb']()}
        eyebrow={m['labs.index.eyebrow']()}
        title={m['labs.index.title']()}
        lead={m['labs.index.description']()}
      >
        <div className="max-w-xl">
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
      </PageHero>

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
              {localeText(subject.name, lang)}
            </Link>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
            {localeText(subject.description, lang)}
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
                  title: localeText(suite.name, lang),
                })}
              />
            ))}
          </div>
        </section>
      ))}
    </SitePage>
  );
}

export const Route = createFileRoute('/labs/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale } = loaderData;
    const lang = contentLocale(locale);
    const opts = { locale: locale as never };
    const title = m['labs.index.meta_title']({}, opts);
    const description = m['labs.index.meta_description']({}, opts);
    const seoLinks = localizedLinks({ path: '/labs', locale });
    // Every chapter, grouped the way the page groups them.
    const items = publicSubjects().flatMap((subject) =>
      suitesForSubject(subject.id).flatMap((suite) =>
        suite.chapters.map((chapter) => ({
          name: `${localeText(suite.name, lang)} · ${localeText(chapter.chapterTitle, lang)}`,
          url: localizedUrl(chapterPath(suite, chapter), locale),
        }))
      )
    );
    const structuredData = [
      breadcrumbJsonLd(
        [
          { name: m['common.nav.home']({}, opts), path: '/' },
          { name: m['labs.breadcrumb']({}, opts), path: '/labs' },
        ],
        locale
      ),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description,
        url: seoLinks.canonical,
        inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
        mainEntity: {
          '@type': 'ItemList',
          name: m['labs.index.title']({}, opts),
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
