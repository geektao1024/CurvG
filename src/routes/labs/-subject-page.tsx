import { notFound } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { LabCard } from '@/components/lab-card';
import {
  chapterPath,
  getSubject,
  publicSubjects,
  subjectPath,
  suitesForSubject,
  type LabSubjectId,
} from '@/content/labs';
import { libraryText } from '@/content/library';

import { libraryLocale, LibraryShell } from '../library/-library-page';
import { levelLabels } from './-labs-page';

/**
 * /labs/{subject}: every suite of one subject, each chapter as a card with
 * its question and key points. The subject-level page that "数学实验" /
 * "physics simulations" searches land on; suites and chapters keep their URLs.
 */
function SubjectPage({ id }: { id: LabSubjectId }) {
  const lang = libraryLocale(getLocale());
  const subject = getSubject(id)!;
  const suites = suitesForSubject(id);
  const chapters = suites.reduce(
    (sum, suite) => sum + suite.chapters.length,
    0
  );
  const others = publicSubjects().filter((other) => other.id !== id);
  const levels = levelLabels();

  return (
    <LibraryShell>
      <section className="curvg-stage curvg-frame border-b px-6 py-14 sm:px-10">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link
            href="/labs"
            className="hover:text-foreground transition-colors"
          >
            {m['labs.breadcrumb']()}
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-foreground">
            {libraryText(subject.name, lang)}
          </span>
        </nav>
        <h1 className="curvg-heading mt-5 max-w-4xl text-4xl text-balance sm:text-5xl">
          {libraryText(subject.headline, lang)}
        </h1>
        <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          {libraryText(subject.description, lang)}
        </p>
        <p className="text-muted-foreground mt-6 font-mono text-xs tracking-[0.14em] uppercase">
          {m['labs.subject.count']({ suites: suites.length, chapters })}
        </p>
        {/* Jump links: one per suite. */}
        <ul className="mt-6 flex flex-wrap gap-2">
          {suites.map((suite) => (
            <li key={suite.slug}>
              <a
                href={`#${suite.slug}`}
                className="hover:border-primary/50 hover:text-primary rounded-full border px-3.5 py-1.5 text-sm transition-colors"
              >
                {libraryText(suite.name, lang)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {suites.map((suite) => (
        <section
          key={suite.slug}
          id={suite.slug}
          className="curvg-stage curvg-frame scroll-mt-24 border-b px-6 py-12 sm:px-10"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="bg-primary block h-0.5 w-10" aria-hidden />
              <h2 className="curvg-heading mt-4 text-2xl sm:text-3xl">
                {libraryText(suite.name, lang)}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {libraryText(suite.summary, lang)}
              </p>
            </div>
            <Link
              href={chapterPath(suite, suite.chapters[0])}
              className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              {m['labs.subject.start_suite']()}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {suite.chapters.map((lab) => (
              <LabCard
                key={lab.slug}
                lab={lab}
                locale={lang}
                levelLabels={levels}
                openLabel={m['labs.index.open']()}
                boardAria={m['labs.board.aria']({
                  title: libraryText(lab.title, lang),
                })}
              />
            ))}
          </div>
        </section>
      ))}

      {others.length ? (
        <section className="curvg-stage curvg-frame px-6 py-12 sm:px-10">
          <h2 className="text-muted-foreground font-mono text-xs font-semibold tracking-[0.16em] uppercase">
            {m['labs.subject.other']()}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {others.map((other) => (
              <li key={other.id}>
                <Link
                  href={subjectPath(other.id)}
                  className="bg-card hover:border-primary/50 group block rounded-2xl border p-5 transition-colors"
                >
                  <span className="group-hover:text-primary text-lg font-semibold transition-colors">
                    {libraryText(other.name, lang)}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {libraryText(other.description, lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </LibraryShell>
  );
}

/** Route options for one subject page; each subject has a two-line route file. */
export function subjectRouteOptions(id: LabSubjectId) {
  return {
    loader: () => {
      if (!publicSubjects().some((subject) => subject.id === id))
        throw notFound();
      return { locale: getLocale() };
    },
    head: ({ loaderData }: { loaderData?: { locale: string } }) => {
      if (!loaderData) return {};
      const { locale } = loaderData;
      const lang = libraryLocale(locale);
      const subject = getSubject(id)!;
      const opts = { locale: locale as never };
      const title = libraryText(subject.metaTitle, lang);
      const description = libraryText(subject.metaDescription, lang);
      const path = subjectPath(id);
      const seoLinks = localizedLinks({ path, locale });
      const items = suitesForSubject(id).flatMap((suite) =>
        suite.chapters.map((chapter) => ({
          name: `${libraryText(suite.name, lang)} · ${libraryText(chapter.chapterTitle, lang)}`,
          url: localizedUrl(chapterPath(suite, chapter), locale),
        }))
      );
      const structuredData = [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: libraryText(subject.headline, lang),
          description,
          url: seoLinks.canonical,
          inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              url: item.url,
            })),
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: m['labs.breadcrumb']({}, opts),
              item: localizedUrl('/labs', locale),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: libraryText(subject.name, lang),
              item: seoLinks.canonical,
            },
          ],
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
    component: () => <SubjectPage id={id} />,
  };
}
