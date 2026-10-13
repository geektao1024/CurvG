import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { MathTex } from '@/components/math-tex';
import {
  getPrimaryTrail,
  libraryText,
  type LibraryScene,
} from '@/content/library';

function formatSeconds(value: number) {
  return Number.isInteger(value) ? `${value}s` : `${value.toFixed(1)}s`;
}

export function PermutationsDetail({
  scene,
  locale,
}: {
  scene: LibraryScene;
  locale: 'en' | 'zh';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState(0);
  const creatorHref = `/creator?prompt=${encodeURIComponent(scene.prompt[locale])}`;

  function phaseAt(time: number) {
    let current = 0;
    scene.phases.forEach((step, index) => {
      if ((step.start ?? 0) <= time + 0.05) current = index;
    });
    return current;
  }

  function seek(index: number) {
    const video = videoRef.current;
    const start = scene.phases[index]?.start ?? 0;
    setPhase(index);
    if (!video) return;
    video.currentTime = start;
    void video.play().catch(() => undefined);
  }

  return (
    <article>
      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            href="/library"
            className="text-muted-foreground hover:text-primary font-mono text-xs tracking-[0.14em] uppercase"
          >
            {m['library.breadcrumb']()}
          </Link>
          {getPrimaryTrail(scene.primaryCategoryId).map(
            (category, index, trail) => (
              <span key={category.id} className="flex items-center gap-2">
                <span
                  className="text-muted-foreground font-mono text-xs"
                  aria-hidden
                >
                  /
                </span>
                <Link
                  href={
                    index === 0
                      ? `/library/${category.id}`
                      : `/library/${trail[0].id}/${category.id}`
                  }
                  className="text-muted-foreground hover:text-primary font-mono text-xs tracking-[0.14em] uppercase"
                >
                  {libraryText(category.title, locale)}
                </Link>
              </span>
            )
          )}
        </nav>
        <p className="text-primary mt-8 font-mono text-xs font-semibold tracking-[0.16em] uppercase">
          {m['library.scene.duration']({ seconds: scene.durationSeconds ?? 0 })}
        </p>
        <h1 className="curvg-heading mt-4 max-w-3xl text-4xl text-balance sm:text-5xl">
          {libraryText(scene.question, locale)}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
          {libraryText(scene.hook, locale)}
        </p>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
          <figure className="bg-card overflow-hidden rounded-2xl border">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={scene.video?.poster}
              className="bg-muted aspect-video w-full"
              onTimeUpdate={(event) =>
                setPhase(phaseAt(event.currentTarget.currentTime))
              }
            >
              {scene.video ? (
                <source src={scene.video.src} type="video/mp4" />
              ) : null}
            </video>
            <figcaption className="text-muted-foreground border-t px-5 py-4 text-sm leading-relaxed">
              {libraryText(scene.payoff, locale)}
            </figcaption>
          </figure>

          <div className="flex flex-col gap-4">
            {scene.equations.map((tex) => (
              <section
                key={tex}
                className="bg-card rounded-2xl border px-4 py-2"
              >
                <MathTex tex={tex} />
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <h2 className="curvg-heading text-2xl sm:text-3xl">
          {m['library.scene.phases']()}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          {m['library.scene.seek']()}
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="text-muted-foreground border-b font-mono text-[10px] tracking-[0.14em] uppercase">
                <th className="py-3 pr-4 font-medium">#</th>
                <th className="py-3 pr-4 font-medium">
                  {m['library.scene.phase_name']()}
                </th>
                <th className="py-3 pr-4 font-medium">
                  {m['library.scene.phase_time']()}
                </th>
                <th className="py-3 font-medium">
                  {m['library.scene.phase_what']()}
                </th>
              </tr>
            </thead>
            <tbody>
              {scene.phases.map((step, index) => (
                <tr
                  key={step.name.en}
                  className={`cursor-pointer border-b align-top ${
                    index === phase ? 'bg-accent' : ''
                  }`}
                  onClick={() => seek(index)}
                >
                  <td className="py-4 pr-4 font-mono text-xs">{index + 1}</td>
                  <td className="py-4 pr-4 font-medium">
                    {libraryText(step.name, locale)}
                  </td>
                  <td className="py-4 pr-4 font-mono text-xs whitespace-nowrap">
                    {formatSeconds(step.start ?? 0)}–
                    {formatSeconds(step.end ?? 0)}
                  </td>
                  <td className="text-muted-foreground py-4 leading-relaxed">
                    {libraryText(step.description, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="curvg-heading text-2xl">
              {m['library.scene.layout']()}
            </h2>
            <pre className="bg-card mt-6 overflow-x-auto rounded-2xl border p-5 font-mono text-xs leading-relaxed">
              {scene.layout}
            </pre>
          </div>
          <div>
            <h2 className="curvg-heading text-2xl">
              {m['library.demo.areas']()}
            </h2>
            <table className="mt-6 w-full border-collapse text-left text-sm">
              <tbody>
                {scene.areas?.map((area) => (
                  <tr key={area.area.en} className="border-b align-top">
                    <th className="w-24 py-3 pr-3 text-left font-medium">
                      {libraryText(area.area, locale)}
                    </th>
                    <td className="text-muted-foreground py-3 leading-relaxed">
                      {libraryText(area.content, locale)}
                      <span className="mt-1 block">
                        {libraryText(area.notes, locale)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="curvg-heading text-2xl">
              {m['library.scene.on_screen']()}
            </h2>
            <ul className="mt-4 space-y-3">
              {scene.onScreen.map((item) => (
                <li
                  key={item.en}
                  className="text-muted-foreground text-sm leading-relaxed"
                >
                  {libraryText(item, locale)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="curvg-heading text-2xl">
              {m['library.scene.absent']()}
            </h2>
            <ul className="mt-4 space-y-3">
              {scene.absent.map((item) => (
                <li
                  key={item.en}
                  className="text-muted-foreground text-sm leading-relaxed"
                >
                  {libraryText(item, locale)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <section className="bg-card mt-10 rounded-2xl border p-6">
          <h2 className="text-xl font-semibold tracking-tight">
            {m['library.scene.render_next']()}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
            {scene.prompt[locale]}
          </p>
          <Link
            href={creatorHref}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
          >
            {m['curves.detail.animate_cta']()}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </section>
      </section>
    </article>
  );
}
