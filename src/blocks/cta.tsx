import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

export function CTA() {
  return (
    <section className="px-4 sm:px-6">
      <div className="curvg-frame relative mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-24">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <span className="curvg-corner bottom-5 left-5" aria-hidden />
        <span className="curvg-corner right-5 bottom-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        <div className="relative overflow-hidden rounded-2xl bg-[#201f32] px-6 py-14 text-center text-[#f3f3f9] sm:px-10 sm:py-20">
          <div className="curvg-cta-grid pointer-events-none absolute inset-0" />
          <p className="relative font-mono text-xs font-semibold tracking-[0.18em] text-[#f3f3f9]/60 uppercase">
            {m['landing.cta.eyebrow']()}
          </p>
          <h2 className="curvg-heading relative mx-auto mt-4 max-w-3xl text-4xl text-balance sm:text-5xl lg:text-6xl">
            {m['landing.cta.headline']()}
          </h2>
          <p className="relative mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#f3f3f9]/65 sm:text-lg">
            {m['landing.cta.subheadline']()}
          </p>
          <div className="relative mt-9 flex justify-center">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'curvg-btn-sharp h-12 gap-2 px-8'
              )}
            >
              {m['landing.cta.button']()}
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <p className="curvg-meta relative mt-8 text-[#f3f3f9]/40">
            manim runtime · deterministic render · export mp4 / gif / webm
          </p>
        </div>
      </div>
    </section>
  );
}
