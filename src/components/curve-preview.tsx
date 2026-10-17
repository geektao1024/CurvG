import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  curveCsv,
  curveSvg,
  downloadPng,
  downloadText,
  EXPORT_H,
  EXPORT_W,
} from '@/lib/curve-export';
import { cn } from '@/lib/utils';
import {
  defaultValues,
  traceExtent,
  traceFrame,
  type CurveDef,
  type TraceGuide,
} from '@/content/curves';
import type { CurvePoints } from '@/content/curves/types';

const VIEW_W = EXPORT_W;
const VIEW_H = EXPORT_H;
const PAD = 0.09;

type Box = { minX: number; maxX: number; minY: number; maxY: number };

function boxOf(polylines: CurvePoints, into?: Box): Box {
  const box = into ?? {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  };
  for (const line of polylines) {
    for (const [x, y] of line) {
      if (x < box.minX) box.minX = x;
      if (x > box.maxX) box.maxX = x;
      if (y < box.minY) box.minY = y;
      if (y > box.maxY) box.maxY = y;
    }
  }
  return box;
}

/**
 * Frame for 'fixed' mode: the union of the shapes at every corner combination
 * of the parameter ranges (≤ 2³ combos), so no slider position ever clips.
 */
function fixedFrame(curve: CurveDef): Box {
  const combos: Array<Record<string, number>> = [defaultValues(curve)];
  const corners = curve.params.map((p) => [p.min, p.max]);
  const total = 1 << curve.params.length;
  for (let mask = 0; mask < total; mask += 1) {
    const values: Record<string, number> = {};
    curve.params.forEach((param, index) => {
      values[param.key] = corners[index][(mask >> index) & 1];
    });
    combos.push(values);
  }
  let box: Box | undefined;
  for (const values of combos) {
    try {
      // Room for the construction lines too (rolling circles, foci).
      box = boxOf(
        [...curve.sample(values), traceExtent(curve.slug, values)],
        box
      );
    } catch {
      // Skip corner combinations the sampler cannot evaluate.
    }
  }
  return box ?? { minX: -1, maxX: 1, minY: -1, maxY: 1 };
}

function fitTransform(box: Box, yStretch = 1) {
  const spanX = Math.max(box.maxX - box.minX, 1e-9);
  const spanY = Math.max(box.maxY - box.minY, 1e-9) * yStretch;
  const scale = Math.min(
    (VIEW_W * (1 - 2 * PAD)) / spanX,
    (VIEW_H * (1 - 2 * PAD)) / spanY
  );
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;
  return (x: number, y: number): [number, number] => [
    VIEW_W / 2 + (x - midX) * scale,
    // SVG y grows downward; curve space y grows upward.
    VIEW_H / 2 - (y - midY) * scale * yStretch,
  ];
}

/** The transform's pixels per unit along each axis. */
function axisScales(transform: Transform) {
  const [ox, oy] = transform(0, 0);
  return {
    ox,
    oy,
    scaleX: transform(1, 0)[0] - ox,
    scaleY: oy - transform(0, 1)[1],
  };
}

/**
 * Snap screen points to 1/100 of a view unit. Node and the browser can
 * disagree on the last bit of Math.sin/cos/exp; on a symmetric curve that
 * is enough to break a tie in `simplify` differently, and the hydrated
 * path no longer matches the server's. Snapped inputs make it identical.
 */
function snap(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Ramer–Douglas–Peucker in screen space: keep a point only when dropping it
 * would move the drawn line by more than `tolerance` view units. Smooth
 * curves shrink to a few dozen points; dense ones (the butterfly) keep the
 * points they need instead of turning into a zigzag.
 */
function simplify(
  points: Array<[number, number]>,
  tolerance: number
): Array<[number, number]> {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    const [ax, ay] = points[first];
    const [bx, by] = points[last];
    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.sqrt(dx * dx + dy * dy);
    let worst = 0;
    let worstIndex = -1;
    for (let index = first + 1; index < last; index += 1) {
      const [px, py] = points[index];
      const distance =
        length > 0
          ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / length
          : Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
      if (distance > worst) {
        worst = distance;
        worstIndex = index;
      }
    }
    if (worstIndex > 0 && worst > tolerance) {
      keep[worstIndex] = 1;
      stack.push([first, worstIndex], [worstIndex, last]);
    }
  }
  return points.filter((_, index) => keep[index] === 1);
}

