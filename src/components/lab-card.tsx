import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { evaluateBoard } from '@/lib/board/evaluate';
import { BoardCanvas } from '@/components/lab-board';
import {
  chapterPath,
  labBoard,
  labPath,
  type Lab,
  type LabLevel,
  type LabSuite,
} from '@/content/labs';
import { localeText, type ContentLocale } from '@/content/text';

export function LabLevelChips({
  levels,
  labels,
}: {
  levels: readonly LabLevel[];
  labels: Record<LabLevel, string>;
}) {
  return (
    <>
      {levels.map((level) => (
        <span
          key={level}
          className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase"
        >
          {labels[level]}
        </span>
      ))}
    </>
  );
}

/** Lab card with a live (server-rendered) still of its board. */
export function LabCard({
  lab,
  locale,
  levelLabels,
  openLabel,
  boardAria,
}: {
  lab: Lab;
  locale: ContentLocale;
  levelLabels: Record<LabLevel, string>;
  openLabel: string;
  boardAria: string;
}) {
  const board = labBoard(lab, locale);
  const frame = useMemo(() => evaluateBoard(board, {}), [board]);
  return (
    <Link
      href={labPath(lab)}
      className="group bg-card hover:border-primary/50 flex flex-col overflow-hidden rounded-2xl border transition-colors"
    >
      <div className="curvg-board-thumb border-b">
        <BoardCanvas
          spec={board.spec}
          frame={frame}
          ariaLabel={boardAria}
          className="aspect-[16/10]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <LabLevelChips levels={lab.levels} labels={levelLabels} />
        </div>
        <h3 className="group-hover:text-primary mt-3 text-lg font-semibold tracking-tight transition-colors">
          {localeText(lab.title, locale)}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {localeText(lab.question, locale)}
        </p>
        <p className="text-muted-foreground mt-3 text-xs">
          {lab.keyPoints
            .slice(0, 3)
            .map((point) => localeText(point, locale))
            .join(' · ')}
        </p>
        <span className="text-primary mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium">
          {openLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * A suite on the /labs hub: a still of its opening board, what it covers,
 * and every chapter as its own link, so each chapter page is one click
 * (and one crawl hop) from the hub.
 */
export function LabSuiteCard({
  suite,
  locale,
  chaptersLabel,
  startLabel,
  boardAria,
  headingLevel: Heading = 'h3',
}: {
  suite: LabSuite;
  locale: ContentLocale;
  chaptersLabel: string;
  startLabel: string;
  boardAria: string;
  headingLevel?: 'h3' | 'h4';
}) {
  const opening = suite.chapters[0];
  const board = labBoard(opening, locale);
  const frame = useMemo(() => evaluateBoard(board, {}), [board]);
  const href = chapterPath(suite, opening);
  return (
    <article className="bg-card flex flex-col overflow-hidden rounded-2xl border">
      <Link
        href={href}
        className="curvg-board-thumb block border-b"
        tabIndex={-1}
        aria-hidden
      >
        <BoardCanvas
          spec={board.spec}
          frame={frame}
          ariaLabel={boardAria}
          className="aspect-[16/10]"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
          {chaptersLabel}
        </p>
        <Heading className="mt-2 text-lg font-semibold tracking-tight">
          <Link href={href} className="hover:text-primary transition-colors">
            {localeText(suite.name, locale)}
          </Link>
        </Heading>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {localeText(suite.summary, locale)}
        </p>
        <ol className="mt-4 space-y-1 border-t pt-3">
          {suite.chapters.map((chapter, i) => (
            <li key={chapter.slug}>
              <Link
                href={chapterPath(suite, chapter)}
                className="hover:text-primary flex items-baseline gap-3 py-1 text-sm transition-colors"
              >
                <span className="text-muted-foreground w-5 font-mono text-xs">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-medium">
                  {localeText(chapter.chapterTitle, locale)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <Link
          href={href}
          className="text-primary mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium"
        >
          {startLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
