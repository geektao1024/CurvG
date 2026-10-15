/**
 * Wonder → narrated film, no model in the loop.
 *
 *   pnpm video:wonders [--base http://localhost:3000] [--lang zh,en]
 *                      [--aspect landscape,portrait] [slug ...]
 *
 * For each wonder with `film` lines: speak each line with ElevenLabs, measure
 * the clips, fit the story to them (`src/lib/wonders/film.ts`), then open
 * /render/wonder/<slug> in headless Chrome, seek it frame by frame, and pipe
 * the frames plus the voice track into ffmpeg. Output lands in
 * output/wonder-videos/<slug>/: <lang>-<aspect>.mp4, a poster, WebVTT
 * captions and a manifest.
 *
 * Needs a running dev or preview server, ffmpeg/ffprobe, and
 * `ELEVENLABS_API_KEY` (read from the environment or .env.development).
 * Narrators are set in `NARRATORS` below; `--lang` defaults to en.
 * Clips are cached by voice, model, settings and text, so re-running after a copy edit
 * only re-speaks what changed.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

import {
  buildWonderFilm,
  WONDER_FILM_FPS,
  WONDER_FILM_SIZE,
  wonderFilmCaptions,
  type WonderFilmAspect,
  type WonderFilmTimeline,
} from '@/lib/wonders/film';
import {
  FOURIER_BEATS,
  FOURIER_STORY_LENGTH,
} from '@/lib/wonders/fourier-scene';
import { getWonder, WONDERS } from '@/content/wonders';

type Lang = 'zh' | 'en';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Story clocks of the wonders that have films. */
const STORIES: Record<string, { beats: readonly number[]; length: number }> = {
  'fourier-epicycles': { beats: FOURIER_BEATS, length: FOURIER_STORY_LENGTH },
};

/**
 * Narration per language. English: "Max – Elearning and Documentary", the
 * most-used educational voice in the ElevenLabs library, on Multilingual v2
 * (ElevenLabs' pick for voice-over: steady takes, a speed control, and
 * request stitching so lines flow as one read). Speed 1.05 puts Max at about
 * 140–150 words a minute, the usual explainer pace, slowed a touch for a
 * picture that needs watching. Chinese keeps the premade Alice on v3.
 * Library voices need a paid plan; `WONDER_VIDEO_VOICE_<LANG>` overrides.
 */
type Narrator = {
  voice: string;
  model: string;
  settings: Record<string, number | boolean>;
  /** Send neighbouring lines as context (Multilingual v2 only). */
  stitch: boolean;
};
const NARRATORS: Record<Lang, Narrator> = {
  en: {
    voice: process.env.WONDER_VIDEO_VOICE_EN ?? 'Gfpl8Yo74Is0W6cPUWWT',
    model: 'eleven_multilingual_v2',
    settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true,
      speed: 1.05,
    },
    stitch: true,
  },
  zh: {
    voice: process.env.WONDER_VIDEO_VOICE_ZH ?? 'Xb7hH8MSUJpSbSDYk0k2',
    // v3 takes stability 0 / 0.5 / 1 (creative / natural / robust).
    model: 'eleven_v3',
    settings: { stability: 0.5 },
    stitch: false,
  },
};

/** Master loudness: YouTube, TikTok and Instagram all play at -14 LUFS. */
const LOUDNESS = 'loudnorm=I=-14:TP=-1:LRA=11';

const OUT = path.resolve('output/wonder-videos');

/** Only the one variable is read, so other lines of the file never run. */
function elevenLabsKey(): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  for (const file of ['.env.development', '.env.local', '.env']) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, 'utf8').match(
      /^ELEVENLABS_API_KEY=\s*["']?([^"'\s]+)/m
    );
    if (match) return match[1];
  }
  throw new Error('Set ELEVENLABS_API_KEY (e.g. in .env.development)');
}

function parseArgs(argv: string[]) {
  const options = {
    base: 'http://localhost:3000',
    langs: ['en'] as Lang[],
    aspects: ['landscape', 'portrait'] as WonderFilmAspect[],
    slugs: [] as string[],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') options.base = argv[++i];
    else if (arg === '--lang') options.langs = argv[++i].split(',') as Lang[];
    else if (arg === '--aspect')
      options.aspects = argv[++i].split(',') as WonderFilmAspect[];
    else options.slugs.push(arg);
  }
  return options;
}

