import {
  Braces,
  Clapperboard,
  Container,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { InteractiveSurface } from '@/components/interactive-surface';

export function Features() {
  const steps: {
    key: string;
    icon: LucideIcon;
    number: string;
    title: string;
    description: string;
  }[] = [
    {
      key: 'describe',
      icon: Braces,
      number: '01',
      title: m['landing.workflow.describe.title'](),
      description: m['landing.workflow.describe.description'](),
    },
    {
      key: 'direct',
      icon: Clapperboard,
      number: '02',
      title: m['landing.workflow.direct.title'](),
      description: m['landing.workflow.direct.description'](),
    },
    {
      key: 'render',
      icon: Container,
      number: '03',
      title: m['landing.workflow.render.title'](),
      description: m['landing.workflow.render.description'](),
    },
  ];

  return (
    <section id="workflow">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        {/* 居中章节徽章 */}
        <div className="flex justify-center">
          <p className="text-muted-foreground flex items-center gap-2.5 font-mono text-sm">
            <span className="text-border select-none" aria-hidden>
              ‹‹
            </span>
            <Workflow className="text-primary size-4" aria-hidden />
            <span className="text-foreground font-medium">
              {m['landing.workflow.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
        </div>

        <h2 className="curvg-heading mx-auto mt-5 max-w-2xl text-center text-4xl text-balance sm:text-5xl">
          {m['landing.workflow.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-center text-base leading-relaxed sm:text-lg">
          {m['landing.workflow.description']()}
        </p>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3">
          {steps.map(({ key, icon: Icon, number, title, description }) => (
            <InteractiveSurface
              key={key}
              className="group border-border bg-card hover:border-primary/20 relative overflow-hidden rounded-lg border p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_-40px_rgba(38,46,242,0.4)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-lg">
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <span className="curvg-meta">
                  {m['landing.workflow.step_index']({ number })}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">
                {title}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {description}
              </p>
            </InteractiveSurface>
          ))}
        </div>

        <div className="border-primary/25 bg-accent/60 text-muted-foreground mt-5 rounded-xl border px-6 py-5 text-sm leading-relaxed sm:px-8">
          <span className="text-primary font-semibold">
            {m['landing.workflow.status_label']()}
          </span>{' '}
          {m['landing.workflow.status_text']()}
        </div>
      </div>
    </section>
  );
}
