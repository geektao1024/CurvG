import { ArrowRight, BookOpen, CircleCheck, WandSparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function ResourceLinks() {
  const resources = [
    {
      icon: WandSparkles,
      title: m['landing.resources.creator.title'](),
      description: m['landing.resources.creator.description'](),
      cta: m['landing.resources.creator.cta'](),
      href: '/creator',
    },
    {
      icon: BookOpen,
      title: m['landing.resources.guide.title'](),
      description: m['landing.resources.guide.description'](),
      cta: m['landing.resources.guide.cta'](),
      href: '/blog/ai-manim-animation-workflow',
    },
    {
      icon: CircleCheck,
      title: m['landing.resources.plans.title'](),
      description: m['landing.resources.plans.description'](),
      cta: m['landing.resources.plans.cta'](),
      href: '/pricing',
    },
  ];

  return (
    <section aria-labelledby="resource-links-title">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative border-t">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
            {m['landing.resources.eyebrow']()}
          </p>
          <h2
            id="resource-links-title"
            className="curvg-heading mt-5 text-4xl text-balance sm:text-5xl"
          >
            {m['landing.resources.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
            {m['landing.resources.description']()}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3">
          {resources.map(({ icon: Icon, title, description, cta, href }) => (
            <article
              key={href}
              className="border-border bg-card flex flex-col rounded-lg border p-7 sm:p-8"
            >
              <span className="bg-accent text-primary flex size-11 items-center justify-center rounded-lg border">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden />
              </span>
              <h3 className="mt-7 text-xl font-semibold tracking-tight">
                {title}
              </h3>
              <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">
                {description}
              </p>
              <Link
                href={href}
                className="text-primary mt-8 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
              >
                {cta}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
