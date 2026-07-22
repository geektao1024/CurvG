import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

type Point = { x: number; y: number };

function createPath(
  pointAt: (t: number) => Point,
  start: number,
  end: number,
  samples = 280
) {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const t = start + (index / samples) * (end - start);
    const point = pointAt(t);
    const x = 160 + point.x * 118;
    const y = 108 - point.y * 82;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

const CURVES = [
  {
    key: 'lissajous',
    formula: 'x = sin(3t + π/2), y = sin(2t)',
    path: createPath(
      (t) => ({ x: Math.sin(3 * t + Math.PI / 2), y: Math.sin(2 * t) }),
      0,
      Math.PI * 2
    ),
    color: '#f2f0e6',
  },
  {
    key: 'rose',
    formula: 'r = cos(5θ)',
    path: createPath(
      (theta) => {
        const radius = Math.cos(5 * theta);
        return {
          x: radius * Math.cos(theta),
          y: radius * Math.sin(theta),
        };
      },
      0,
      Math.PI * 2
    ),
    color: '#e8c477',
  },
  {
    key: 'spirograph',
    formula: 'R = 5, r = 3, d = 2',
    path: createPath(
      (t) => ({
        x: ((5 - 3) * Math.cos(t) + 2 * Math.cos(((5 - 3) / 3) * t)) / 4,
        y: ((5 - 3) * Math.sin(t) - 2 * Math.sin(((5 - 3) / 3) * t)) / 4,
      }),
      0,
      Math.PI * 6
    ),
    color: '#7dd8c0',
  },
  {
    key: 'fourier',
    formula: 'y = sin(x) + sin(3x)/3 + sin(5x)/5',
    path: createPath(
      (t) => ({
        x: t / Math.PI - 1,
        y: (Math.sin(t) + Math.sin(3 * t) / 3 + Math.sin(5 * t) / 5) / 1.45,
      }),
      0,
      Math.PI * 2
    ),
    color: '#8a9589',
  },
] as const;

export function CurveGallery() {
  return (
    <section id="gallery" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {m['landing.gallery.eyebrow']()}
            </p>
            <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.04em] sm:text-5xl">
              {m['landing.gallery.title']()}
            </h2>
          </div>
          <p className="text-muted-foreground max-w-2xl text-base leading-7 lg:justify-self-end lg:text-lg">
            {m['landing.gallery.description']()}
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {CURVES.map((curve) => (
            <article
              key={curve.key}
              className="border-border bg-card group overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,0.6)]"
            >
              <div className="relative h-64 overflow-hidden bg-[#0c1310]">
                <svg
                  viewBox="0 0 320 216"
                  role="img"
                  aria-label={tDynamic(`landing.gallery.${curve.key}.aria`)}
                  className="absolute inset-0 size-full"
                >
                  <defs>
                    <pattern
                      id={`grid-${curve.key}`}
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M24 0H0V24"
                        fill="none"
                        stroke="rgba(242,240,230,0.06)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect
                    width="320"
                    height="216"
                    fill={`url(#grid-${curve.key})`}
                  />
                  <path
                    d={curve.path}
                    fill="none"
                    stroke={curve.color}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="transition-[stroke-width] duration-300 group-hover:[stroke-width:3.2]"
                  />
                </svg>
                <span className="absolute top-4 left-4 rounded-full border border-white/10 bg-black/20 px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-white/65 uppercase backdrop-blur">
                  {tDynamic(`landing.gallery.${curve.key}.tag`)}
                </span>
              </div>
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">
                      {tDynamic(`landing.gallery.${curve.key}.title`)}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {tDynamic(`landing.gallery.${curve.key}.description`)}
                    </p>
                  </div>
                  <ArrowUpRight className="text-muted-foreground mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <code className="bg-muted text-foreground/75 mt-5 block overflow-x-auto rounded-xl px-4 py-3 text-xs">
                  {curve.formula}
                </code>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
