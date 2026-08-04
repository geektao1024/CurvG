import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';
import { defaultValues, type CurveDef } from '@/content/curves';
import type { CurvePoints } from '@/content/curves/types';

const VIEW_W = 720;
const VIEW_H = 540;
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
      box = boxOf(curve.sample(values), box);
    } catch {
      // Skip corner combinations the sampler cannot evaluate.
    }
  }
  return box ?? { minX: -1, maxX: 1, minY: -1, maxY: 1 };
}

function fitTransform(box: Box) {
  const spanX = Math.max(box.maxX - box.minX, 1e-9);
  const spanY = Math.max(box.maxY - box.minY, 1e-9);
  const scale = Math.min(
    (VIEW_W * (1 - 2 * PAD)) / spanX,
    (VIEW_H * (1 - 2 * PAD)) / spanY
  );
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;
  return (x: number, y: number): [number, number] => [
    VIEW_W / 2 + (x - midX) * scale,
    // SVG y grows downward; curve space y grows upward.
    VIEW_H / 2 - (y - midY) * scale,
  ];
}

function toPaths(
  polylines: CurvePoints,
  transform: (x: number, y: number) => [number, number],
  maxPoints?: number
): string[] {
  return polylines.map((line) => {
    const step = maxPoints
      ? Math.max(1, Math.ceil(line.length / maxPoints))
      : 1;
    let d = '';
    for (let index = 0; index < line.length; index += step) {
      const [x, y] = transform(line[index][0], line[index][1]);
      d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    if (step > 1 && (line.length - 1) % step !== 0 && line.length > 1) {
      const [x, y] = transform(
        line[line.length - 1][0],
        line[line.length - 1][1]
      );
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  });
}

function CurveSvg({
  paths,
  origin,
  ariaLabel,
  className,
}: {
  paths: string[];
  origin?: [number, number];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn('size-full', className)}
      role="img"
      aria-label={ariaLabel}
    >
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
      {paths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={index === 0 && paths.length > 1 ? 1.6 : 2.6}
          strokeOpacity={index === 0 && paths.length > 1 ? 0.45 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
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
    const transform = fitTransform(boxOf(polylines));
    return {
      paths: toPaths(polylines, transform, 170),
      origin: transform(0, 0),
    };
  }, [curve]);
  return (
    <CurveSvg
      paths={paths}
      origin={origin}
      ariaLabel={ariaLabel}
      className={className}
    />
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
}: {
  curve: CurveDef;
  locale: string;
  parametersLabel: string;
  resetLabel: string;
  ariaLabel: string;
}) {
  const defaults = useMemo(() => defaultValues(curve), [curve]);
  const [values, setValues] = useState<Record<string, number>>(defaults);
  const frame = useMemo(
    () => (curve.fitMode === 'fixed' ? fixedFrame(curve) : undefined),
    [curve]
  );

  const { paths, origin } = useMemo(() => {
    const polylines = curve.sample(values);
    const transform = fitTransform(frame ?? boxOf(polylines));
    return { paths: toPaths(polylines, transform), origin: transform(0, 0) };
  }, [curve, values, frame]);

  const isDefault = curve.params.every(
    (param) => values[param.key] === defaults[param.key]
  );

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="bg-muted/20 aspect-[4/3]">
        <CurveSvg paths={paths} origin={origin} ariaLabel={ariaLabel} />
      </div>
      <div className="border-t px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            {parametersLabel}
          </p>
          <button
            type="button"
            onClick={() => setValues(defaults)}
            disabled={isDefault}
            className="text-primary text-xs font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {resetLabel}
          </button>
        </div>
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
                  setValues((current) => ({
                    ...current,
                    [param.key]: Number(event.target.value),
                  }))
                }
                className="accent-primary mt-1.5 block w-full"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
