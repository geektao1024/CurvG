/**
 * Wonder → narrated film. A wonder story is a pure function of story time,
 * scripted with one beat per caption. A film keeps that picture and fits it to
 * a real voice: each beat lasts at least as long as its line takes to speak,
 * and film time maps back to story time through a smooth, increasing warp, so
 * the motion slows where a line runs long instead of freezing on a still.
 *
 * Pure and shared by the render page (`/render/wonder/$slug`), the capture
 * script (`scripts/wonder-video.ts`) and the tests.
 */

export const WONDER_FILM_FPS = 30;

export type WonderFilmAspect = 'landscape' | 'portrait';

export const WONDER_FILM_SIZE: Record<
  WonderFilmAspect,
  { width: number; height: number }
> = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
};

/** Silence before a line starts once its beat begins. */
const LEAD = 0.35;
/** Room after a line before the next beat may start. */
const TAIL = 0.55;
/** Seconds the closing card holds after the last line. */
const OUTRO = 3;
/** Words per second used when no voice durations are given (preview). */
const PREVIEW_CHARS_PER_SECOND = { zh: 4.6, en: 15 } as const;

export type WonderFilmCue = {
  index: number;
  /** Film time this beat starts. */
  start: number;
  end: number;
  voiceStart: number;
  voiceEnd: number;
  text: string;
};

export type WonderFilmTimeline = {
  duration: number;
  /** Film time the closing card starts fading in. */
  outroStart: number;
  cues: WonderFilmCue[];
  /** Matching (film, story) times the warp passes through. */
  knots: { film: number; story: number }[];
};

/**
 * Lay the beats out. `beats` are the story's beat start times, `length` its
 * duration, `lines` one narration line per beat and `voiceSeconds` the
 * measured clip lengths (estimated from the text when omitted).
 */
export function buildWonderFilm(params: {
  beats: readonly number[];
  length: number;
  lines: readonly string[];
  lang: 'zh' | 'en';
  voiceSeconds?: readonly number[];
}): WonderFilmTimeline {
  const { beats, length, lines, lang } = params;
  if (lines.length !== beats.length)
    throw new Error(
      `A film needs one line per beat (${lines.length} lines, ${beats.length} beats)`
    );
  const voice = (i: number) =>
    params.voiceSeconds?.[i] ??
    lines[i].length / PREVIEW_CHARS_PER_SECOND[lang];

  const cues: WonderFilmCue[] = [];
  const knots: WonderFilmTimeline['knots'] = [];
  let film = 0;
  for (let i = 0; i < beats.length; i++) {
    const storyStart = beats[i];
    const storyEnd = i + 1 < beats.length ? beats[i + 1] : length;
    const spoken = LEAD + voice(i) + TAIL;
    const last = i === beats.length - 1;
    // The last beat plays at story speed: past the story's end the picture
    // keeps turning on its own, so the closing card never sits on a still.
    const span = last
      ? Math.max(storyEnd - storyStart, spoken) + OUTRO
      : Math.max(storyEnd - storyStart, spoken);
    knots.push({ film, story: storyStart });
    cues.push({
      index: i,
      start: film,
      end: film + span,
      voiceStart: film + LEAD,
      voiceEnd: film + LEAD + voice(i),
      text: lines[i],
    });
    film += span;
    if (last) knots.push({ film, story: storyStart + span });
  }
  const lastCue = cues[cues.length - 1];
  return {
    duration: film,
    outroStart: lastCue.voiceEnd + TAIL,
    cues,
    knots,
  };
}

/**
 * Story time at film time `t`: a monotone cubic through the knots
 * (Fritsch–Carlson), so the story's speed changes smoothly between beats.
 */
export function storyTimeAt(film: WonderFilmTimeline, t: number): number {
  const k = film.knots;
  if (t <= k[0].film) return k[0].story + (t - k[0].film);
  const n = k.length;
  if (t >= k[n - 1].film) return k[n - 1].story + (t - k[n - 1].film);

  const slope = (i: number) =>
    (k[i + 1].story - k[i].story) / (k[i + 1].film - k[i].film);
  const tangent = (i: number) => {
    if (i === 0) return slope(0);
    if (i === n - 1) return slope(n - 2);
    const a = slope(i - 1);
    const b = slope(i);
    // Harmonic mean keeps the curve increasing and inside the two slopes.
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };

  let i = 0;
  while (i < n - 2 && t >= k[i + 1].film) i++;
  const h = k[i + 1].film - k[i].film;
  const s = (t - k[i].film) / h;
  const h00 = (1 + 2 * s) * (1 - s) ** 2;
  const h10 = s * (1 - s) ** 2;
  const h01 = s * s * (3 - 2 * s);
  const h11 = s * s * (s - 1);
  return (
    h00 * k[i].story +
    h10 * h * tangent(i) +
    h01 * k[i + 1].story +
    h11 * h * tangent(i + 1)
  );
}

/** The cue whose beat is playing at film time `t`. */
export function cueAt(
  film: WonderFilmTimeline,
  t: number
): WonderFilmCue | undefined {
  let found: WonderFilmCue | undefined;
  for (const cue of film.cues) if (t >= cue.start) found = cue;
  return found;
}

const stamp = (seconds: number) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (x: number, w = 2) => String(x).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
};

/** WebVTT captions: one cue per line, while it is spoken. */
export function wonderFilmCaptions(film: WonderFilmTimeline): string {
  const body = film.cues
    .map(
      (cue) =>
        `${cue.index + 1}\n${stamp(cue.voiceStart)} --> ${stamp(cue.voiceEnd + 0.4)}\n${cue.text}`
    )
    .join('\n\n');
  return `WEBVTT\n\n${body}\n`;
}
