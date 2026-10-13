import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Hand, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  dragTargets,
  evaluateBoard,
  formatBoardNumber,
  type CompiledBoard,
} from '@/lib/board/evaluate';
import type { BoardParam } from '@/lib/board/spec';
import { cn } from '@/lib/utils';
import {
  BoardCanvas,
  fitViewport,
  useBoardValues,
  type BoardSize,
  type BoardValues,
} from '@/components/lab-board';
import { InlineTex } from '@/components/rich-math';

export type PlaygroundItem = {
  slug: string;
  /** Short tab name, e.g. 导数. */
  tab: string;
  title: string;
  question: string;
  board: CompiledBoard;
  href: string;
  videoHref: string;
  ariaLabel: string;
};

/**
 * A real lab board, small enough for a hero: drag the handle or move the
 * first sliders, then open the full lab or send it to the video creator.
 * Only point drags are wired; no pan or wheel zoom, so the page still
 * scrolls normally over it.
 */
export function LabPlayground({
  items,
  openLabel,
  videoLabel,
  dragHint,
  tabsLabel,
}: {
  items: PlaygroundItem[];
  openLabel: string;
  videoLabel: string;
  dragHint: string;
  tabsLabel: string;
}) {
  const [active, setActive] = useState(0);
  const item = items[active] ?? items[0];
  if (!item) return null;

  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(29,35,33,0.04),0_24px_48px_-32px_rgba(29,35,33,0.45)]">
      <div
        role="tablist"
        aria-label={tabsLabel}
        className="flex gap-1 overflow-x-auto border-b px-2 pt-2"
      >
        {items.map((entry, i) => (
          <button
            key={entry.slug}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              '-mb-px shrink-0 rounded-t-lg border border-transparent px-3.5 py-2 text-sm transition-colors',
              i === active
                ? 'border-border bg-background text-foreground border-b-background font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {entry.tab}
          </button>
        ))}
      </div>
      <PlaygroundBoard
        key={item.slug}
        item={item}
        openLabel={openLabel}
        videoLabel={videoLabel}
        dragHint={dragHint}
      />
    </div>
  );
}

function PlaygroundBoard({
  item,
  openLabel,
  videoLabel,
  dragHint,
}: {
  item: PlaygroundItem;
  openLabel: string;
  videoLabel: string;
  dragHint: string;
}) {
  const { board } = item;
  const { spec } = board;
  const state = useBoardValues(spec);
  const [size, setSize] = useState<BoardSize | null>(null);
  const [touched, setTouched] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(
    () => (size ? fitViewport(spec.view, size) : undefined),
    [spec.view, size]
  );
  const frame = useMemo(
    () => evaluateBoard(board, state.values, viewport),
    [board, state.values, viewport]
  );
  const interaction = useMemo(
    () => ({
      onDragPoint: (
        drag: Parameters<typeof dragTargets>[0],
        at: [number, number]
      ) => {
        setTouched(true);
        state.setMany(dragTargets(drag, at, spec));
      },
    }),
    [spec, state]
  );

  const sliders = spec.params.slice(0, 2);
  const readouts = frame.readouts.slice(0, 3);

  return (
    <div className="bg-background">
      <div className="px-5 pt-4">
        <p className="text-sm font-semibold">{item.title}</p>
        <p className="text-muted-foreground mt-0.5 text-sm">{item.question}</p>
      </div>
      <div className="relative mt-3 border-y">
        <div ref={boxRef} className="curvg-board-thumb aspect-[16/10]">
          <BoardCanvas
            spec={spec}
            frame={frame}
            ariaLabel={item.ariaLabel}
            size={size ?? undefined}
            viewport={viewport}
            interaction={interaction}
          />
        </div>
        <p
          className={cn(
            'bg-background/90 text-muted-foreground pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-opacity duration-500',
            touched && 'opacity-0'
          )}
        >
          <Hand className="text-primary size-3.5" aria-hidden />
          {dragHint}
        </p>
      </div>
      <div className="grid gap-x-6 gap-y-3 px-5 pt-4 sm:grid-cols-2">
        {sliders.map((param) => (
          <MiniSlider
            key={param.id}
            param={param}
            state={state}
            onChange={() => setTouched(true)}
          />
        ))}
      </div>
      {readouts.length ? (
        <dl className="flex flex-wrap gap-2 px-5 pt-3">
          {readouts.map((readout, i) => (
            <div
              key={i}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs',
                readout.kind === 'status' &&
                  (readout.ok
                    ? 'border-[var(--color-success)]/40 text-[var(--color-success)]'
                    : 'text-muted-foreground')
              )}
            >
              <dt className="text-muted-foreground">
                <InlineTex tex={readout.label} />
              </dt>
              <dd className="font-mono font-medium">{readout.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 px-5 pt-4 pb-5">
        <Link
          href={item.href}
          className="bg-foreground text-background hover:bg-foreground/90 group inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors"
        >
          {openLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href={item.videoHref}
          className="text-primary hover:bg-primary/8 border-primary/30 inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors"
        >
          <Sparkles className="size-4" aria-hidden />
          {videoLabel}
        </Link>
      </div>
    </div>
  );
}

function MiniSlider({
  param,
  state,
  onChange,
}: {
  param: BoardParam;
  state: BoardValues;
  onChange: () => void;
}) {
  const value = state.values[param.id] ?? param.value;
  const digits = Math.max(0, -Math.floor(Math.log10(param.step) + 1e-9));
  const id = `playground-${param.id}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="w-10 shrink-0 text-sm">
        <InlineTex tex={param.label} />
      </label>
      <input
        id={id}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(event) => {
          onChange();
          state.setOne(param.id, Number(event.target.value));
        }}
        className="accent-primary h-1.5 min-w-0 flex-1 cursor-pointer"
      />
      <span className="text-primary w-12 text-right font-mono text-xs font-semibold tabular-nums">
        {formatBoardNumber(value, digits)}
      </span>
    </div>
  );
}
