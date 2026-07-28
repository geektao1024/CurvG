import { useEffect, useMemo, useRef } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

import type { AnimationMathObjectType } from '@/lib/animation';
import {
  evaluateMathExpression,
  formulaToLatex,
  integralParts,
  parseMatrix,
  seriesParts,
} from '@/lib/math-preview';
import { cn } from '@/lib/utils';

interface Point {
  x: number;
  y: number;
}

function chartPoint(x: number, y: number): Point {
  return { x: 360 + x * 52, y: 180 - y * 34 };
}

function plotPath(expression: string): { path: string; points: Point[] } {
  const points: Point[] = [];
  let path = '';
  for (let index = 0; index <= 180; index += 1) {
    const x = -6 + (12 * index) / 180;
    try {
      const y = evaluateMathExpression(expression, { x });
      if (Math.abs(y) > 8) {
        path += ' M';
        continue;
      }
      const point = chartPoint(x, y);
      points.push(point);
      path += `${path && !path.endsWith(' M') ? ' L' : ''}${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    } catch {
      path += ' M';
    }
  }
  return { path: path.replace(/ M(?= M|$)/g, ''), points };
}

function FormulaTypeset({ formula }: { formula: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    katex.render(formulaToLatex(formula) || '\\text{—}', ref.current, {
      displayMode: true,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml',
      errorColor: '#dc2626',
    });
  }, [formula]);
  return <div ref={ref} className="min-w-0 overflow-x-auto py-1" />;
}

function FunctionPlot({
  formula,
  integral,
}: {
  formula: string;
  integral: boolean;
}) {
  const data = useMemo(() => {
    try {
      const parts = integral
        ? integralParts(formula)
        : { expression: formula, from: 0, to: 0 };
      const plot = plotPath(parts.expression);
      const selected = integral
        ? plot.points.filter((point) => {
            const x = (point.x - 360) / 52;
            return x >= parts.from && x <= parts.to;
          })
        : [];
      const area =
        selected.length > 1
          ? `M ${selected[0].x} 180 ${selected
              .map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
              .join(' ')} L ${selected.at(-1)!.x} 180 Z`
          : '';
      return { ...plot, area, error: '' };
    } catch (error) {
      return {
        path: '',
        points: [],
        area: '',
        error: error instanceof Error ? error.message : 'Invalid formula',
      };
    }
  }, [formula, integral]);

  return (
    <>
      {data.area && <path d={data.area} fill="var(--primary)" opacity="0.2" />}
      {data.path && (
        <path
          d={data.path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {data.error && (
        <text
          x="360"
          y="205"
          textAnchor="middle"
          className="fill-destructive text-[13px]"
        >
          {data.error.slice(0, 72)}
        </text>
      )}
    </>
  );
}

function SeriesPlot({ formula }: { formula: string }) {
  const data = useMemo(() => {
    try {
      const parts = seriesParts(formula);
      const sums: number[] = [];
      let sum = 0;
      for (let n = parts.from; n <= parts.to; n += 1) {
        sum += evaluateMathExpression(parts.expression, { n });
        sums.push(sum);
      }
      const min = Math.min(0, ...sums);
      const max = Math.max(1, ...sums);
      const span = Math.max(0.001, max - min);
      return {
        points: sums.map((value, index) => ({
          x: 92 + (index * 536) / Math.max(1, sums.length - 1),
          y: 300 - ((value - min) / span) * 220,
        })),
        error: '',
      };
    } catch (error) {
      return {
        points: [] as Point[],
        error: error instanceof Error ? error.message : 'Invalid series',
      };
    }
  }, [formula]);
  const path = data.points
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
    .join(' ');
  return (
    <>
      {path && (
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="3" />
      )}
      {data.points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="var(--primary)"
        />
      ))}
      {data.error && (
        <text
          x="360"
          y="205"
          textAnchor="middle"
          className="fill-destructive text-[13px]"
        >
          {data.error.slice(0, 72)}
        </text>
      )}
    </>
  );
}

function MatrixPlot({ formula }: { formula: string }) {
  const result = useMemo(() => {
    try {
      const matrix = parseMatrix(formula);
      const a = matrix[0]?.[0] ?? 1;
      const b = matrix[0]?.[1] ?? 0;
      const c = matrix[1]?.[0] ?? 0;
      const d = matrix[1]?.[1] ?? 1;
      const transform = (x: number, y: number) => ({
        x: 360 + (a * x + b * y) * 60,
        y: 180 - (c * x + d * y) * 60,
      });
      return {
        points: [
          transform(-1, -1),
          transform(1, -1),
          transform(1, 1),
          transform(-1, 1),
        ],
        error: '',
      };
    } catch (error) {
      return {
        points: [] as Point[],
        error: error instanceof Error ? error.message : 'Invalid matrix',
      };
    }
  }, [formula]);
  const polygon = result.points
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  return (
    <>
      {polygon && (
        <polygon
          points={polygon}
          fill="var(--primary)"
          fillOpacity="0.2"
          stroke="var(--primary)"
          strokeWidth="3"
        />
      )}
      {result.error && (
        <text
          x="360"
          y="205"
          textAnchor="middle"
          className="fill-destructive text-[13px]"
        >
          {result.error.slice(0, 72)}
        </text>
      )}
    </>
  );
}

export function MathFormulaPreview({
  formula,
  type,
  className,
  previewLabel,
}: {
  formula: string;
  type: AnimationMathObjectType;
  className?: string;
  previewLabel: string;
}) {
  return (
    <section
      className={cn('bg-card overflow-hidden rounded-2xl border', className)}
    >
      <div className="border-b px-4 py-3">
        <p className="text-muted-foreground font-mono text-[9px] tracking-[0.14em] uppercase">
          {previewLabel}
        </p>
        <FormulaTypeset formula={formula} />
      </div>
      <div className="bg-muted/20 aspect-[2/1] min-h-52 overflow-hidden">
        <svg
          viewBox="0 0 720 360"
          className="size-full"
          role="img"
          aria-label={previewLabel}
        >
          <defs>
            <pattern
              id="formula-preview-grid"
              width="52"
              height="34"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M52 0H0V34"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.075"
              />
            </pattern>
          </defs>
          <rect width="720" height="360" fill="url(#formula-preview-grid)" />
          <path
            d="M52 180H668M360 24V336"
            stroke="currentColor"
            strokeOpacity="0.24"
          />
          {type === 'function' && (
            <FunctionPlot formula={formula} integral={false} />
          )}
          {type === 'integral' && <FunctionPlot formula={formula} integral />}
          {type === 'series' && <SeriesPlot formula={formula} />}
          {type === 'matrix' && <MatrixPlot formula={formula} />}
        </svg>
      </div>
    </section>
  );
}
