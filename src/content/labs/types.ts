import type { BoardSpecInput } from '@/lib/board/spec';

import type { ContentLocale, LocaleText, Publication } from '../text';

/**
 * Interactive lab: one concept, one board you can move, and the text that
 * explains what the board shows. The indexable unit of /labs (see
 * docs/LABS_PLAN.md) and the source a lesson video is cut from: `guide`
 * steps are param keyframes plus narration.
 */

export type LabLevel = 'middle' | 'high' | 'university';

export type LabGuideStep = {
  title: LocaleText;
  /** Inline TeX with `$…$`. Written to be read aloud. */
  body: LocaleText;
  /** Param values this step moves the board to. */
  set?: Readonly<Record<string, number>>;
};

export type LabSection = {
  id: string;
  title: LocaleText;
  /** Paragraphs split by blank lines; `$…$`, `$$…$$` and `**bold**`. */
  body: LocaleText;
};

export type LabQuizItem = {
  question: LocaleText;
  choices: readonly LocaleText[];
  /** Index into `choices`. */
  answer: number;
  explanation: LocaleText;
};

export type Lab = {
  slug: string;
  publication: Publication;
  levels: readonly LabLevel[];
  /** Short name for the chapter rail, e.g. 导数的几何意义 / Secant to tangent. */
  chapterTitle: LocaleText;
  title: LocaleText;
  /** The question the lab answers. Page H1 and card hook. */
  question: LocaleText;
  /** One or two sentences. Meta description and card body. */
  summary: LocaleText;
  /** Knowledge points shown as tags. */
  keyPoints: readonly LocaleText[];
  /** Board labels are localized, so the spec is built per locale. */
  board: (lang: ContentLocale) => BoardSpecInput;
  guide: readonly LabGuideStep[];
  sections: readonly LabSection[];
  quiz: readonly LabQuizItem[];
  /** TeX heading of the live result card, e.g. a formula the readouts fill in. */
  resultTex: string;
  curveSlugs?: readonly string[];
  related?: readonly string[];
  /** Hand-off into the video creator. */
  videoPrompt: LocaleText;
  /** ISO date of the last content change: sitemap lastmod, dateModified. */
  updated: string;
};

/**
 * A narrated film cut from a lab's guide (`pnpm video:labs`), per language.
 * Published films are listed in `videos.generated.ts`; the page shows the
 * player and emits VideoObject structured data when one exists.
 */
export type LabVideo = {
  /** Site-relative URL of the MP4. */
  src: string;
  poster: string;
  /** WebVTT captions. */
  captions: string;
  /** Vertical cut for Shorts and Reels, when rendered. */
  portrait?: string;
  /** ISO 8601 duration, e.g. PT1M5S. */
  duration: string;
  uploaded: string;
};

/** Top level of /labs. Physics is reserved and stays hidden until it has suites. */
export type LabSubjectId = 'math' | 'physics';

export type LabSubject = {
  id: LabSubjectId;
  publication: Publication;
  name: LocaleText;
  description: LocaleText;
  /** Subject page H1, e.g. 数学交互实验：函数、微积分…. */
  headline: LocaleText;
  metaTitle: LocaleText;
  metaDescription: LocaleText;
};

/**
 * One topic, several chapters, one workspace (/labs/{suite}/{chapter}).
 * Chapters are `Lab` entries; the suite gives them an order and a name.
 */
export type LabSuite = {
  slug: string;
  publication: Publication;
  subject: LabSubjectId;
  name: LocaleText;
  summary: LocaleText;
  chapters: readonly Lab[];
};

export function pick(lang: ContentLocale) {
  return (en: string, zh: string) => (lang === 'zh' ? zh : en);
}