function toPaths(
  polylines: CurvePoints,
  transform: (x: number, y: number) => [number, number],
  tolerance?: number
): string[] {
  return polylines.map((line) => {
    const screen = line.map(([x, y]) => {
      const [sx, sy] = transform(x, y);
      return [snap(sx), snap(sy)] as [number, number];
    });
    const points = tolerance ? simplify(screen, tolerance) : screen;
    let d = '';
    for (const [x, y] of points) {
      d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  });
}

function CurveSvg({
  paths,
  origin,
  ariaLabel,
  className,
  guideLines = 0,
  faded,
  axes,
  reveal,
  halo = reveal,
  children,
}: {
  paths: string[];
  origin?: [number, number];
  ariaLabel: string;
  className?: string;
  /** Leading paths that are construction (`CurveDef.guideLines`). */
  guideLines?: number;
  /** Dim the finished curve while an animation draws over it. */
  faded?: boolean;
  /** Graph paper with numbered axes instead of the plain grid. */
  axes?: Transform;
  /** Draw the curve in once on mount. */
  reveal?: boolean;
  /** A soft amber glow under the curve; defaults to `reveal`. */
  halo?: boolean;
  children?: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('size-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
      {axes ? (
        <AxisGrid transform={axes} />
      ) : (
        <>
          <defs>
            <pattern
              id="curve-grid"
              width="52"
              height="52"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M52 0H0V52"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.07"
              />
            </pattern>
          </defs>
          <rect width={VIEW_W} height={VIEW_H} fill="url(#curve-grid)" />
          {origin && origin[0] > 0 && origin[0] < VIEW_W && (
            <path
              d={`M${origin[0].toFixed(1)} 0V${VIEW_H}`}
              stroke="currentColor"
              strokeOpacity="0.18"
            />
          )}
          {origin && origin[1] > 0 && origin[1] < VIEW_H && (
            <path
              d={`M0 ${origin[1].toFixed(1)}H${VIEW_W}`}
              stroke="currentColor"
              strokeOpacity="0.18"
            />
          )}
        </>
      )}
      {halo
        ? paths.map((d, index) =>
            index < guideLines ? null : (
              <path
                key={`halo-${index}`}
                d={d}
                pathLength={1}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={10}
                strokeOpacity={faded ? 0 : 0.13}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="curvg-draw-in transition-[stroke-opacity] duration-300"
              />
            )
          )
        : null}
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          pathLength={reveal ? 1 : undefined}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={index < guideLines ? 1.6 : 2.6}
          strokeOpacity={(index < guideLines ? 0.45 : 1) * (faded ? 0.2 : 1)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            'transition-[stroke-opacity] duration-300',
            reveal && 'curvg-draw-in'
          )}
        />
      ))}
      {children}
    </svg>
  );
}

/** 1, 2 or 5 × 10ⁿ: the tick spacing nearest to `raw`. */
function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
}

function tickLabel(value: number): string {
  return String(Number(value.toPrecision(6))).replace('-', '−');
}

/**
 * Graph paper whose lines fall on round numbers, with the axes numbered —
 * so a reader can measure the curve, not just look at it. Labels stick to
 * the nearest edge when an axis is off screen.
 */
