import { useMemo, useState } from 'react';

const VIEW_W = 720;
const VIEW_H = 420;
const X_MIN = -2.5;
const X_MAX = 2.5;
const Y_MIN = -0.8;
const Y_MAX = 4.2;

function mapX(x: number) {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * VIEW_W;
}

function mapY(y: number) {
  return ((Y_MAX - y) / (Y_MAX - Y_MIN)) * VIEW_H;
}

function curvePath(coefficient: number) {
  let d = '';
  const steps = 80;
  for (let index = 0; index <= steps; index += 1) {
    const x = X_MIN + ((X_MAX - X_MIN) * index) / steps;
    const y = coefficient * x * x;
    const command = index === 0 ? 'M' : 'L';
    d += `${command}${mapX(x).toFixed(1)} ${mapY(y).toFixed(1)}`;
  }
  return d;
}

export function ParabolaRiseStage({
  parameterLabel,
  resetLabel,
  matchesLabel,
  differsLabel,
  ariaLabel,
}: {
  parameterLabel: string;
  resetLabel: string;
  matchesLabel: string;
  differsLabel: string;
  ariaLabel: string;
}) {
  const [coefficient, setCoefficient] = useState(1);
  const path = useMemo(() => curvePath(coefficient), [coefficient]);
  const matchesClip = coefficient === 1;
  const sampleX = 1;
  const sampleY = coefficient * sampleX * sampleX;
  const sampleInside =
    sampleY >= Y_MIN &&
    sampleY <= Y_MAX &&
    sampleX >= X_MIN &&
    sampleX <= X_MAX;

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="bg-muted/20 relative aspect-[12/7]">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="text-foreground size-full"
          role="img"
          aria-label={ariaLabel}
        >
          <path
            d={`M${mapX(0)} 0V${VIEW_H} M0 ${mapY(0)}H${VIEW_W}`}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.28"
          />
          <path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {sampleInside ? (
            <circle
              cx={mapX(sampleX)}
              cy={mapY(sampleY)}
              r="4.5"
              fill="var(--primary)"
            />
          ) : null}
        </svg>
      </div>
      <div className="space-y-3 border-t px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="parabola-rise-a"
            className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            {parameterLabel}
          </label>
          <button
            type="button"
            onClick={() => setCoefficient(1)}
            disabled={matchesClip}
            className="text-primary text-xs font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            {resetLabel}
          </button>
        </div>
        <input
          id="parabola-rise-a"
          type="range"
          min={0.4}
          max={1.8}
          step={0.1}
          value={coefficient}
          onChange={(event) =>
            setCoefficient(Math.round(Number(event.target.value) * 10) / 10)
          }
          className="accent-primary w-full"
        />
        <p className="font-mono text-sm">
          a = {coefficient.toFixed(1)}
          <span className="text-muted-foreground"> · </span>
          (1, {sampleY.toFixed(1)})
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {matchesClip ? matchesLabel : differsLabel}
        </p>
      </div>
    </div>
  );
}
