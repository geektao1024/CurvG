/**
 * Editorial scene library — content graph types.
 *
 * Categories form a tree with one primary parent (breadcrumb and URL) and
 * optional additional parents (cross-listing). Copy lives here, not in
 * messages, so a category can be added without a translation-key rename.
 * See docs/LIBRARY_PLAN.md.
 */

export type LibraryLocale = 'en' | 'zh';

export type LibraryText = { en: string; zh: string };

export type LibraryPublication = 'draft' | 'public';

export type LibraryCategory = {
  id: string;
  publication: LibraryPublication;
  title: LibraryText;
  description: LibraryText;
  /** Tailwind class for the thin accent bar. Stays inside the CurvG palette. */
  accentClass: string;
  order: number;
  primaryParentId?: string;
  additionalParentIds?: readonly string[];
};

export type LibraryPath = {
  id: string;
  publication: LibraryPublication;
  order: number;
  title: LibraryText;
  description: LibraryText;
  /** Curve slugs, in editorial order. Scene slugs join this list in a later phase. */
  curveSlugs: readonly string[];
};

export type LibraryScenePhase = {
  name: LibraryText;
  description: LibraryText;
  /** Present only when the scene is an archived clip with a real timeline. */
  start?: number;
  end?: number;
};

export type LibrarySceneArea = {
  area: LibraryText;
  content: LibraryText;
  notes: LibraryText;
};

/**
 * One editorial scene. Copy describes the archived clip, not a lesson the
 * clip does not show.
 */
export type LibraryScene = {
  slug: string;
  publication: LibraryPublication;
  primaryCategoryId: string;
  additionalCategoryIds?: readonly string[];
  difficulty: 'intro' | 'standard' | 'advanced';
  evidence: 'modeled' | 'verified';
  /** Set for an archived MP4. Omitted when the page itself is the diagram. */
  durationSeconds?: number;
  title: LibraryText;
  question: LibraryText;
  hook: LibraryText;
  payoff: LibraryText;
  equations: readonly string[];
  curveSlugs?: readonly string[];
  prompt: LibraryText;
  video?: { src: string; poster: string };
  phases: readonly LibraryScenePhase[];
  layout: string;
  areas?: readonly LibrarySceneArea[];
  dependencies?: readonly LibraryText[];
  onScreen: readonly LibraryText[];
  absent: readonly LibraryText[];
};

export function libraryText(text: LibraryText, locale: string): string {
  return locale === 'zh' ? text.zh : text.en;
}
