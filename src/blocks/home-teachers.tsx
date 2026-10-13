import { Film, ListChecks, Maximize, PenLine } from 'lucide-react';

import { m } from '@/paraglide/messages.js';
import { SectionHeading } from '@/components/section-heading';

/** What a teacher gets from a lab page: teachers are the paying audience. */
export function HomeTeachers() {
  const items = [
    {
      icon: Maximize,
      title: m['home.teachers.present.title'](),
      body: m['home.teachers.present.body'](),
    },
    {
      icon: PenLine,
      title: m['home.teachers.pen.title'](),
      body: m['home.teachers.pen.body'](),
    },
    {
      icon: ListChecks,
      title: m['home.teachers.quiz.title'](),
      body: m['home.teachers.quiz.body'](),
    },
    {
      icon: Film,
      title: m['home.teachers.video.title'](),
      body: m['home.teachers.video.body'](),
    },
  ];

  return (
    <section id="teachers">
      <div className="curvg-stage curvg-frame curvg-section-spacing relative border-b">
        <SectionHeading
          eyebrow={m['home.teachers.eyebrow']()}
          title={m['home.teachers.title']()}
          description={m['home.teachers.description']()}
        />
        <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, body }) => (
            <li key={title} className="bg-card p-6">
              <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-base font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
