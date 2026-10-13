import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  defaultParamValues,
  type BoardFrame,
  type BoardShape,
  type BoardViewport,
  type Vec,
} from '@/lib/board/evaluate';
import {
  BOARD_COLORS,
  type BoardColor,
  type BoardSpec,
} from '@/lib/board/spec';
import { cn } from '@/lib/utils';

/**
 * SVG board renderer. Drawing follows wedulab's 2D plots: a light minor and
 * major grid, axes with arrowheads and mono tick numbers, italic serif point
 * names, ring handles on points you can drag, and two themes (paper, studio)
 * where studio lines glow on a dark stage.
 */

export type BoardTheme = 'paper' | 'studio';

type Palette = Record<BoardColor, string> & {
  grid: string;
  gridMinor: string;
  axis: string;
  label: string;
  halo: string;
  pointFill: string;
  dash: string;
};

export const BOARD_PALETTES: Record<BoardTheme, Palette> = {
  paper: {
    primary: '#c9800f',
    ink: '#23272c',
    muted: '#5d6670',
    red: '#d0452f',
    blue: '#2f6fd0',
    green: '#2f8f4e',
    amber: '#d9a21b',
    purple: '#7d54d6',
    grid: 'rgba(35,39,44,.12)',
    gridMinor: 'rgba(35,39,44,.05)',
    axis: '#4a5058',
    label: '#23272c',
    halo: 'rgba(255,254,251,.92)',
    pointFill: '#fffefb',
    dash: '6 4',
  },
  studio: {
    primary: '#ffb84d',
    ink: '#eef3f8',
    muted: '#9fb0c4',
    red: '#ff6b5a',
    blue: '#6fb2ff',
    green: '#5fe08f',
    amber: '#ffd66b',
    purple: '#b99bff',
    grid: 'rgba(207,214,222,.11)',
    gridMinor: 'rgba(207,214,222,.045)',
    axis: '#9fb0c4',
    label: '#f1f4f8',
    halo: 'rgba(10,12,16,.75)',
    pointFill: '#0b0e12',
    dash: '6 5',
  },
};

const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const MATH_SERIF = "'Times New Roman', 'Noto Serif SC', serif";
const SANS = "'PingFang SC', 'Noto Sans SC', system-ui, sans-serif";
const CJK = /[㐀-鿿＀-￯]/;

/** Fractions of the box height kept clear for overlays (title, toolbar). */
export type BoardInset = { top?: number; bottom?: number };
export type BoardSize = { width: number; height: number };
/** A screen rectangle, in px from the board's top-left, kept free of tick numbers. */
export type BoardRect = { x: number; y: number; width: number; height: number };

// Static boards (cards, thumbnails) have no measured box: they draw at a
// fixed width and keep the board's own shape within these bounds.
const STATIC_WIDTH = 1000;
const MIN_ASPECT = 1.5;
const MAX_ASPECT = 2.6;
const FREE_ASPECT = 1.6;
const STATIC_SCALE = 2;

/**
 * The math rectangle that fills a `size` box. Units stay square when the
 * view asks for it; the y range then grows over the insets so overlays sit
 * on empty board instead of covering the construction.
 */
export function fitViewport(
  view: BoardSpec['view'],
  size: BoardSize,
  inset?: BoardInset
): BoardViewport {
  let [x0, x1] = view.x;
  let [y0, y1] = view.y;
  const top = inset?.top ?? 0;
  const bottom = inset?.bottom ?? 0;
  const content = size.width / size.height / (1 - top - bottom);
  if (view.equal) {
    const ratio = (x1 - x0) / (y1 - y0);
    if (ratio < content) {
      const grow = ((y1 - y0) * content - (x1 - x0)) / 2;
      x0 -= grow;
      x1 += grow;
    } else {
      const grow = ((x1 - x0) / content - (y1 - y0)) / 2;
      y0 -= grow;
      y1 += grow;
    }
  }
  const full = (y1 - y0) / (1 - top - bottom);
  return { x: [x0, x1], y: [y0 - full * bottom, y1 + full * top] };
}

