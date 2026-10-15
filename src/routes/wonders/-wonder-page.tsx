import { ArrowDown, ArrowRight } from 'lucide-react';

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
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { Footer } from '@/blocks/footer';
import { siteNavLinks } from '@/blocks/site-nav';
import { FourierWonder } from '@/components/fourier-wonder';
import { LocaleSelector } from '@/components/locale-selector';
import { LorenzWonder } from '@/components/lorenz-wonder';
import { MandelbrotWonder } from '@/components/mandelbrot-wonder';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { PhyllotaxisWonder } from '@/components/phyllotaxis-wonder';
import { RichMath } from '@/components/rich-math';
import { SiteNavMenu } from '@/components/site-nav-menu';
import { Clauses } from '@/components/wonder-card';
import type { WonderStageLabels } from '@/components/wonder-stage';
import { getCurve } from '@/content/curves';
import { getLab, labPath } from '@/content/labs';
import { localeText, type ContentLocale } from '@/content/text';
import { wonderOgImage, wonderPath, type Wonder } from '@/content/wonders';

import { WorkspaceAccount } from '../labs/-labs-page';

/** Plain text for structured data: drop TeX delimiters and bold markers. */
function plain(text: string): string {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\*\*/g, '');
}

export function wonderHead(wonder: Wonder, locale: string) {
  const lang: ContentLocale = locale === 'zh' ? 'zh' : 'en';
  const opts = { locale: locale as never };
  const question = localeText(wonder.question, lang);
  const name = localeText(wonder.name, lang);
  const title = localeText(wonder.metaTitle, lang);
  const description = localeText(wonder.summary, lang);
  const path = wonderPath(wonder);
  const seo = localizedLinks({ path, locale });
  const inLanguage = lang === 'zh' ? 'zh-CN' : 'en';
  const image = wonderOgImage(wonder, lang);

  const resource = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: question,
    alternateName: name,
    description,
    url: seo.canonical,
    image: absoluteUrl(image),
    inLanguage,
    dateModified: wonder.updated,
    learningResourceType: ['Interactive simulation', 'Animation'],
    interactivityType: 'mixed',
    isAccessibleForFree: true,
    teaches: localeText(wonder.takeaway, lang),
    provider: {
      '@type': 'Organization',
      name: envConfigs.app_name,
      url: absoluteUrl('/'),
    },
    citation: wonder.sources.map((source) => ({
      '@type': 'CreativeWork',
      name: source.title,
      url: source.url,
    })),
  };
  const breadcrumb = breadcrumbJsonLd(
    [
      { name: m['common.nav.home']({}, opts), path: '/' },
      { name: m['wonders.breadcrumb']({}, opts), path: '/wonders' },
      { name, path },
    ],
    locale
  );
  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: wonder.faq.map((item) => ({
      '@type': 'Question',
      name: localeText(item.question, lang),
      acceptedAnswer: {
        '@type': 'Answer',
        text: plain(localeText(item.answer, lang)),
      },
    })),
  };

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      ...socialMeta({
        title,
        description,
        url: seo.canonical,
        type: 'article',
      }),
    ],
    links: seo.links,
    scripts: [
      {
        type: 'application/ld+json',
        children: serializeJsonLd([resource, breadcrumb, faq]),
      },
    ],
  };
}

/** Minimal chrome over the dark stage: brand + section, then a few links. */
/**
 * Compact bar over the stage, same structure as the lab workspace bar
 * (docs/NAVIGATION.md §3): logo, breadcrumb, then the site menu, language
 * and account.
 */
function WonderTopBar({
  wonder,
  lang,
}: {
  wonder: Wonder;
  lang: ContentLocale;
}) {
  return (
    <header className="wonder-top">
      <div className="wonder-brand">
        <Link href="/" className="wonder-home">
          <img src={envConfigs.app_logo} alt="" width={26} height={26} />
          <span>{envConfigs.app_name}</span>
        </Link>
        <PageBreadcrumbs
          label={m['common.nav.breadcrumb']()}
          items={[
            { href: '/wonders', label: m['wonders.breadcrumb']() },
            { href: wonderPath(wonder), label: localeText(wonder.name, lang) },
          ]}
        />
      </div>
      <div className="wonder-nav">
        <SiteNavMenu
          links={siteNavLinks()}
          label={m['common.nav.site_menu']()}
        />
        <LocaleSelector switchLabel={m['common.nav.switch_language']()} />
        <WorkspaceAccount />
      </div>
    </header>
  );
}

