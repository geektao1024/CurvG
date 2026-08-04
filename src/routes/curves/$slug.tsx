import { createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowRight, WandSparkles } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { CurveExplorer, CurveThumb } from '@/components/curve-preview';
import { MathTex } from '@/components/math-tex';
import { getCurve, getRelatedCurves } from '@/content/curves';

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

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <article>
          <section className="curvg-stage curvg-frame border-b px-6 py-12 sm:px-10">
            <nav aria-label="Breadcrumb">
              <Link
                href="/curves"
                className="text-muted-foreground hover:text-primary font-mono text-xs tracking-[0.14em] uppercase transition-colors"
              >
                ← {m['curves.detail.breadcrumb_home']()}
              </Link>
            </nav>
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

            <div className="mt-10 grid gap-6 lg:grid-cols-[3fr_2fr]">
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
            <div className="mt-6 max-w-3xl space-y-4">
              {curve.intro[lang].map((paragraph) => (
                <p
                  key={paragraph.slice(0, 32)}
                  className="text-muted-foreground text-base leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
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
      </main>
      <Footer />
    </div>
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
    const description = `${curve.short[lang]} ${m['curves.detail.meta_suffix']({}, { locale: locale as never })}`;
    const seoLinks = localizedLinks({ path: `/curves/${slug}`, locale });
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: m['curves.detail.breadcrumb_home'](
            {},
            { locale: locale as never }
          ),
          item: localizedUrl('/curves', locale),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: curve.name[lang],
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
  component: CurveDetailPage,
});
