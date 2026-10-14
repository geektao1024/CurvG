/**
 * Upload rendered lab films to R2 and list them in
 * src/content/labs/videos.generated.ts, which turns on the player and
 * VideoObject data on each chapter page.
 *
 *   pnpm video:labs:publish [--local] [--dry-run] [slug ...]
 *
 * `--local` writes to wrangler's local R2 (for `wrangler dev`) instead of
 * the production bucket. A film rendered from an older version of the lab
 * (its manifest's `labUpdated` differs from the lab's `updated`) is skipped:
 * re-render it first.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getLab } from '@/content/labs';
import {
  PUBLISHED_LAB_FILMS,
  type PublishedLabFilm,
} from '@/content/labs/videos.generated';

const BUCKET = 'curvg-assets';
const OUT = path.resolve('output/lab-videos');
const MANIFEST = path.resolve('src/content/labs/videos.generated.ts');
const LANGS = ['zh', 'en'] as const;

const TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
  vtt: 'text/vtt; charset=utf-8',
};

const args = process.argv.slice(2);
const local = args.includes('--local');
const dryRun = args.includes('--dry-run');
const only = args.filter((arg) => !arg.startsWith('--'));

function wrangler(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'wrangler', ...args], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let err = '';
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`wrangler exited ${code}: ${err.slice(-600)}`))
    );
  });
}

async function put(slug: string, file: string) {
  const key = `${BUCKET}/labs/videos/${slug}/${file}`;
  const type = TYPES[file.split('.').pop()!];
  console.log(`  ${dryRun ? '(dry run) ' : ''}put ${key}`);
  if (dryRun) return;
  await wrangler([
    'r2',
    'object',
    'put',
    key,
    '--file',
    path.join(OUT, slug, file),
    '--content-type',
    type,
    '--cache-control',
    'public, max-age=86400',
    local ? '--local' : '--remote',
  ]);
}

const films = structuredClone(PUBLISHED_LAB_FILMS);
const slugs = only.length
  ? only
  : (await readdir(OUT)).filter((name) => !name.startsWith('.'));

for (const slug of slugs) {
  const lab = getLab(slug);
  if (!lab) {
    console.warn(`skip ${slug}: no such lab`);
    continue;
  }
  for (const lang of LANGS) {
    const dir = path.join(OUT, slug);
    const json = path.join(dir, `${lang}-landscape.json`);
    if (!existsSync(json)) continue;
    const manifest = JSON.parse(await readFile(json, 'utf8'));
    if (manifest.labUpdated !== lab.updated) {
      console.warn(
        `skip ${slug} ${lang}: rendered from ${manifest.labUpdated}, lab is ${lab.updated}`
      );
      continue;
    }
    if (manifest.tts === 'say' && !args.includes('--allow-system-voice')) {
      console.warn(
        `skip ${slug} ${lang}: system-voice draft (pass --allow-system-voice to publish anyway)`
      );
      continue;
    }
    const portrait = existsSync(path.join(dir, `${lang}-portrait.mp4`));
    const files = [
      `${lang}-landscape.mp4`,
      `${lang}-landscape.jpg`,
      `${lang}.vtt`,
      ...(portrait ? [`${lang}-portrait.mp4`, `${lang}-portrait.jpg`] : []),
    ];
    console.log(`${slug} ${lang}`);
    for (const file of files) await put(slug, file);
    const entry: PublishedLabFilm = {
      duration: manifest.duration,
      uploaded: new Date().toISOString().slice(0, 10),
      portrait,
      sha256: manifest.sha256,
    };
    films[slug] = { ...films[slug], [lang]: entry };
  }
}

if (!dryRun) {
  const source = await readFile(MANIFEST, 'utf8');
  const head = source.slice(
    0,
    source.indexOf('export const PUBLISHED_LAB_FILMS')
  );
  const sorted = Object.fromEntries(
    Object.entries(films).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(
    MANIFEST,
    `${head}export const PUBLISHED_LAB_FILMS: Record<\n  string,\n  Partial<Record<'en' | 'zh', PublishedLabFilm>>\n> = ${JSON.stringify(sorted, null, 2)};\n`
  );
  console.log(`updated ${path.relative(process.cwd(), MANIFEST)}`);
}