function staticLayout(view: BoardSpec['view']): {
  size: BoardSize;
  viewport: BoardViewport;
} {
  let [x0, x1] = view.x;
  let [y0, y1] = view.y;
  let aspect = FREE_ASPECT;
  if (view.equal) {
    aspect = (x1 - x0) / (y1 - y0);
    if (aspect > MAX_ASPECT) {
      const grow = ((x1 - x0) / MAX_ASPECT - (y1 - y0)) / 2;
      y0 -= grow;
      y1 += grow;
      aspect = MAX_ASPECT;
    } else if (aspect < MIN_ASPECT) {
      const grow = ((y1 - y0) * MIN_ASPECT - (x1 - x0)) / 2;
      x0 -= grow;
      x1 += grow;
      aspect = MIN_ASPECT;
    }
  }
  return {
    size: { width: STATIC_WIDTH, height: STATIC_WIDTH / aspect },
    viewport: { x: [x0, x1], y: [y0, y1] },
  };
}

/** Pan by a screen offset and zoom about a screen point. */
export type ViewTransform = { zoom: number; dx: number; dy: number };
export const IDENTITY_VIEW: ViewTransform = { zoom: 1, dx: 0, dy: 0 };

export function applyViewTransform(
  base: BoardViewport,
  t: ViewTransform
): BoardViewport {
  const cx = (base.x[0] + base.x[1]) / 2 + t.dx;
  const cy = (base.y[0] + base.y[1]) / 2 + t.dy;
  const hx = (base.x[1] - base.x[0]) / 2 / t.zoom;
  const hy = (base.y[1] - base.y[0]) / 2 / t.zoom;
  return { x: [cx - hx, cx + hx], y: [cy - hy, cy + hy] };
}

function niceStep(raw: number): number {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
}

function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  const first = Math.ceil(lo / step);
  const last = Math.floor(hi / step + 1e-9);
  for (let i = first; i <= last && out.length < 400; i += 1) out.push(i * step);
  return out;
}

function tickLabel(value: number, step: number): string {
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const text = value.toFixed(digits);
  return text.startsWith('-') ? `−${text.slice(1)}` : text;
}

function inside(
  rects: readonly BoardRect[] | undefined,
  x: number,
  y: number,
  pad = 6
) {
  return rects?.some(
    (r) =>
      x > r.x - pad &&
      x < r.x + r.width + pad &&
      y > r.y - pad &&
      y < r.y + r.height + pad
  );
}

export type BoardInteraction = {
  /** Screen-space drag of the empty board. */
  onPan?: (dxPx: number, dyPx: number) => void;
  /** Wheel zoom by `factor` about a screen point. */
  onZoom?: (factor: number, atPx: Vec) => void;
  /** A draggable point moved to math coordinates `at`. */
  onDragPoint?: (
    drag: NonNullable<Extract<BoardShape, { kind: 'point' }>['drag']>,
    at: Vec
  ) => void;
  onDragEnd?: () => void;
};

