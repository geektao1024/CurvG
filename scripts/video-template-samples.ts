/**
 * Sample films and posters for the creator's template gallery: each template
 * at its default parameters, paper theme, 16:9, in Chinese and English.
 *
 *   npx tsx scripts/video-template-samples.ts [id ...] [--publish]
 *
 * Renders in the `curvg-manim-preview` image (see render-video-templates.ts)
 * at 854×480/30fps, then writes:
 * - public/video-templates/<id>-<locale>.webp  poster (in git, ~40 KB each)
 * - output/video-template-samples/<id>-<locale>.mp4  sample film
 * `--publish` uploads the films to R2 (`video-templates/<id>-<locale>.mp4`),
 * served by /media/video-templates/<file>.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  buildVideoTemplate,
  resolveTemplateContext,
  VIDEO_TEMPLATES,
} from '@/lib/video-templates';

const args = process.argv.slice(2);
const ids = args.filter((arg) => !arg.startsWith('--'));
const publish = args.includes('--publish');
const OUT = path.resolve('output/video-template-samples');
const POSTERS = path.resolve('public/video-templates');
mkdirSync(OUT, { recursive: true });
mkdirSync(POSTERS, { recursive: true });

const run = (command: string, argv: string[], cwd?: string) => {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr.slice(-2000)}`);
  }
  return result.stdout;
};

for (const template of VIDEO_TEMPLATES.filter(
  (candidate) => !ids.length || ids.includes(candidate.id)
)) {
  for (const locale of ['zh', 'en'] as const) {
    const name = `${template.id}-${locale}`;
    const work = path.join(OUT, name);
    mkdirSync(work, { recursive: true });
    const built = buildVideoTemplate({
      id: template.id,
      context: resolveTemplateContext({
        locale,
        frame: '16:9',
        theme: 'paper',
      }),
    });
    writeFileSync(path.join(work, 'scene.py'), built.code);
    run('docker', [
      'run',
      '--rm',
      '-v',
      `${work}:/manim`,
      '-w',
      '/manim',
      'curvg-manim-preview',
      'manim',
      '-qm',
      '--fps',
      '30',
      '--resolution',
      '854,480',
      '--format=mp4',
      '--disable_caching',
      'scene.py',
      'CurvGScene',
      '--media_dir',
      'media',
    ]);
    const raw = run('find', [
      path.join(work, 'media'),
      '-name',
      'CurvGScene.mp4',
    ])
      .trim()
      .split('\n')[0];
    const film = path.join(OUT, `${name}.mp4`);
    run('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      raw,
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      film,
    ]);
    // The poster: the moment the result is on screen, before the closing card.
    const at = Math.max(1, built.durationSeconds - 8.5);
    run('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-ss',
      String(at),
      '-i',
      film,
      '-frames:v',
      '1',
      '-vf',
      'scale=640:-1',
      '-quality',
      '78',
      path.join(POSTERS, `${name}.webp`),
    ]);
    console.log(`${name}: ${built.durationSeconds}s`);
    if (publish) {
      run('npx', [
        'wrangler',
        'r2',
        'object',
        'put',
        `curvg-assets/video-templates/${name}.mp4`,
        '--file',
        film,
        '--content-type',
        'video/mp4',
        '--remote',
      ]);
      console.log(`  published video-templates/${name}.mp4`);
    }
  }
}