function AxisGrid({ transform }: { transform: Transform }) {
  const { ox, oy, scaleX, scaleY } = axisScales(transform);
  if (!(scaleX > 0) || !(scaleY > 0)) return null;
  const stepX = niceStep(64 / scaleX);
  const stepY = niceStep(64 / scaleY);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = Math.ceil(-ox / scaleX / stepX); ; i += 1) {
    const sx = ox + i * stepX * scaleX;
    if (sx > VIEW_W || xs.length > 60) break;
    xs.push(i);
  }
  for (let i = Math.ceil((oy - VIEW_H) / scaleY / stepY); ; i += 1) {
    const sy = oy - i * stepY * scaleY;
    if (sy < 0 || ys.length > 60) break;
    ys.push(i);
  }
  const axisX = Math.min(Math.max(ox, 6), VIEW_W - 6);
  const axisY = Math.min(Math.max(oy, 6), VIEW_H - 6);
  // Labels sit below the x-axis and right of the y-axis unless that edge is near.
  const labelY = axisY > VIEW_H - 24 ? axisY - 8 : axisY + 16;
  const labelX = axisX > VIEW_W - 48 ? axisX - 8 : axisX + 8;
  const anchorX = axisX > VIEW_W - 48 ? 'end' : 'start';
  return (
    <g aria-hidden>
      <g stroke="currentColor" strokeOpacity={0.07}>
        {xs.map((i) => {
          const sx = (ox + i * stepX * scaleX).toFixed(1);
          return <path key={`gx${i}`} d={`M${sx} 0V${VIEW_H}`} />;
        })}
        {ys.map((i) => {
          const sy = (oy - i * stepY * scaleY).toFixed(1);
          return <path key={`gy${i}`} d={`M0 ${sy}H${VIEW_W}`} />;
        })}
      </g>
      <g stroke="currentColor" strokeOpacity={0.28}>
        {ox >= 0 && ox <= VIEW_W && (
          <path d={`M${ox.toFixed(1)} 0V${VIEW_H}`} />
        )}
        {oy >= 0 && oy <= VIEW_H && (
          <path d={`M0 ${oy.toFixed(1)}H${VIEW_W}`} />
        )}
      </g>
      {/* Too small to read once the graph is phone-width. */}
      <g
        className="max-sm:hidden"
        fill="currentColor"
        fillOpacity={0.42}
        fontFamily="var(--font-code)"
        fontSize={11}
      >
        {xs.map((i) => {
          const sx = ox + i * stepX * scaleX;
          if (i === 0 || sx < 14 || sx > VIEW_W - 14) return null;
          return (
            <text
              key={`tx${i}`}
              x={sx.toFixed(1)}
              y={labelY.toFixed(1)}
              textAnchor="middle"
            >
              {tickLabel(i * stepX)}
            </text>
          );
        })}
        {ys.map((i) => {
          const sy = oy - i * stepY * scaleY;
          if (i === 0 || sy < 12 || sy > VIEW_H - 10) return null;
          return (
            <text
              key={`ty${i}`}
              x={labelX.toFixed(1)}
              y={(sy + 4).toFixed(1)}
              textAnchor={anchorX}
            >
              {tickLabel(i * stepY)}
            </text>
          );
        })}
      </g>
    </g>
  );
}

/** Static thumbnail at default parameters — used on the /curves index grid. */
export function CurveThumb({
  curve,
  ariaLabel,
  className,
}: {
  curve: CurveDef;
  ariaLabel: string;
  className?: string;
}) {
  const { paths, origin } = useMemo(() => {
    const polylines = curve.sample(defaultValues(curve));
    const transform = fitTransform(boxOf(polylines), curve.yStretch);
    return {
      paths: toPaths(polylines, transform, 0.6),
      origin: transform(0, 0),
    };
  }, [curve]);
  return (
    <CurveSvg
      paths={paths}
      origin={origin}
      ariaLabel={ariaLabel}
      className={className}
      guideLines={curve.guideLines}
    />
  );
}

/**
 * A curve that draws itself in a loop (CSS only, see `.curvg-draw-loop`),
 * over its own faint outline. Decorative: the index hero.
 */
export function CurveDrawingLoop({
  curve,
  className,
}: {
  curve: CurveDef;
  className?: string;
}) {
  const paths = useMemo(() => {
    const polylines = curve.sample(defaultValues(curve));
    const transform = fitTransform(boxOf(polylines), curve.yStretch);
    return toPaths(polylines, transform, 0.6);
  }, [curve]);
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('size-full', className)}
      aria-hidden
    >
      {paths.map((d, index) => (
        <g key={index}>
          <path
            d={d}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={0.12}
            strokeWidth={2}
          />
          <path
            d={d}
            pathLength={1}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="curvg-draw-loop"
          />
        </g>
      ))}
    </svg>
  );
}

/**
 * Interactive preview with one slider per curve parameter. SSR renders the
 * default-parameter shape, so the drawing is present in the crawled HTML.
 */
