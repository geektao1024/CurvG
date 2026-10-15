import { useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { flushSync } from 'react-dom';

import type { StageInsets, WonderEngine } from '@/lib/wonders/engine';
import {
  buildWonderFilm,
  cueAt,
  storyTimeAt,
  WONDER_FILM_SIZE,
  type WonderFilmAspect,
  type WonderFilmTimeline,
} from '@/lib/wonders/film';
import { FourierEngine } from '@/lib/wonders/fourier-scene';
import { m } from '@/paraglide/messages.js';
import { Clauses } from '@/components/wonder-card';
import type { ContentLocale } from '@/content/text';
import { getWonder } from '@/content/wonders';
import type { Wonder } from '@/content/wonders/types';

/**
 * Frame source for wonder films. `scripts/wonder-video.ts` loads this page in
 * a headless browser, injects the voiced timeline as `window.__curvgWonderFilm`
 * and calls `window.__curvgSeek(t)` once per frame. Opened by hand it plays
 * with estimated timings, as a preview. Not a public page: noindex, and the
 * root shell skips its widgets on /render/*.
 */

declare global {
  interface Window {
    __curvgWonderFilm?: WonderFilmTimeline;
    __curvgSeek?: (t: number) => Promise<void>;
    __curvgReady?: boolean;
  }
}

/** Engines that have a film. Each wonder opts in by adding `film` lines. */
function engineFor(wonder: Wonder, lang: ContentLocale): WonderEngine | null {
  switch (wonder.slug) {
    case 'fourier-epicycles':
      return new FourierEngine({
        overshoot: (percent) =>
          m['wonders.stage.overshoot_note']({ percent }, { locale: lang }),
      });
    default:
      return null;
  }
}

/** Picture margins kept clear of the title block and the caption. */
const INSETS: Record<WonderFilmAspect, StageInsets> = {
  landscape: { top: 190, right: 80, bottom: 190, left: 80 },
  portrait: { top: 420, right: 40, bottom: 470, left: 40 },
};

/**
 * Stage drawings are tuned for a ~1280px page; the film draws them at 1.5×
 * so strokes and canvas labels keep their on-page weight at 1080p.
 */
const PICTURE_SCALE = 1.5;

const fade = (t: number, from: number, length = 0.35) =>
  Math.min(1, Math.max(0, (t - from) / length));

function WonderFilmPage() {
  const { slug, lang, aspect } = Route.useLoaderData();
  const wonder = getWonder(slug)!;
  const lines = wonder.film!.map((line) => line.text[lang]);
  const size = WONDER_FILM_SIZE[aspect];
  const insets = INSETS[aspect];

  const [engine] = useState(() => engineFor(wonder, lang)!);
  const [film, setFilm] = useState<WonderFilmTimeline>(() =>
    buildWonderFilm({
      beats: engine.beats,
      length: engine.length,
      lines,
      lang,
    })
  );
  const [time, setTime] = useState(0);
  const [preview, setPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.__curvgWonderFilm) setFilm(window.__curvgWonderFilm);
    else setPreview(true);
    window.__curvgSeek = (next: number) =>
      new Promise((resolve) => {
        flushSync(() => {
          setPreview(false);
          setTime(next);
        });
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    void document.fonts.ready.then(() => {
      window.__curvgReady = true;
    });
    return () => {
      window.__curvgSeek = undefined;
    };
  }, []);

  // Preview: play in real time, loop.
  useEffect(() => {
    if (!preview) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setTime(((now - start) / 1000) % film.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [preview, film.duration]);

  // Attach once; every frame is drawn from film time alone.
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = size.width;
    canvas.height = size.height;
    engine.attach({ gl: null, ui: canvas });
    engine.resize?.(
      size.width / PICTURE_SCALE,
      size.height / PICTURE_SCALE,
      PICTURE_SCALE
    );
  }, [engine, size.width, size.height]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.setTransform(PICTURE_SCALE, 0, 0, PICTURE_SCALE, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    engine.frame(
      {
        mode: 'story',
        t: storyTimeAt(film, time),
        dt: 1 / 30,
        playing: true,
        width: size.width / PICTURE_SCALE,
        height: size.height / PICTURE_SCALE,
        insets: {
          top: insets.top / PICTURE_SCALE,
          right: insets.right / PICTURE_SCALE,
          bottom: insets.bottom / PICTURE_SCALE,
          left: insets.left / PICTURE_SCALE,
        },
      },
      ctx
    );
  }, [engine, film, time, size.width, size.height, insets]);

  const cue = cueAt(film, time);
  const captionOpacity = cue ? fade(time, cue.voiceStart - 0.15, 0.3) : 0;
  const outro = fade(time, film.outroStart, 0.6);
  const titleOpacity = 1 - outro;
  const url = `curvg.com${lang === 'zh' ? '/zh' : ''}/wonders/${wonder.slug}`;
  const text = useMemo(
    () => ({
      eyebrow: `CurvG · ${m['wonders.breadcrumb']({}, { locale: lang })} · ${m['wonders.page.no']({ number: wonder.number }, { locale: lang })}`,
      question: wonder.question[lang],
      takeaway: wonder.takeaway[lang],
      cta: lang === 'zh' ? '在网页上自己画一笔' : 'Draw your own on the web',
    }),
    [wonder, lang]
  );

  return (
    <div className={`wonder-film is-${aspect}`} style={size}>
      <canvas ref={canvasRef} className="wonder-film-canvas" style={size} />
      <div className="wonder-film-scrim" />
      <header className="wonder-film-head" style={{ opacity: titleOpacity }}>
        <p>{text.eyebrow}</p>
        <h1>
          <Clauses text={text.question} />
        </h1>
      </header>
      {cue && outro < 1 ? (
        <p
          className="wonder-film-caption"
          style={{ opacity: captionOpacity * (1 - outro) }}
        >
          {cue.text}
        </p>
      ) : null}
      {outro > 0 ? (
        <div className="wonder-film-outro" style={{ opacity: outro }}>
          <p className="wonder-film-brand">
            Curv<span>G</span>
          </p>
          <p className="wonder-film-takeaway">{text.takeaway}</p>
          <p className="wonder-film-url">{url}</p>
          <p className="wonder-film-cta">{text.cta}</p>
        </div>
      ) : null}
    </div>
  );
}

const FILM_CSS = `
html,body{margin:0;background:#06070c;overflow:hidden}
.wonder-film{position:relative;overflow:hidden;color:#eceaf4;
  background:radial-gradient(60% 55% at 30% 45%,rgba(120,92,255,.13),transparent 70%),
  radial-gradient(45% 45% at 78% 60%,rgba(40,170,220,.08),transparent 70%),#06070c}
.wonder-film-canvas{position:absolute;inset:0;display:block}
.wonder-film-scrim{position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(6,7,12,.75),transparent 22%,transparent 74%,rgba(6,7,12,.8))}
.wonder-film-head{position:absolute;left:80px;top:64px;right:80px}
.wonder-film-head p{margin:0 0 14px;font:600 22px/1 var(--font-code,monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(236,234,244,.62)}
.wonder-film-head h1{margin:0;font:400 52px/1.2 var(--font-heading,serif);max-width:1300px;text-wrap:balance}
.wonder-film-caption{position:absolute;left:0;right:0;bottom:70px;margin:0 auto;width:fit-content;max-width:1500px;
  padding:14px 30px;border-radius:22px;background:rgba(6,7,12,.82);box-shadow:0 0 40px 16px rgba(6,7,12,.6);text-align:center;
  font:400 42px/1.5 var(--font-heading,serif);text-wrap:balance;
  text-shadow:0 1px 2px rgba(0,0,0,.9),0 0 24px rgba(6,7,12,.9)}
.wonder-film-outro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:26px;text-align:center;padding:0 140px;background:rgba(6,7,12,.72)}
.wonder-film-outro p{margin:0}
.wonder-film-brand{font:400 112px/1 var(--font-heading,serif)}
.wonder-film-brand span{color:#ffb84d}
.wonder-film-takeaway{font:400 40px/1.5 var(--font-heading,serif);max-width:1300px;text-wrap:balance;color:rgba(236,234,244,.86)}
.wonder-film-url{font:500 34px/1 var(--font-code,monospace);color:#6ee7ff}
.wonder-film-cta{font:500 28px/1 var(--font-sans,sans-serif);color:rgba(236,234,244,.62)}
.wonder-film.is-portrait .wonder-film-head{left:60px;right:60px;top:150px}
.wonder-film.is-portrait .wonder-film-head p{font-size:24px}
.wonder-film.is-portrait .wonder-film-head h1{font-size:64px}
.wonder-film.is-portrait .wonder-film-caption{bottom:230px;max-width:960px;font-size:46px}
.wonder-film.is-portrait .wonder-film-outro{padding:0 70px}
.wonder-film.is-portrait .wonder-film-brand{font-size:120px}
.wonder-film.is-portrait .wonder-film-takeaway{font-size:44px}
.wonder-film.is-portrait .wonder-film-url{font-size:32px}
`;

export const Route = createFileRoute('/render/wonder/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: search.lang === 'en' ? 'en' : 'zh',
    aspect: search.aspect === 'portrait' ? 'portrait' : 'landscape',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => {
    const wonder = getWonder(params.slug);
    if (!wonder?.film) throw notFound();
    return {
      slug: params.slug,
      lang: deps.lang as ContentLocale,
      aspect: deps.aspect as WonderFilmAspect,
    };
  },
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    styles: [{ children: FILM_CSS }],
  }),
  component: WonderFilmPage,
});
