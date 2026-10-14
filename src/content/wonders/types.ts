import type { LibraryPublication, LibraryText } from '../library/types';

/**
 * A math wonder (/wonders): one striking phenomenon told as a short animated
 * story on a dark stage, then handed to the reader to play with. Unlike a lab
 * (/labs), it does not follow a syllabus chapter; it answers a "why does this
 * happen?" question. See docs/WONDERS_PLAN.md.
 */
export type WonderSection = {
  id: string;
  title: LibraryText;
  /** Paragraphs split by blank lines; `$…$`, `$$…$$`, `**bold**`, `- ` lists. */
  body: LibraryText;
};

export type WonderFaq = { question: LibraryText; answer: LibraryText };

export type WonderSource = { title: string; url: string };

export type Wonder = {
  slug: string;
  publication: LibraryPublication;
  /** Running number shown as "No. 1" on the stage and the card. */
  number: number;
  /** ISO date of the last content change (sitemap lastmod). */
  updated: string;
  /** Field tag, e.g. 分析 · 信号 / Analysis · Signals. */
  field: LibraryText;
  /** Short name for cards and breadcrumbs, e.g. 傅里叶级数. */
  name: LibraryText;
  /**
   * Search title, keyword first, under ~60 display units with the brand
   * (CJK counts double). The question stays the H1.
   */
  metaTitle: LibraryText;
  /** The question the story answers. Page H1. */
  question: LibraryText;
  /** One or two sentences. Meta description and stage subtitle. */
  summary: LibraryText;
  /** The one thing to remember, shown on the card and after the story. */
  takeaway: LibraryText;
  /**
   * One caption per story beat, in order; written to be read aloud, so the
   * same lines are the narration script for a film.
   */
  beats: readonly LibraryText[];
  sections: readonly WonderSection[];
  faq: readonly WonderFaq[];
  /** Curve encyclopedia entries this wonder draws on. */
  relatedCurves: readonly string[];
  /** Lab slugs that teach the syllabus side of this wonder. */
  relatedLabs: readonly string[];
  sources: readonly WonderSource[];
};
