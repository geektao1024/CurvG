import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Bloom } from '@/lib/wonders/bloom';
import {
  safeArea,
  storyClock,
  teaserCut,
  teaserLength,
  type StageInsets,
  type WonderEngine,
  type WonderMode,
} from '@/lib/wonders/engine';
import { decodeShare, SHARE_PARAM, type ShareState } from '@/lib/wonders/share';
import { beatAt } from '@/lib/wonders/timeline';
import { WonderExportTools } from '@/components/wonder-export';

export type WonderStageLabels = {
  /** One caption per story beat. */
  beats: readonly string[];
  play: string;
  pause: string;
  replay: string;
  skip: string;
  story: string;
  params: string;
  canvas: string;
  fullscreen?: string;
  exitFullscreen?: string;
};

/** A wonder's free-play settings, in and out of a share link. */
export type StageShare = {
  /** Settings worth a link, or null when there is nothing to restore. */
  get: () => ShareState | null;
  /** Apply settings from a link (already in free play). Values unchecked. */
  apply: (state: Record<string, string>) => void;
};

/** What a wonder's own controls can ask of the stage. */
export type StageApi = {
  mode: WonderMode;
  playing: boolean;
  /** Leave the story (if playing it) and hand control to the reader. */
  enterFree: () => void;
};

/**
 * The shared shell of every wonder: canvases (a WebGL layer when the engine
 * asks for one, plus a 2D layer on top), the frame loop, the story clock with
 * captions and beat ticks, and a glass panel for the wonder's own controls.
 * The engine draws; the stage keeps time and keeps the picture clear of the
 * title, the panel and the captions (`insets`).
 *
 * While the story plays the stage is a cinema: the title shrinks after the
 * first beat, the panel folds down to its readouts, and the picture takes
 * the room they free (eased, never cut). Free play brings the controls back.
 */
