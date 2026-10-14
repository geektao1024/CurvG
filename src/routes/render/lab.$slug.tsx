import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { flushSync } from 'react-dom';

import { defaultParamValues } from '@/lib/board/evaluate';
import {
  buildLabFilm,
  type LabFilmAspect,
  type LabFilmTimeline,
} from '@/lib/lab-video/timeline';
import { LabFilmFrame, type LabFilmText } from '@/components/lab-film';
import {
  chapterPath,
  getLab,
  labBoard,
  subjectOf,
  suiteForLab,
} from '@/content/labs';
import type { LibraryLocale } from '@/content/library/types';

/**
 * Frame source for lab films. `scripts/lab-video.ts` loads this page in a
 * headless browser, injects the voiced timeline as `window.__curvgFilm`, and
 * calls `window.__curvgSeek(t)` once per frame. Opened by hand it plays the
 * film with estimated timings, as a preview. Not a public page: noindex,
 * and the root shell skips its widgets on /render/*.
 */

declare global {
  interface Window {
    __curvgFilm?: LabFilmTimeline;
    __curvgSeek?: (t: number) => Promise<void>;
    __curvgReady?: boolean;
  }
}

function LabFilmPage() {
  const { slug, lang, aspect } = Route.useLoaderData();
  const lab = getLab(slug)!;
  const suite = suiteForLab(slug)!;
  const board = labBoard(lab, lang);
  const t = (text: { en: string; zh: string }) => text[lang];

  const [film, setFilm] = useState<LabFilmTimeline>(() =>
    buildLabFilm(lab, lang, defaultParamValues(board.spec))
  );
  const [time, setTime] = useState(0);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (window.__curvgFilm) setFilm(window.__curvgFilm);
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

  const text = useMemo<LabFilmText>(
    () => ({
      brand: 'CurvG',
      context: `${t(subjectOf(suite).name)} · ${t(suite.name)}`,
      chapterTitle: t(lab.chapterTitle),
      question: t(lab.question),
      keyPoints: lab.keyPoints.map(t).slice(0, 4),
      steps: lab.guide.map((step) => ({
        title: t(step.title),
        body: t(step.body),
      })),
      resultTex: lab.resultTex,
      stepLabel: (index, total) =>
        lang === 'zh'
          ? `第 ${index} 步 / 共 ${total} 步`
          : `Step ${index} of ${total}`,
      outroTitle: lang === 'zh' ? '自己动手试试' : 'Now try it yourself',
      outroBody:
        lang === 'zh'
          ? '同一块画板就在网页上：拖动点、调参数，数字会实时重算。'
          : 'The same board is live on the web: drag the points, move the sliders, and every number updates.',
      url: `curvg.com${lang === 'zh' ? '/zh' : ''}${chapterPath(suite, lab)}`,
      boardLabel: t(lab.title),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lab, suite, lang]
  );

  return (
    <LabFilmFrame
      film={film}
      board={board}
      text={text}
      aspect={aspect}
      t={time}
    />
  );
}

export const Route = createFileRoute('/render/lab/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: search.lang === 'en' ? 'en' : 'zh',
    aspect: search.aspect === 'portrait' ? 'portrait' : 'landscape',
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => {
    const lab = getLab(params.slug);
    if (!lab || !suiteForLab(params.slug)) throw notFound();
    return {
      slug: params.slug,
      lang: deps.lang as LibraryLocale,
      aspect: deps.aspect as LabFilmAspect,
    };
  },
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex, nofollow' }],
    styles: [{ children: 'html,body{margin:0;background:#f6f4ef}' }],
  }),
  component: LabFilmPage,
});
