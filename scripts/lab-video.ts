/**
 * Lab → narrated lesson video, no model in the loop.
 *
 *   pnpm video:labs [--base http://localhost:3000] [--lang zh,en]
 *                   [--aspect landscape,portrait] [slug ...]
 *
 * For each lab: speak every cue of the film script with edge-tts, measure
 * the clips, lay out the timeline (`src/lib/lab-video/timeline.ts`), then
 * open /render/lab/<slug> in headless Chrome, seek it frame by frame, and
 * pipe the frames plus the voice track into ffmpeg. Output per lab and
 * language lands in output/lab-videos/<slug>/: <lang>-<aspect>.mp4, a
 * poster, WebVTT captions and a manifest with the timeline and digests.
 *
 * Needs a running dev or preview server and ffmpeg/ffprobe. The voice comes
 * from `LAB_VIDEO_TTS`:
 *
 * - `say` (default): macOS system voices. Offline, fine for checking timing
 *   and layout, not for publishing.
 * - `openai`: any OpenAI-compatible `POST {LAB_VIDEO_TTS_URL}/audio/speech`
 *   (OpenAI, SiliconFlow CosyVoice, a relay). Needs `LAB_VIDEO_TTS_KEY`,
 *   `LAB_VIDEO_TTS_MODEL`, and `LAB_VIDEO_VOICE_ZH` / `LAB_VIDEO_VOICE_EN`.
 * - `edge`: `python3 -m edge_tts`, when Microsoft's endpoint accepts it.
 *
 * Voice clips are cached by provider, voice and text, so re-running after a
 * copy edit only re-speaks what changed.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

import { defaultParamValues } from '@/lib/board/evaluate';
import type { SpeechLang } from '@/lib/lab-video/speech';
import {
  buildLabFilm,
  LAB_FILM_FPS,
  LAB_FILM_SIZE,
  labFilmCaptions,
  labFilmScripts,
  type LabFilmAspect,
  type LabFilmTimeline,
} from '@/lib/lab-video/timeline';
import { getLab, labBoard, publicLabs } from '@/content/labs';

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

type TtsProvider = 'say' | 'openai' | 'edge';

const TTS = (process.env.LAB_VIDEO_TTS ?? 'say') as TtsProvider;

const DEFAULT_VOICES: Record<TtsProvider, Record<SpeechLang, string>> = {
  say: { zh: 'Tingting', en: 'Samantha' },
  openai: { zh: 'alloy', en: 'alloy' },
  edge: { zh: 'zh-CN-XiaoxiaoNeural', en: 'en-US-AvaNeural' },
};

const VOICES: Record<SpeechLang, string> = {
  zh: process.env.LAB_VIDEO_VOICE_ZH ?? DEFAULT_VOICES[TTS].zh,
  en: process.env.LAB_VIDEO_VOICE_EN ?? DEFAULT_VOICES[TTS].en,
};

const OUT = path.resolve('output/lab-videos');

function parseArgs(argv: string[]) {
  const options = {
    base: 'http://localhost:3000',
    langs: ['zh', 'en'] as SpeechLang[],
    aspects: ['landscape'] as LabFilmAspect[],
    slugs: [] as string[],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base') options.base = argv[++i];
    else if (arg === '--lang')
      options.langs = argv[++i].split(',') as SpeechLang[];
    else if (arg === '--aspect')
      options.aspects = argv[++i].split(',') as LabFilmAspect[];
    else options.slugs.push(arg);
  }
  return options;
}

function run(
  cmd: string,
  args: string[],
  input?: NodeJS.ReadableStream
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    if (input) input.pipe(child.stdin);
    else child.stdin.end();
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(out)
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

async function synthesize(lang: SpeechLang, text: string, file: string) {
  const voice = VOICES[lang];
  if (TTS === 'say') {
    const aiff = `${file}.aiff`;
    await run('say', ['-v', voice, '-o', aiff, text]);
    await run('ffmpeg', [
      '-y',
      '-i',
      aiff,
      '-c:a',
      'libmp3lame',
      '-q:a',
      '2',
      file,
    ]);
    await rm(aiff);
    return;
  }
  if (TTS === 'edge') {
    await run('python3', [
      '-m',
      'edge_tts',
      '--voice',
      voice,
      '--text',
      text,
      '--write-media',
      file,
    ]);
    return;
  }
  const url = process.env.LAB_VIDEO_TTS_URL;
  const key = process.env.LAB_VIDEO_TTS_KEY;
  const model = process.env.LAB_VIDEO_TTS_MODEL;
  if (!url || !key || !model)
    throw new Error(
      'LAB_VIDEO_TTS=openai needs LAB_VIDEO_TTS_URL, _KEY and _MODEL'
    );
  const response = await fetch(`${url.replace(/\/+$/, '')}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, voice, input: text, response_format: 'mp3' }),
  });
  if (!response.ok)
    throw new Error(
      `TTS ${response.status}: ${(await response.text()).slice(0, 300)}`
    );
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

/** One cue's narration as an mp3, cached by provider, voice and text. */
async function speak(dir: string, lang: SpeechLang, text: string) {
  const key = sha(`${TTS}\n${VOICES[lang]}\n${text}`).slice(0, 16);
  const file = path.join(dir, `${key}.mp3`);
  if (!existsSync(file)) await synthesize(lang, text, file);
  return { file, seconds: await duration(file) };
}

