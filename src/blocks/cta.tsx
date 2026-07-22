import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { buttonVariants } from '@/components/ui/button';

export function CTA() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="bg-primary text-primary-foreground relative overflow-hidden rounded-2xl px-6 py-14 text-center sm:px-10 sm:py-20">
          <div className="curvg-cta-grid pointer-events-none absolute inset-0 opacity-35" />
          <p className="relative font-mono text-xs font-semibold tracking-[0.18em] uppercase">
            <span className="opacity-60">§ 03 ·</span>{' '}
            {m['landing.cta.eyebrow']()}
          </p>
          <h2 className="relative mx-auto mt-4 max-w-3xl font-serif text-4xl leading-[1.1] text-balance italic sm:text-5xl lg:text-6xl">
            {m['landing.cta.headline']()}
          </h2>
          <p className="text-primary-foreground/70 relative mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.cta.subheadline']()}
          </p>
          <div className="relative mt-9 flex justify-center">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'h-12 gap-2 rounded-lg bg-[#101815] px-8 text-[#f2f0e6] hover:bg-[#101815]/85'
              )}
            >
              {m['landing.cta.button']()}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
