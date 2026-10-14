import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Contrast,
  Eraser,
  Maximize,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Undo2,
} from 'lucide-react';

import { Link, useRouter } from '@/core/i18n/navigation';
import {
  dragTargets,
  evaluateBoard,
  formatBoardNumber,
  type BoardFrame,
  type CompiledBoard,
  type Vec,
} from '@/lib/board/evaluate';
import type { BoardParam } from '@/lib/board/spec';
import { cn } from '@/lib/utils';
import {
  applyViewTransform,
  BOARD_PALETTES,
  BoardCanvas,
  fitViewport,
  IDENTITY_VIEW,
  useBoardValues,
  type BoardRect,
  type BoardSize,
  type BoardTheme,
  type BoardValues,
  type ViewTransform,
} from '@/components/lab-board';
import { QuizCard } from '@/components/lab-quiz';
import { LocaleSelector } from '@/components/locale-selector';
import { InlineTex, RichMath } from '@/components/rich-math';
import type { Lab, LabVideo } from '@/content/labs';
import { libraryText, type LibraryLocale } from '@/content/library';

/**
 * Full-screen lab workspace after wedulab's lab pages: a top bar with
 * chapter progress, a chapter rail, a full-bleed board with the chapter
 * title laid over it, and a panel with the explanation, controls and the
 * live result. Styles live in `src/styles/lab-workspace.css` (`.lw-*`).
 * Below 860px it becomes one scrolling column.
 *
 * The shell (top bar, rail, style) survives chapter changes; everything
 * that belongs to one chapter's board sits in `ChapterView`, keyed by slug.
 */

export type WorkspaceLabels = {
  home: string;
  breadcrumb: string;
  chapters: string;
  previous: string;
  next: string;
  stylePaper: string;
  styleStudio: string;
  view: string;
  fullscreen: string;
  switchLanguage: string;
  viewSettings: string;
  showLabels: string;
  showGrid: string;
  shortcutChapters: string;
  shortcutView: string;
  shortcutStyle: string;
  shortcutPlay: string;
  shortcutPan: string;
  play: string;
  pause: string;
  resetParams: string;
  dragHint: string;
  pen: string;
  penUndo: string;
  penClear: string;
  penColor: string;
  board: string;
  guide: string;
  explanation: string;
  quizTitle: string;
  correct: string;
  incorrect: string;
  related: string;
  relatedLabs: string;
  relatedWonders: string;
  relatedCurves: string;
  relatedLibrary: string;
  video: string;
  captions: string;
  makeVideo: string;
  ctaTitle: string;
  ctaBody: string;
  ctaButton: string;
};

/** A link out of the lab: another lab, a curve page or a library topic. */
export type WorkspaceLink = {
  kind: 'lab' | 'wonder' | 'curve' | 'library';
  href: string;
  label: string;
  note?: string;
};

export type WorkspaceChapter = {
  slug: string;
  href: string;
  title: string;
  subtitle?: string;
};

const STYLE_KEY = 'curvg-lab-style';
const SEEN_KEY = 'curvg-lab-seen';

// Keep the title (top) and the step bar (bottom) over empty board.
const STAGE_INSET = { top: 0.15, bottom: 0.1 };
// Before the stage is measured (server render), assume a laptop layout.
const FALLBACK_SIZE: BoardSize = { width: 836, height: 840 };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

function useSeenChapters(
  chapters: readonly WorkspaceChapter[],
  current: string
) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => {
    try {
      const stored = new Set<string>(
        JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? '[]')
      );
      stored.add(current);
      window.localStorage.setItem(
        SEEN_KEY,
        JSON.stringify([...stored].slice(-200))
      );
      setSeen(
        new Set(chapters.map((c) => c.slug).filter((slug) => stored.has(slug)))
      );
    } catch {
      setSeen(new Set([current]));
    }
  }, [chapters, current]);
  return seen;
}

