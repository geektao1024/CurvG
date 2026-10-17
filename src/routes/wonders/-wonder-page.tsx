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
import { AttractorWonder } from '@/components/attractor-wonder';
import { BuffonWonder } from '@/components/buffon-wonder';
import { CollatzWonder } from '@/components/collatz-wonder';
import { FourierWonder } from '@/components/fourier-wonder';
import { GaltonWonder } from '@/components/galton-wonder';
import { LocaleSelector } from '@/components/locale-selector';
import { LorenzWonder } from '@/components/lorenz-wonder';
import { MandelbrotWonder } from '@/components/mandelbrot-wonder';
import { NewtonWonder } from '@/components/newton-wonder';
import { PageBreadcrumbs } from '@/components/page-breadcrumbs';
import { PendulumWaveWonder } from '@/components/pendulum-wave-wonder';
import { PhyllotaxisWonder } from '@/components/phyllotaxis-wonder';
import { PrimeSpiralWonder } from '@/components/prime-spiral-wonder';
import { RichMath } from '@/components/rich-math';
import { SiteNavMenu } from '@/components/site-nav-menu';
import { Clauses } from '@/components/wonder-card';
import {
  WonderExportContext,
  type WonderExportInfo,
} from '@/components/wonder-export';
import type { WonderStageLabels } from '@/components/wonder-stage';
import { getCurve } from '@/content/curves';
import { getLab, labPath } from '@/content/labs';
import { localeText, type ContentLocale } from '@/content/text';
import {
  publicWonders,
  wonderOgImage,
  wonderPath,
  type Wonder,
} from '@/content/wonders';

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

/** Host and path as printed on exports: curvg.com/zh/wonders/<slug>. */
function shownUrl(wonder: Wonder, lang: ContentLocale): string {
  let host = 'curvg.com';
  try {
    const url = new URL(envConfigs.app_url);
    if (!/^(localhost|127\.)/.test(url.hostname)) {
      host = url.host.replace(/^www\./, '');
    }
  } catch {
    // Keep the default.
  }
  return `${host}${lang === 'zh' ? '/zh' : ''}${wonderPath(wonder)}`;
}

/** The wonder after this one, wrapping round: suggested when a story ends. */
function nextWonder(wonder: Wonder, lang: ContentLocale) {
  const all = publicWonders();
  if (all.length < 2) return undefined;
  const i = all.findIndex((item) => item.slug === wonder.slug);
  const next = all[(i + 1) % all.length];
  return { href: wonderPath(next), name: localeText(next.name, lang) };
}

