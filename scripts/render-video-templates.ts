/**
 * Render video templates locally with Manim, for reviewing a template before
 * it ships. Writes output/video-templates/<id>-<frame>-<locale>/: scene.py,
 * the MP4 and a contact sheet (12 frames) to look at.
 *
 *   npx tsx scripts/render-video-templates.ts [id ...]
 *     [--frame 16:9|9:16] [--locale zh|en] [--theme paper|studio]
 *     [--params '{"f":"sin(x)"}'] [--quality l|m|h]
 *
 * Renders inside the `curvg-manim-preview` image (Manim 0.20.1 + LaTeX + Noto
 * CJK, like production): docker build -t curvg-manim-preview -f
 * scripts/docker/manim-preview.Dockerfile scripts/docker. `--local` uses the
 * host's manim instead. Also runs the renderer's scene validator.
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
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const ids = args.filter(
  (arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--')
);
const context = resolveTemplateContext({
  locale: option('locale') || 'zh',
  frame: option('frame') || '16:9',
  theme: option('theme') || 'paper',
});
const quality = option('quality') || 'l';
const params = option('params') ? JSON.parse(option('params')!) : undefined;

const run = (command: string, argv: string[], cwd?: string) => {
  const result = spawnSync(command, argv, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr.slice(-3000)}`);
  }
  return result.stdout;
};

for (const template of VIDEO_TEMPLATES.filter(
  (candidate) => !ids.length || ids.includes(candidate.id)
)) {
  const built = buildVideoTemplate({ id: template.id, params, context });
  const dir = path.resolve(
    'output/video-templates',
    `${template.id}-${context.frame.replace(':', 'x')}-${context.locale}`
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'scene.py'), built.code);
  run('python3', [
    path.resolve('renderer/validate_scene.py'),
    path.join(dir, 'scene.py'),
  ]);
  const started = Date.now();
  const manimArgs = [
    `-q${quality}`,
    '--format=mp4',
    '--disable_caching',
    'scene.py',
    'CurvGScene',
    '--media_dir',
    'media',
  ];
  if (args.includes('--local')) run('manim', manimArgs, dir);
  else
    run('docker', [
      'run',
      '--rm',
      '-v',
      `${dir}:/manim`,
      '-w',
      '/manim',
      'curvg-manim-preview',
      'manim',
      ...manimArgs,
    ]);
  const video = run('find', [
    path.join(dir, 'media'),
    '-name',
    'CurvGScene.mp4',
  ])
    .trim()
    .split('\n')[0];
  const duration = Number(
    run('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      video,
    ]).trim()
  );
  const every = Math.max(duration / 12, 0.1);
  run('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-i',
    video,
    '-vf',
    `fps=1/${every.toFixed(3)},scale=480:-1,tile=4x3`,
    '-frames:v',
    '1',
    path.join(dir, 'contact-sheet.png'),
  ]);
  console.log(
    `${template.id}: ${built.durationSeconds}s planned, ${duration.toFixed(3)}s rendered, ${Math.round((Date.now() - started) / 1000)}s wall → ${dir}`
  );
  console.log(
    `  facts: ${built.facts.map((fact) => `${fact.label}=${fact.value}`).join('  ')}`
  );
}