/** Zoom factor in the reader's units: 1.2 万× / 12k×. */
function formatZoom(factor: number, lang: ContentLocale): string {
  const fixed = (x: number) =>
    x < 10 ? x.toFixed(1) : Math.round(x).toString();
  if (lang === 'zh') {
    if (factor < 1e4) return `${fixed(factor)}×`;
    if (factor < 1e8) return `${fixed(factor / 1e4)} 万×`;
    if (factor < 1e12) return `${fixed(factor / 1e8)} 亿×`;
    return `${fixed(factor / 1e12)} 万亿×`;
  }
  if (factor < 1e3) return `${fixed(factor)}×`;
  if (factor < 1e6) return `${fixed(factor / 1e3)}k×`;
  if (factor < 1e9) return `${fixed(factor / 1e6)}M×`;
  if (factor < 1e12) return `${fixed(factor / 1e9)}B×`;
  return `${fixed(factor / 1e12)}T×`;
}

/** The interactive stage for a wonder, by slug. */
function StageFor({ wonder, lang }: { wonder: Wonder; lang: ContentLocale }) {
  const overlay = (
    <div className="wonder-head">
      <p className="wonder-eyebrow">
        {m['wonders.page.no']({ number: wonder.number })} ·{' '}
        {localeText(wonder.field, lang)}
      </p>
      <h1>
        <Clauses text={localeText(wonder.question, lang)} />
      </h1>
      <p>{localeText(wonder.summary, lang)}</p>
      <a href="#explain" className="wonder-why">
        <ArrowDown />
        {m['wonders.page.why']()}
      </a>
    </div>
  );
  const stage = (canvas: string): WonderStageLabels => ({
    beats: wonder.beats.map((beat) => localeText(beat, lang)),
    play: m['wonders.stage.play'](),
    pause: m['wonders.stage.pause'](),
    replay: m['wonders.stage.replay'](),
    skip: m['wonders.stage.skip'](),
    story: m['wonders.stage.story'](),
    params: m['wonders.stage.params'](),
    canvas,
  });

  switch (wonder.slug) {
    case 'fourier-epicycles':
      return (
        <FourierWonder
          overlay={overlay}
          stage={stage(m['wonders.fourier.canvas']())}
          labels={{
            shape: m['wonders.stage.shape'](),
            shapes: {
              square: m['wonders.fourier.shape.square'](),
              sawtooth: m['wonders.fourier.shape.sawtooth'](),
              triangle: m['wonders.fourier.shape.triangle'](),
              pi: m['wonders.fourier.shape.pi'](),
              custom: m['wonders.fourier.shape.custom'](),
            },
            circles: m['wonders.stage.circles'](),
            error: m['wonders.stage.error'](),
            overshoot: m['wonders.stage.overshoot'](),
            overshootNote: (percent) =>
              m['wonders.stage.overshoot_note']({ percent }),
            showCircles: m['wonders.stage.show_circles'](),
            drawHint: m['wonders.stage.draw_hint'](),
            drawTooShort: m['wonders.stage.draw_too_short'](),
          }}
        />
      );
    case 'mandelbrot-set':
      return (
        <MandelbrotWonder
          overlay={overlay}
          stage={stage(m['wonders.mandelbrot.canvas']())}
          labels={{
            zoom: m['wonders.mandelbrot.zoom'](),
            iterations: m['wonders.mandelbrot.iterations'](),
            places: m['wonders.mandelbrot.places'](),
            presets: {
              full: m['wonders.mandelbrot.preset.full'](),
              seahorse: m['wonders.mandelbrot.preset.seahorse'](),
              deep: m['wonders.mandelbrot.preset.deep'](),
              antenna: m['wonders.mandelbrot.preset.antenna'](),
            },
            detail: m['wonders.mandelbrot.detail'](),
            hint: m['wonders.mandelbrot.hint'](),
            noWebgl: m['wonders.mandelbrot.no_webgl'](),
            escaped: (steps) => m['wonders.mandelbrot.escaped']({ steps }),
            stays: m['wonders.mandelbrot.stays'](),
            formatZoom: (factor) => formatZoom(factor, lang),
          }}
        />
      );
    case 'lorenz-attractor':
      return (
        <LorenzWonder
          overlay={overlay}
          stage={stage(m['wonders.lorenz.canvas']())}
          labels={{
            rho: m['wonders.lorenz.rho'](),
            longRun: m['wonders.lorenz.long_run'](),
            states: {
              origin: m['wonders.lorenz.state.origin'](),
              wing: m['wonders.lorenz.state.wing'](),
              mixed: m['wonders.lorenz.state.mixed'](),
              chaos: m['wonders.lorenz.state.chaos'](),
            },
            gapLabel: m['wonders.lorenz.gap'](),
            gap: (value) => m['wonders.lorenz.gap_note']({ value }),
            points: m['wonders.lorenz.points'](),
            reseed: m['wonders.lorenz.reseed'](),
            showPath: m['wonders.lorenz.show_path'](),
            hint: m['wonders.lorenz.hint'](),
          }}
        />
      );
    case 'sunflower-golden-angle':
      return (
        <PhyllotaxisWonder
          overlay={overlay}
          stage={stage(m['wonders.phyllo.canvas']())}
          labels={{
            angle: m['wonders.phyllo.angle'](),
            fraction: m['wonders.phyllo.fraction'](),
            spacing: m['wonders.phyllo.spacing'](),
            seeds: m['wonders.phyllo.seeds'](),
            presets: m['wonders.phyllo.presets'](),
            golden: m['wonders.phyllo.golden'](),
            spirals: m['wonders.phyllo.spirals'](),
          }}
        />
      );
    default:
      return null;
  }
}