export function LabWorkspace({
  logo,
  crumbs,
  chapters,
  index,
  lab,
  board,
  locale,
  labels,
  tags,
  related,
  videoHref,
  film,
  account,
  siteMenu,
}: {
  /** Site identity: the workspace is a CurvG tool, not a separate product. */
  logo: { src: string; name: string };
  /** Breadcrumb above the chapter: labs hub, then the suite. */
  crumbs: readonly { label: string; href: string }[];
  chapters: readonly WorkspaceChapter[];
  index: number;
  lab: Lab;
  board: CompiledBoard;
  locale: LibraryLocale;
  labels: WorkspaceLabels;
  /** Level and knowledge-point chips under the lead. */
  tags: readonly string[];
  related: readonly WorkspaceLink[];
  videoHref: string;
  /** The chapter's narrated film, once published. */
  film?: LabVideo;
  /** Sign-in link or the user menu. */
  account: ReactNode;
  /** The site's top-level navigation (SiteNavMenu), shared with every page. */
  siteMenu?: ReactNode;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<BoardTheme>('paper');
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const prev = chapters[index - 1];
  const next = chapters[index + 1];
  const chapter = chapters[index];
  const seen = useSeenChapters(chapters, chapter.slug);

  useEffect(() => {
    if (window.localStorage.getItem(STYLE_KEY) === 'studio') setTheme('studio');
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((value) => {
      const nextTheme = value === 'studio' ? 'paper' : 'studio';
      window.localStorage.setItem(STYLE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  }, []);

  // Chapter-level keys (view, play) are handled inside ChapterView.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      )
        return;
      if (event.key === 'ArrowLeft' && prev) router.push(prev.href);
      else if (event.key === 'ArrowRight' && next) router.push(next.href);
      else if (event.key === 't' || event.key === 'T') toggleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, router, toggleTheme]);

  const viewRef = useRef<{ resetView: () => void } | null>(null);

  return (
    <div
      ref={rootRef}
      className={cn('lw', theme === 'studio' && 'studio')}
      data-lab-slug={lab.slug}
    >
      <header className="lw-top">
        <Link href="/" className="lw-home" aria-label={labels.home}>
          <img src={logo.src} alt="" width={28} height={28} />
          <span>{logo.name}</span>
        </Link>
        <nav className="lw-crumbs" aria-label={labels.breadcrumb}>
          <ol>
            {crumbs.map((crumb) => (
              <li key={crumb.href}>
                <Link href={crumb.href}>{crumb.label}</Link>
              </li>
            ))}
            <li aria-current="page">{chapter.title}</li>
          </ol>
        </nav>

        <nav className="lw-prog" aria-label={labels.chapters}>
          {chapters.map((item, i) => (
            <Link
              key={item.slug}
              href={item.href}
              aria-label={`${pad(i + 1)} ${item.title}`}
              aria-current={i === index ? 'page' : undefined}
              className={cn(
                i === index ? 'cur' : seen.has(item.slug) && 'seen'
              )}
            >
              <i />
            </Link>
          ))}
        </nav>

        {siteMenu}
        <LocaleSelector
          variant="pill"
          switchLabel={labels.switchLanguage}
          className="lw-lang h-8 gap-[7px] rounded-[6px] px-2.5 text-[13px]"
        />
        <div className="lw-tbtns">
          <Link
            href={prev?.href ?? chapter.href}
            aria-label={labels.previous}
            aria-disabled={!prev}
            className="lw-tb"
          >
            <ChevronLeft />
          </Link>
          <Link
            href={next?.href ?? chapter.href}
            aria-label={labels.next}
            aria-disabled={!next}
            className="lw-tb"
          >
            <ChevronRight />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={theme === 'studio'}
            className={cn('lw-tb keep', theme === 'studio' && 'on')}
          >
            <Contrast />
            <span className="lbl">
              {theme === 'studio' ? labels.styleStudio : labels.stylePaper}
            </span>
          </button>
          <button
            type="button"
            onClick={() => viewRef.current?.resetView()}
            className="lw-tb keep"
          >
            <RotateCcw />
            <span className="lbl">{labels.view}</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={labels.fullscreen}
            className="lw-tb"
          >
            <Maximize />
          </button>
        </div>
        <Link href={videoHref} className="lw-cta">
          <Clapperboard />
          <span className="lbl">{labels.makeVideo}</span>
        </Link>
        <div className="lw-account">{account}</div>
      </header>

      <nav className="lw-nav" aria-label={labels.chapters}>
        <div className="lw-navh">{labels.chapters}</div>
        {chapters.map((item, i) => (
          <Link
            key={item.slug}
            href={item.href}
            aria-current={i === index ? 'page' : undefined}
            className={cn(
              'lw-ni',
              i === index ? 'on' : seen.has(item.slug) && 'seen'
            )}
          >
            <em>{pad(i + 1)}</em>
            <b>{item.title}</b>
            {item.subtitle ? <small>{item.subtitle}</small> : null}
          </Link>
        ))}
        <div className="lw-navf">
          <p>
            <kbd>←</kbd>
            <kbd>→</kbd> {labels.shortcutChapters}
          </p>
          <p>
            <kbd>R</kbd> {labels.shortcutView} &nbsp;<kbd>T</kbd>{' '}
            {labels.shortcutStyle}
          </p>
          <p>
            <kbd>Space</kbd> {labels.shortcutPlay}
          </p>
          <p>{labels.shortcutPan}</p>
        </div>
      </nav>

      <ChapterView
        key={lab.slug}
        ref={viewRef}
        lab={lab}
        board={board}
        locale={locale}
        labels={labels}
        index={index}
        total={chapters.length}
        title={chapter.title}
        subtitle={chapter.subtitle}
        theme={theme}
        showLabels={showLabels}
        showGrid={showGrid}
        videoHref={videoHref}
        film={film}
        tags={tags}
        related={related}
        footer={
          <div className="lw-view">
            <div className="lw-vh">{labels.viewSettings}</div>
            <div className="lw-tgs">
              <Toggle on={showLabels} onClick={() => setShowLabels((v) => !v)}>
                {labels.showLabels}
              </Toggle>
              <Toggle on={showGrid} onClick={() => setShowGrid((v) => !v)}>
                {labels.showGrid}
              </Toggle>
            </div>
          </div>
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

type ChapterViewProps = {
  lab: Lab;
  board: CompiledBoard;
  locale: LibraryLocale;
  labels: WorkspaceLabels;
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  theme: BoardTheme;
  showLabels: boolean;
  showGrid: boolean;
  videoHref: string;
  film?: LabVideo;
  tags: readonly string[];
  related: readonly WorkspaceLink[];
  footer: ReactNode;
  ref: React.Ref<{ resetView: () => void }>;
};

function ChapterView({
  lab,
  board,
  locale,
  labels,
  index,
  total,
  title,
  subtitle,
  theme,
  showLabels,
  showGrid,
  videoHref,
  film,
  tags,
  related,
  footer,
  ref,
}: ChapterViewProps) {
  const { spec } = board;
  const state = useBoardValues(spec);
  const [size, setSize] = useState<BoardSize | null>(null);
  const [transform, setTransform] = useState<ViewTransform>(IDENTITY_VIEW);
  const [step, setStep] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const t = (text: { en: string; zh: string }) => libraryText(text, locale);

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

  const measured = size ?? FALLBACK_SIZE;
  const viewport = useMemo(
    () =>
      applyViewTransform(
        fitViewport(spec.view, measured, STAGE_INSET),
        transform
      ),
    [spec.view, measured, transform]
  );
  const frame = useMemo(
    () => evaluateBoard(board, state.values, viewport),
    [board, state.values, viewport]
  );

  const resetView = useCallback(() => setTransform(IDENTITY_VIEW), []);
  useImperativeHandle(ref, () => ({ resetView }), [resetView]);

  const playable = spec.params.find((param) => param.play);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      )
        return;
      if (event.key === 'r' || event.key === 'R') resetView();
      else if (event.key === ' ' && playable) {
        // Space on a focused button presses it; leave that alone.
        if (event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        state.togglePlay(playable.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playable, resetView, state]);

  const sx = measured.width / (viewport.x[1] - viewport.x[0]);
  const sy = measured.height / (viewport.y[1] - viewport.y[0]);
  const interaction = useMemo(
    () => ({
      onPan: (dx: number, dy: number) =>
        setTransform((v) => ({ ...v, dx: v.dx - dx / sx, dy: v.dy + dy / sy })),
      onZoom: (factor: number, at: Vec) =>
        setTransform((v) => {
          const zoom = Math.min(8, Math.max(0.25, v.zoom * factor));
          const scale = v.zoom / zoom;
          // Keep the math point under the cursor where it is.
          const fx = at[0] / measured.width - 0.5;
          const fy = 0.5 - at[1] / measured.height;
          const spanX = viewport.x[1] - viewport.x[0];
          const spanY = viewport.y[1] - viewport.y[0];
          return {
            zoom,
            dx: v.dx + fx * spanX * (1 - scale),
            dy: v.dy + fy * spanY * (1 - scale),
          };
        }),
      onDragPoint: (drag: Parameters<typeof dragTargets>[0], at: Vec) => {
        setStep(null);
        state.setMany(dragTargets(drag, at, spec));
      },
    }),
    [measured, sx, sy, spec, state, viewport]
  );

  const goTo = (i: number) => {
    const target = lab.guide[i];
    if (!target) return;
    setStep(i);
    if (target.set) state.moveTo(target.set);
  };

  const draggable = frame.shapes.some(
    (shape) => shape.kind === 'point' && shape.drag
  );

  return (
    <>
      <Stage
        boxRef={boxRef}
        board={board}
        frame={frame}
        size={size}
        viewport={viewport}
        theme={theme}
        showGrid={showGrid}
        showLabels={showLabels}
        interaction={interaction}
        labels={labels}
        index={index}
        total={total}
        title={title}
        subtitle={subtitle}
        guide={lab.guide.map((item) => t(item.title))}
        step={step}
        onStep={goTo}
        playable={playable}
        state={state}
      />

      <aside className="lw-panel">
        <div className="lw-lesson">
          {/* The page's one H1: the lab's full name, which is what people
              search for. The board overlay repeats the short chapter name. */}
          <header className="lw-lh">
            <em>{pad(index + 1)}</em>
            <div>
              <h1>{t(lab.title)}</h1>
              <small>
                {title}
                {subtitle ? ` · ${subtitle}` : null}
              </small>
            </div>
          </header>

          <div className="lw-body">
            <p>
              <b>{t(lab.question)}</b>
            </p>
            <p>{t(lab.summary)}</p>
            {draggable ? (
              <p className="text-(--lw-muted)">{labels.dragHint}</p>
            ) : null}
          </div>
          <ul className="lw-tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>

          <div className="lw-ctl">
            {spec.params.map((param) => (
              <Slider key={param.id} param={param} state={state} />
            ))}
            <div className="lw-row">
              {playable ? (
                <button
                  type="button"
                  className="lw-act"
                  onClick={() => state.togglePlay(playable.id)}
                >
                  {state.playing === playable.id ? <Pause /> : <Play />}
                  {state.playing === playable.id ? labels.pause : labels.play}
                  <InlineTex tex={playable.label} />
                </button>
              ) : null}
              <button
                type="button"
                className="lw-act ghost"
                onClick={() => {
                  setStep(null);
                  state.reset();
                }}
              >
                <RotateCcw />
                {labels.resetParams}
              </button>
            </div>
          </div>

          <ResultCard tex={lab.resultTex} readouts={frame.readouts} />

          {film ? (
            <section className="lw-sect">
              <h2 className="lw-subh">{labels.video}</h2>
              <video
                className="lw-video"
                poster={film.poster}
                controls
                preload="none"
                playsInline
              >
                <source src={film.src} type="video/mp4" />
                <track
                  kind="captions"
                  src={film.captions}
                  srcLang={locale}
                  label={labels.captions}
                />
              </video>
            </section>
          ) : null}

          <section className="lw-sect">
            <h2 className="lw-subh">{labels.guide}</h2>
            <ol className="lw-steps">
              {lab.guide.map((item, i) => (
                <li
                  key={i}
                  className={cn(
                    step === i ? 'on' : step !== null && i < step && 'done'
                  )}
                  onClick={() => goTo(i)}
                >
                  <span className="no">{i + 1}</span>
                  <b>{t(item.title)}</b>
                  <RichMath
                    source={t(item.body)}
                    className="say space-y-2 leading-[1.75]"
                  />
                </li>
              ))}
            </ol>
          </section>

          <section className="lw-sect">
            <h2 className="lw-subh">{labels.explanation}</h2>
            <ol className="lw-steps derive">
              {lab.sections.map((section, i) => (
                <li key={section.id} id={section.id} className="scroll-mt-6">
                  <span className="no">{i + 1}</span>
                  <h3>{t(section.title)}</h3>
                  <RichMath
                    source={t(section.body)}
                    className="lw-body space-y-2.5 leading-[1.85]"
                  />
                </li>
              ))}
            </ol>
          </section>

          <section className="lw-sect">
            <h2 className="lw-subh">{labels.quizTitle}</h2>
            {lab.quiz.map((item, i) => (
              <QuizCard
                key={i}
                number={i + 1}
                question={t(item.question)}
                choices={item.choices.map(t)}
                answer={item.answer}
                explanation={t(item.explanation)}
                correctLabel={labels.correct}
                incorrectLabel={labels.incorrect}
              />
            ))}
          </section>

          {related.length > 0 ? (
            <section className="lw-sect">
              <h2 className="lw-subh">{labels.related}</h2>
              <RelatedLinks links={related} labels={labels} />
            </section>
          ) : null}

          <div className="lw-cta-card">
            <p>
              <b>{labels.ctaTitle}</b>
              {labels.ctaBody}
            </p>
            <Link href={videoHref} className="lw-act">
              <Clapperboard />
              {labels.ctaButton}
            </Link>
          </div>
        </div>
        {footer}
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------

function Stage({
  boxRef,
  board,
  frame,
  size,
  viewport,
  theme,
  showGrid,
  showLabels,
  interaction,
  labels,
  index,
  total,
  title,
  subtitle,
  guide,
  step,
  onStep,
  playable,
  state,
}: {
  boxRef: React.RefObject<HTMLDivElement | null>;
  board: CompiledBoard;
  frame: BoardFrame;
  size: BoardSize | null;
  viewport: ReturnType<typeof applyViewTransform>;
  theme: BoardTheme;
  showGrid: boolean;
  showLabels: boolean;
  interaction: React.ComponentProps<typeof BoardCanvas>['interaction'];
  labels: WorkspaceLabels;
  index: number;
  total: number;
  title: string;
  subtitle?: string;
  guide: string[];
  step: number | null;
  onStep: (i: number) => void;
  playable?: BoardParam;
  state: BoardValues;
}) {
  const titleRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLDivElement>(null);
  const [avoid, setAvoid] = useState<BoardRect[]>([]);

  // Tick numbers stay out from under the overlays.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const origin = box.getBoundingClientRect();
      setAvoid(
        [titleRef.current, barRef.current, penRef.current]
          .filter((el): el is HTMLDivElement => !!el)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              x: r.left - origin.left,
              y: r.top - origin.top,
              width: r.width,
              height: r.height,
            };
          })
      );
    };
    measure();
    void document.fonts?.ready.then(measure);
  }, [boxRef, size]);

  return (
    <main className="lw-stage">
      <div ref={boxRef} className="lw-board">
        <BoardCanvas
          spec={board.spec}
          frame={frame}
          ariaLabel={labels.board}
          size={size ?? FALLBACK_SIZE}
          viewport={viewport}
          theme={theme}
          showGrid={showGrid}
          showLabels={showLabels}
          avoid={avoid}
          interaction={interaction}
        />
        <InkLayer ref={penRef} theme={theme} labels={labels} />
      </div>

      <div ref={titleRef} className="lw-chapter">
        <div className="n">
          {pad(index + 1)} / {pad(total)}
        </div>
        <p className="t">{title}</p>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <div ref={barRef} className="lw-stagebar">
        {guide.map((name, i) => (
          <button
            key={i}
            type="button"
            className={cn(step === i && 'on')}
            aria-pressed={step === i}
            onClick={() => onStep(i)}
          >
            {name}
          </button>
        ))}
        {playable ? (
          <>
            <span className="sep" />
            <button
              type="button"
              className="act"
              onClick={() => state.togglePlay(playable.id)}
            >
              {state.playing === playable.id ? (
                <Pause className="size-3.5" />
              ) : (
                <Play className="size-3.5" />
              )}
              {state.playing === playable.id ? labels.pause : labels.play}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Annotation pen (from edulab's boards): freehand ink over the stage, for a
// teacher circling something on a projector. Strokes live in screen px and
// are dropped with the chapter.

type Stroke = { color: number; points: Vec[] };

const INK: Record<BoardTheme, string[]> = {
  paper: [
    BOARD_PALETTES.paper.red,
    BOARD_PALETTES.paper.blue,
    BOARD_PALETTES.paper.ink,
  ],
  studio: ['#ffffff', '#2dd4bf', '#fbbf24'],
};

function InkLayer({
  ref,
  theme,
  labels,
}: {
  ref: React.Ref<HTMLDivElement>;
  theme: BoardTheme;
  labels: WorkspaceLabels;
}) {
  const [on, setOn] = useState(false);
  const [color, setColor] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    if (!on) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOn(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);

  const local = (event: React.PointerEvent): Vec => {
    const box = svgRef.current!.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  };

  return (
    <>
      <svg
        ref={svgRef}
        className={cn('lw-ink', on && 'drawing')}
        onPointerDown={(event) => {
          if (!on) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drawing.current = true;
          setStrokes((list) => [...list, { color, points: [local(event)] }]);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const p = local(event);
          setStrokes((list) => {
            const last = list[list.length - 1];
            return [
              ...list.slice(0, -1),
              { ...last, points: [...last.points, p] },
            ];
          });
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      >
        {strokes.map((stroke, i) => (
          <path
            key={i}
            d={`M${stroke.points.map((p) => p.join(',')).join('L')}`}
            fill="none"
            stroke={INK[theme][stroke.color]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div ref={ref} className="lw-pen">
        <button
          type="button"
          className={cn(on && 'on')}
          aria-pressed={on}
          aria-label={labels.pen}
          title={labels.pen}
          onClick={() => setOn((v) => !v)}
        >
          <PenLine />
        </button>
        {on
          ? INK[theme].map((swatch, i) => (
              <button
                key={swatch}
                type="button"
                className={cn(color === i && 'picked')}
                aria-label={`${labels.penColor} ${i + 1}`}
                aria-pressed={color === i}
                onClick={() => setColor(i)}
                style={{ color: swatch }}
              >
                <span className="swatch" style={{ background: swatch }} />
              </button>
            ))
          : null}
        {strokes.length > 0 ? (
          <>
            <button
              type="button"
              aria-label={labels.penUndo}
              title={labels.penUndo}
              onClick={() => setStrokes((list) => list.slice(0, -1))}
            >
              <Undo2 />
            </button>
            <button
              type="button"
              aria-label={labels.penClear}
              title={labels.penClear}
              onClick={() => setStrokes([])}
            >
              <Eraser />
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Slider({ param, state }: { param: BoardParam; state: BoardValues }) {
  const value = state.values[param.id] ?? param.value;
  const digits = Math.max(0, -Math.floor(Math.log10(param.step) + 1e-9));
  const span = param.max - param.min;
  const at = (v: number) => `${((v - param.min) / span) * 100}%`;
  const palette = BOARD_PALETTES.paper;
  return (
    <div className="lw-sl">
      <label htmlFor={`param-${param.id}`}>
        <InlineTex tex={param.label} />
      </label>
      <div className="lw-track">
        <input
          id={`param-${param.id}`}
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(event) =>
            state.setOne(param.id, Number(event.target.value))
          }
        />
        {param.bands?.length ? (
          <div className="lw-bands">
            {param.bands.map((band, i) => {
              const tone = palette[band.color ?? 'primary'];
              const active =
                value >= band.from - 1e-9 && value <= band.to + 1e-9;
              const point = band.to - band.from < span * 0.02;
              return (
                <div key={i}>
                  <span
                    style={{
                      left: point
                        ? `calc(${at(band.from)} - 2px)`
                        : at(band.from),
                      width: point
                        ? '4px'
                        : `${((band.to - band.from) / span) * 100}%`,
                      background: tone,
                      opacity: active ? 1 : 0.35,
                    }}
                  />
                  <small
                    className={cn(active && 'on')}
                    style={{
                      left: at((band.from + band.to) / 2),
                      color: active ? tone : 'var(--lw-dim)',
                    }}
                  >
                    {band.label}
                  </small>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      <b>{formatBoardNumber(value, digits)}</b>
    </div>
  );
}

function ResultCard({
  tex,
  readouts,
}: {
  tex: string;
  readouts: BoardFrame['readouts'];
}) {
  const values = readouts.filter((r) => r.kind === 'value');
  const statuses = readouts.filter((r) => r.kind === 'status');
  return (
    <div className="lw-mcard">
      <InlineTex tex={tex} className="lw-mh block" />
      <dl className="lw-kv">
        {values.map((readout, i) => (
          <div key={i} className={readout.highlight ? 'hl' : 'contents'}>
            <dt>
              <InlineTex tex={readout.label} />
            </dt>
            <dd className="tabular-nums">{readout.text}</dd>
          </div>
        ))}
      </dl>
      {statuses.map((readout, i) => (
        <div key={i} className={cn('lw-status', readout.ok ? 'ok' : 'bad')}>
          <i />
          <span>{readout.label}</span>
          <b>{readout.text}</b>
        </div>
      ))}
    </div>
  );
}

function RelatedLinks({
  links,
  labels,
}: {
  links: readonly WorkspaceLink[];
  labels: WorkspaceLabels;
}) {
  const groups = [
    { kind: 'lab', title: labels.relatedLabs },
    { kind: 'wonder', title: labels.relatedWonders },
    { kind: 'curve', title: labels.relatedCurves },
    { kind: 'library', title: labels.relatedLibrary },
  ] as const;
  return (
    <div className="lw-related">
      {groups.map(({ kind, title }) => {
        const items = links.filter((link) => link.kind === kind);
        if (items.length === 0) return null;
        return (
          <div key={kind}>
            <h3>{title}</h3>
            <ul>
              {items.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span>{link.label}</span>
                    {link.note ? <small>{link.note}</small> : null}
                    <ChevronRight />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn('lw-tg', on && 'on')}
    >
      <i />
      {children}
    </button>
  );
}
