import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { LabPlayground } from '@/components/lab-playground';
import { LabSearch } from '@/components/lab-search';
import {
  getLab,
  labBoard,
  labPath,
  labSearchEntries,
  labVideoHref,
  publicLabs,
  publicSubjects,
  type Lab,
} from '@/content/labs';

/** Boards the hero cycles through: each has a handle worth dragging. */
const PLAYGROUND = [
  'derivative-tangent-slope',
  'projectile-motion',
  'unit-circle-sine',
  'conic-sections-eccentricity',
];

/** Quick picks under the search box. */
const POPULAR = [
  'derivative-tangent-slope',
  'projectile-motion',
  'unit-circle-sine',
  'uniform-acceleration-vt',
  'conic-sections-eccentricity',
];

const resolve = (slugs: string[]) =>
  slugs
    .map((slug) => getLab(slug))
    .filter((lab): lab is Lab => lab?.publication === 'public');

/**
 * Homepage first screen (docs/SITE_ARCHITECTURE_PLAN.md, 2026-10-12): the
 * tool itself. Left: what CurvG is and a knowledge-point search. Right: a
 * live lab, with both tracks one click away (full lab / make a video).
 */
export function HomeHero() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const items = resolve(PLAYGROUND).map((lab) => ({
    slug: lab.slug,
    tab: lab.chapterTitle[lang],
    title: lab.title[lang],
    question: lab.question[lang],
    board: labBoard(lab, lang),
    href: labPath(lab),
    videoHref: labVideoHref(lab, lang),
    ariaLabel: m['labs.board.aria']({ title: lab.title[lang] }),
  }));
  const subjects = publicSubjects()
    .map((subject) => subject.name[lang])
    .join(lang === 'zh' ? '、' : ' & ');
  const stats = [
    m['home.hero.stat_labs']({ count: publicLabs().length }),
    subjects,
    m['home.hero.stat_free'](),
  ];

  return (
    <section className="relative isolate overflow-hidden">
      <div className="curvg-stage curvg-frame relative border-b">
        <span className="curvg-corner top-3 left-3" aria-hidden />
        <span className="curvg-corner top-3 right-3" aria-hidden />
        <div className="grid items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14 lg:py-16">
          <div>
            <p className="curvg-pill text-muted-foreground inline-flex items-center gap-2 px-3.5 py-1.5 font-mono text-xs">
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              {m['home.hero.eyebrow']()}
            </p>
            <h1 className="curvg-heading mt-6 text-[clamp(2.4rem,4.2vw,3.4rem)] leading-[1.08] text-balance">
              <span className="block">{m['home.hero.title_prefix']()}</span>
              <span className="text-primary block">
                {m['home.hero.title_accent']()}
              </span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-base leading-relaxed text-pretty sm:text-lg">
              {m['home.hero.subtitle']()}
            </p>
            <div className="mt-8 max-w-lg">
              <LabSearch
                items={labSearchEntries(lang)}
                label={m['home.hero.search_label']()}
                placeholder={m['home.hero.search_placeholder']()}
                emptyLabel={m['home.hero.search_empty']()}
                popular={resolve(POPULAR).map((lab) => ({
                  label: lab.chapterTitle[lang],
                  href: labPath(lab),
                }))}
              />
            </div>
            <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs tracking-[0.04em]">
              {stats.map((stat) => (
                <li key={stat} className="inline-flex items-center gap-2">
                  <span className="bg-brand size-1 rounded-full" aria-hidden />
                  {stat}
                </li>
              ))}
            </ul>
          </div>
          <LabPlayground
            items={items}
            tabsLabel={m['home.hero.tabs_label']()}
            openLabel={m['home.hero.open']()}
            videoLabel={m['home.hero.video']()}
            dragHint={m['home.hero.drag_hint']()}
          />
        </div>
      </div>
    </section>
  );
}