/** Place each clip at its cue's voice start and mix to one track. */
async function voiceTrack(film: LabFilmTimeline, clips: string[], out: string) {
  const inputs = clips.flatMap((clip) => ['-i', clip]);
  const delays = film.cues
    .map((cue, i) => {
      const ms = Math.round(cue.voiceStart * 1000);
      return `[${i}:a]adelay=${ms}|${ms},aresample=48000[a${i}]`;
    })
    .join(';');
  const mix = `${film.cues.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,apad,atrim=0:${film.duration.toFixed(3)}[out]`;
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
    out,
  ]);
}

async function renderFilm(
  base: string,
  slug: string,
  lang: SpeechLang,
  aspect: LabFilmAspect
) {
  const lab = getLab(slug);
  if (!lab) throw new Error(`Unknown lab ${slug}`);
  const dir = path.join(OUT, slug);
  const voiceDir = path.join(OUT, '.voice', lang);
  await mkdir(dir, { recursive: true });
  await mkdir(voiceDir, { recursive: true });

  const scripts = labFilmScripts(lab, lang);
  const clips = [];
  for (const script of scripts) clips.push(await speak(voiceDir, lang, script));

  const board = labBoard(lab, lang);
  const film = buildLabFilm(
    lab,
    lang,
    defaultParamValues(board.spec),
    clips.map((clip) => clip.seconds)
  );
  const name = `${lang}-${aspect}`;
  const wav = path.join(dir, `${name}.voice.wav`);
  await voiceTrack(
    film,
    clips.map((clip) => clip.file),
    wav
  );

  const size = LAB_FILM_SIZE[aspect];
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({
    viewport: size,
    deviceScaleFactor: 1,
    colorScheme: 'light',
  });
  await page.addInitScript((value) => {
    window.__curvgFilm = value;
  }, film);
  await page.goto(`${base}/render/lab/${slug}?lang=${lang}&aspect=${aspect}`, {
    waitUntil: 'networkidle',
  });
  const ready = () =>
    page.waitForFunction(() => window.__curvgReady && window.__curvgSeek);
  await ready();
  // A dev server's hot reload can navigate the page mid-render; the film is
  // re-injected by the init script, so wait for the page and retry the frame.
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

  const mp4 = path.join(dir, `${name}.mp4`);
  const encoder = spawn(
    'ffmpeg',
    [
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(LAB_FILM_FPS),
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
      '20',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
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

  const frames = Math.ceil(film.duration * LAB_FILM_FPS);
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const jpeg = await frameAt(i / LAB_FILM_FPS);
    if (!encoder.stdin.write(jpeg))
      await new Promise((resolve) => encoder.stdin.once('drain', resolve));
    if (i % 300 === 0)
      process.stdout.write(
        `  ${slug} ${name} frame ${i}/${frames} (${((Date.now() - started) / 1000).toFixed(0)}s)\n`
      );
  }
  encoder.stdin.end();
  await encoded;
  await rm(wav);

  // Poster: the first step, once the board has settled.
  const first = film.cues.find((cue) => cue.kind === 'step') ?? film.cues[0];
  await page.evaluate(
    (t) => window.__curvgSeek!(t),
    Math.min(first.voiceEnd, first.voiceStart + 2)
  );
  const poster = path.join(dir, `${name}.jpg`);
  await page.screenshot({ path: poster, type: 'jpeg', quality: 88 });
  await browser.close();

  const vtt = path.join(dir, `${lang}.vtt`);
  await writeFile(vtt, labFilmCaptions(film));
  const video = await readFile(mp4);
  const manifest = {
    slug,
    lang,
    aspect,
    fps: LAB_FILM_FPS,
    frames,
    duration: Number(film.duration.toFixed(3)),
    tts: TTS,
    voice: VOICES[lang],
    labUpdated: lab.updated,
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
  : publicLabs().map((lab) => lab.slug);

for (const slug of slugs)
  for (const lang of options.langs)
    for (const aspect of options.aspects)
      await renderFilm(options.base, slug, lang, aspect);
