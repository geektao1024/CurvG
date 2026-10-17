import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowRight, Clapperboard, Telescope } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
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
import { cn } from '@/lib/utils';
import { templateCreatorHref } from '@/lib/video-templates/href';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import {
  curveCategoryHref,
  curveCategoryLabel,
} from '@/blocks/curve-categories';
import { curveFactRows, curveFaq, curveLatex } from '@/blocks/curve-facts';
import { SitePage } from '@/blocks/site-page';
import { CurveFormulaCard } from '@/components/curve-formula-card';
import {
  CurveDrawingLoop,
  CurveExplorer,
  CurveThumb,
} from '@/components/curve-preview';
import { LabCard } from '@/components/lab-card';
import { MathProse } from '@/components/math-prose';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import {
  sectionActionClass,
  SectionHeading,
} from '@/components/section-heading';
import {
  CURVE_PRESETS,
  curveGraphImage,
  curveOgImage,
  CURVES,
  defaultValues,
  getCurve,
  getRelatedCurves,
  type CurveDef,
} from '@/content/curves';
import { curveVideoTemplate } from '@/content/curves/video';
import { labsForCurve } from '@/content/labs';
import { localeText } from '@/content/text';
import { wonderPath, wondersForCurve } from '@/content/wonders';

import { labCardLabels } from '../labs/-labs-page';

function CurveDetailPage() {
  const { locale, slug } = Route.useLoaderData();
  const curve = getCurve(slug);
  // Keyed by slug: moving to a related curve starts from its own defaults.
  return curve ? (
    <CurveDetail key={curve.slug} curve={curve} locale={locale} />
  ) : null;
}