export function WonderStage({
  engine,
  labels,
  overlay,
  panel,
  onTick,
  notice,
  canvasProps,
  share,
  className,
}: {
  engine: WonderEngine;
  labels: WonderStageLabels;
  /** Title block drawn over the top-left of the canvas. */
  overlay?: ReactNode;
  /** The wonder's controls and readouts. */
  panel: (api: StageApi) => ReactNode;
  /** Called a few times a second, for readouts. */
  onTick?: () => void;
  /** A hint shown where the caption goes (e.g. "draw a curve"). */
  notice?: string | null;
  canvasProps?: HTMLAttributes<HTMLCanvasElement>;
  /** Share links: free-play settings out (`get`) and in (`apply`). */
  share?: StageShare;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<WonderMode>('story');
  const [playing, setPlaying] = useState(true);
  /** The story ran to its end on its own (not skipped): time to offer more. */
  const [ended, setEnded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);
  // The clock starts before 0 when the wonder has a cold open (teaser).
  const clock = useRef({
    mode: 'story' as WonderMode,
    playing: true,
    t: -teaserLength(engine),
  });
  const [storyT, setStoryT] = useState(clock.current.t);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;
  const shareRef = useRef(share);
  shareRef.current = share;
  /** Where the picture sits right now, device px (for the share card). */
  const focusRef = useRef<{ cx: number; cy: number; w: number; h: number }>(
    null
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clock.current.playing = false;
      clock.current.t = 0;
      setPlaying(false);
      setStoryT(0);
    }
    setCanFullscreen(!!document.fullscreenEnabled);
    const onChange = () =>
      setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const enterFree = useCallback(() => {
    const c = clock.current;
    if (c.mode === 'story') engine.leaveStory?.(storyClock(engine, c.t));
    c.mode = 'free';
    c.playing = true;
    setMode('free');
    setPlaying(true);
  }, [engine]);

  const replay = useCallback(() => {
    const c = clock.current;
    engine.replay?.();
    c.mode = 'story';
    c.t = 0;
    c.playing = true;
    setMode('story');
    setPlaying(true);
    setStoryT(0);
    setEnded(false);
  }, [engine]);

  const seek = (t: number) => {
    const c = clock.current;
    if (c.mode !== 'story') {
      engine.replay?.();
      c.mode = 'story';
      setMode('story');
      setEnded(false);
    }
    c.t = Math.max(0, Math.min(engine.length - 0.01, t));
    setStoryT(c.t);
  };

  const togglePlay = () => {
    const c = clock.current;
    c.playing = !c.playing;
    setPlaying(c.playing);
  };

  // Opened from a share link: skip the story, restore the settings.
  useEffect(() => {
    const state = decodeShare(
      new URLSearchParams(window.location.search).get(SHARE_PARAM)
    );
    if (!state || !shareRef.current) return;
    enterFree();
    shareRef.current.apply(state);
  }, [enterFree]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  // ── Frame loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ui = uiRef.current;
    if (!ui) return;
    const ctx = ui.getContext('2d');
    if (!ctx) return;
    const gl = engine.gl ? glRef.current : null;
    engine.attach({ gl, ui });
    const bloom = engine.glow ? new Bloom() : null;

    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    /** Where the picture should be kept clear of, and where it is now. */
    let target: StageInsets = { top: 0, right: 0, bottom: 0, left: 0 };
    let insets: StageInsets | null = null;

    // Keep the picture clear of the title, the panel and the caption/bar,
    // whatever the layout (the panel drops below the canvas on phones).
    const measure = () => {
      const rect = ui.getBoundingClientRect();
      const root = ui.parentElement;
      const head = root?.querySelector('.wonder-head')?.getBoundingClientRect();
      const bar = root?.querySelector('.wonder-bar')?.getBoundingClientRect();
      const side = root?.parentElement
        ?.querySelector('.wonder-panel')
        ?.getBoundingClientRect();
      const overlaps = (r?: DOMRect) =>
        !!r && r.width > 0 && r.top < rect.bottom && r.bottom > rect.top;
      const top = overlaps(head) ? head!.bottom - rect.top + 12 : 56;
      // A panel folded to its readouts sits in the title band: only a tall
      // panel takes a column off the picture.
      const sideTall =
        overlaps(side) &&
        side!.left > rect.left + rect.width / 2 &&
        side!.bottom - rect.top > top + 48;
      target = {
        top,
        right: sideTall ? rect.right - side!.left + 16 : 16,
        bottom: overlaps(bar) ? rect.bottom - bar!.top + 96 : 24,
        left: 16,
      };
      if (!insets) insets = { ...target };
    };

    const resize = () => {
      const rect = ui.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      ui.width = Math.round(width * dpr);
      ui.height = Math.round(height * dpr);
      if (gl) {
        gl.width = ui.width;
        gl.height = ui.height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      insets = null;
      measure();
      engine.resize?.(width, height, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(ui);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(ui);

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      const c = clock.current;
      if (c.mode === 'story' && c.playing) c.t += dt;
      if (c.mode === 'story' && c.t >= engine.length) {
        c.t = engine.length;
        engine.leaveStory?.(c.t);
        c.mode = 'free';
        setMode('free');
        setEnded(true);
      }
      // Ease the framing towards the measured insets (title shrinking,
      // panel folding) so the picture glides instead of jumping.
      const e = 1 - Math.exp(-dt * 5);
      const cur = insets ?? target;
      insets = {
        top: cur.top + (target.top - cur.top) * e,
        right: cur.right + (target.right - cur.right) * e,
        bottom: cur.bottom + (target.bottom - cur.bottom) * e,
        left: cur.left + (target.left - cur.left) * e,
      };
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const story = c.mode === 'story';
      engine.frame(
        {
          mode: c.mode,
          t: story ? storyClock(engine, c.t) : c.t,
          dt,
          playing: c.playing,
          width,
          height,
          insets,
        },
        ctx
      );
      bloom?.apply(ctx, ui, engine.glow ?? 0);
      const area = safeArea(width, height, insets);
      focusRef.current = {
        cx: area.cx * dpr,
        cy: area.cy * dpr,
        w: area.w * dpr,
        h: area.h * dpr,
      };
      // Dip to black across the cut from the cold open into the story.
      const cut = story && engine.teaser ? teaserCut(c.t) : 0;
      if (cut > 0) {
        ctx.fillStyle = `rgba(6,7,12,${cut})`;
        ctx.fillRect(0, 0, width, height);
      }
      if (now - lastTick > 120) {
        lastTick = now;
        measure();
        if (c.mode === 'story') setStoryT(c.t);
        tickRef.current?.();
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      engine.detach?.();
    };
  }, [engine]);

  const teasing = mode === 'story' && storyT < 0;
  const beat = beatAt(engine.beats, Math.max(0, storyT));
  const caption = labels.beats[beat] ?? '';
  const api: StageApi = { mode, playing, enterFree };
  const compact = mode === 'free' || beat > 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      ref={rootRef}
      className={cn('wonder-stage', className)}
      data-mode={mode}
      data-compact={compact ? '' : undefined}
    >
      <div className="wonder-viewport">
        {overlay}
        {engine.gl ? (
          <canvas ref={glRef} className="wonder-canvas" aria-hidden />
        ) : null}
        <canvas
          ref={uiRef}
          role="img"
          aria-label={labels.canvas}
          {...canvasProps}
          className={cn('wonder-canvas', canvasProps?.className)}
        />

        {notice ? (
          <p className="wonder-caption is-notice" aria-live="polite">
            {notice}
          </p>
        ) : mode === 'story' && !teasing ? (
          <p key={beat} className="wonder-caption" aria-live="polite">
            <span className="wonder-chapter">
              {pad(beat + 1)} / {pad(engine.beats.length)}
            </span>
            {caption}
          </p>
        ) : null}

        <WonderExportTools
          engine={engine}
          canvases={() => ({
            gl: glRef.current,
            ui: uiRef.current,
            focus: focusRef.current,
          })}
          shareState={() =>
            clock.current.mode === 'free'
              ? (shareRef.current?.get() ?? null)
              : null
          }
          mode={mode}
          ended={ended}
          onDismissEnd={() => setEnded(false)}
        >
          {(tools) => (
            <div className="wonder-bar">
              <button
                type="button"
                className="wonder-icon-btn"
                onClick={togglePlay}
                aria-label={playing ? labels.pause : labels.play}
                title={playing ? labels.pause : labels.play}
              >
                {playing ? <Pause /> : <Play />}
              </button>
              {mode === 'story' ? (
                <>
                  <div className="wonder-track" aria-label={labels.story}>
                    <div
                      className="wonder-track-fill"
                      style={{
                        width: `${(Math.max(0, storyT) / engine.length) * 100}%`,
                      }}
                    />
                    {engine.beats.map((start, i) => (
                      <button
                        key={start}
                        type="button"
                        className={cn('wonder-tick', i <= beat && 'is-past')}
                        style={{ left: `${(start / engine.length) * 100}%` }}
                        onClick={() => seek(start + 0.01)}
                        aria-label={`${i + 1}. ${labels.beats[i] ?? ''}`}
                        title={labels.beats[i]}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="wonder-text-btn"
                    onClick={enterFree}
                  >
                    <SkipForward />
                    <span className="wonder-hide-sm">{labels.skip}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="wonder-text-btn"
                  onClick={replay}
                >
                  <RotateCcw />
                  {labels.replay}
                </button>
              )}
              {tools}
              {canFullscreen ? (
                <button
                  type="button"
                  className="wonder-ghost-btn wonder-hide-sm"
                  onClick={toggleFullscreen}
                  aria-label={
                    fullscreen ? labels.exitFullscreen : labels.fullscreen
                  }
                  title={fullscreen ? labels.exitFullscreen : labels.fullscreen}
                >
                  {fullscreen ? <Minimize2 /> : <Maximize2 />}
                </button>
              ) : null}
            </div>
          )}
        </WonderExportTools>
      </div>

      <aside className="wonder-panel" aria-label={labels.params}>
        <p className="wonder-panel-title">{labels.params}</p>
        {panel(api)}
      </aside>
    </div>
  );
}

/** A row of readouts: label on the left, a mono value on the right. */
export function WonderReadouts({
  items,
}: {
  items: readonly { label: string; value: string; tone?: 'amber' }[];
}) {
  return (
    <div className="wonder-readouts">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong className={item.tone === 'amber' ? 'is-amber' : undefined}>
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

/** Pill buttons; one pressed. */
export function WonderChips<T extends string>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly { value: T; label: ReactNode }[];
  value: T | null;
  onPick: (value: T) => void;
}) {
  return (
    <>
      <p className="wonder-panel-label">{label}</p>
      <div className="wonder-chips" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={option.value === value}
            className="wonder-chip"
            onClick={() => onPick(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </>
  );
}

/** Labelled range input with its value shown. */
export function WonderSlider({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="wonder-slider">
      <span>
        {label}
        <output>{display ?? value}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    </label>
  );
}

/** Labelled checkbox. */
export function WonderToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="wonder-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
