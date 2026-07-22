import {
  Braces,
  Clapperboard,
  Container,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

const STEPS: { key: string; icon: LucideIcon; number: string }[] = [
  { key: 'describe', icon: Braces, number: '01' },
  { key: 'direct', icon: Clapperboard, number: '02' },
  { key: 'render', icon: Container, number: '03' },
];

export function Features() {
  return (
    <section id="workflow" className="px-4 sm:px-6">
      <div className="curvg-frame relative mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
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

        <h2 className="mx-auto mt-5 max-w-2xl text-center text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">
          {m['landing.workflow.title']()}
        </h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-center text-base leading-relaxed sm:text-lg">
          {m['landing.workflow.description']()}
        </p>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {STEPS.map(({ key, icon: Icon, number }) => (
            <article
              key={key}
              className="group border-border bg-card relative overflow-hidden rounded-xl border p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(25,27,58,0.25)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <div className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-lg">
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <span className="text-muted-foreground/60 font-mono text-xs tracking-[0.16em]">
                  {number}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">
                {tDynamic(`landing.workflow.${key}.title`)}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {tDynamic(`landing.workflow.${key}.description`)}
              </p>
            </article>
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
