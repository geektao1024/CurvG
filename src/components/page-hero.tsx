import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { PageBreadcrumbs, type Crumb } from '@/components/page-breadcrumbs';

/**
 * First screen of every hub and category page (docs/NAVIGATION.md §5):
 * breadcrumb, eyebrow, H1, one line of lead, then optional extras (search,
 * counts, chips). Left-aligned, with an optional decoration on the right.
 * `tone="dark"` for the wonders section.
 */
export function PageHero({
  crumbs,
  crumbLabel,
  eyebrow,
  title,
  lead,
  children,
  aside,
  tone = 'paper',
  className,
}: {
  crumbs: readonly Crumb[];
  crumbLabel: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  /** Decoration on the right, wide screens only (e.g. a curve drawing). */
  aside?: ReactNode;
  tone?: 'paper' | 'dark';
  className?: string;
}) {
  return (
    <section
      className={cn(
        // Always inside the stage frame, so it lines up with the header.
        'curvg-page-hero curvg-stage curvg-frame relative overflow-hidden border-b px-6 pt-10 pb-12 sm:px-10',
        tone === 'dark' && 'is-dark',
        className
      )}
    >
      <PageBreadcrumbs items={crumbs} label={crumbLabel} className="relative" />
      {eyebrow ? (
        <p className="curvg-page-eyebrow relative mt-8">{eyebrow}</p>
      ) : null}
      <h1
        className={cn(
          'curvg-heading relative max-w-3xl text-4xl text-balance sm:text-5xl',
          eyebrow ? 'mt-4' : 'mt-8'
        )}
      >
        {title}
      </h1>
      {lead ? (
        <div className="curvg-page-lead relative mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
          {lead}
        </div>
      ) : null}
      {children ? <div className="relative mt-8">{children}</div> : null}
      {aside ? (
        <div className="pointer-events-none absolute top-1/2 right-10 hidden w-[min(34%,24rem)] -translate-y-1/2 lg:block">
          {aside}
        </div>
      ) : null}
    </section>
  );
}
