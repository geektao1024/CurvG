import {
  ArrowRight,
  Clapperboard,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { InteractiveSurface } from '@/components/interactive-surface';

export function UseCases() {
  const useCases = [
    {
      number: '01',
      icon: GraduationCap,
      title: m['landing.use_cases.educators.title'](),
      description: m['landing.use_cases.educators.description'](),
      tags: [
        m['landing.use_cases.educators.tag_1'](),
        m['landing.use_cases.educators.tag_2'](),
      ],
      cta: m['landing.use_cases.educators.cta'](),
    },
    {
      number: '02',
      icon: Lightbulb,
      title: m['landing.use_cases.learners.title'](),
      description: m['landing.use_cases.learners.description'](),
      tags: [
        m['landing.use_cases.learners.tag_1'](),
        m['landing.use_cases.learners.tag_2'](),
      ],
      cta: m['landing.use_cases.learners.cta'](),
    },
    {
      number: '03',
      icon: Clapperboard,
      title: m['landing.use_cases.creators.title'](),
      description: m['landing.use_cases.creators.description'](),
      tags: [
        m['landing.use_cases.creators.tag_1'](),
        m['landing.use_cases.creators.tag_2'](),
      ],
      cta: m['landing.use_cases.creators.cta'](),
    },
  ];

  return (
    <section id="use-cases">
      <div className="curvg-stage curvg-frame curvg-section-field relative px-6 py-20 sm:px-10 sm:py-28">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground flex items-center justify-center gap-2.5 font-mono text-sm">
            <span className="text-border select-none" aria-hidden>
              ‹‹
            </span>
            <span className="text-primary" aria-hidden>
              ∿
            </span>
            <span className="text-foreground font-medium">
              {m['landing.use_cases.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
          <h2 className="curvg-heading mt-5 text-4xl text-balance sm:text-5xl">
            {m['landing.use_cases.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
            {m['landing.use_cases.description']()}
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {useCases.map(
            ({ number, icon: Icon, title, description, tags, cta }) => (
              <InteractiveSurface
                key={title}
                className="border-border bg-card group hover:border-primary/20 overflow-hidden rounded-lg border p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_-40px_rgba(38,46,242,0.4)] sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="bg-accent text-primary flex size-11 items-center justify-center rounded-lg border">
                    <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="curvg-meta">case {number} / 03</span>
                </div>
                <h3 className="mt-7 text-xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="border-border bg-secondary text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href="/creator"
                  className="text-primary mt-8 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
                >
                  {cta}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </InteractiveSurface>
            )
          )}
        </div>
      </div>
    </section>
  );
}