export function CurveExplorer({
  curve,
  locale,
  parametersLabel,
  resetLabel,
  ariaLabel,
  values,
  onValuesChange,
  presets,
  presetsLabel,
  drawLabels,
  drawNext,
  exports,
}: {
  curve: CurveDef;
  locale: string;
  parametersLabel: string;
  resetLabel: string;
  ariaLabel: string;
  /** Controlled: the page shares the values with its formula card. */
  values: Record<string, number>;
  onValuesChange: (values: Record<string, number>) => void;
  /** Named settings shown as one-click buttons above the sliders. */
  presets?: readonly { label: string; values: Record<string, number> }[];
  presetsLabel?: string;
  /** "Watch it draw" button; omitted = no animation. */
  drawLabels?: { play: string; replay: string; stop: string };
  /** Shown once a drawing has finished: the paid next step, a video. */
  drawNext?: { href: string; label: string };
  /** Free downloads of the shape as currently set; omitted = no export bar. */
  exports?: ExportOptions;
}) {
  const defaults = useMemo(() => defaultValues(curve), [curve]);
  const draw = useDrawing();
  const frame = useMemo(
    () => (curve.fitMode === 'fixed' ? fixedFrame(curve) : undefined),
    [curve]
  );

  const { polylines, paths, origin, transform } = useMemo(() => {
    const polylines = curve.sample(values);
    const transform = fitTransform(
      frame ?? boxOf([...polylines, traceExtent(curve.slug, values)]),
      curve.yStretch
    );
    return {
      polylines,
      paths: toPaths(polylines, transform),
      origin: transform(0, 0),
      transform,
    };
  }, [curve, values, frame]);

  const start = useMemo(() => {
    const first = polylines.at(-1)?.[0];
    return first ? transform(first[0], first[1]) : null;
  }, [polylines, transform]);

  const isDefault = curve.params.every(
    (param) => values[param.key] === defaults[param.key]
  );

  return (
    <div className="bg-card overflow-hidden rounded-2xl border shadow-[0_1px_0_0_var(--border),0_24px_48px_-32px_color-mix(in_oklab,var(--foreground)_28%,transparent)]">
      <div className="bg-muted/20 relative aspect-[4/3]">
        <CurveSvg
          paths={paths}
          origin={origin}
          ariaLabel={ariaLabel}
          guideLines={curve.guideLines}
          faded={draw.progress !== null}
          axes={transform}
          reveal
          // Dense fractal edges blur under a glow.
          halo={curve.category !== 'fractal'}
        >
          {draw.progress !== null ? (
            <TraceOverlay
              slug={curve.slug}
              values={values}
              polylines={polylines}
              transform={transform}
              progress={draw.progress}
            />
          ) : start ? (
            // Where the pen will set off: the amber handle of the logo.
            <circle
              cx={start[0].toFixed(1)}
              cy={start[1].toFixed(1)}
              r={6}
              fill="var(--card)"
              stroke="var(--brand)"
              strokeWidth={2.5}
              aria-hidden
            />
          ) : null}
        </CurveSvg>
        <PointerReadout transform={transform} />
        {drawLabels ? (
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                draw.progress !== null
                  ? draw.stop()
                  : draw.play(drawDuration(polylines, transform))
              }
              className={cn(
                'bg-card/95 hover:border-primary/60 hover:text-primary inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm font-medium shadow-sm backdrop-blur transition-colors',
                !draw.played && draw.progress === null && 'curvg-play-nudge'
              )}
            >
              <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full">
                {draw.progress !== null ? (
                  <Square className="size-3 fill-current" aria-hidden />
                ) : draw.played ? (
                  <RotateCcw className="size-3.5" aria-hidden />
                ) : (
                  <Play className="ml-0.5 size-3.5 fill-current" aria-hidden />
                )}
              </span>
              {draw.progress !== null
                ? drawLabels.stop
                : draw.played
                  ? drawLabels.replay
                  : drawLabels.play}
            </button>
            {drawNext && draw.played && draw.progress === null ? (
              <Link
                href={drawNext.href}
                className="bg-primary text-primary-foreground hover:bg-primary/90 curvg-playground-in inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors"
              >
                {drawNext.label}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
        {draw.progress !== null ? (
          <div
            className="bg-border/60 absolute inset-x-0 bottom-0 h-0.5"
            aria-hidden
          >
            <div
              className="bg-brand h-full"
              style={{ width: `${(draw.progress * 100).toFixed(2)}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="border-t px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            {parametersLabel}
          </p>
          <button
            type="button"
            onClick={() => onValuesChange(defaults)}
            disabled={isDefault}
            className="text-primary text-xs font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {resetLabel}
          </button>
        </div>
        {presets && presets.length > 0 ? (
          <div
            className="mt-3 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={presetsLabel}
          >
            {presets.map((preset) => {
              const active = curve.params.every(
                (param) => values[param.key] === preset.values[param.key]
              );
              return (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onValuesChange({ ...defaults, ...preset.values })
                  }
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-primary bg-accent text-primary'
                      : 'hover:border-primary/50 hover:text-primary'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="mt-3 grid gap-3">
          {curve.params.map((param) => (
            <label key={param.key} className="block">
              <span className="flex items-baseline justify-between text-sm">
                <span>{param.label[locale === 'zh' ? 'zh' : 'en']}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {values[param.key]}
                </span>
              </span>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={values[param.key]}
                onChange={(event) =>
                  onValuesChange({
                    ...values,
                    [param.key]: Number(event.target.value),
                  })
                }
                className="accent-primary mt-1.5 block w-full"
              />
            </label>
          ))}
        </div>
      </div>
      {exports ? (
        <ExportBar
          options={exports}
          slug={curve.slug}
          guideLines={curve.guideLines ?? 0}
          shape={{ polylines, paths, origin }}
        />
      ) : null}
    </div>
  );
}

type Transform = (x: number, y: number) => [number, number];

function readoutValue(value: number, step: number): string {
  const digits = Math.max(0, Math.min(4, 1 - Math.floor(Math.log10(step))));
  return value.toFixed(digits).replace('-', '−');
}

/**
 * Crosshair and (x, y) readout under the pointer, in curve coordinates.
 * Its own state, so moving the mouse never re-renders the curve.
 */
function PointerReadout({ transform }: { transform: Transform }) {
  const [point, setPoint] = useState<[number, number] | null>(null);
  const { ox, oy, scaleX, scaleY } = axisScales(transform);
  const stepX = niceStep(64 / scaleX) / 10;
  const stepY = niceStep(64 / scaleY) / 10;
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="absolute inset-0 size-full cursor-crosshair"
      aria-hidden
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        setPoint([
          ((event.clientX - rect.left) / rect.width) * VIEW_W,
          ((event.clientY - rect.top) / rect.height) * VIEW_H,
        ]);
      }}
      onPointerLeave={() => setPoint(null)}
    >
      {point ? (
        <g className="text-primary">
          <path
            d={`M${point[0].toFixed(1)} 0V${VIEW_H}M0 ${point[1].toFixed(1)}H${VIEW_W}`}
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeDasharray="3 4"
          />
          <text
            x={VIEW_W - 12}
            y={22}
            textAnchor="end"
            fill="currentColor"
            fontFamily="var(--font-code)"
            fontSize={12}
          >
            {`x ${readoutValue((point[0] - ox) / scaleX, stepX)}   y ${readoutValue((oy - point[1]) / scaleY, stepY)}`}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** Playback clock: progress 0 → 1 over one run, null when idle. */
function useDrawing() {
  const [run, setRun] = useState<{ duration: number } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    if (!run) return;
    let frameId = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - start) / run.duration);
      setProgress(u);
      if (u < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setRun(null);
        setProgress(null);
        setPlayed(true);
      }
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [run]);
  return {
    progress,
    played,
    play: (duration: number) => {
      setProgress(0);
      setRun({ duration });
    },
    stop: () => {
      setRun(null);
      setProgress(null);
      setPlayed(true);
    },
  };
}

/** Long curves get more time, within 3–9 s, so the pen speed feels even. */
function drawDuration(polylines: CurvePoints, transform: Transform): number {
  const line = polylines.at(-1) ?? [];
  let length = 0;
  for (let i = 1; i < line.length; i += 1) {
    const [x0, y0] = transform(line[i - 1][0], line[i - 1][1]);
    const [x1, y1] = transform(line[i][0], line[i][1]);
    length += Math.hypot(x1 - x0, y1 - y0);
  }
  return Math.min(9000, Math.max(3000, 1500 + length * 1.6));
}

/**
 * One frame of the drawing: the curve so far, the construction that makes
 * it (rolling circle, radius, focal strings), and the amber pen.
 */
function TraceOverlay({
  slug,
  values,
  polylines,
  transform,
  progress,
}: {
  slug: string;
  values: Record<string, number>;
  polylines: CurvePoints;
  transform: Transform;
  progress: number;
}) {
  const frame = traceFrame(slug, values, polylines, progress);
  if (!frame) return null;
  const line = polylines[frame.polyline];
  const [penX, penY] = transform(frame.pen[0], frame.pen[1]);
  let d = '';
  for (let i = 0; i <= Math.floor(frame.upto); i += 1) {
    const [x, y] = transform(line[i][0], line[i][1]);
    d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += `L${penX.toFixed(1)} ${penY.toFixed(1)}`;
  const scale = transform(1, 0)[0] - transform(0, 0)[0];
  return (
    <g aria-hidden>
      {frame.guides.map((guide, index) => (
        <Guide key={index} guide={guide} transform={transform} scale={scale} />
      ))}
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={penX}
        cy={penY}
        r={7}
        fill="var(--primary)"
        stroke="var(--card)"
        strokeWidth={2.5}
      />
    </g>
  );
}

function Guide({
  guide,
  transform,
  scale,
}: {
  guide: TraceGuide;
  transform: Transform;
  scale: number;
}) {
  const stroke = {
    stroke: 'currentColor',
    strokeOpacity: 'faint' in guide && guide.faint ? 0.22 : 0.55,
    strokeWidth: 1.4,
    fill: 'none',
  };
  if (guide.kind === 'circle') {
    const [cx, cy] = transform(guide.cx, guide.cy);
    return <circle cx={cx} cy={cy} r={Math.abs(guide.r * scale)} {...stroke} />;
  }
  if (guide.kind === 'segment') {
    const [x1, y1] = transform(guide.from[0], guide.from[1]);
    const [x2, y2] = transform(guide.to[0], guide.to[1]);
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        strokeDasharray={guide.dashed ? '5 5' : undefined}
        {...stroke}
      />
    );
  }
  const [x, y] = transform(guide.at[0], guide.at[1]);
  return <circle cx={x} cy={y} r={3.5} fill="currentColor" fillOpacity={0.6} />;
}

export type ExportOptions = {
  /** LaTeX copied by the copy button: the curve's equations, one per line. */
  latex: string;
  /** Small credit printed in the corner of exported images. */
  credit: string;
  labels: {
    title: string;
    svg: string;
    png: string;
    csv: string;
    copyLatex: string;
    copied: string;
  };
};

function ExportBar({
  options,
  slug,
  guideLines,
  shape,
}: {
  options: ExportOptions;
  slug: string;
  guideLines: number;
  shape: {
    polylines: CurvePoints;
    paths: string[];
    origin: [number, number];
  };
}) {
  const { labels, credit, latex } = options;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const svg = (background?: string) =>
    curveSvg({
      paths: shape.paths,
      origin: shape.origin,
      guideLines,
      credit,
      background,
    });
  const button =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary/50 hover:text-primary';

  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
      <p className="text-muted-foreground mr-1 font-mono text-[10px] tracking-[0.14em] uppercase">
        {labels.title}
      </p>
      <button
        type="button"
        className={button}
        onClick={() => downloadText(svg(), 'image/svg+xml', `${slug}.svg`)}
      >
        <Download className="size-3.5" aria-hidden />
        {labels.svg}
      </button>
      <button
        type="button"
        className={button}
        onClick={() => void downloadPng(svg('#ffffff'), `${slug}.png`)}
      >
        <Download className="size-3.5" aria-hidden />
        {labels.png}
      </button>
      <button
        type="button"
        className={button}
        onClick={() =>
          downloadText(curveCsv(shape.polylines), 'text/csv', `${slug}.csv`)
        }
      >
        <Download className="size-3.5" aria-hidden />
        {labels.csv}
      </button>
      <button
        type="button"
        className={button}
        aria-live="polite"
        onClick={() =>
          void navigator.clipboard?.writeText(latex).then(() => setCopied(true))
        }
      >
        {copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? labels.copied : labels.copyLatex}
      </button>
    </div>
  );
}
