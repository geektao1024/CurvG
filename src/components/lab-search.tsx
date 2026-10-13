import { useId, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';

import { Link, useRouter } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';

export type LabSearchItem = {
  href: string;
  title: string;
  /** Where it sits, e.g. 数学 · 函数与微积分. */
  context: string;
  /** Extra words that should find it: key points, the question. */
  terms: string;
};

/**
 * Knowledge-point search over the lab chapters. Client-side and instant:
 * the whole index is a few dozen entries. Arrow keys move, Enter opens.
 */
export function LabSearch({
  items,
  placeholder,
  emptyLabel,
  label,
  popular,
}: {
  items: LabSearchItem[];
  placeholder: string;
  emptyLabel: string;
  label: string;
  /** Quick picks shown under the box. */
  popular?: { label: string; href: string }[];
}) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const blurTimer = useRef<number | null>(null);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return items
      .map((item) => {
        const title = item.title.toLowerCase();
        const haystack = `${title} ${item.context} ${item.terms}`.toLowerCase();
        if (!words.every((word) => haystack.includes(word))) return null;
        // Title hits first.
        const score = words.filter((word) => title.includes(word)).length;
        return { item, score };
      })
      .filter((hit): hit is { item: LabSearchItem; score: number } => !!hit)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((hit) => hit.item);
  }, [items, query]);

  const showList = open && query.trim().length > 0;

  return (
    <div className="relative">
      <div className="bg-card focus-within:border-primary/60 focus-within:ring-primary/15 flex h-12 items-center gap-2.5 rounded-xl border px-3.5 shadow-[0_1px_2px_rgba(29,35,33,0.05)] transition focus-within:ring-4">
        <Search
          className="text-muted-foreground size-4.5 shrink-0"
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={
            showList && results[cursor] ? `${listId}-${cursor}` : undefined
          }
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            setOpen(true);
          }}
          // Let a click on a result land before the list closes.
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (event.key === 'Enter' && results[cursor]) {
              event.preventDefault();
              router.push(results[cursor].href);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
          className="placeholder:text-muted-foreground/80 h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="text-muted-foreground hidden items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
          <CornerDownLeft className="size-3" aria-hidden />
        </kbd>
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border p-1.5 shadow-[0_18px_40px_-20px_rgba(29,35,33,0.45)]"
        >
          {results.length ? (
            results.map((item, i) => (
              <li
                key={item.href}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === cursor}
              >
                <Link
                  href={item.href}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    'flex items-baseline justify-between gap-4 rounded-lg px-3 py-2.5 transition-colors',
                    i === cursor && 'bg-secondary'
                  )}
                >
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {item.context}
                  </span>
                </Link>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-3 py-2.5 text-sm">
              {emptyLabel}
            </li>
          )}
        </ul>
      ) : null}

      {popular?.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {popular.map((pick) => (
            <Link
              key={pick.href}
              href={pick.href}
              className="hover:border-primary/50 hover:text-primary text-muted-foreground rounded-full border px-3 py-1 text-xs transition-colors"
            >
              {pick.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
