import { Braces, Clapperboard, Container, type LucideIcon } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';

const STEPS: { key: string; icon: LucideIcon; number: string }[] = [
  { key: 'describe', icon: Braces, number: '01' },
  { key: 'direct', icon: Clapperboard, number: '02' },
  { key: 'render', icon: Container, number: '03' },
];

export function Features() {
  return (
    <section
      id="workflow"
      className="bg-sidebar text-foreground px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-primary font-mono text-xs font-semibold tracking-[0.18em] uppercase">
            <span className="text-accent">§ 01</span>
            <span className="text-muted-foreground mx-2">·</span>
            {m['landing.workflow.eyebrow']()}
          </p>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-balance italic sm:text-5xl">
            {m['landing.workflow.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed sm:text-lg">
            {m['landing.workflow.description']()}
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {STEPS.map(({ key, icon: Icon, number }) => (
            <article
              key={key}
              className="group border-border bg-card hover:bg-secondary hover:border-accent/30 relative overflow-hidden rounded-2xl border-2 border-dashed p-7 transition-colors sm:p-8"
            >
              <span className="text-accent/70 font-mono text-xs tracking-[0.16em]">
                {number}
                <span className="bg-border ml-3 inline-block h-px w-8 align-middle" />
              </span>
              <div className="bg-primary text-primary-foreground mt-10 flex size-11 -rotate-2 items-center justify-center rounded-xl transition-transform group-hover:rotate-0">
                <Icon className="size-5" strokeWidth={2} />
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

        <div className="border-accent/40 bg-accent/10 text-muted-foreground mt-5 rounded-2xl border-2 border-dashed px-6 py-5 text-sm leading-relaxed sm:px-8">
          <span className="text-accent font-semibold">
            {m['landing.workflow.status_label']()}
          </span>{' '}
          {m['landing.workflow.status_text']()}
        </div>
      </div>
    </section>
  );
}
