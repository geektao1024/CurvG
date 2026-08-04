import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';

/**
 * Shared presentational sections for the standalone marketing pages
 * (/math-animation-tool, /free-math-video-creator, /manim-alternative).
 * All content arrives via props — no i18n reads here.
 */

export function PageHero({
  eyebrow,
  heading,
  lead,
  primary,
  secondary,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}) {
  return (
    <section className="curvg-stage curvg-frame relative border-b px-6 py-16 sm:px-10 sm:py-20">
      <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
        {eyebrow}
      </p>
      <h1 className="curvg-heading mt-5 max-w-3xl text-4xl text-balance sm:text-5xl">
        {heading}
      </h1>
      <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
        {lead}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href={primary.href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
        >
          {primary.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {secondary && (
          <Link
            href={secondary.href}
            className="text-primary text-sm font-medium underline underline-offset-4"
          >
            {secondary.label}
          </Link>
        )}
      </div>
    </section>
  );
}

export function SectionCards({
  id,
  title,
  description,
  items,
  columns = 3,
}: {
  id: string;
  title: string;
  description?: string;
  items: Array<{ title: string; description: string; index?: string }>;
  columns?: 2 | 3 | 4;
}) {
  const gridClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 4
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';
  return (
    <section
      className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
      aria-labelledby={id}
    >
      <h2 id={id} className="curvg-heading max-w-2xl text-2xl sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
          {description}
        </p>
      )}
      <div className={`mt-8 grid gap-5 ${gridClass}`}>
        {items.map((item) => (
          <article key={item.title} className="bg-card rounded-2xl border p-6">
            {item.index && (
              <p className="text-primary font-mono text-xs tracking-[0.14em]">
                {item.index}
              </p>
            )}
            <h3 className="mt-2 text-lg font-semibold tracking-tight">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ComparisonTable({
  id,
  title,
  description,
  aspectHeader,
  columnA,
  columnB,
  rows,
}: {
  id: string;
  title: string;
  description?: string;
  aspectHeader: string;
  columnA: string;
  columnB: string;
  rows: Array<{ aspect: string; a: string; b: string }>;
}) {
  return (
    <section
      className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
      aria-labelledby={id}
    >
      <h2 id={id} className="curvg-heading max-w-2xl text-2xl sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
          {description}
        </p>
      )}
      <div className="bg-card mt-8 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="text-muted-foreground px-5 py-3.5 font-mono text-xs tracking-[0.12em] uppercase">
                {aspectHeader}
              </th>
              <th className="text-muted-foreground px-5 py-3.5 font-mono text-xs tracking-[0.12em] uppercase">
                {columnA}
              </th>
              <th className="text-primary px-5 py-3.5 font-mono text-xs tracking-[0.12em] uppercase">
                {columnB}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.aspect} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="px-5 py-3.5 text-left align-top font-medium"
                >
                  {row.aspect}
                </th>
                <td className="text-muted-foreground px-5 py-3.5 align-top leading-relaxed">
                  {row.a}
                </td>
                <td className="px-5 py-3.5 align-top leading-relaxed">
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BulletsSplit({
  id,
  title,
  left,
  right,
}: {
  id: string;
  title: string;
  left: { title: string; items: string[] };
  right: { title: string; items: string[] };
}) {
  const List = ({ heading, items }: { heading: string; items: string[] }) => (
    <div className="bg-card rounded-2xl border p-6">
      <h3 className="text-lg font-semibold tracking-tight">{heading}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item.slice(0, 32)}
            className="text-muted-foreground flex gap-3 text-sm leading-relaxed"
          >
            <span className="text-primary select-none" aria-hidden>
              —
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <section
      className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
      aria-labelledby={id}
    >
      <h2 id={id} className="curvg-heading max-w-2xl text-2xl sm:text-3xl">
        {title}
      </h2>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <List heading={left.title} items={left.items} />
        <List heading={right.title} items={right.items} />
      </div>
    </section>
  );
}

export function PageFaq({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: Array<{ question: string; answer: string }>;
}) {
  return (
    <section
      className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
      aria-labelledby={id}
    >
      <h2 id={id} className="curvg-heading max-w-2xl text-2xl sm:text-3xl">
        {title}
      </h2>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.question}
            className="bg-card rounded-2xl border p-6"
          >
            <h3 className="text-base font-semibold tracking-tight">
              {item.question}
            </h3>
            <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">
              {item.answer}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CtaBand({
  title,
  lead,
  button,
  children,
}: {
  title: string;
  lead?: string;
  button: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <section className="curvg-stage curvg-frame px-6 py-16 text-center sm:px-10">
      <h2 className="curvg-heading mx-auto max-w-2xl text-3xl text-balance sm:text-4xl">
        {title}
      </h2>
      {lead && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed">
          {lead}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <Link
          href={button.href}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-7 py-3 text-sm font-semibold transition-colors"
        >
          {button.label}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}
