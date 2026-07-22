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
      className="bg-[#001e2b] px-4 py-20 text-white sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-[#00ed64] uppercase">
            {m['landing.workflow.eyebrow']()}
          </p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-[-0.04em] sm:text-5xl">
            {m['landing.workflow.title']()}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            {m['landing.workflow.description']()}
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {STEPS.map(({ key, icon: Icon, number }) => (
            <article
              key={key}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-7 transition-colors hover:bg-white/[0.07] sm:p-8"
            >
              <span className="font-mono text-xs tracking-[0.16em] text-white/35">
                {number}
              </span>
              <div className="mt-10 flex size-11 items-center justify-center rounded-2xl bg-[#00ed64] text-[#001e2b]">
                <Icon className="size-5" strokeWidth={2} />
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight">
                {tDynamic(`landing.workflow.${key}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {tDynamic(`landing.workflow.${key}.description`)}
              </p>
              <div className="absolute right-0 bottom-0 size-28 translate-x-1/3 translate-y-1/3 rounded-full bg-[#00ed64]/0 blur-2xl transition-colors group-hover:bg-[#00ed64]/15" />
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-[#00ed64]/25 bg-[#00ed64]/[0.07] px-6 py-5 text-sm leading-6 text-white/65 sm:px-8">
          <span className="font-semibold text-[#00ed64]">
            {m['landing.workflow.status_label']()}
          </span>{' '}
          {m['landing.workflow.status_text']()}
        </div>
      </div>
    </section>
  );
}
