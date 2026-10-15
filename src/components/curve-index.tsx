import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { plainMath } from '@/lib/plain-math';
import { CurveThumb } from '@/components/curve-preview';
import type { CurveDef } from '@/content/curves';

export type CurveIndexGroup = {
  id: string;
  title: string;
  description: string;
  curves: readonly CurveDef[];
};

export type CurveIndexLabels = {
  search: string;
  clear: string;
  /** "{count} results"-style line while filtering. */
  results: (count: number) => string;
  empty: string;
  jump: string;
  previewAria: (name: string) => string;
};

/**
 * The /curves catalogue: a jump bar over the category sections, and a
 * name filter. Everything is rendered on the server; filtering only hides
 * cards, so without JavaScript the full grouped list is still there.
 */
export function CurveIndex({
  groups,
  locale,
  labels,
}: {
  groups: readonly CurveIndexGroup[];
  locale: 'en' | 'zh';
  labels: CurveIndexLabels;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!needle) return null;
    return groups.flatMap((group) =>
      group.curves.filter((curve) =>
        [curve.name.en, curve.name.zh, curve.slug.replace(/-/g, ' ')].some(
          (text) => text.toLowerCase().includes(needle)
        )
      )
    );
  }, [groups, needle]);

  return (
    <>
      <div className="bg-background/90 sticky top-20 z-20 border-b backdrop-blur">
        <div className="curvg-stage curvg-frame flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:px-10">
          <label className="relative block sm:w-64">
            <span className="sr-only">{labels.search}</span>
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={labels.search}
              className="bg-card focus-visible:border-primary w-full rounded-full border py-1.5 pr-8 pl-9 text-sm outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={labels.clear}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </label>
          <nav
            aria-label={labels.jump}
            className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:pb-0"
          >
            {groups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                onClick={() => setQuery('')}
                className="hover:border-primary/50 hover:text-primary shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors"
              >
                {group.title}
                <span className="text-muted-foreground ml-1.5 font-mono">
                  {group.curves.length}
                </span>
              </a>
            ))}
          </nav>
        </div>
      </div>

      {matches ? (
        <section className="curvg-stage curvg-frame border-b px-6 py-10 sm:px-10">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {matches.length > 0 ? labels.results(matches.length) : labels.empty}
          </p>
          <CardGrid
            curves={matches}
            locale={locale}
            previewAria={labels.previewAria}
          />
        </section>
      ) : (
        groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            className="curvg-stage curvg-frame scroll-mt-40 border-b px-6 py-12 sm:px-10"
            aria-labelledby={`curves-${group.id}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2
                id={`curves-${group.id}`}
                className="curvg-heading text-2xl sm:text-3xl"
              >
                {group.title}
              </h2>
              <p className="text-muted-foreground font-mono text-xs">
                {group.curves.length}
              </p>
            </div>
            <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
              {group.description}
            </p>
            <CardGrid
              curves={group.curves}
              locale={locale}
              previewAria={labels.previewAria}
            />
          </section>
        ))
      )}
    </>
  );
}

function CardGrid({
  curves,
  locale,
  previewAria,
}: {
  curves: readonly CurveDef[];
  locale: 'en' | 'zh';
  previewAria: (name: string) => string;
}) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {curves.map((curve) => (
        <li key={curve.slug}>
          <Link
            href={`/curves/${curve.slug}`}
            className="group bg-card hover:border-primary/50 flex h-full flex-col overflow-hidden rounded-xl border transition-colors"
          >
            <div className="bg-muted/20 aspect-[4/3] border-b">
              <CurveThumb
                curve={curve}
                ariaLabel={previewAria(curve.name[locale])}
              />
            </div>
            <div className="p-4">
              <h3 className="group-hover:text-primary text-base font-semibold tracking-tight transition-colors">
                {curve.name[locale]}
              </h3>
              <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm leading-relaxed">
                {plainMath(curve.short[locale])}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