export function WonderPage({
  wonder,
  locale,
}: {
  wonder: Wonder;
  locale: string;
}) {
  const lang: ContentLocale = locale === 'zh' ? 'zh' : 'en';
  const curves = wonder.relatedCurves.flatMap((slug) => {
    const curve = getCurve(slug);
    return curve ? [curve] : [];
  });
  const labs = wonder.relatedLabs
    .map((slug) => getLab(slug))
    .filter((lab) => lab?.publication === 'public');

  return (
    <div className="dark wonder-page">
      <div className="relative">
        <WonderTopBar wonder={wonder} lang={lang} />
        <StageFor wonder={wonder} lang={lang} />
      </div>

      <article id="explain" className="wonder-article">
        <div className="wonder-article-inner">
          <p className="wonder-eyebrow">{m['wonders.page.explain']()}</p>
          <p className="wonder-takeaway mt-4">
            {localeText(wonder.takeaway, lang)}
          </p>

          {wonder.sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="wonder-section"
            >
              <h2>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                {localeText(section.title, lang)}
              </h2>
              <RichMath
                source={localeText(section.body, lang)}
                className="wonder-prose"
              />
            </section>
          ))}

          <section className="wonder-section">
            <h2>{m['wonders.page.faq']()}</h2>
            <div className="wonder-faq">
              {wonder.faq.map((item, i) => (
                <details key={i}>
                  <summary>{localeText(item.question, lang)}</summary>
                  <p>{localeText(item.answer, lang)}</p>
                </details>
              ))}
            </div>
          </section>

          {labs.length ? (
            <section className="wonder-section">
              <h2>{m['wonders.page.related']()}</h2>
              <div className="wonder-links">
                {labs.map((lab) =>
                  lab ? (
                    <Link
                      key={lab.slug}
                      href={labPath(lab)}
                      className="wonder-link"
                    >
                      <span>
                        <span className="kind">
                          {m['wonders.page.related_kind']()}
                        </span>
                        <span className="title mt-1 block">
                          {localeText(lab.chapterTitle, lang)}
                        </span>
                        <span className="note block">
                          {localeText(lab.question, lang)}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 opacity-60" />
                    </Link>
                  ) : null
                )}
              </div>
            </section>
          ) : null}

          {curves.length ? (
            <section className="wonder-section">
              <h2>{m['wonders.page.related_curves']()}</h2>
              <div className="wonder-links">
                {curves.map((curve) => (
                  <Link
                    key={curve.slug}
                    href={`/curves/${curve.slug}`}
                    className="wonder-link"
                  >
                    <span>
                      <span className="kind">
                        {m['wonders.page.curve_kind']()}
                      </span>
                      <span className="title mt-1 block">
                        {curve.name[lang]}
                      </span>
                      <span className="note block">
                        {plainMath(curve.short[lang])}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 opacity-60" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <p className="wonder-sources">
            {m['wonders.page.sources']()}:{' '}
            {wonder.sources.map((source, i) => (
              <span key={source.url}>
                {i ? ' · ' : ''}
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              </span>
            ))}
          </p>
        </div>
      </article>
      <Footer />
    </div>
  );
}
