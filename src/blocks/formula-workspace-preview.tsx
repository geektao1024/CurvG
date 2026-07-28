import { ArrowRight, Braces, CheckCircle2, Eye } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function FormulaWorkspacePreview() {
  const specificationItems = [
    {
      title: m['landing.workspace.spec_item_1_title'](),
      description: m['landing.workspace.spec_item_1_description'](),
    },
    {
      title: m['landing.workspace.spec_item_2_title'](),
      description: m['landing.workspace.spec_item_2_description'](),
    },
    {
      title: m['landing.workspace.spec_item_3_title'](),
      description: m['landing.workspace.spec_item_3_description'](),
    },
  ];

  return (
    <section id="workspace">
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
              {m['landing.workspace.eyebrow']()}
            </span>
            <span className="text-border select-none" aria-hidden>
              ››
            </span>
          </p>
          <h2 className="curvg-heading mt-5 text-4xl text-balance sm:text-5xl">
            {m['landing.workspace.title']()}
          </h2>
          <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
            {m['landing.workspace.description']()}
          </p>
        </div>

        <div className="bg-card mt-10 overflow-hidden rounded-lg border sm:mt-12">
          <div className="text-muted-foreground flex items-center justify-between border-b px-5 py-3 font-mono text-[11px] tracking-[0.12em] uppercase sm:px-6">
            <span>{m['landing.workspace.window_label']()}</span>
            <span className="flex items-center gap-2">
              <span
                className="size-1.5 rounded-full"
                style={{ background: 'var(--success)' }}
                aria-hidden
              />
              {m['landing.workspace.window_status']()}
            </span>
          </div>

          <div className="grid lg:grid-cols-3">
            <div className="border-b p-6 sm:p-7 lg:border-r lg:border-b-0">
              <p className="curvg-meta">
                {m['landing.workspace.input_label']()}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                {m['landing.workspace.input_title']()}
              </h3>
              <div className="bg-secondary text-foreground mt-5 rounded-md border px-4 py-4 font-mono text-sm leading-7">
                {m['landing.workspace.sample_prompt']()}
              </div>
              <p className="text-muted-foreground mt-4 text-sm leading-6">
                {m['landing.workspace.input_hint']()}
              </p>
              <div className="text-primary mt-6 flex items-center gap-2 text-xs font-medium">
                <CheckCircle2 className="size-4" aria-hidden />
                {m['landing.workspace.input_state']()}
              </div>
            </div>

            <div className="border-b p-6 sm:p-7 lg:border-r lg:border-b-0">
              <p className="curvg-meta">
                {m['landing.workspace.spec_label']()}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                {m['landing.workspace.spec_title']()}
              </h3>
              <ol className="mt-5 space-y-4">
                {specificationItems.map((item, index) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="text-primary font-mono text-xs">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-6">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="curvg-meta">
                    {m['landing.workspace.preview_label']()}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">
                    {m['landing.workspace.preview_title']()}
                  </h3>
                </div>
                <Eye className="text-primary size-5" aria-hidden />
              </div>
              <div className="bg-secondary relative mt-5 aspect-[16/9] overflow-hidden rounded-md border">
                <svg
                  viewBox="0 0 320 180"
                  className="text-foreground absolute inset-0 size-full"
                  role="img"
                  aria-label={m['landing.workspace.preview_aria']()}
                >
                  <defs>
                    <pattern
                      id="workspace-preview-grid"
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M24 0H0V24"
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.08"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect
                    width="320"
                    height="180"
                    fill="url(#workspace-preview-grid)"
                  />
                  <path
                    d="M24 90H296M160 18V162"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.22"
                    strokeDasharray="3 4"
                  />
                  <path
                    d="M160 90C185 70 208 41 222 39C239 36 234 68 212 92C190 116 167 135 141 133C113 131 101 107 116 84C128 65 145 62 160 90C179 125 203 141 220 129C235 119 225 95 202 90C180 85 163 87 160 90Z"
                    fill="none"
                    stroke="var(--primary)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <circle cx="222" cy="39" r="3.5" fill="currentColor" />
                </svg>
                <span className="text-primary absolute right-3 bottom-2 font-mono text-[10px]">
                  f(t) → scene
                </span>
              </div>
              <div className="mt-5 overflow-hidden rounded-md bg-[#201f32] px-4 py-3 font-mono text-[11px] leading-5 text-[#f3f3f9]/80">
                <p className="text-[#f3f3f9]/45">scene.py</p>
                <p>curve = ParametricFunction(f)</p>
                <p>self.play(Create(curve))</p>
              </div>
            </div>
          </div>

          <div className="text-muted-foreground flex flex-col gap-4 border-t px-6 py-5 text-sm leading-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p>{m['landing.workspace.status_note']()}</p>
            <Link
              href="/creator"
              className="text-primary inline-flex shrink-0 items-center gap-2 font-medium underline underline-offset-4"
            >
              {m['landing.workspace.cta']()}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
