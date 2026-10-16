import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { THEMES } from '@/lib/video-templates/manim';
import type {
  PreviewShape,
  PreviewTone,
  TemplateFrame,
  TemplatePreview,
  TemplateTheme,
} from '@/lib/video-templates/types';

const VIEW = {
  '16:9': { w: 640, h: 360 },
  '9:16': { w: 360, h: 640 },
} as const;

/**
 * The template's key frame as SVG, in the film's frame and theme, redrawn
 * on every parameter change. It is a sketch of the geometry, not the film:
 * captions, formulas and motion come from the Manim render.
 */
export function PreviewCanvas({
  preview,
  frame,
  theme,
  className,
  label,
  children,
}: {
  preview?: TemplatePreview;
  frame: TemplateFrame;
  theme: TemplateTheme;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  const palette = THEMES[theme];
  const tone = (value: PreviewTone) =>
    ({
      amber: palette.amber,
      blue: palette.blue,
      green: palette.green,
      red: palette.red,
      muted: palette.axis,
      ink: palette.ink,
    })[value];
  const { w, h } = VIEW[frame];
  const layout = useMemo(() => {
    if (!preview) return undefined;
    // The plot box: inset from the frame, equal units when asked.
    const pad = 28;
    let bw = w - pad * 2;
    let bh = h - pad * 2;
    const sx = preview.x[1] - preview.x[0] || 1;
    const sy = preview.y[1] - preview.y[0] || 1;
    if (preview.equal) {
      const unit = Math.min(bw / sx, bh / sy);
      bw = unit * sx;
      bh = unit * sy;
    }
    const ox = (w - bw) / 2;
    const oy = (h - bh) / 2;
    const X = (x: number) => ox + ((x - preview.x[0]) / sx) * bw;
    const Y = (y: number) => oy + bh - ((y - preview.y[0]) / sy) * bh;
    return { X, Y, ox, oy, bw, bh };
  }, [preview, w, h]);

  const shape = (item: PreviewShape, index: number) => {
    if (!layout) return null;
    const { X, Y } = layout;
    const pts = (points: Array<[number, number]>) =>
      points
        .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
        .map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`)
        .join(' ');
    switch (item.kind) {
      case 'line':
        return (
          <polyline
            key={index}
            points={pts(item.points)}
            fill="none"
            stroke={tone(item.tone)}
            strokeWidth={item.width ?? 2}
            strokeDasharray={item.dashed ? '6 5' : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      case 'area':
        return (
          <polygon
            key={index}
            points={pts(item.points)}
            fill={tone(item.tone)}
            fillOpacity={item.opacity ?? 0.3}
          />
        );
      case 'dot':
        return (
          <g key={index}>
            <circle
              cx={X(item.at[0])}
              cy={Y(item.at[1])}
              r={5}
              fill={tone(item.tone)}
            />
            {item.label && (
              <text
                x={X(item.at[0]) - 14}
                y={Y(item.at[1]) - 9}
                fill={palette.ink}
                fontSize={14}
                fontStyle="italic"
              >
                {item.label}
              </text>
            )}
          </g>
        );
      case 'arrow': {
        const [x1, y1, x2, y2] = [
          X(item.from[0]),
          Y(item.from[1]),
          X(item.to[0]),
          Y(item.to[1]),
        ];
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = (offset: number) =>
          `${x2 - 11 * Math.cos(angle + offset)},${y2 - 11 * Math.sin(angle + offset)}`;
        return (
          <g key={index} stroke={tone(item.tone)} fill={tone(item.tone)}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={3} />
            <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} />
          </g>
        );
      }
    }
  };

  const gridLines = () => {
    if (!layout || !preview) return null;
    const { X, Y } = layout;
    const lines: React.ReactNode[] = [];
    const step = (span: number) => {
      const raw = span / 8;
      const power = 10 ** Math.floor(Math.log10(raw));
      return (
        [1, 2, 2.5, 5, 10].map((f) => f * power).find((v) => v >= raw) ?? raw
      );
    };
    const sx = step(preview.x[1] - preview.x[0]);
    const sy = step(preview.y[1] - preview.y[0]);
    for (
      let x = Math.ceil(preview.x[0] / sx) * sx;
      x <= preview.x[1];
      x += sx
    ) {
      lines.push(
        <line
          key={`gx${x}`}
          x1={X(x)}
          x2={X(x)}
          y1={Y(preview.y[0])}
          y2={Y(preview.y[1])}
          stroke={palette.grid}
          strokeWidth={1}
        />
      );
    }
    for (
      let y = Math.ceil(preview.y[0] / sy) * sy;
      y <= preview.y[1];
      y += sy
    ) {
      lines.push(
        <line
          key={`gy${y}`}
          y1={Y(y)}
          y2={Y(y)}
          x1={X(preview.x[0])}
          x2={X(preview.x[1])}
          stroke={palette.grid}
          strokeWidth={1}
        />
      );
    }
    if (preview.axes !== false) {
      if (preview.y[0] <= 0 && preview.y[1] >= 0) {
        lines.push(
          <line
            key="ax"
            x1={X(preview.x[0])}
            x2={X(preview.x[1])}
            y1={Y(0)}
            y2={Y(0)}
            stroke={palette.axis}
            strokeWidth={1.5}
          />
        );
      }
      if (preview.x[0] <= 0 && preview.x[1] >= 0) {
        lines.push(
          <line
            key="ay"
            y1={Y(preview.y[0])}
            y2={Y(preview.y[1])}
            x1={X(0)}
            x2={X(0)}
            stroke={palette.axis}
            strokeWidth={1.5}
          />
        );
      }
    }
    return lines;
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border shadow-sm',
        frame === '9:16' ? 'aspect-[9/16]' : 'aspect-video',
        className
      )}
      style={{ background: palette.bg }}
    >
      {preview && layout ? (
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0 size-full"
          role="img"
          aria-label={label}
        >
          <clipPath id="studio-plot">
            <rect
              x={layout.ox - 2}
              y={layout.oy - 2}
              width={layout.bw + 4}
              height={layout.bh + 4}
            />
          </clipPath>
          {gridLines()}
          <g clipPath="url(#studio-plot)">{preview.shapes.map(shape)}</g>
        </svg>
      ) : null}
      {children}
    </div>
  );
}
