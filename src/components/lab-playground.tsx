import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Hand,
  Pause,
  Play,
  Pointer,
  Sparkles,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  dragTargets,
  evaluateBoard,
  formatBoardNumber,
  type BoardShape,
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
  /** Short name for the pager, e.g. 导数. */
  tab: string;
  title: string;
  question: string;
  board: CompiledBoard;
  href: string;
  videoHref: string;
  ariaLabel: string;
};

type Point = { x: number; y: number };
type DemoPhase = 'wait' | 'enter' | 'press' | 'drag' | 'release' | 'rest';

/**
 * A real lab board, small enough for a hero: drag the handle or move the
 * first sliders, then open the full lab or send it to the video creator.
 * Only point drags are wired; no pan or wheel zoom, so the page still
 * scrolls normally over it.
 *
 * On first load a ghost hand drags the handle once to show that the board is
 * live, then the handle and the play button keep a soft pulse until the
 * visitor touches something.
 */
export function LabPlayground({
  items,
  openLabel,
  videoLabel,
  dragHint,
  tabsLabel,
  playLabel,
  pauseLabel,
  prevLabel,
  nextLabel,
}: {
  items: PlaygroundItem[];
  openLabel: string;
  videoLabel: string;
  dragHint: string;
  tabsLabel: string;
  playLabel: string;
  pauseLabel: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const [active, setActive] = useState(0);
  // The ghost-hand demo runs once per visit; the pulse stays until the
  // visitor first drags, slides or presses play.
  const [demoed, setDemoed] = useState(false);
  const [engaged, setEngaged] = useState(false);
  // Auto-advance after the first demo, until the visitor takes over. The
  // fill animation in the active pager pill is the timer: it pauses on hover,
  // focus or when the card is off screen, and advances when it completes.
  const [manual, setManual] = useState(false);
  const [hold, setHold] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting)
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const item = items[active] ?? items[0];
  if (!item) return null;

  const count = items.length;
  const go = (step: number) => setActive((i) => (i + step + count) % count);
  const pick = (next: number) => {
    setManual(true);
    setActive((next + count) % count);
  };
  const rotating = demoed && !engaged && !manual && !reducedMotion();
  const player = item.board.spec.params.find((param) => param.play);
  // Long enough to watch most of the board's sweep, short enough that a
  // full round of four boards takes about half a minute.
  const dwell = (Math.min(player?.play ?? 5, 7) + 1.5) * 1000;

  return (
    <div
      ref={cardRef}
      className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(29,35,33,0.04),0_24px_48px_-32px_rgba(29,35,33,0.45)]"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setHold(true);
      }}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHold(false);
      }}
    >
      <div className="flex items-center gap-3 border-b px-4 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="text-primary font-mono text-xs font-semibold tabular-nums">
            {String(active + 1).padStart(2, '0')}
            <span className="text-muted-foreground/60">
              {' / '}
              {String(count).padStart(2, '0')}
            </span>
          </span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="font-medium">{item.tab}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <PagerButton label={prevLabel} onClick={() => pick(active - 1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </PagerButton>
          <div
            role="tablist"
            aria-label={tabsLabel}
            className="flex items-center gap-1 px-1"
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') pick(active + 1);
              if (event.key === 'ArrowLeft') pick(active - 1);
            }}
          >
            {items.map((entry, i) => (
              <button
                key={entry.slug}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={entry.tab}
                title={entry.tab}
                tabIndex={i === active ? 0 : -1}
                onClick={() => pick(i)}
                className="group grid h-6 place-items-center px-0.5"
              >
                <span
                  className={cn(
                    'relative block h-1.5 overflow-hidden rounded-full transition-all duration-300',
                    i === active
                      ? cn('w-5', rotating ? 'bg-primary/25' : 'bg-primary')
                      : 'bg-border group-hover:bg-muted-foreground/50 w-1.5'
                  )}
                >
                  {i === active && rotating ? (
                    <span
                      key={entry.slug}
                      className="curvg-pager-fill bg-primary absolute inset-y-0 left-0"
                      style={{
                        animationDuration: `${dwell}ms`,
                        animationPlayState:
                          hold || !onScreen ? 'paused' : 'running',
                      }}
                      onAnimationEnd={() => go(1)}
                    />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
          <PagerButton label={nextLabel} onClick={() => pick(active + 1)}>
            <ChevronRight className="size-4" aria-hidden />
          </PagerButton>
        </div>
      </div>
      <PlaygroundBoard
        key={item.slug}
        item={item}
        openLabel={openLabel}
        videoLabel={videoLabel}
        dragHint={dragHint}
        playLabel={playLabel}
        pauseLabel={pauseLabel}
        demo={!demoed && !engaged}
        nudge={!engaged}
        showcase={rotating}
        onDemoDone={() => setDemoed(true)}
        onEngage={() => setEngaged(true)}
      />
    </div>
  );
}

function PagerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground hover:bg-muted grid size-7 place-items-center rounded-full transition-colors"
    >
      {children}
    </button>
  );
}

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function PlaygroundBoard({
  item,
  openLabel,
  videoLabel,
  dragHint,
  playLabel,
  pauseLabel,
  demo,
  nudge,
  showcase,
  onDemoDone,
  onEngage,
}: {
  item: PlaygroundItem;
  openLabel: string;
  videoLabel: string;
  dragHint: string;
  playLabel: string;
  pauseLabel: string;
  /** Run the ghost-hand drag once this board has a size. */
  demo: boolean;
  /** Keep pulsing the handle and play button. */
  nudge: boolean;
  /** Arrived by auto-advance: play the board's sweep once. */
  showcase: boolean;
  onDemoDone: () => void;
  onEngage: () => void;
}) {
  const { board } = item;
  const { spec } = board;
  const state = useBoardValues(spec);
  const [size, setSize] = useState<BoardSize | null>(null);
  const [phase, setPhase] = useState<DemoPhase>(demo ? 'wait' : 'rest');
  const boxRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

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

  // The first draggable point, in px from the board's top-left.
  const handle = frame.shapes.find(
    (shape): shape is Extract<BoardShape, { kind: 'point' }> =>
      shape.kind === 'point' && !!shape.drag
  );
  const handlePx: Point | null =
    handle && size && viewport
      ? {
          x:
            ((handle.at[0] - viewport.x[0]) / (viewport.x[1] - viewport.x[0])) *
            size.width,
          y:
            size.height -
            ((handle.at[1] - viewport.y[0]) / (viewport.y[1] - viewport.y[0])) *
              size.height,
        }
      : null;

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // Ghost-hand demo: enter, press, drag the handle a little way and back,
  // let go, then leave the pulse in place.
  const hasHandle = !!handle;
  useEffect(() => {
    if (!demo || !size || phase !== 'wait') return;
    const drag = hasHandle ? handle?.drag : undefined;
    if (!drag || reducedMotion()) {
      setPhase('rest');
      onDemoDone();
      return;
    }
    const ids = [drag.x, drag.y, drag.angle].filter((id): id is string => !!id);
    const home: Record<string, number> = {};
    const away: Record<string, number> = {};
    for (const id of ids) {
      const param = spec.params.find((p) => p.id === id);
      if (!param) continue;
      const value = state.values[id] ?? param.value;
      const reach = (param.max - param.min) * 0.22;
      home[id] = value;
      away[id] = value + reach <= param.max ? value + reach : value - reach;
    }
    const at = (ms: number, run: () => void) =>
      timers.current.push(window.setTimeout(run, ms));
    at(700, () => setPhase('enter'));
    at(1400, () => setPhase('press'));
    at(1650, () => {
      setPhase('drag');
      state.moveTo(away);
    });
    at(2750, () => state.moveTo(home));
    at(3650, () => setPhase('release'));
    at(4100, () => {
      setPhase('rest');
      onDemoDone();
    });
    return clearTimers;
    // The demo starts once, when the board first has a size.
  }, [demo, size === null]);

  // An auto-advanced board shows itself moving: run its play sweep once.
  const playParam = spec.params.find((param) => param.play);
  useEffect(() => {
    if (!showcase || !size || !playParam || reducedMotion()) return;
    const id = window.setTimeout(() => state.togglePlay(playParam.id), 350);
    return () => window.clearTimeout(id);
    // Once, when the board first has a size.
  }, [size === null]);

  const engage = () => {
    if (phase !== 'rest') {
      clearTimers();
      setPhase('rest');
      onDemoDone();
    }
    onEngage();
  };

  const interaction = useMemo(
    () => ({
      onDragPoint: (
        drag: Parameters<typeof dragTargets>[0],
        at: [number, number]
      ) => {
        engage();
        state.setMany(dragTargets(drag, at, spec));
      },
    }),
    [spec, state, phase]
  );

  const sliders = spec.params.slice(0, 2);
  const player = playParam;
  const readouts = frame.readouts.slice(0, 3);
  const ghost = phase === 'enter' || phase === 'press' || phase === 'drag';
  const showRing = nudge && phase === 'rest' && handlePx;
  // Keep the hint chip inside the board: flip it left near the right edge.
  const chipLeft = handlePx && size ? handlePx.x > size.width * 0.62 : false;

  return (
    <div className="bg-background curvg-playground-in">
      {/* Fixed-height text slots, so switching boards never changes the
          card's height (and the hero around it does not jump). */}
      <div className="px-5 pt-4">
        <p className="truncate text-sm font-semibold" title={item.title}>
          {item.title}
        </p>
        <p className="text-muted-foreground mt-0.5 line-clamp-2 min-h-[2lh] text-sm">
          {item.question}
        </p>
      </div>
      <div
        className="relative mt-3 overflow-hidden border-y"
        onPointerDown={() => {
          if (phase !== 'rest') engage();
        }}
      >
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
        {showRing ? (
          <div
            className="pointer-events-none absolute"
            style={{ left: handlePx.x, top: handlePx.y }}
            aria-hidden
          >
            <span className="curvg-handle-ring border-primary absolute -top-4 -left-4 size-8 rounded-full border-2" />
            <span
              className={cn(
                'bg-background/95 text-foreground absolute top-0 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap shadow-sm',
                chipLeft ? 'right-6' : 'left-6'
              )}
            >
              <Hand className="text-primary size-3.5" aria-hidden />
              {dragHint}
            </span>
          </div>
        ) : null}
        {handlePx ? (
          <div
            className={cn(
              'pointer-events-none absolute transition-[opacity,translate] ease-out',
              phase === 'drag' ? 'duration-0' : 'duration-500',
              ghost ? 'opacity-100' : 'opacity-0',
              phase === 'wait' && 'translate-x-12 translate-y-12'
            )}
            style={{ left: handlePx.x, top: handlePx.y }}
            aria-hidden
          >
            <span
              className={cn(
                'bg-primary/25 absolute -top-3 -left-3 size-6 rounded-full transition-transform duration-200',
                phase === 'press' || phase === 'drag' ? 'scale-100' : 'scale-0'
              )}
            />
            <Pointer
              className={cn(
                'text-foreground fill-background absolute -top-0.5 -left-2 size-7 drop-shadow-md transition-transform duration-200',
                phase === 'press' || phase === 'drag' ? 'scale-90' : 'scale-100'
              )}
              strokeWidth={1.6}
            />
          </div>
        ) : null}
      </div>
      <div className="grid gap-x-6 gap-y-3 px-5 pt-4 sm:grid-cols-2">
        {sliders.map((param) => (
          <MiniSlider
            key={param.id}
            param={param}
            state={state}
            onChange={engage}
          />
        ))}
        {/* Hold the second row on boards with one slider, so the card
            keeps its height when sliders stack on phones. */}
        {sliders.length === 1 ? (
          <div
            className="invisible flex items-center gap-3 sm:hidden"
            aria-hidden
          >
            <span className="w-10 shrink-0 text-sm">
              <InlineTex tex={sliders[0].label} />
            </span>
            <input
              type="range"
              disabled
              tabIndex={-1}
              className="h-1.5 min-w-0 flex-1"
            />
            <span className="w-12 font-mono text-xs">0</span>
          </div>
        ) : null}
      </div>
      {readouts.length ? (
        <dl className="flex h-11 flex-nowrap items-center gap-2 overflow-hidden px-5 pt-3">
          {readouts.map((readout, i) => (
            <div
              key={i}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 text-xs whitespace-nowrap',
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
        {player ? (
          <button
            type="button"
            onClick={() => {
              engage();
              state.togglePlay(player.id);
            }}
            className={cn(
              'hover:bg-muted ml-auto inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium transition-colors',
              nudge && phase === 'rest' && 'curvg-play-nudge border-primary/40'
            )}
          >
            {state.playing === player.id ? (
              <Pause className="text-primary size-4" aria-hidden />
            ) : (
              <Play className="text-primary fill-primary size-4" aria-hidden />
            )}
            {state.playing === player.id ? pauseLabel : playLabel}
            <span className="text-muted-foreground text-xs">
              <InlineTex tex={player.label} />
            </span>
          </button>
        ) : null}
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
