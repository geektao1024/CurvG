import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LivingCurve } from '@/components/living-curve';
import { ScrollCue } from '@/components/scroll-cue';

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-4rem)] items-center overflow-hidden">
      {/* 黑板质感：板擦痕般的极淡光晕（薄荷 + 琥珀） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 75% 25%, rgba(125,216,192,0.05), transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(232,196,119,0.04), transparent 50%)',
        }}
      />

      {/* 粉笔残迹：上一堂课没擦干净的数学符号，极淡 */}
      <div
        aria-hidden
        className="text-foreground pointer-events-none absolute inset-0 -z-10 font-serif italic select-none"
      >
        <span className="absolute top-[14%] left-[6%] -rotate-12 text-2xl opacity-[0.05]">
          ∫
        </span>
        <span className="absolute top-[68%] left-[3%] rotate-6 text-lg opacity-[0.045]">
          π
        </span>
        <span className="absolute top-[24%] right-[8%] rotate-12 text-xl opacity-[0.05]">
          ∂
        </span>
        <span className="absolute right-[28%] bottom-[12%] -rotate-6 text-lg opacity-[0.04]">
          Σ
        </span>
      </div>

      {/* 活的粉笔曲线：铺满右侧大半黑板，延伸到标题后方 */}
      <div className="absolute inset-y-0 right-0 left-0 hidden lg:left-[26%] lg:block">
        <LivingCurve
          color="#f2f0e6"
          secondaryColor="#e8c477"
          renderStyle="chalk"
          className="h-full w-full opacity-90"
        />
        {/* 手写风公式标注 */}
        <p className="text-accent/80 pointer-events-none absolute right-8 bottom-16 rotate-1 font-mono text-xs">
          x(t) = sin(3t + π/2) · y(t) = sin(2t)
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="relative z-10 max-w-xl py-12 lg:py-0">
          <p className="bg-accent/15 text-accent inline-block -rotate-1 rounded px-3 py-1 font-mono text-xs">
            {m['landing.hero.eyebrow']()}
          </p>

          <h1 className="mt-6 font-serif text-5xl leading-[1.12] text-balance italic sm:text-6xl">
            {m['landing.hero.headline_prefix']()}{' '}
            <span className="text-primary curvg-chalk-underline">
              {m['landing.hero.headline_accent']()}
            </span>
          </h1>

          <p className="text-muted-foreground mt-6 max-w-md text-base leading-relaxed text-pretty sm:text-lg">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground inline-flex h-12 items-center gap-2 rounded-lg px-7 text-sm font-semibold transition-transform hover:scale-[1.02] hover:-rotate-1"
            >
              {m['landing.hero.cta']()}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#gallery"
              className="text-muted-foreground hover:text-foreground font-mono text-sm underline decoration-dashed underline-offset-4 transition-colors"
            >
              {m['landing.hero.secondary']()}
            </a>
          </div>

          {/* 移动端：曲线在文字下方以块级呈现 */}
          <div className="relative mt-10 h-[300px] sm:h-[360px] lg:hidden">
            <LivingCurve
              color="#f2f0e6"
              secondaryColor="#e8c477"
              renderStyle="chalk"
              className="absolute inset-0 h-full w-full opacity-90"
            />
            <p className="text-accent/80 pointer-events-none absolute right-2 bottom-0 rotate-1 font-mono text-[10px]">
              x(t) = sin(3t + π/2) · y(t) = sin(2t)
            </p>
          </div>
        </div>
      </div>

      <ScrollCue />
    </section>
  );
}
