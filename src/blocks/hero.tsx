import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LivingCurve } from '@/components/living-curve';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* 黑板质感：板擦痕般的极淡光晕（薄荷 + 琥珀） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 75% 25%, rgba(125,216,192,0.05), transparent 50%), radial-gradient(ellipse at 15% 85%, rgba(232,196,119,0.04), transparent 50%)',
        }}
      />

      {/* 左文右曲线：曲线无框，直接画在黑板上 */}
      <div className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6 lg:py-20">
        <div className="relative z-10 max-w-xl">
          <p className="bg-accent/15 text-accent inline-block -rotate-1 rounded px-3 py-1 font-mono text-xs">
            {m['landing.hero.eyebrow']()}
          </p>

          <h1 className="mt-6 font-serif text-5xl leading-[1.12] text-balance italic sm:text-6xl">
            {m['landing.hero.headline_prefix']()}{' '}
            <span className="text-primary">
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
        </div>

        {/* 活的粉笔曲线：无框、无卡片，偏右直接书写 */}
        <div className="relative h-[320px] sm:h-[420px] lg:h-[560px]">
          <LivingCurve
            color="#f2f0e6"
            secondaryColor="#e8c477"
            renderStyle="chalk"
            className="absolute inset-0 h-full w-full opacity-90"
          />
          {/* 手写风公式标注 */}
          <p className="text-accent/80 pointer-events-none absolute right-4 bottom-2 rotate-1 font-mono text-xs">
            x(t) = sin(3t + π/2) · y(t) = sin(2t)
          </p>
        </div>
      </div>
    </section>
  );
}