/** Run a command; resolves with stdout (or stderr, where ffmpeg logs). */
function run(
  cmd: string,
  args: string[],
  stream: 'stdout' | 'stderr' = 'stdout'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(stream === 'stdout' ? out : err)
        : reject(new Error(`${cmd} exited ${code}: ${err.slice(-800)}`))
    );
  });
}

const sha = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex');

async function duration(file: string) {
  const out = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    file,
  ]);
  return Number(out.trim());
}

type Line = { text: string; previous?: string; next?: string };

async function synthesize(lang: Lang, line: Line, file: string) {
  const narrator = NARRATORS[lang];
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${narrator.voice}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: line.text,
        model_id: narrator.model,
        language_code: lang,
        voice_settings: narrator.settings,
        ...(narrator.stitch
          ? { previous_text: line.previous, next_text: line.next }
          : {}),
      }),
    }
  );
  if (!response.ok)
    throw new Error(
      `ElevenLabs ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

/** One line's narration as an mp3, cached by everything that shapes it. */
async function speak(dir: string, lang: Lang, line: Line) {
  const narrator = NARRATORS[lang];
  const key = sha(
    JSON.stringify(['elevenlabs', narrator, narrator.stitch ? line : line.text])
  ).slice(0, 16);
  const file = path.join(dir, `${key}.mp3`);
  if (!existsSync(file)) await synthesize(lang, line, file);
  return { file, seconds: await duration(file) };
}

/**
 * Place each clip at its cue's voice start and mix to one track, then master
 * it in two passes: measure, then apply a single linear gain to hit the
 * target (one-pass loudnorm guesses and lands a dB or two short).
 */
async function voiceTrack(
  film: WonderFilmTimeline,
  clips: string[],
  out: string
) {
  const inputs = clips.flatMap((clip) => ['-i', clip]);
  const delays = film.cues
    .map((cue, i) => {
      const ms = Math.round(cue.voiceStart * 1000);
      return `[${i}:a]adelay=${ms}|${ms},aresample=48000[a${i}]`;
    })
    .join(';');
  const mix = `${film.cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${film.duration.toFixed(3)}[out]`;
  const raw = `${out}.raw.wav`;
  await run('ffmpeg', [
    '-y',
    ...inputs,
    '-filter_complex',
    `${delays};${mix}`,
    '-map',
    '[out]',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    raw,
  ]);

  const log = await run(
    'ffmpeg',
    ['-i', raw, '-af', `${LOUDNESS}:print_format=json`, '-f', 'null', '-'],
    'stderr'
  );
  const measured = JSON.parse(
    log.slice(log.lastIndexOf('{'), log.lastIndexOf('}') + 1)
  );
  const second = [
    LOUDNESS,
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    'linear=true',
  ].join(':');
  await run('ffmpeg', [
    '-y',
    '-i',
    raw,
    '-af',
    `${second},aresample=48000`,
    '-c:a',
    'pcm_s16le',
    out,
  ]);
  await rm(raw);
}

/** Speak once per language; both aspects share the timeline and the track. */
async function prepare(slug: string, lang: Lang) {
  const wonder = getWonder(slug);
  const story = STORIES[slug];
  if (!wonder?.film || !story) throw new Error(`No film for ${slug}`);
  const voiceDir = path.join(OUT, '.voice', lang);
  await mkdir(voiceDir, { recursive: true });
  const spoken = wonder.film.map((line) => (line.speak ?? line.text)[lang]);
  const clips = [];
  for (let i = 0; i < spoken.length; i++)
    clips.push(
      await speak(voiceDir, lang, {
        text: spoken[i],
        previous: spoken.slice(0, i).join(' ').slice(-600) || undefined,
        next: spoken[i + 1],
      })
    );
  const film = buildWonderFilm({
    beats: story.beats,
    length: story.length,
    lines: wonder.film.map((line) => line.text[lang]),
    lang,
    voiceSeconds: clips.map((clip) => clip.seconds),
  });
  const dir = path.join(OUT, slug);
  await mkdir(dir, { recursive: true });
  const wav = path.join(dir, `${lang}.voice.wav`);
  await voiceTrack(
    film,
    clips.map((clip) => clip.file),
    wav
  );
  await writeFile(path.join(dir, `${lang}.vtt`), wonderFilmCaptions(film));
  return { wonder, film, wav, dir };
}

async function renderFilm(
  base: string,
  slug: string,
  lang: Lang,
  aspect: WonderFilmAspect,
  prepared: Awaited<ReturnType<typeof prepare>>
) {
  const { wonder, film, wav, dir } = prepared;
  const size = WONDER_FILM_SIZE[aspect];
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  await page.addInitScript((value) => {
    window.__curvgWonderFilm = value;
  }, film);
  await page.goto(
    `${base}/render/wonder/${slug}?lang=${lang}&aspect=${aspect}`,
    { waitUntil: 'networkidle' }
  );
  const ready = () =>
    page.waitForFunction(() => window.__curvgReady && window.__curvgSeek);
  await ready();
  const frameAt = async (t: number) => {
    for (let attempt = 0; ; attempt++) {
      try {
        await page.evaluate((at) => window.__curvgSeek!(at), t);
        return await page.screenshot({ type: 'jpeg', quality: 92 });
      } catch (error) {
        if (attempt >= 3) throw error;
        await page.waitForLoadState('networkidle').catch(() => {});
        await ready();
      }
    }
  };

  const name = `${lang}-${aspect}`;
  const mp4 = path.join(dir, `${name}.mp4`);
  const encoder = spawn(
    'ffmpeg',
    [
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(WONDER_FILM_FPS),
      '-c:v',
      'mjpeg',
      '-i',
      '-',
      '-i',
      wav,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      '+faststart',
      mp4,
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] }
  );
  let encoderLog = '';
  encoder.stderr.on(
    'data',
    (d) => (encoderLog = (encoderLog + d).slice(-2000))
  );
  const encoded = new Promise<void>((resolve, reject) => {
    encoder.on('error', reject);
    encoder.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}: ${encoderLog}`))
    );
  });

  const frames = Math.ceil(film.duration * WONDER_FILM_FPS);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const jpeg = await frameAt(i / WONDER_FILM_FPS);
    if (!encoder.stdin.write(jpeg))
      await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    if (i % 300 === 0)
      process.stdout.write(
        `  ${slug} ${name} frame ${i}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)\n`
      );
  }
  encoder.stdin.end();
  await encoded;

  // Poster: the finished π, before the closing card.
  await page.evaluate(
    (t) => window.__curvgSeek!(t),
    Math.max(0, film.outroStart - 0.5)
  );
  await page.screenshot({
    path: path.join(dir, `${name}.jpg`),
    type: 'jpeg',
    quality: 88,
  });
  await browser.close();

  const video = await readFile(mp4);
  const manifest = {
    slug,
    lang,
    aspect,
    fps: WONDER_FILM_FPS,
    frames,
    duration: Number(film.duration.toFixed(3)),
    tts: { provider: 'elevenlabs', ...NARRATORS[lang] },
    wonderUpdated: wonder.updated,
    rendered: new Date().toISOString(),
    sha256: sha(video),
    bytes: video.length,
    film,
  };
  await writeFile(
    path.join(dir, `${name}.json`),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  console.log(
    `✓ ${slug} ${name}: ${film.duration.toFixed(1)}s, ${(video.length / 1e6).toFixed(1)} MB in ${((Date.now() - started) / 1000).toFixed(0)}s`
  );
}

const options = parseArgs(process.argv.slice(2));
const slugs = options.slugs.length
  ? options.slugs
  : WONDERS.filter((wonder) => wonder.film).map((wonder) => wonder.slug);

for (const slug of slugs)
  for (const lang of options.langs) {
    const prepared = await prepare(slug, lang);
    for (const aspect of options.aspects)
      await renderFilm(options.base, slug, lang, aspect, prepared);
    await rm(prepared.wav);
  }
