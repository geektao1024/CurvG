import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Eyebrow, H2 and a line of copy: the opening of every homepage section. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  /** A link on the right, e.g. "Browse all". */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="max-w-2xl">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
        <h2 className="curvg-heading mt-3 text-3xl text-balance sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="text-muted-foreground mt-3 text-base leading-relaxed text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** The quiet "see all →" link used beside section headings. */
export const sectionActionClass =
  'text-primary inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline';
