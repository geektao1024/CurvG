/**
 * Video templates: the paid path (docs/VIDEO_TEMPLATES.md).
 *
 * A template is a pure function from validated parameters to a finished
 * Manim scene. Every number on screen is computed here, in TypeScript, from
 * the parameters; a model may choose the template and fill the parameters,
 * but never writes a frame. Same parameters, same film, every time.
 */

export type TemplateLocale = 'en' | 'zh';
export type TemplateFrame = '16:9' | '9:16';
export type TemplateTheme = 'paper' | 'studio';

export type Localized = Record<TemplateLocale, string>;

export type TemplateCategory =
  | 'functions'
  | 'calculus'
  | 'trigonometry'
  | 'series'
  | 'curves'
  | 'linear-algebra';

interface ParamBase {
  key: string;
  label: Localized;
  help?: Localized;
}

export interface ExpressionParam extends ParamBase {
  type: 'expression';
  /** The free variable(s) the expression may use; the first is plotted. */
  variables: readonly string[];
  default: string;
}

export interface NumberParam extends ParamBase {
  type: 'number';
  default: number;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
}

export interface ChoiceParam extends ParamBase {
  type: 'choice';
  default: string;
  options: ReadonlyArray<{ value: string; label: Localized }>;
}

export type TemplateParam = ExpressionParam | NumberParam | ChoiceParam;

export type TemplateParamValues = Record<string, string | number>;

/** Rendering choices every template accepts. */
export interface TemplateContext {
  locale: TemplateLocale;
  frame: TemplateFrame;
  theme: TemplateTheme;
}

export interface TemplateFact {
  label: string;
  value: string;
}

export interface TemplateBuild {
  title: string;
  summary: string;
  /** Exact film length; the renderer checks the MP4 against it. */
  durationSeconds: number;
  code: string;
  /** The computed values the film shows, for the result card. */
  facts: TemplateFact[];
  /** Short beats, in order, for the storyboard view. */
  beats: string[];
}

export interface VideoTemplate {
  id: string;
  /** Bump when a change alters films already made from this template. */
  version: number;
  category: TemplateCategory;
  title: Localized;
  summary: Localized;
  /**
   * For the template matcher: what requests this template answers, and what
   * it does not (so a near miss falls through to the beta generator).
   */
  matchHint: string;
  examples: ReadonlyArray<{ prompt: string; params: TemplateParamValues }>;
  params: readonly TemplateParam[];
  /** Cross-parameter rules (a < b); return an error message or null. */
  check?: (params: TemplateParamValues) => string | null;
  build: (
    params: TemplateParamValues,
    context: TemplateContext
  ) => TemplateBuild;
}
