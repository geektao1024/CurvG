import { ArrowRight, Check, Eye, SlidersHorizontal } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';

export function WhyCurvG() {
  const clarityItems = [
    {
      title: m['landing.why.clarity.item_1_title'](),
      description: m['landing.why.clarity.item_1_description'](),
    },
    {
      title: m['landing.why.clarity.item_2_title'](),
      description: m['landing.why.clarity.item_2_description'](),
    },
    {
      title: m['landing.why.clarity.item_3_title'](),
      description: m['landing.why.clarity.item_3_description'](),
    },
  ];
  const controlItems = [
    {
      title: m['landing.why.control.item_1_title'](),
      description: m['landing.why.control.item_1_description'](),
    },
    {
      title: m['landing.why.control.item_2_title'](),
      description: m['landing.why.control.item_2_description'](),
    },
    {
      title: m['landing.why.control.item_3_title'](),
      description: m['landing.why.control.item_3_description'](),
    },
  ];

  const cards = [
    {
      icon: Eye,
      title: m['landing.why.clarity.title'](),
      badge: m['landing.why.clarity.badge'](),
      items: clarityItems,
    },
    {
      icon: SlidersHorizontal,
      title: m['landing.why.control.title'](),
      badge: m['landing.why.control.badge'](),
      items: controlItems,
    },
  ];

  return (
    <section id="features">
      <div className="curvg-stage curvg-frame relative border-t px-6 py-20 sm:px-10 sm:py-28">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />

        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start">
          <div className="max-w-xl">
            <p className="text-primary font-mono text-xs font-semibold tracking-[0.16em] uppercase">
              {m['landing.why.eyebrow']()}
            </p>
            <h2 className="curvg-heading mt-5 text-4xl text-balance sm:text-5xl">
              <span className="block sm:inline">
                {m['landing.why.title_line_1']()}
              </span>
              <span className="block sm:inline">
                {m['landing.why.title_line_2']()}
              </span>
              <span className="block sm:inline">
                {m['landing.why.title_line_3']()}
              </span>
            </h2>
            <p className="text-muted-foreground mt-5 text-base leading-relaxed sm:text-lg">
              {m['landing.why.description']()}
            </p>
            <Link
              href="/creator"
              className="text-primary mt-8 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
            >
              {m['landing.why.cta']()}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(({ icon: Icon, title, badge, items }) => (
              <article
                key={title}
                className="bg-card rounded-lg border p-6 sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-lg border">
                      <Icon className="size-5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {title}
                    </h3>
                  </div>
                  <span className="bg-accent text-primary shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] tracking-[0.08em]">
                    {badge}
                  </span>
                </div>
                <ul className="mt-7 space-y-6">
                  {items.map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                        <Check
                          className="size-3"
                          strokeWidth={2.4}
                          aria-hidden
                        />
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground mt-1 text-sm leading-6">
                          {item.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