function CurveDetail({ curve, locale }: { curve: CurveDef; locale: string }) {
  const [values, setValues] = useState(() => defaultValues(curve));
  const lang = locale === 'zh' ? 'zh' : 'en';
  // A curve a template can draw opens it with the sliders' current values;
  // the rest keep the free-text brief.
  const videoTemplate = curveVideoTemplate(curve.slug, values);
  const creatorHref = videoTemplate
    ? templateCreatorHref(videoTemplate.templateId, videoTemplate.params)
    : `/creator?prompt=${encodeURIComponent(curve.prompt[lang])}`;
  const related = getRelatedCurves(curve);
  const labs = labsForCurve(curve.slug);
  const wonders = wondersForCurve(curve.slug);
  const facts = curveFactRows(curve, locale, values);
  const presets = (CURVE_PRESETS[curve.slug] ?? []).map((preset) => ({
    label: preset.label[lang],
    values: preset.values,
  }));
  const faq = curveFaq(curve, locale);

  // Sections below the fold are numbered in the order they appear.
  let section = 0;
  const eyebrow = (label: string) =>
    `${String(++section).padStart(2, '0')} · ${label}`;
  const [lead, ...rest] = curve.intro[lang];

  return (
    <SitePage>
      <article>
        <section className="curvg-stage curvg-frame relative overflow-hidden border-b px-6 pt-12 pb-14 sm:px-10">
          <PageBreadcrumbs
            label={m['common.nav.breadcrumb']()}
            items={[
              { href: '/', label: m['common.nav.home']() },
              { href: '/curves', label: m['curves.breadcrumb']() },
              { href: `/curves/${curve.slug}`, label: curve.name[lang] },
            ]}
          />
          <Link
            href={curveCategoryHref(curve.category)}
            className="text-primary mt-8 inline-block font-mono text-xs font-semibold tracking-[0.16em] uppercase underline-offset-4 hover:underline"
          >
            {curveCategoryLabel(curve.category)}
          </Link>
          <h1 className="curvg-heading mt-3 text-4xl text-balance sm:text-6xl">
            {curve.name[lang]}
            {lang === 'zh' ? (
              <span
                lang="en"
                className="curvg-display text-muted-foreground/70 ml-4 align-baseline text-3xl sm:text-5xl"
              >
                {curve.name.en}
              </span>
            ) : null}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-base leading-relaxed text-pretty sm:text-lg">
            <MathProse text={curve.short[lang]} />
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
              values={values}
              onValuesChange={setValues}
              presets={presets}
              presetsLabel={m['curves.detail.presets']()}
              drawLabels={{
                play: m['curves.draw.play'](),
                replay: m['curves.draw.replay'](),
                stop: m['curves.draw.stop'](),
              }}
              drawNext={{
                href: creatorHref,
                label: m['curves.draw.video'](),
              }}
              exports={{
                latex: curveLatex(curve),
                credit: new URL(envConfigs.app_url).host,
                labels: {
                  title: m['curves.export.title'](),
                  svg: m['curves.export.svg'](),
                  png: m['curves.export.png'](),
                  csv: m['curves.export.csv'](),
                  copyLatex: m['curves.export.copy_latex'](),
                  copied: m['curves.export.copied'](),
                },
              }}
            />
            <div className="flex flex-col gap-6">
              {facts ? (
                <CurveFormulaCard
                  id="curve-formulas"
                  title={m['curves.detail.formulas']()}
                  rows={facts.rows}
                  where={facts.where}
                  currentLabel={m['curves.detail.current']()}
                />
              ) : null}
              {/* The studio's dark stage in both themes: the paid next step. */}
              <section className="dark" aria-labelledby="curve-video">
                <div className="bg-card text-foreground relative isolate overflow-hidden rounded-2xl border p-6">
                  <div
                    className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_100%_100%,color-mix(in_oklab,var(--brand)_22%,transparent),transparent_60%)]"
                    aria-hidden
                  />
                  <CurveDrawingLoop
                    curve={curve}
                    className="pointer-events-none absolute -right-8 -bottom-10 -z-10 h-44 w-60 opacity-80"
                  />
                  <p className="text-primary font-mono text-[11px] font-semibold tracking-[0.16em] uppercase">
                    {m['curves.detail.video_eyebrow']()}
                  </p>
                  <h2
                    id="curve-video"
                    className="curvg-heading mt-2 max-w-[16rem] text-xl"
                  >
                    {m['curves.detail.video_title']({
                      name: curve.name[lang],
                    })}
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-[19rem] text-sm leading-relaxed">
                    {videoTemplate
                      ? m['curves.detail.video_hint_template']()
                      : m['curves.detail.video_hint_brief']()}
                  </p>
                  <Link
                    href={creatorHref}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mt-5 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <Clapperboard className="size-4" aria-hidden />
                    {m['curves.detail.animate_cta']()}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section
          className="curvg-stage curvg-frame border-b px-6 py-16 sm:px-10"
          aria-labelledby="curve-about"
        >
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:gap-16">
            <div className="min-w-0">
              <SectionHeading
                id="curve-about"
                eyebrow={eyebrow(m['curves.detail.eyebrow_about']())}
                title={m['curves.detail.about']({ name: curve.name[lang] })}
              />
              <div className="mt-7 max-w-3xl space-y-4">
                {lead ? (
                  <p className="text-foreground text-lg leading-relaxed text-pretty sm:text-xl sm:leading-relaxed">
                    <MathProse text={lead} />
                  </p>
                ) : null}
                {rest.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 32)}
                    className="text-muted-foreground text-base leading-relaxed text-pretty"
                  >
                    <MathProse text={paragraph} />
                  </p>
                ))}
              </div>

              <SectionHeading
                className="mt-16"
                eyebrow={eyebrow(m['curves.detail.eyebrow_properties']())}
                title={m['curves.detail.properties']()}
              />
              <ol className="mt-7 grid gap-3 sm:grid-cols-2">
                {curve.properties[lang].map((property, index) => (
                  <li
                    key={property.slice(0, 32)}
                    className={cn(
                      'bg-card hover:border-primary/40 flex gap-4 rounded-xl border p-5 transition-colors',
                      // An odd count: the first property spans the row, so the grid closes evenly.
                      index === 0 &&
                        curve.properties[lang].length % 2 === 1 &&
                        'sm:col-span-2'
                    )}
                  >
                    <span
                      className="curvg-display text-brand w-8 shrink-0 text-3xl leading-none"
                      aria-hidden
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[15px] leading-relaxed text-pretty">
                      <MathProse text={property} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="flex flex-col gap-5 lg:sticky lg:top-24">
              {/* A real image file, so image search can index the graph
                (the interactive one above is inline SVG). */}
              <figure className="curvg-board-thumb overflow-hidden rounded-2xl border">
                <img
                  src={curveGraphImage(curve.slug)}
                  alt={m['curves.detail.graph_alt']({ name: curve.name[lang] })}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
                <figcaption className="text-muted-foreground border-t px-4 py-2.5 font-mono text-[11px]">
                  {m['curves.detail.figure']({ name: curve.name[lang] })}
                </figcaption>
              </figure>
              <section
                className="bg-accent/60 rounded-2xl border p-5"
                aria-labelledby="curve-seen-in"
              >
                <p className="text-primary flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] uppercase">
                  <Telescope className="size-3.5" aria-hidden />
                  {m['curves.detail.eyebrow_seen_in']()}
                </p>
                <h2 id="curve-seen-in" className="curvg-heading mt-2 text-lg">
                  {m['curves.detail.seen_in']()}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                  <MathProse text={curve.seenIn[lang]} />
                </p>
              </section>
            </aside>
          </div>
        </section>

        {faq.length > 0 && (
          <section
            className="curvg-stage curvg-frame border-b px-6 py-16 sm:px-10"
            aria-labelledby="curve-faq"
          >
            <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] xl:gap-16">
              <SectionHeading
                id="curve-faq"
                className="lg:sticky lg:top-24 lg:self-start"
                eyebrow={eyebrow(m['curves.detail.eyebrow_faq']())}
                title={m['curves.faq.heading']({ name: curve.name[lang] })}
              />
              <dl className="max-w-3xl divide-y border-y">
                {faq.map((item, index) => (
                  <div
                    key={item.question}
                    className="grid gap-x-5 py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)]"
                  >
                    <span
                      className="text-primary hidden pt-1 font-mono text-xs sm:block"
                      aria-hidden
                    >
                      Q{index + 1}
                    </span>
                    <div>
                      <dt className="font-heading text-lg leading-snug font-semibold">
                        {item.question}
                      </dt>
                      <dd className="text-muted-foreground mt-2 text-base leading-relaxed text-pretty">
                        {/* Same text as the FAQPage answer; exponents only typeset. */}
                        <MathProse text={item.answer} />
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {labs.length > 0 && (
          <section className="curvg-stage curvg-frame border-b px-6 py-16 sm:px-10">
            <SectionHeading
              eyebrow={eyebrow(m['curves.detail.eyebrow_labs']())}
              title={m['labs.topic.heading']()}
            />
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
          <section className="curvg-stage curvg-frame border-b px-6 py-16 sm:px-10">
            <SectionHeading
              eyebrow={eyebrow(m['curves.detail.eyebrow_wonders']())}
              title={m['curves.detail.wonders']()}
            />
            <div className="dark mt-8 grid gap-4 sm:grid-cols-2">
              {wonders.map((wonder) => (
                <Link
                  key={wonder.slug}
                  href={wonderPath(wonder)}
                  className="group bg-card text-foreground hover:border-primary/60 flex items-end justify-between gap-4 rounded-2xl border p-6 transition-colors"
                >
                  <span className="flex flex-col gap-2">
                    <span className="text-primary font-mono text-[11px] tracking-[0.14em] uppercase">
                      {localeText(wonder.name, lang)}
                    </span>
                    <span className="font-heading text-lg leading-snug">
                      {localeText(wonder.question, lang)}
                    </span>
                  </span>
                  <ArrowRight
                    className="text-primary size-5 shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section
            className="curvg-stage curvg-frame border-b px-6 py-16 sm:px-10"
            aria-labelledby="curve-related"
          >
            <SectionHeading
              id="curve-related"
              eyebrow={eyebrow(m['curves.detail.eyebrow_related']())}
              title={m['curves.detail.related']()}
              action={
                <Link href="/curves" className={sectionActionClass}>
                  {m['landing.nav.all_curves']({ count: CURVES.length })}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              }
            />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((relatedCurve) => (
                <Link
                  key={relatedCurve.slug}
                  href={`/curves/${relatedCurve.slug}`}
                  className="group bg-card hover:border-primary/50 block overflow-hidden rounded-2xl border transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-28px_color-mix(in_oklab,var(--foreground)_40%,transparent)]"
                >
                  <div className="bg-muted/20 aspect-[4/3] border-b">
                    <CurveThumb
                      curve={relatedCurve}
                      ariaLabel={m['curves.detail.preview_aria']({
                        name: relatedCurve.name[lang],
                      })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-4">
                    <span className="min-w-0">
                      <span className="text-muted-foreground block font-mono text-[10px] tracking-[0.14em] uppercase">
                        {curveCategoryLabel(relatedCurve.category)}
                      </span>
                      <h3 className="group-hover:text-primary mt-1 text-base font-semibold tracking-tight transition-colors">
                        {relatedCurve.name[lang]}
                      </h3>
                    </span>
                    <ArrowRight
                      className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-[color,transform] group-hover:translate-x-0.5"
                      aria-hidden
                    />
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
    const faq = curveFaq(curve, locale);
    const faqPage = faq.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        }
      : null;
    const structuredData = faqPage
      ? [breadcrumb, resource, faqPage]
      : [breadcrumb, resource];
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