/** One frame of a board as SVG. Renders identically on the server. */
export function BoardCanvas({
  spec,
  frame,
  ariaLabel,
  className,
  size,
  viewport,
  theme = 'paper',
  showGrid = true,
  showLabels = true,
  avoid,
  interaction,
}: {
  spec: BoardSpec;
  frame: BoardFrame;
  ariaLabel: string;
  className?: string;
  /** Measured box in px. Without it the board keeps its own shape. */
  size?: BoardSize;
  /** Math rectangle to show; defaults to the spec's view, fitted. */
  viewport?: BoardViewport;
  theme?: BoardTheme;
  showGrid?: boolean;
  /** Object labels and text; axes keep their numbers. */
  showLabels?: boolean;
  avoid?: readonly BoardRect[];
  interaction?: BoardInteraction;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const layout = useMemo(() => {
    if (size)
      return {
        size,
        viewport: viewport ?? fitViewport(spec.view, size),
        scale: 1,
      };
    return { ...staticLayout(spec.view), scale: STATIC_SCALE };
  }, [size, viewport, spec.view]);
  const { width: W, height: H } = layout.size;
  const [x0, x1] = layout.viewport.x;
  const [y0, y1] = layout.viewport.y;
  const k = layout.scale;
  const sx = W / (x1 - x0);
  const sy = H / (y1 - y0);
  const X = (x: number) => (x - x0) * sx;
  const Y = (y: number) => H - (y - y0) * sy;
  const C = BOARD_PALETTES[theme];
  const color = (name: BoardColor) => C[name];

  // Grid: majors about every 90px, minors at half steps.
  const stepX = niceStep(90 / sx);
  const stepY = spec.view.equal ? stepX : niceStep(90 / sy);
  const majorX = ticks(x0, x1, stepX);
  const majorY = ticks(y0, y1, stepY);
  const minorX = ticks(x0, x1, stepX / 2);
  const minorY = ticks(y0, y1, stepY / 2);

  // Axes stay on screen, pinned to an edge when the origin is off it.
  const ax = Math.max(4 * k, Math.min(W - 4 * k, X(0)));
  const ay = Math.max(4 * k, Math.min(H - 4 * k, Y(0)));
  const font = (px: number) => px * k;

  // --- Interaction: drag a handle, otherwise pan; wheel zooms. -------------
  const gesture = useRef<
    | { mode: 'pan'; x: number; y: number }
    | {
        mode: 'drag';
        drag: NonNullable<Extract<BoardShape, { kind: 'point' }>['drag']>;
      }
    | null
  >(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const toLocal = useCallback(
    (event: { clientX: number; clientY: number }): Vec | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const box = svg.getBoundingClientRect();
      return [
        ((event.clientX - box.left) / box.width) * W,
        ((event.clientY - box.top) / box.height) * H,
      ];
    },
    [W, H]
  );

  const handles = useMemo(
    () =>
      frame.shapes.filter(
        (shape): shape is Extract<BoardShape, { kind: 'point' }> =>
          shape.kind === 'point' && !!shape.drag
      ),
    [frame.shapes]
  );

  const hit = (p: Vec) =>
    handles.find(
      (shape) =>
        Math.hypot(X(shape.at[0]) - p[0], Y(shape.at[1]) - p[1]) < 16 * k
    );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interaction?.onZoom) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const p = toLocal(event);
      if (p) interaction.onZoom?.(Math.exp(-event.deltaY * 0.0015), p);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [interaction, toLocal]);

  const pointerHandlers = interaction
    ? {
        onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => {
          const p = toLocal(event);
          if (!p) return;
          const target = hit(p);
          event.currentTarget.setPointerCapture(event.pointerId);
          if (target?.drag && interaction.onDragPoint) {
            gesture.current = { mode: 'drag', drag: target.drag };
          } else if (interaction.onPan) {
            gesture.current = { mode: 'pan', x: p[0], y: p[1] };
          }
          setCursor('grabbing');
        },
        onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => {
          const p = toLocal(event);
          if (!p) return;
          const g = gesture.current;
          if (!g) {
            setCursor(
              hit(p) ? 'pointer' : interaction.onPan ? 'grab' : undefined
            );
            return;
          }
          if (g.mode === 'drag') {
            interaction.onDragPoint?.(g.drag, [x0 + p[0] / sx, y1 - p[1] / sy]);
          } else {
            interaction.onPan?.(p[0] - g.x, p[1] - g.y);
            gesture.current = { mode: 'pan', x: p[0], y: p[1] };
          }
        },
        onPointerUp: () => {
          if (gesture.current?.mode === 'drag') interaction.onDragEnd?.();
          gesture.current = null;
          setCursor(undefined);
        },
        onPointerCancel: () => {
          gesture.current = null;
          setCursor(undefined);
        },
      }
    : {};

  const glow = theme === 'studio';

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H.toFixed(2)}`}
      preserveAspectRatio={size ? 'xMidYMid slice' : undefined}
      role="img"
      aria-label={ariaLabel}
      className={cn(
        'block select-none',
        size ? 'h-full w-full' : 'h-auto w-full',
        className
      )}
      style={{ cursor, touchAction: interaction ? 'none' : undefined }}
      {...pointerHandlers}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect width={W} height={H} />
        </clipPath>
        {glow ? (
          <filter
            id={`${id}-glow`}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation={3 * k} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ) : null}
        {BOARD_COLORS.map((name) => (
          <marker
            key={name}
            id={`${id}-arrow-${name}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={color(name)} />
          </marker>
        ))}
      </defs>

      {spec.view.grid && showGrid ? (
        <g shapeRendering="crispEdges">
          <g stroke={C.gridMinor} strokeWidth={k}>
            {minorX.map((v) => (
              <line key={`mx${v}`} x1={X(v)} x2={X(v)} y1={0} y2={H} />
            ))}
            {minorY.map((v) => (
              <line key={`my${v}`} y1={Y(v)} y2={Y(v)} x1={0} x2={W} />
            ))}
          </g>
          <g stroke={C.grid} strokeWidth={k}>
            {majorX.map((v) => (
              <line key={`gx${v}`} x1={X(v)} x2={X(v)} y1={0} y2={H} />
            ))}
            {majorY.map((v) => (
              <line key={`gy${v}`} y1={Y(v)} y2={Y(v)} x1={0} x2={W} />
            ))}
          </g>
        </g>
      ) : null}

      {spec.view.axes ? (
        <g>
          <g stroke={C.axis} strokeWidth={1.3 * k} fill="none">
            <line x1={0} x2={W - 2 * k} y1={ay} y2={ay} />
            <line x1={ax} x2={ax} y1={H} y2={2 * k} />
          </g>
          <path
            fill={C.axis}
            d={`M${W - 2 * k},${ay} l${-9 * k},${-4 * k} l0,${8 * k} z M${ax},${2 * k} l${-4 * k},${9 * k} l${8 * k},0 z`}
          />
          <g
            fill={C.axis}
            fontFamily={MONO}
            fontSize={font(11)}
            fontWeight={500}
          >
            {majorX
              .filter((v) => Math.abs(v) > stepX / 2)
              .map((v) => ({ v, x: X(v), y: ay + 5 * k + font(11) * 0.8 }))
              .filter(
                ({ x, y }) =>
                  x > 14 * k && x < W - 22 * k && !inside(avoid, x, y)
              )
              .map(({ v, x, y }) => (
                <text key={`tx${v}`} x={x} y={y} textAnchor="middle">
                  {tickLabel(v, stepX)}
                </text>
              ))}
            {majorY
              .filter((v) => Math.abs(v) > stepY / 2)
              .map((v) => ({ v, x: ax - 6 * k, y: Y(v) }))
              .filter(
                ({ x, y }) =>
                  y > 12 * k &&
                  y < H - 10 * k &&
                  x > 16 * k &&
                  !inside(avoid, x - 12 * k, y)
              )
              .map(({ v, x, y }) => (
                <text
                  key={`ty${v}`}
                  x={x}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  {tickLabel(v, stepY)}
                </text>
              ))}
            {X(0) === ax && Y(0) === ay ? (
              <text
                x={ax - 5 * k}
                y={ay + 4 * k + font(11) * 0.8}
                textAnchor="end"
              >
                O
              </text>
            ) : null}
          </g>
          <g
            fill={C.axis}
            fontFamily={MATH_SERIF}
            fontStyle="italic"
            fontSize={font(15)}
            fontWeight={500}
          >
            <text x={W - 6 * k} y={ay - 6 * k} textAnchor="end">
              x
            </text>
            {inside(avoid, ax + 8 * k, 14 * k) ? null : (
              <text x={ax + 8 * k} y={4 * k + font(15) * 0.8}>
                y
              </text>
            )}
          </g>
        </g>
      ) : null}

      <g
        clipPath={`url(#${id}-clip)`}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#${id}-glow)` : undefined}
      >
        {/* Handles last, so nothing sits on top of what you can grab. */}
        {[...frame.shapes]
          .sort(
            (a, b) =>
              Number(a.kind === 'point' && !!a.drag) -
              Number(b.kind === 'point' && !!b.drag)
          )
          .map((shape, i) => (
            <Shape
              key={i}
              shape={shape}
              X={X}
              Y={Y}
              k={k}
              palette={C}
              arrowId={`${id}-arrow`}
            />
          ))}
      </g>

      <g
        display={showLabels ? undefined : 'none'}
        paintOrder="stroke"
        stroke={C.halo}
        strokeWidth={4 * k}
        strokeLinejoin="round"
      >
        {frame.shapes.map((shape, i) => {
          if (shape.kind === 'text') {
            return (
              <Label
                key={i}
                text={shape.text}
                x={X(shape.at[0])}
                y={Y(shape.at[1])}
                anchor={shape.anchor}
                fill={color(shape.style.color)}
                opacity={shape.style.opacity}
                k={k}
              />
            );
          }
          const at = shape.style.labelAt;
          if (!shape.style.label || !at) return null;
          const centered = shape.kind === 'path' && shape.closed && shape.fill;
          const isPoint = shape.kind === 'point';
          return (
            <Label
              key={i}
              text={shape.style.label}
              x={X(at[0]) + (centered ? 0 : 9 * k)}
              y={Y(at[1]) + (centered ? 6 * k : -9 * k)}
              anchor={centered ? 'middle' : 'start'}
              fill={isPoint ? C.label : color(shape.style.color)}
              k={k}
            />
          );
        })}
      </g>
    </svg>
  );
}

