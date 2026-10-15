import type { LocaleText, Publication } from '../text';

/**
 * A math wonder (/wonders): one striking phenomenon told as a short animated
 * story on a dark stage, then handed to the reader to play with. Unlike a lab
 * (/labs), it does not follow a syllabus chapter; it answers a "why does this
 * happen?" question. See docs/WONDERS_PLAN.md.
 */
export type WonderSection = {
  id: string;
  title: LocaleText;
  /** Paragraphs split by blank lines; `$…$`, `$$…$$`, `**bold**`, `- ` lists. */
  body: LocaleText;
};

export type WonderFaq = { question: LocaleText; answer: LocaleText };

export type WonderSource = { title: string; url: string };

/**
 * One narrated line of a wonder film, per story beat. `text` is shown as the
 * caption; `speak` overrides what the voice reads when a symbol would be read
 * badly (π, fractions).
 */
export type WonderFilmLine = { text: LocaleText; speak?: LocaleText };

export type Wonder = {
  slug: string;
  publication: Publication;
  /** Running number shown as "No. 1" on the stage and the card. */
  number: number;
  /** ISO date of the last content change (sitemap lastmod). */
  updated: string;
  /** Field tag, e.g. 分析 · 信号 / Analysis · Signals. */
  field: LocaleText;
  /** Short name for cards and breadcrumbs, e.g. 傅里叶级数. */
  name: LocaleText;
  /**
   * Search title, keyword first, under ~60 display units with the brand
   * (CJK counts double). The question stays the H1.
   */
  metaTitle: LocaleText;
  /** The question the story answers. Page H1. */
  question: LocaleText;
  /** One or two sentences. Meta description and stage subtitle. */
  summary: LocaleText;
  /** The one thing to remember, shown on the card and after the story. */
  takeaway: LocaleText;
  /**
   * One caption per story beat, in order; written to be read aloud, so the
   * same lines are the narration script for a film.
   */
  beats: readonly LocaleText[];
  /**
   * Narration for the film (`pnpm video:wonders`), one line per beat. Written
   * to be heard: a hook up front, a call to the page at the end. Numbers are
   * pinned by tests/wonders.test.ts like the captions.
   */
  film?: readonly WonderFilmLine[];
  sections: readonly WonderSection[];
  faq: readonly WonderFaq[];
  /** Curve encyclopedia entries this wonder draws on. */
  relatedCurves: readonly string[];
  /** Lab slugs that teach the syllabus side of this wonder. */
  relatedLabs: readonly string[];
  sources: readonly WonderSource[];
};
