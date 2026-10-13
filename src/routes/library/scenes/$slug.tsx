import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { MathTex } from '@/components/math-tex';
import { ParabolaRiseStage } from '@/components/parabola-rise-stage';
import { PermutationsDetail } from '@/components/permutations-detail';
import { getCurve } from '@/content/curves';
import {
  getLibraryScene,
  getPrimaryTrail,
  libraryText,
} from '@/content/library';

import {
  LibraryBreadcrumb,
  libraryLocale,
  LibraryShell,
} from '../-library-page';

function formatSeconds(value: number) {
  return Number.isInteger(value) ? `${value}s` : `${value.toFixed(1)}s`;
}

function ScenePage() {
  const { locale, slug } = Route.useLoaderData();
  const lang = libraryLocale(locale);
  const scene = getLibraryScene(slug);
  if (!scene) return null;
  const trail = getPrimaryTrail(scene.primaryCategoryId);
  const curve = scene.curveSlugs
    ?.map((curveSlug) => getCurve(curveSlug))
    .find((item) => item !== undefined);
  const creatorHref = `/creator?prompt=${encodeURIComponent(scene.prompt[lang])}`;

  if (scene.slug === 'permutations-vs-combinations') {
    return (
      <LibraryShell>
        <PermutationsDetail scene={scene} locale={lang} />
      </LibraryShell>
    );
  }

  if (!scene.video) return null;

  return (
    <LibraryShell>
      <article>
        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <LibraryBreadcrumb trail={trail} locale={lang} />
          <p className="text-primary mt-8 font-mono text-xs font-semibold tracking-[0.16em] uppercase">
            {m['library.scene.duration']({
              seconds: scene.durationSeconds,
            })}
          </p>
          <h1 className="curvg-heading mt-4 max-w-3xl text-4xl text-balance sm:text-5xl">
            {libraryText(scene.question, lang)}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {libraryText(scene.hook, lang)}
          </p>
          <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {libraryText(scene.payoff, lang)}
          </p>

          <div className="mt-10 grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
            <figure className="bg-card overflow-hidden rounded-2xl border">
              <video
                controls
                playsInline
                preload="metadata"
                poster={scene.video.poster}
                className="aspect-video w-full bg-black"
              >
                <source src={scene.video.src} type="video/mp4" />
              </video>
              <figcaption className="text-muted-foreground border-t px-5 py-4 text-sm leading-relaxed">
                {m['library.scene.clip_note']()}
              </figcaption>
            </figure>

            <div className="flex flex-col gap-6">
              <section className="bg-card rounded-2xl border p-5">
                <h2 className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                  {m['curves.detail.equation']()}
                </h2>
                {scene.equations.map((tex) => (
                  <MathTex key={tex} tex={tex} />
                ))}
              </section>
              <ParabolaRiseStage
                parameterLabel={m['library.scene.parameter']()}
                resetLabel={m['library.scene.reset']()}
                matchesLabel={m['library.scene.matches']()}
                differsLabel={m['library.scene.differs']()}
                ariaLabel={m['library.scene.stage_aria']()}
              />
            </div>
          </div>
        </section>

        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <h2 className="curvg-heading text-2xl sm:text-3xl">
            {m['library.scene.phases']()}
          </h2>
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
                {scene.phases.map((phase, index) => (
                  <tr key={phase.name.en} className="border-b align-top">
                    <td className="py-4 pr-4 font-mono text-xs">{index + 1}</td>
                    <td className="py-4 pr-4 font-medium">
                      {libraryText(phase.name, lang)}
                    </td>
                    <td className="py-4 pr-4 font-mono text-xs whitespace-nowrap">
                      {formatSeconds(phase.start)}–{formatSeconds(phase.end)}
                    </td>
                    <td className="text-muted-foreground py-4 leading-relaxed">
                      {libraryText(phase.description, lang)}
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
              <pre className="bg-card text-muted-foreground mt-6 overflow-x-auto rounded-2xl border p-5 font-mono text-xs leading-relaxed">
                {scene.layout}
              </pre>
            </div>
            <div className="space-y-8">
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
                      {libraryText(item, lang)}
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
                      {libraryText(item, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {curve ? (
              <Link
                href={`/curves/${curve.slug}`}
                className="bg-card hover:border-primary/50 rounded-2xl border p-6 transition-colors"
              >
                <p className="text-primary font-mono text-[10px] tracking-[0.14em] uppercase">
                  {m['library.object_badge']()}
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-tight">
                  {curve.name[lang]}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {curve.short[lang]}
                </p>
              </Link>
            ) : null}
            <section className="bg-card rounded-2xl border p-6">
              <h2 className="text-xl font-semibold tracking-tight">
                {m['library.scene.render_next']()}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {scene.prompt[lang]}
              </p>
              <Link
                href={creatorHref}
                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
              >
                {m['curves.detail.animate_cta']()}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </section>
          </div>
        </section>
      </article>
    </LibraryShell>
  );
}

export const Route = createFileRoute('/library/scenes/$slug')({
  loader: ({ params }) => {
    if (!getLibraryScene(params.slug)) throw notFound();
    return { locale: getLocale(), slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const scene = getLibraryScene(loaderData.slug);
    if (!scene) return {};
    const { locale } = loaderData;
    const lang = libraryLocale(locale);
    const title = m['library.scene.meta_title'](
      { title: libraryText(scene.title, lang) },
      { locale: locale as never }
    );
    const description = libraryText(scene.hook, lang);
    const path = `/library/scenes/${scene.slug}`;
    const seoLinks = localizedLinks({ path, locale });
    const trail = getPrimaryTrail(scene.primaryCategoryId);
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: m['library.breadcrumb']({}, { locale: locale as never }),
          item: localizedUrl('/library', locale),
        },
        ...trail.map((category, index) => ({
          '@type': 'ListItem',
          position: index + 2,
          name: libraryText(category.title, lang),
          item: localizedUrl(
            index === 0
              ? `/library/${category.id}`
              : `/library/${trail[0].id}/${category.id}`,
            locale
          ),
        })),
        {
          '@type': 'ListItem',
          position: trail.length + 2,
          name: libraryText(scene.title, lang),
          item: seoLinks.canonical,
        },
      ],
    };
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({ title, description, url: seoLinks.canonical }),
      ],
      links: seoLinks.links,
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd(structuredData),
        },
      ],
    };
  },
  component: ScenePage,
});
