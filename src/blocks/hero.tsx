import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LivingCurve } from '@/components/living-curve';
import { ScrollCue } from '@/components/scroll-cue';
import { Typewriter } from '@/components/typewriter';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 sm:px-6">
      <div className="curvg-frame relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-6xl items-center">
        {/* 画框角落定位标记 */}
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />

        {/* 右侧点阵装饰底 + 活的曲线 */}
        <div className="absolute inset-y-0 right-0 left-[46%] hidden lg:block">
          <div className="curvg-dotmatrix absolute inset-8 opacity-50" />
          <LivingCurve
            color="#262ef2"
            secondaryColor="#201f32"
            renderStyle="hairline"
            className="absolute inset-0 h-full w-full"
          />
          <p className="curvg-meta pointer-events-none absolute top-8 right-8">
            fig. 01 — lissajous
          </p>
          <p className="curvg-success pointer-events-none absolute top-14 right-8 font-mono text-[11px]">
            ● render precision: 99.9%
          </p>
          <p className="text-primary pointer-events-none absolute right-8 bottom-14 font-mono text-xs">
            x(t) = sin(3t + π/2) · y(t) = sin(2t)
          </p>
        </div>

        {/* 左右分隔线 */}
        <div
          className="bg-border absolute inset-y-0 left-[46%] hidden w-px lg:block"
          aria-hidden
        />

        <div className="relative z-10 w-full px-6 py-14 sm:px-10 lg:w-[46%] lg:py-0">
          <p className="curvg-pill text-muted-foreground inline-flex items-center gap-2 px-3.5 py-1.5 font-mono text-xs">
            <span className="bg-primary size-1.5 rounded-full" aria-hidden />
            {m['landing.hero.eyebrow']()}
          </p>

          <h1 className="curvg-heading mt-7 text-5xl text-balance sm:text-6xl">
            {m['landing.hero.headline_prefix']()}{' '}
            <span className="text-primary block min-h-[1.05em]">
              <Typewriter words={[m['landing.hero.headline_accent']()]} />
            </span>
          </h1>

          <p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed text-pretty sm:text-lg">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/sign-up"
              className="curvg-btn-sharp inline-flex h-12 items-center gap-2 px-7 text-sm font-semibold"
            >
              {m['landing.hero.cta']()}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#gallery"
              className="text-muted-foreground hover:text-primary text-sm font-medium underline underline-offset-4 transition-colors"
            >
              {m['landing.hero.secondary']()}
            </a>
          </div>

          {/* 移动端：曲线在文字下方以块级呈现 */}
          <div className="relative mt-10 h-[300px] sm:h-[360px] lg:hidden">
            <div className="curvg-dotmatrix absolute inset-4 opacity-50" />
            <LivingCurve
              color="#262ef2"
              secondaryColor="#201f32"
              renderStyle="hairline"
              className="absolute inset-0 h-full w-full"
            />
            <p className="text-primary pointer-events-none absolute right-2 bottom-0 font-mono text-[10px]">
              x(t) = sin(3t + π/2) · y(t) = sin(2t)
            </p>
          </div>
        </div>

        <ScrollCue />
      </div>
    </section>
  );
}
