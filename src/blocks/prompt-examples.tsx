import { ArrowRight, Braces, Code2 } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { InteractiveSurface } from '@/components/interactive-surface';

export function PromptExamples() {
  const examples = [
    {
      number: '01',
      title: m['landing.prompts.linear_algebra.title'](),
      prompt: m['landing.prompts.linear_algebra.prompt'](),
      api: 'LinearTransformationScene',
    },
    {
      number: '02',
      title: m['landing.prompts.calculus.title'](),
      prompt: m['landing.prompts.calculus.prompt'](),
      api: 'ParametricFunction, always_redraw',
    },
    {
      number: '03',
      title: m['landing.prompts.geometry.title'](),
      prompt: m['landing.prompts.geometry.prompt'](),
      api: 'MathTex, TransformMatchingShapes',
    },
  ];

  return (
    <section id="prompt-examples">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="curvg-dotted-divider absolute inset-x-0 top-0" />

        <div className="mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground flex items-center justify-center gap-2.5 font-mono text-sm">
            <span className="text-border select-none" aria-hidden>
              ‹‹
            </span>
            <Braces className="text-primary size-4" aria-hidden />
            <span className="text-foreground font-medium">
              {m['landing.prompts.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
          <h2 className="curvg-heading mt-5 text-4xl text-balance sm:text-5xl">
            {m['landing.prompts.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
            {m['landing.prompts.description']()}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-3">
          {examples.map((example) => (
            <InteractiveSurface
              key={example.number}
              className="border-border bg-card group hover:border-primary/20 overflow-hidden rounded-lg border p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_46px_-40px_rgba(38,46,242,0.4)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="bg-accent text-primary flex size-11 items-center justify-center rounded-lg border">
                  <Code2 className="size-5" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="curvg-meta">
                  {m['landing.prompts.example_index']({
                    number: example.number,
                  })}
                </span>
              </div>
              <h3 className="mt-7 text-xl font-semibold tracking-tight">
                {example.title}
              </h3>
              <blockquote className="bg-secondary text-foreground/85 mt-5 rounded-md border px-4 py-4 text-sm leading-6">
                “{example.prompt}”
              </blockquote>
              <div className="mt-5">
                <p className="curvg-meta">{m['landing.prompts.api_label']()}</p>
                <code className="text-primary mt-2 block font-mono text-xs leading-5">
                  {example.api}
                </code>
              </div>
              <Link
                href="/creator"
                className="text-primary mt-7 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
              >
                {m['landing.prompts.cta']()}
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </InteractiveSurface>
          ))}
        </div>
      </div>
    </section>
  );
}
