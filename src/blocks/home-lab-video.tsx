import { ArrowRight, Sparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { RichMath } from '@/components/rich-math';
import { SectionHeading } from '@/components/section-heading';
import { getLab, labPath, labVideoHref } from '@/content/labs';

/** The lab whose guide is shown, and a rendered sample of the same curve. */
const LAB = 'quadratic-transformations';
const SAMPLE = {
  src: '/videos/gallery/parabola-plot.mp4',
  poster: '/videos/gallery/parabola-plot-poster.webp',
};

/**
 * Homepage conversion band: a lab's guided steps beside a rendered video,
 * so the free lab and the paid video read as one thing. Swap SAMPLE for the
 * lab's own lesson video once production renders one (`lab.video`).
 */
export function HomeLabVideo() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const lab = getLab(LAB);
  if (!lab) return null;
  const video = lab.video ?? SAMPLE;

  return (
    <section id="lab-to-video">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative border-b">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <SectionHeading
          eyebrow={m['home.video.eyebrow']()}
          title={m['home.video.title']()}
          description={m['home.video.description']()}
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="bg-card rounded-2xl border p-5 sm:p-6">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.14em] uppercase">
              {m['home.video.steps_label']({ lab: lab.chapterTitle[lang] })}
            </p>
            <ol className="mt-4 space-y-4">
              {lab.guide.map((step, i) => (
                <li key={i} className="grid grid-cols-[auto_1fr] gap-x-4">
                  <span className="curvg-display text-primary text-2xl leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                      {step.title[lang]}
                      <span className="text-muted-foreground font-mono text-[10px] font-normal tracking-[0.12em] uppercase">
                        {m['home.video.shot']({ n: i + 1 })}
                      </span>
                    </p>
                    <RichMath
                      source={step.body[lang]}
                      className="text-muted-foreground mt-1 text-sm leading-relaxed"
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <figure className="flex flex-col">
            <div className="relative overflow-hidden rounded-2xl border bg-black">
              <video
                src={video.src}
                poster={video.poster}
                controls
                muted
                playsInline
                preload="none"
                aria-label={m['home.video.aria']()}
                className="aspect-video w-full"
              />
              <span className="bg-background/90 text-foreground pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px]">
                <span className="bg-brand size-1.5 rounded-full" aria-hidden />
                {m['home.video.sample_label']()}
              </span>
            </div>
            <figcaption className="text-muted-foreground mt-3 text-sm leading-relaxed">
              {m['home.video.sample_caption']()}
            </figcaption>
            <div className="mt-auto flex flex-wrap items-center gap-4 pt-6">
              <Link
                href={labVideoHref(lab, lang)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 group inline-flex h-11 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors"
              >
                <Sparkles className="size-4" aria-hidden />
                {m['home.video.cta']()}
              </Link>
              <Link
                href={labPath(lab)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
              >
                {m['home.video.secondary']()}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
