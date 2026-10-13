import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { LabSuiteCard } from '@/components/lab-card';
import {
  sectionActionClass,
  SectionHeading,
} from '@/components/section-heading';
import {
  publicLabs,
  publicSubjects,
  suitesForSubject,
  type LabSubjectId,
} from '@/content/labs';

/**
 * Homepage lab index: a subject filter with counts (as wedulab's wall) over
 * every suite, each listing its chapters. All subjects render on the server
 * and the filter only hides, so every chapter link stays crawlable.
 */
export function HomeLabIndex() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const subjects = publicSubjects().map((subject) => {
    const suites = suitesForSubject(subject.id);
    return {
      subject,
      suites,
      count: suites.reduce((sum, suite) => sum + suite.chapters.length, 0),
    };
  });
  const [filter, setFilter] = useState<'all' | LabSubjectId>('all');
  const tabs = [
    {
      id: 'all' as const,
      label: m['home.labs.all'](),
      count: publicLabs().length,
    },
    ...subjects.map(({ subject, count }) => ({
      id: subject.id,
      label: subject.name[lang],
      count,
    })),
  ];

  return (
    <section id="labs">
      <div className="curvg-stage curvg-frame curvg-section-spacing relative border-b">
        <SectionHeading
          eyebrow={m['home.labs.eyebrow']()}
          title={m['home.labs.title']()}
          description={m['home.labs.description']()}
          action={
            <Link href="/labs" className={sectionActionClass}>
              {m['home.labs.more']()}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          }
        />
        {tabs.length > 2 ? (
          <div
            role="group"
            aria-label={m['home.labs.filter_label']()}
            className="mt-8 flex flex-wrap gap-2"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
                  filter === tab.id
                    ? 'bg-foreground text-background border-foreground'
                    : 'hover:border-foreground/40 text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span className="font-mono text-xs opacity-70">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-10 space-y-12">
          {subjects.map(({ subject, suites, count }) => (
            <div
              key={subject.id}
              hidden={filter !== 'all' && filter !== subject.id}
            >
              <div className="flex items-baseline justify-between gap-4 border-b pb-3">
                <h3 className="text-xl font-semibold">
                  <Link
                    href={`/labs/${subject.id}`}
                    className="hover:text-primary transition-colors"
                  >
                    {subject.name[lang]}
                  </Link>
                </h3>
                <span className="text-muted-foreground font-mono text-xs">
                  {m['home.labs.subject_count']({ count })}
                </span>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {suites.map((suite) => (
                  <LabSuiteCard
                    key={suite.slug}
                    suite={suite}
                    locale={lang}
                    chaptersLabel={m['labs.index.chapters']({
                      count: suite.chapters.length,
                    })}
                    startLabel={m['labs.index.start']()}
                    headingLevel="h4"
                    boardAria={m['labs.board.aria']({
                      title: suite.name[lang],
                    })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
