import { ArrowRight, CirclePlay, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

function createLissajousPath() {
  return Array.from({ length: 241 }, (_, index) => {
    const t = (index / 240) * Math.PI * 2;
    const x = 360 + Math.sin(3 * t + Math.PI / 2) * 250;
    const y = 240 - Math.sin(2 * t) * 150;
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

const LISSAJOUS_PATH = createLissajousPath();

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      <div className="curvg-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-6xl" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
        <div className="max-w-2xl">
          <div className="border-primary/30 bg-primary/10 text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="text-primary size-3.5" />
            {m['landing.hero.eyebrow']()}
          </div>

          <h1 className="mt-7 text-5xl leading-[0.98] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
            {m['landing.hero.headline_prefix']()}{' '}
            <span className="text-primary">
              {m['landing.hero.headline_accent']()}
            </span>
          </h1>
          <p className="text-muted-foreground mt-7 max-w-xl text-lg leading-8 sm:text-xl">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-full px-7 text-sm font-semibold'
              )}
            >
              {m['landing.hero.cta']()}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#gallery"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'h-12 gap-2 rounded-full px-7 text-sm font-semibold'
              )}
            >
              <CirclePlay className="size-4" />
              {m['landing.hero.secondary']()}
            </a>
          </div>

          <p className="text-muted-foreground mt-5 text-xs leading-5">
            {m['landing.hero.disclosure']()}
          </p>
        </div>

        <div className="border-foreground/10 relative overflow-hidden rounded-[1.75rem] border bg-[#001e2b] p-3 shadow-[0_32px_80px_-28px_rgba(0,30,43,0.55)] sm:p-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#062d3a]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#ff6b6b]" />
                <span className="size-2.5 rounded-full bg-[#ffd166]" />
                <span className="size-2.5 rounded-full bg-[#00ed64]" />
              </div>
              <span className="font-mono text-[10px] tracking-[0.18em] text-white/45 uppercase sm:text-xs">
                {m['landing.hero.preview_status']()}
              </span>
            </div>

            <div className="grid sm:grid-cols-[0.42fr_0.58fr]">
              <div className="border-b border-white/10 p-5 sm:border-r sm:border-b-0 sm:p-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-[#00ed64] uppercase">
                  {m['landing.hero.preview_label']()}
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                  {m['landing.hero.preview_title']()}
                </h2>
                <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-xs leading-6 text-white/75">
                  <p>
                    <span className="text-[#00ed64]">x(t)</span> = sin(3t + π/2)
                  </p>
                  <p>
                    <span className="text-[#00ed64]">y(t)</span> = sin(2t)
                  </p>
                  <p className="mt-3 text-white/35">0 ≤ t ≤ 2π</p>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-white/45">
                  <span className="size-1.5 rounded-full bg-[#00ed64] shadow-[0_0_12px_#00ed64]" />
                  {m['landing.hero.preview_note']()}
                </div>
              </div>

              <div className="relative min-h-[330px] overflow-hidden bg-[#001e2b]">
                <svg
                  viewBox="0 0 720 480"
                  role="img"
                  aria-label={m['landing.hero.preview_aria']()}
                  className="absolute inset-0 size-full"
                >
                  <defs>
                    <pattern
                      id="hero-grid"
                      width="48"
                      height="48"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M48 0H0V48"
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1"
                      />
                    </pattern>
                    <filter
                      id="hero-glow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="720" height="480" fill="url(#hero-grid)" />
                  <path
                    d="M80 240H640M360 54V426"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1"
                  />
                  <path
                    d={LISSAJOUS_PATH}
                    pathLength="1"
                    fill="none"
                    stroke="#00ed64"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                    filter="url(#hero-glow)"
                    className="curvg-curve-draw"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
