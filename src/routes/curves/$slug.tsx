import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowRight, WandSparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { plainMath } from '@/lib/plain-math';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
  titleWidth,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SitePage } from '@/blocks/site-page';
import { CurveExplorer, CurveThumb } from '@/components/curve-preview';
import { LabCard } from '@/components/lab-card';
import { MathTex } from '@/components/math-tex';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import {
  curveGraphImage,
  curveOgImage,
  getCurve,
  getRelatedCurves,
} from '@/content/curves';
import { labsForCurve } from '@/content/labs';
import { libraryText, scenesForCurve } from '@/content/library';
import { wonderPath, wondersForCurve } from '@/content/wonders';

import { labCardLabels } from '../labs/-labs-page';

const CATEGORY_LABEL = {
  parametric: () => m['curves.category.parametric'](),
  polar: () => m['curves.category.polar'](),
  roulette: () => m['curves.category.roulette'](),
  spiral: () => m['curves.category.spiral'](),
  conic: () => m['curves.category.conic'](),
  cartesian: () => m['curves.category.cartesian'](),
} as const;

function CurveDetailPage() {
  const { locale, slug } = Route.useLoaderData();
  const curve = getCurve(slug);
  if (!curve) return null;
  const lang = locale === 'zh' ? 'zh' : 'en';
  const creatorHref = `/creator?prompt=${encodeURIComponent(curve.prompt[lang])}`;
  const related = getRelatedCurves(curve);
  const scenes = scenesForCurve(curve.slug);
  const labs = labsForCurve(curve.slug);
  const wonders = wondersForCurve(curve.slug);

  return (
    <SitePage>
      <article>
        <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
          <PageBreadcrumbs
            label={m['common.nav.breadcrumb']()}
            items={[
              { href: '/', label: m['common.nav.home']() },
              { href: '/curves', label: m['curves.breadcrumb']() },
              { href: `/curves/${curve.slug}`, label: curve.name[lang] },
            ]}
          />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="curvg-heading text-4xl text-balance sm:text-5xl">
              {curve.name[lang]}
            </h1>
            <span className="curvg-pill text-muted-foreground px-3 py-1 font-mono text-xs">
              {CATEGORY_LABEL[curve.category]()}
            </span>
          </div>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed sm:text-lg">
            {curve.short[lang]}
          </p>

          {/* min-w-0: a long equation scrolls inside its card instead of widening the page. */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[3fr_2fr] [&>*]:min-w-0">
            <CurveExplorer
              curve={curve}
              locale={lang}
              parametersLabel={m['curves.detail.parameters']()}
              resetLabel={m['curves.detail.reset']()}
              ariaLabel={m['curves.detail.preview_aria']({
                name: curve.name[lang],
              })}
            />
            <div className="flex flex-col gap-6">
              <section
                className="bg-card rounded-2xl border p-5"
                aria-labelledby="curve-equation"
              >
                <h2
                  id="curve-equation"
                  className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase"
                >
                  {m['curves.detail.equation']()}
                </h2>
                <div className="mt-2">
                  {curve.equations.map((tex) => (
                    <MathTex key={tex} tex={tex} />
                  ))}
                </div>
              </section>
              <section className="bg-card rounded-2xl border p-5">
                <div className="flex items-start gap-3">
                  <span className="bg-accent text-primary flex size-10 shrink-0 items-center justify-center rounded-lg border">
                    <WandSparkles className="size-4.5" aria-hidden />
                  </span>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {m['curves.detail.animate_hint']()}
                  </p>
                </div>
                <Link
                  href={creatorHref}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  {m['curves.detail.animate_cta']()}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </section>
            </div>
          </div>
        </section>

        <section
          className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
          aria-labelledby="curve-about"
        >
          <h2 id="curve-about" className="curvg-heading text-2xl sm:text-3xl">
            {m['curves.detail.about']({ name: curve.name[lang] })}
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,48rem)_18rem] lg:items-start">
            <div className="max-w-3xl space-y-4">
              {curve.intro[lang].map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-muted-foreground text-base leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
            {/* A real image file, so image search can index the graph
              (the interactive one above is inline SVG). */}
            <figure className="bg-card overflow-hidden rounded-2xl border">
              <img
                src={curveGraphImage(curve.slug)}
                alt={m['curves.detail.graph_alt']({ name: curve.name[lang] })}
                width={800}
                height={600}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full"
              />
              <figcaption className="text-muted-foreground border-t px-4 py-2.5 text-xs">
                {m['curves.detail.figure']({ name: curve.name[lang] })}
              </figcaption>
            </figure>
          </div>

          <h2 className="curvg-heading mt-12 text-2xl sm:text-3xl">
            {m['curves.detail.properties']()}
          </h2>
          <ul className="mt-6 max-w-3xl space-y-2.5">
            {curve.properties[lang].map((property) => (
              <li
                key={property.slice(0, 32)}
                className="text-muted-foreground flex gap-3 text-base leading-relaxed"
              >
                <span className="text-primary select-none" aria-hidden>
                  —
                </span>
                {property}
              </li>
            ))}
          </ul>

          <h2 className="curvg-heading mt-12 text-2xl sm:text-3xl">
            {m['curves.detail.seen_in']()}
          </h2>
          <p className="text-muted-foreground mt-6 max-w-3xl text-base leading-relaxed">
            {curve.seenIn[lang]}
          </p>
        </section>

        {scenes.length > 0 && (
          <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
            <h2 className="curvg-heading text-2xl sm:text-3xl">
              {m['library.breadcrumb']()}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {scenes.map((scene) => (
                <Link
                  key={scene.slug}
                  href={`/library/scenes/${scene.slug}`}
                  className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-colors"
                >
                  <div className="bg-muted/30 grid aspect-video place-items-center border-b">
                    {scene.video ? (
                      <img
                        src={scene.video.poster}
                        alt=""
                        className="size-full bg-black object-contain"
                      />
                    ) : (
                      <span className="font-heading text-3xl tracking-[0.2em]">
                        ABC
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="group-hover:text-primary text-lg font-semibold tracking-tight">
                      {libraryText(scene.title, lang)}
                    </h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                      {libraryText(scene.question, lang)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {labs.length > 0 && (
          <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
            <h2 className="curvg-heading text-2xl sm:text-3xl">
              {m['labs.topic.heading']()}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {labs.map((lab) => (
                <LabCard
                  key={lab.slug}
                  lab={lab}
                  locale={lang}
                  {...labCardLabels(lab, lang)}
                />
              ))}
            </div>
          </section>
        )}

        {wonders.length > 0 && (
          <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
            <h2 className="curvg-heading text-2xl sm:text-3xl">
              {m['curves.detail.wonders']()}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {wonders.map((wonder) => (
                <Link
                  key={wonder.slug}
                  href={wonderPath(wonder)}
                  className="group bg-card hover:border-primary/50 flex flex-col gap-1.5 rounded-2xl border p-5 transition-colors"
                >
                  <span className="text-primary font-mono text-[11px] tracking-[0.14em] uppercase">
                    {libraryText(wonder.name, lang)}
                  </span>
                  <span className="font-heading group-hover:text-primary text-lg leading-snug transition-colors">
                    {libraryText(wonder.question, lang)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section
            className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10"
            aria-labelledby="curve-related"
          >
            <h2
              id="curve-related"
              className="curvg-heading text-2xl sm:text-3xl"
            >
              {m['curves.detail.related']()}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((relatedCurve) => (
                <Link
                  key={relatedCurve.slug}
                  href={`/curves/${relatedCurve.slug}`}
                  className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-colors"
                >
                  <div className="bg-muted/20 aspect-[4/3] border-b">
                    <CurveThumb
                      curve={relatedCurve}
                      ariaLabel={m['curves.detail.preview_aria']({
                        name: relatedCurve.name[lang],
                      })}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="group-hover:text-primary text-base font-semibold tracking-tight transition-colors">
                      {relatedCurve.name[lang]}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </SitePage>
  );
}

export const Route = createFileRoute('/curves/$slug')({
  loader: ({ params }) => {
    if (!getCurve(params.slug)) throw notFound();
    return { locale: getLocale(), slug: params.slug };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, slug } = loaderData;
    const curve = getCurve(slug);
    if (!curve) return {};
    const lang = locale === 'zh' ? 'zh' : 'en';
    const title = m['curves.detail.meta_title'](
      { name: curve.name[lang] },
      { locale: locale as never }
    );
    // Lead with what the searcher asked for (the curve and its formula),
    // then one concrete fact (arc length, area…) if it still fits a snippet.
    const opts = { locale: locale as never };
    const short = plainMath(curve.short[lang]);
    const fact = plainMath(curve.properties[lang][0] ?? '');
    const tag = m['curves.detail.meta_tag']({}, opts);
    const suffix = m['curves.detail.meta_suffix']({}, opts);
    // Chinese sentences run on without spaces.
    const join = (...parts: string[]) => parts.join(lang === 'zh' ? '' : ' ');
    const description =
      [join(short, fact, tag), join(short, suffix), join(short, tag)].find(
        (text) => titleWidth(text) <= 320
      ) ?? short;
    const image = curveOgImage(slug, lang);
    const seoLinks = localizedLinks({ path: `/curves/${slug}`, locale });
    const breadcrumb = breadcrumbJsonLd(
      [
        {
          name: m['common.nav.home']({}, { locale: locale as never }),
          path: '/',
        },
        {
          name: m['curves.breadcrumb']({}, { locale: locale as never }),
          path: '/curves',
        },
        { name: curve.name[lang], path: `/curves/${slug}` },
      ],
      locale
    );
    const resource = {
      '@context': 'https://schema.org',
      '@type': 'LearningResource',
      name: curve.name[lang],
      description,
      url: seoLinks.canonical,
      image: absoluteUrl(curveGraphImage(slug)),
      inLanguage: lang === 'zh' ? 'zh-CN' : 'en',
      learningResourceType: ['Interactive simulation', 'Reference'],
      isAccessibleForFree: true,
      teaches: curve.properties[lang].map(plainMath),
    };
    const structuredData = [breadcrumb, resource];
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({
          title,
          description,
          url: seoLinks.canonical,
          image,
          imageAlt: m['curves.detail.graph_alt'](
            { name: curve.name[lang] },
            opts
          ),
        }),
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
  component: CurveDetailPage,
});
