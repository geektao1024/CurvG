import { ArrowUpRight, Spline } from 'lucide-react';

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
    color: '#4f4ee6',
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
    color: '#191b3a',
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
    color: '#7a79f0',
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
    color: '#9ba0c0',
  },
] as const;

export function CurveGallery() {
  return (
    <section id="gallery" className="px-4 sm:px-6">
      <div className="curvg-frame relative mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        {/* 居中章节徽章 */}
        <div className="flex justify-center">
          <p className="text-muted-foreground flex items-center gap-2.5 font-mono text-sm">
            <span className="text-border select-none" aria-hidden>
              ‹‹
            </span>
            <Spline className="text-primary size-4" aria-hidden />
            <span className="text-foreground font-medium">
              {m['landing.gallery.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
        </div>

        <h2 className="mx-auto mt-5 max-w-2xl text-center text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          {m['landing.gallery.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-center text-base leading-relaxed sm:text-lg">
          {m['landing.gallery.description']()}
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {CURVES.map((curve) => (
            <article
              key={curve.key}
              className="border-border bg-card group overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-36px_rgba(25,27,58,0.4)]"
            >
              <div className="bg-secondary relative h-64 overflow-hidden">
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
                        stroke="rgba(25,27,58,0.07)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect
                    width="320"
                    height="216"
                    fill={`url(#grid-${curve.key})`}
                  />
                  {/* 坐标纸四角注册标记 */}
                  <path
                    d="M14 20h12M20 14v12 M306 20h-12M300 14v12 M14 196h12M20 202v-12 M306 196h-12M300 202v-12"
                    fill="none"
                    stroke="rgba(25,27,58,0.16)"
                    strokeWidth="1"
                    strokeLinecap="round"
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
                <span className="border-border bg-card/80 text-muted-foreground absolute top-4 left-4 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.14em] uppercase backdrop-blur">
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
                  <ArrowUpRight className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <code className="bg-muted text-foreground/75 border-border mt-5 block overflow-x-auto rounded-lg border px-4 py-3 font-mono text-xs">
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