function Label({
  text,
  x,
  y,
  anchor,
  fill,
  opacity,
  k,
}: {
  text: string;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  fill: string;
  opacity?: number;
  k: number;
}) {
  // Math names read as italic serif, the way a textbook sets them; prose
  // (Chinese, or anything with spaces and digits) stays upright sans.
  const prose = CJK.test(text) || /\s/.test(text.trim());
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fill={fill}
      opacity={opacity ?? 1}
      fontFamily={prose ? SANS : MATH_SERIF}
      fontStyle={prose ? undefined : 'italic'}
      fontSize={(prose ? 13 : 16) * k}
      fontWeight={prose ? 600 : 500}
    >
      {text}
    </text>
  );
}

function Shape({
  shape,
  X,
  Y,
  k,
  palette,
  arrowId,
}: {
  shape: BoardShape;
  X: (x: number) => number;
  Y: (y: number) => number;
  k: number;
  palette: Palette;
  arrowId: string;
}) {
  const color = palette[shape.style.color];
  if (shape.kind === 'text') return null;
  if (shape.kind === 'point') {
    const cx = X(shape.at[0]);
    const cy = Y(shape.at[1]);
    const r = shape.size * 0.75 * k;
    if (shape.drag) {
      // A handle: soft halo plus a ring, so it reads as something to grab.
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={r + 5 * k}
            fill={color}
            fillOpacity={0.16}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r + 1 * k}
            fill={palette.pointFill}
            stroke={color}
            strokeWidth={2 * k}
          />
        </g>
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={shape.hollow ? palette.pointFill : color}
        stroke={color}
        strokeWidth={shape.hollow ? 2 * k : 0}
      />
    );
  }
  const P = ([x, y]: Vec) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
  const d = shape.lines
    .map((line) => `M${line.map(P).join('L')}${shape.closed ? 'Z' : ''}`)
    .join('');
  const width = shape.style.width * 0.75 * k;
  return (
    <path
      d={d}
      fill={shape.fill ? color : 'none'}
      fillOpacity={shape.fill ? (shape.style.opacity ?? 0.15) : undefined}
      stroke={color}
      strokeOpacity={shape.fill ? 0.85 : (shape.style.opacity ?? 1)}
      strokeWidth={width}
      strokeDasharray={
        shape.style.dashed
          ? palette.dash
              .split(' ')
              .map((n) => Number(n) * k)
              .join(' ')
          : undefined
      }
      markerEnd={
        shape.arrow ? `url(#${arrowId}-${shape.style.color})` : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------
// State: values, eased transitions between guide steps, and param playback.

const TRANSITION_MS = 700;

export function useBoardValues(spec: BoardSpec) {
  const defaults = useMemo(() => defaultParamValues(spec), [spec]);
  const [values, setValues] = useState(defaults);
  const [playing, setPlaying] = useState<string | null>(null);
  const raf = useRef<number | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const cancel = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const animate = useCallback(
    (
      step: (progress: number) => Record<string, number>,
      ms: number,
      onDone?: () => void
    ) => {
      cancel();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / ms);
        setValues(step(progress));
        if (progress < 1) raf.current = requestAnimationFrame(tick);
        else {
          raf.current = null;
          onDone?.();
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [cancel]
  );

  const reducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  /** Jump (or ease) to new values, e.g. a guide step. */
  const moveTo = useCallback(
    (target: Readonly<Record<string, number>>) => {
      setPlaying(null);
      const from = { ...valuesRef.current };
      const to = { ...from, ...target };
      if (reducedMotion()) {
        cancel();
        setValues(to);
        return;
      }
      animate((p) => {
        const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        return Object.fromEntries(
          Object.keys(to).map((key) => [
            key,
            from[key] + (to[key] - from[key]) * e,
          ])
        );
      }, TRANSITION_MS);
    },
    [animate, cancel]
  );

  const setOne = useCallback(
    (id: string, value: number) => {
      cancel();
      setPlaying(null);
      setValues((current) => ({ ...current, [id]: value }));
    },
    [cancel]
  );

  /** Write several params at once (a dragged point), snapped to their steps. */
  const setMany = useCallback(
    (next: Record<string, number>) => {
      cancel();
      setPlaying(null);
      const snapped: Record<string, number> = {};
      for (const [id, raw] of Object.entries(next)) {
        const param = spec.params.find((p) => p.id === id);
        if (!param || !Number.isFinite(raw)) continue;
        const stepped =
          param.min + Math.round((raw - param.min) / param.step) * param.step;
        snapped[id] = Math.min(
          param.max,
          Math.max(param.min, Number(stepped.toFixed(6)))
        );
      }
      setValues((current) => ({ ...current, ...snapped }));
    },
    [cancel, spec.params]
  );

  /** Sweep one param from its min to its max over `play` seconds. */
  const togglePlay = useCallback(
    (id: string) => {
      if (playing === id) {
        cancel();
        setPlaying(null);
        return;
      }
      const param = spec.params.find((p) => p.id === id);
      if (!param?.play) return;
      setPlaying(id);
      const base = { ...valuesRef.current };
      animate(
        (p) => ({ ...base, [id]: param.min + (param.max - param.min) * p }),
        param.play * 1000,
        () => setPlaying(null)
      );
    },
    [animate, cancel, playing, spec.params]
  );

  const reset = useCallback(() => moveTo(defaults), [defaults, moveTo]);

  return { values, moveTo, setOne, setMany, togglePlay, playing, reset };
}

export type BoardValues = ReturnType<typeof useBoardValues>;
