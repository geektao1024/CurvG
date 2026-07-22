import { ArrowRight, CirclePlay, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { LivingCurve } from '@/components/living-curve';
import { buttonVariants } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      <div className="curvg-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-[520px] max-w-6xl" />

      {/* 左文右曲线：移动端纵向堆叠（文字在上、曲线在下） */}
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="max-w-2xl">
          <div className="border-primary/40 bg-primary/10 text-foreground inline-flex items-center gap-2 rounded-full border border-dashed px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="text-primary size-3.5" />
            {m['landing.hero.eyebrow']()}
          </div>

          <h1 className="mt-7 font-serif text-5xl leading-[1.08] text-balance italic sm:text-6xl">
            {m['landing.hero.headline_prefix']()}{' '}
            <span className="text-primary">
              {m['landing.hero.headline_accent']()}
            </span>
          </h1>
          <p className="text-muted-foreground mt-7 max-w-xl text-lg leading-relaxed text-pretty sm:text-xl">
            {m['landing.hero.subheadline']()}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-lg px-7 text-sm font-semibold'
              )}
            >
              {m['landing.hero.cta']()}
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#gallery"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'border-border h-12 gap-2 rounded-lg border-2 border-dashed px-7 text-sm font-semibold'
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

        {/* 黑板画布：活的粉笔曲线（签名交互 L1） */}
        <div className="border-border bg-card relative overflow-hidden rounded-2xl border-2 border-dashed p-1.5">
          <div className="border-border relative overflow-hidden rounded-xl border bg-[#0c1310]">
            <div className="border-border flex items-center justify-between border-b px-4 py-3 sm:px-5">
              <p className="text-primary font-mono text-[10px] tracking-[0.18em] uppercase sm:text-xs">
                {m['landing.hero.preview_label']()}
              </p>
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase sm:text-xs">
                {m['landing.hero.preview_status']()}
              </span>
            </div>

            <div className="relative min-h-[340px] sm:min-h-[420px]">
              <LivingCurve
                color="#f2f0e6"
                secondaryColor="#e8c477"
                renderStyle="chalk"
                className="absolute inset-0 h-full w-full"
              />
              {/* 手写风公式标注（黑板宇宙手迹词汇表） */}
              <p className="text-accent/90 pointer-events-none absolute bottom-4 left-5 -rotate-1 font-mono text-xs">
                x(t) = sin(3t + π/2) · y(t) = sin(2t)
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