/** Export copy and labels for the stage's video/snapshot tools. */
function exportInfo(wonder: Wonder, lang: ContentLocale): WonderExportInfo {
  return {
    slug: wonder.slug,
    path: wonderPath(wonder),
    next: nextWonder(wonder, lang),
    text: {
      eyebrow: `${envConfigs.app_name} · ${m['wonders.breadcrumb']()} · ${m['wonders.page.no']({ number: wonder.number })}`,
      title: localeText(wonder.question, lang),
      captions: wonder.beats.map((beat) => localeText(beat, lang)),
      takeaway: localeText(wonder.takeaway, lang),
      url: shownUrl(wonder, lang),
      cta: m['wonders.export.cta'](),
    },
    labels: {
      snapshot: m['wonders.export.snapshot'](),
      snapshotSaved: m['wonders.export.snapshot_saved'](),
      copyLink: m['wonders.export.copy_link'](),
      linkCopied: m['wonders.export.link_copied'](),
      next: m['wonders.export.next'](),
      video: m['wonders.export.video'](),
      dialogTitle: m['wonders.export.dialog_title'](),
      dialogLead: m['wonders.export.dialog_lead'](),
      content: m['wonders.export.content'](),
      story: (seconds) => m['wonders.export.story']({ seconds }),
      storyNote: m['wonders.export.story_note'](),
      mine: m['wonders.export.mine'](),
      mineNote: m['wonders.export.mine_note'](),
      aspect: m['wonders.export.aspect'](),
      landscape: m['wonders.export.landscape'](),
      portrait: m['wonders.export.portrait'](),
      quality: m['wonders.export.quality'](),
      free: m['wonders.export.free'](),
      freeNote: m['wonders.export.free_note'](),
      hd: m['wonders.export.hd'](),
      hdNote: m['wonders.export.hd_note'](),
      credits: (cost) => m['wonders.export.credits']({ cost }),
      balance: (balance) => m['wonders.export.balance']({ balance }),
      endCard: m['wonders.export.end_card'](),
      start: m['wonders.export.start'](),
      signIn: m['wonders.export.sign_in'](),
      rendering: (percent) => m['wonders.export.rendering']({ percent }),
      renderingNote: m['wonders.export.rendering_note'](),
      cancel: m['wonders.export.cancel'](),
      downloadFree: m['wonders.export.download_free'](),
      downloadHd: (cost) => m['wonders.export.download_hd']({ cost }),
      upsell: m['wonders.export.upsell'](),
      upgrade: m['wonders.export.upgrade'](),
      noCredits: m['wonders.export.no_credits'](),
      unsupported: m['wonders.export.unsupported'](),
      failed: m['wonders.export.failed'](),
      again: m['wonders.export.again'](),
      close: m['wonders.export.close'](),
      endTitle: m['wonders.export.end_title'](),
      endBody: m['wonders.export.end_body'](),
      endPlay: m['wonders.export.end_play'](),
    },
  };
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
    fullscreen: m['wonders.stage.fullscreen'](),
    exitFullscreen: m['wonders.stage.exit_fullscreen'](),
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
    case 'pendulum-wave':
      return (
        <PendulumWaveWonder
          overlay={overlay}
          stage={stage(m['wonders.pendulum.canvas']())}
          labels={{
            time: m['wonders.pendulum.time'](),
            gap: m['wonders.pendulum.gap'](),
            pattern: m['wonders.pendulum.pattern'](),
            groups: (count) => m['wonders.pendulum.groups']({ count }),
            together: m['wonders.pendulum.together'](),
            wave: m['wonders.pendulum.wave'](),
            jump: m['wonders.pendulum.jump'](),
            speed: m['wonders.pendulum.speed'](),
            count: m['wonders.pendulum.count'](),
            showWave: m['wonders.pendulum.show_wave'](),
            hint: m['wonders.pendulum.hint'](),
          }}
        />
      );
    case 'prime-spirals':
      return (
        <PrimeSpiralWonder
          overlay={overlay}
          stage={stage(m['wonders.primes.canvas']())}
          labels={{
            view: m['wonders.primes.view'](),
            primes: m['wonders.primes.primes'](),
            arms: m['wonders.primes.arms'](),
            armsValue: (count) => m['wonders.primes.arms_value']({ count }),
            oneSpiral: m['wonders.primes.one_spiral'](),
            zoom: m['wonders.primes.zoom'](),
            presets: m['wonders.primes.presets'](),
            primesOnly: m['wonders.primes.primes_only'](),
            colour: m['wonders.primes.colour'](),
            noColour: m['wonders.primes.no_colour'](),
            hint: m['wonders.primes.hint'](),
            formatCount: (value) =>
              value.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'),
          }}
        />
      );
    case 'newton-fractal':
      return (
        <NewtonWonder
          overlay={overlay}
          stage={stage(m['wonders.newton.canvas']())}
          labels={{
            noWebgl: m['wonders.mandelbrot.no_webgl'](),
            reached: (steps) => m['wonders.newton.reached']({ steps }),
            never: m['wonders.newton.never'](),
            guess: m['wonders.newton.guess'](),
            equation: m['wonders.newton.equation'](),
            custom: m['wonders.newton.custom'](),
            zoom: m['wonders.mandelbrot.zoom'](),
            roots: m['wonders.newton.roots'](),
            presets: m['wonders.newton.presets'](),
            addRoot: m['wonders.newton.add_root'](),
            removeRoot: m['wonders.newton.remove_root'](),
            overview: m['wonders.newton.overview'](),
            hint: m['wonders.newton.hint'](),
            formatZoom: (factor) => formatZoom(factor, lang),
          }}
        />
      );
    case 'galton-board':
      return (
        <GaltonWonder
          overlay={overlay}
          stage={stage(m['wonders.galton.canvas']())}
          labels={{
            dropped: m['wonders.galton.dropped'](),
            middle: m['wonders.galton.middle'](),
            versus: (measured, expected) =>
              m['wonders.galton.versus']({ measured, expected }),
            mean: m['wonders.galton.mean'](),
            rows: m['wonders.galton.rows'](),
            tilt: m['wonders.galton.tilt'](),
            rate: m['wonders.galton.rate'](),
            dropMore: m['wonders.galton.drop_more'](),
            reset: m['wonders.galton.reset'](),
            pascal: m['wonders.galton.pascal'](),
            curve: m['wonders.galton.curve'](),
            hint: m['wonders.galton.hint'](),
          }}
        />
      );
    case 'buffon-needle':
      return (
        <BuffonWonder
          overlay={overlay}
          stage={stage(m['wonders.buffon.canvas']())}
          labels={{
            thrown: m['wonders.buffon.thrown'](),
            crossed: m['wonders.buffon.crossed'](),
            versus: (measured, expected) =>
              m['wonders.galton.versus']({ measured, expected }),
            estimate: m['wonders.buffon.estimate'](),
            length: m['wonders.buffon.length'](),
            rate: m['wonders.buffon.rate'](),
            throwMore: m['wonders.buffon.throw_more'](),
            reset: m['wonders.galton.reset'](),
            graph: m['wonders.buffon.graph'](),
            hint: m['wonders.buffon.hint'](),
          }}
        />
      );
    case 'collatz-tree':
      return (
        <CollatzWonder
          overlay={overlay}
          stage={stage(m['wonders.collatz.canvas']())}
          labels={{
            numbers: m['wonders.collatz.numbers'](),
            steps: m['wonders.collatz.steps'](),
            peak: m['wonders.collatz.peak'](),
            count: m['wonders.collatz.count'](),
            even: m['wonders.collatz.even'](),
            odd: m['wonders.collatz.odd'](),
            follow: m['wonders.collatz.follow'](),
            none: m['wonders.collatz.none'](),
            hint: m['wonders.collatz.hint'](),
            formatCount: (value) =>
              value.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US'),
          }}
        />
      );
    case 'strange-attractors':
      return (
        <AttractorWonder
          overlay={overlay}
          stage={stage(m['wonders.attractors.canvas']())}
          labels={{
            lambda: m['wonders.attractors.lambda'](),
            kind: m['wonders.attractors.kind'](),
            kinds: {
              chaos: m['wonders.attractors.kind_chaos'](),
              curve: m['wonders.attractors.kind_curve'](),
              cycle: m['wonders.attractors.kind_cycle'](),
            },
            gallery: m['wonders.attractors.gallery'](),
            random: m['wonders.attractors.random'](),
            hint: m['wonders.attractors.hint'](),
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
        <WonderExportContext.Provider value={exportInfo(wonder, lang)}>
          <StageFor wonder={wonder} lang={lang} />
        </WonderExportContext.Provider>
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
