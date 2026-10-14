import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  StageInsets,
  WonderEngine,
  WonderMode,
} from '@/lib/wonders/engine';
import { beatAt } from '@/lib/wonders/timeline';

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
 */
export function WonderStage({
  engine,
  labels,
  overlay,
  panel,
  onTick,
  notice,
  canvasProps,
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
  className?: string;
}) {
  const glRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<WonderMode>('story');
  const [playing, setPlaying] = useState(true);
  const [storyT, setStoryT] = useState(0);
  const clock = useRef({ mode: 'story' as WonderMode, playing: true, t: 0 });
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clock.current.playing = false;
      setPlaying(false);
    }
  }, []);

  const enterFree = useCallback(() => {
    const c = clock.current;
    if (c.mode === 'story') engine.leaveStory?.(c.t);
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
  }, [engine]);

  const seek = (t: number) => {
    const c = clock.current;
    if (c.mode !== 'story') {
      engine.replay?.();
      c.mode = 'story';
      setMode('story');
    }
    c.t = Math.max(0, Math.min(engine.length - 0.01, t));
    setStoryT(c.t);
  };

  const togglePlay = () => {
    const c = clock.current;
    c.playing = !c.playing;
    setPlaying(c.playing);
  };

  // ── Frame loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ui = uiRef.current;
    if (!ui) return;
    const ctx = ui.getContext('2d');
    if (!ctx) return;
    const gl = engine.gl ? glRef.current : null;
    engine.attach({ gl, ui });

    let raf = 0;
    let last = performance.now();
    let lastTick = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = true;
    let insets: StageInsets = { top: 0, right: 0, bottom: 0, left: 0 };

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
      insets = {
        top: overlaps(head) ? head!.bottom - rect.top + 12 : 56,
        right:
          overlaps(side) && side!.left > rect.left + rect.width / 2
            ? rect.right - side!.left + 16
            : 16,
        bottom: overlaps(bar) ? rect.bottom - bar!.top + 96 : 24,
        left: 16,
      };
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
      }
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      engine.frame(
        { mode: c.mode, t: c.t, dt, playing: c.playing, width, height, insets },
        ctx
      );
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

  const beat = beatAt(engine.beats, storyT);
  const caption = labels.beats[beat] ?? '';
  const api: StageApi = { mode, playing, enterFree };

  return (
    <div className={cn('wonder-stage', className)}>
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
        ) : mode === 'story' ? (
          <p key={beat} className="wonder-caption" aria-live="polite">
            {caption}
          </p>
        ) : null}

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
                  style={{ width: `${(storyT / engine.length) * 100}%` }}
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
                {labels.skip}
              </button>
            </>
          ) : (
            <button type="button" className="wonder-text-btn" onClick={replay}>
              <RotateCcw />
              {labels.replay}
            </button>
          )}
        </div>
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
