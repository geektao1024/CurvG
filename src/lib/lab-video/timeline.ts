/**
 * Lab film timeline: a lab's guide steps laid out on a clock. Pure and
 * deterministic, so the render page, the frame capture script and the tests
 * agree on what the board shows at any time `t`.
 *
 * A film is an intro card, one cue per guide step and an outro. Each cue
 * eases the board to its step's params, then holds while the narration for
 * that step plays. Durations come from the synthesized voice; without them
 * (a browser preview) they are estimated from the text length.
 */

import type { Lab } from '@/content/labs/types';

import { captionText, spokenText, type SpeechLang } from './speech';

export type LabFilmAspect = 'landscape' | 'portrait';

export const LAB_FILM_SIZE: Record<
  LabFilmAspect,
  { width: number; height: number }
> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

export const LAB_FILM_FPS = 30;

export type LabFilmCueKind = 'intro' | 'step' | 'outro';

export type LabFilmCue = {
  kind: LabFilmCueKind;
  /** Guide step index for `step` cues. */
  step: number | null;
  start: number;
  end: number;
  /** When the narration for this cue starts and ends. */
  voiceStart: number;
  voiceEnd: number;
  /** What the voice says. */
  script: string;
  /** The same words as written, for captions. */
  caption: string;
  /** Params the board eases to at the start of the cue. */
  target: Readonly<Record<string, number>>;
};

export type LabFilmTimeline = {
  slug: string;
  lang: SpeechLang;
  duration: number;
  cues: LabFilmCue[];
};

/** Seconds of silence before the voice starts in a cue. */
const LEAD = 0.6;
/** Seconds the board holds after the voice ends. */
const TAIL = 0.9;
/** Seconds the board takes to ease to a new step. */
const TRANSITION = 1.4;

const OUTRO: Record<SpeechLang, string> = {
  en: 'Open this lab on CurvG and drag it yourself.',
  zh: '在 CurvG 打开这个实验，亲手拖一拖。',
};

/** The film's copy, one entry per cue: intro, every guide step, outro. */
function labFilmSources(lab: Lab, lang: SpeechLang): string[] {
  return [
    lang === 'zh'
      ? `${lab.chapterTitle.zh}。${lab.question.zh}`
      : `${lab.chapterTitle.en}. ${lab.question.en}`,
    ...lab.guide.map((step) => step.body[lang]),
    OUTRO[lang],
  ];
}

/** What the voice says in each cue. */
export function labFilmScripts(lab: Lab, lang: SpeechLang): string[] {
  return labFilmSources(lab, lang).map((source) => spokenText(source, lang));
}

/** Rough narration length, for previews before a voice is synthesized. */
export function estimateSpeechSeconds(text: string, lang: SpeechLang) {
  return lang === 'zh' ? text.length / 4.6 : text.split(/\s+/).length / 2.6;
}

/**
 * Lay the cues out. `voiceSeconds` holds one duration per script from
 * `labFilmScripts`; missing entries are estimated.
 */
export function buildLabFilm(
  lab: Lab,
  lang: SpeechLang,
  defaults: Readonly<Record<string, number>>,
  voiceSeconds: readonly number[] = []
): LabFilmTimeline {
  const scripts = labFilmScripts(lab, lang);
  const captions = labFilmSources(lab, lang).map(captionText);
  const cues: LabFilmCue[] = [];
  let clock = 0;
  let values = { ...defaults };
  scripts.forEach((script, index) => {
    const kind: LabFilmCueKind =
      index === 0 ? 'intro' : index === scripts.length - 1 ? 'outro' : 'step';
    const step = kind === 'step' ? index - 1 : null;
    const set = step === null ? undefined : lab.guide[step].set;
    values = { ...values, ...set };
    const voice = voiceSeconds[index] ?? estimateSpeechSeconds(script, lang);
    // A step that moves the board lets the move land before the voice.
    const lead = set ? Math.max(LEAD, TRANSITION * 0.6) : LEAD;
    const start = clock;
    const voiceStart = start + lead;
    const voiceEnd = voiceStart + voice;
    const end = voiceEnd + TAIL;
    cues.push({
      kind,
      step,
      start,
      end,
      voiceStart,
      voiceEnd,
      script,
      caption: captions[index],
      target: values,
    });
    clock = end;
  });
  return { slug: lab.slug, lang, duration: clock, cues };
}

export function cueAt(film: LabFilmTimeline, t: number): LabFilmCue {
  return (
    film.cues.find((cue) => t < cue.end) ?? film.cues[film.cues.length - 1]
  );
}

function ease(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

/** Board params at time `t`: the same in-out ease the live lab uses. */
export function paramsAt(
  film: LabFilmTimeline,
  t: number
): Record<string, number> {
  const index = film.cues.indexOf(cueAt(film, t));
  const cue = film.cues[index];
  const from = index > 0 ? film.cues[index - 1].target : cue.target;
  const p = ease(Math.min(1, Math.max(0, (t - cue.start) / TRANSITION)));
  return Object.fromEntries(
    Object.keys(cue.target).map((key) => {
      const a = from[key] ?? cue.target[key];
      return [key, a + (cue.target[key] - a) * p];
    })
  );
}

/** WebVTT captions: each cue's narration, split into sentences. */
export function labFilmCaptions(film: LabFilmTimeline): string {
  const stamp = (s: number) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor(ms / 60_000) % 60;
    const sec = Math.floor(ms / 1000) % 60;
    const frac = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(frac).padStart(3, '0')}`;
  };
  const lines = ['WEBVTT', ''];
  for (const cue of film.cues) {
    // Time each sentence by its share of the spoken words; show it as
    // written when the two split the same way.
    const spoken = splitSentences(cue.script);
    const written = splitSentences(cue.caption);
    const shown = written.length === spoken.length ? written : spoken;
    const total = spoken.reduce((sum, s) => sum + s.length, 0) || 1;
    let at = cue.voiceStart;
    spoken.forEach((sentence, i) => {
      const span = ((cue.voiceEnd - cue.voiceStart) * sentence.length) / total;
      lines.push(`${stamp(at)} --> ${stamp(at + span)}`, shown[i], '');
      at += span;
    });
  }
  return lines.join('\n');
}

function splitSentences(text: string): string[] {
  // Latin . ! ? end a sentence only before a space, so 0.5 and 3! stay whole.
  return text
    .split(/(?<=[。！？])|(?<=[.!?])(?=\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}
