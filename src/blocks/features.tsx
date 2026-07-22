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
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
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
              className="group border-border bg-card hover:bg-secondary relative overflow-hidden rounded-2xl border-2 border-dashed p-7 transition-colors sm:p-8"
            >
              <span className="text-muted-foreground font-mono text-xs tracking-[0.16em]">
                {number}
              </span>
              <div className="bg-primary text-primary-foreground mt-10 flex size-11 items-center justify-center rounded-xl">
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
