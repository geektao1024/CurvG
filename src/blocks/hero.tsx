import { m } from '@/paraglide/messages.js';
import { LivingCurve } from '@/components/living-curve';
import { PixelRevealLink } from '@/components/pixel-reveal-link';

export function Hero() {
  const metrics = [
    {
      value: '01',
      label: m['landing.hero.metric_engine'](),
      borderClass: '',
    },
    {
      value: '02',
      label: m['landing.hero.metric_precision'](),
      borderClass: 'border-t sm:border-t-0 sm:border-l',
    },
    {
      value: '03',
      label: m['landing.hero.metric_formats'](),
      borderClass: 'border-t lg:border-t-0 lg:border-l',
    },
    {
      value: '04',
      label: m['landing.hero.metric_input'](),
      borderClass: 'border-t sm:border-l lg:border-t-0',
    },
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="curvg-stage curvg-frame relative">
        <div className="relative flex min-h-[600px] items-center border-b">
          {/* 画框角落定位标记 */}
          <span className="curvg-corner top-3 left-3" aria-hidden />
          <span className="curvg-corner top-3 right-3" aria-hidden />

          {/* 右侧点阵装饰底 + 活的曲线 */}
          <div className="absolute inset-y-0 right-0 left-1/2 hidden overflow-hidden lg:block">
            <div className="curvg-coordinate-grid absolute inset-0 opacity-80" />
            <div className="curvg-dotmatrix absolute inset-8 opacity-55" />
            <LivingCurve
              color="#262ef2"
              secondaryColor="#201f32"
              renderStyle="hairline"
              className="absolute inset-0 h-full w-full"
            />
            <p className="curvg-meta pointer-events-none absolute top-8 right-8">
              01 / {m['landing.hero.preview_label']()}
            </p>
            <p className="curvg-success pointer-events-none absolute top-14 right-8 font-mono text-[11px]">
              ● {m['landing.hero.preview_status']()}
            </p>
            <p className="text-primary pointer-events-none absolute right-8 bottom-14 font-mono text-xs">
              x(t) = sin(3t + π/2) · y(t) = sin(2t)
            </p>
          </div>

          {/* 左右分隔线 */}
          <div
            className="bg-border absolute inset-y-0 left-1/2 hidden w-px lg:block"
            aria-hidden
          />

          <div className="relative z-10 w-full px-6 py-16 sm:px-10 lg:w-1/2 lg:px-10 lg:py-0">
            <p className="curvg-pill text-muted-foreground inline-flex items-center gap-2 px-3.5 py-1.5 font-mono text-xs">
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              {m['landing.hero.eyebrow']()}
            </p>

            <h1 className="curvg-heading mt-7 text-[clamp(2.65rem,3.65vw,3.25rem)] leading-none text-balance">
              <span className="block">
                {m['landing.hero.headline_prefix']()}
              </span>
              <span className="text-primary block whitespace-normal">
                {m['landing.hero.headline_accent']()}
              </span>
              <span className="block">
                {m['landing.hero.headline_suffix']()}
              </span>
            </h1>

            <p className="text-muted-foreground mt-6 max-w-md text-base leading-[1.42] text-pretty sm:text-lg">
              {m['landing.hero.subheadline']()}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <PixelRevealLink
                href="/creator"
                label={m['landing.hero.cta']()}
              />
              <a
                href="#prompt-examples"
                className="text-muted-foreground hover:text-foreground decoration-border text-sm font-medium underline underline-offset-4 transition-colors"
              >
                {m['landing.hero.secondary']()}
              </a>
            </div>

            {/* 移动端：曲线在文字下方以块级呈现 */}
            <div className="relative mt-10 h-[300px] sm:h-[360px] lg:hidden">
              <div className="curvg-coordinate-grid absolute inset-0 opacity-80" />
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
        </div>

        <div className="grid border-b sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`flex min-h-24 items-center gap-4 px-6 py-5 sm:px-8 ${metric.borderClass}`}
            >
              <span className="curvg-heading text-primary text-xl">
                {metric.value}
              </span>
              <span className="text-muted-foreground max-w-32 text-sm leading-5">
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
