import type { AnimationSpec } from '@/lib/animation';

import type { BuiltVideoTemplate } from './index';

/**
 * Template videos keep a small descriptor in `parts.spec` so the rest of
 * the animation record (versions, summaries, render bookkeeping) reads them
 * like any other film. It is never compiled: the Manim source always comes
 * from the template itself.
 */
export function templateDescriptorSpec(
  built: BuiltVideoTemplate
): AnimationSpec {
  const duration = built.durationSeconds;
  return {
    schemaVersion: 2,
    title: built.title.slice(0, 160),
    summary: built.summary.slice(0, 1000),
    durationSeconds: duration,
    assumptions: [],
    style: {
      background: built.context.theme === 'studio' ? '#0E1116' : '#F6F4EF',
      palette: ['#C9800F', '#2F6FD0', '#2F8F4E'],
      camera: `Video template ${built.templateId} v${built.templateVersion}`,
    },
    layout: { regions: 'single', title: built.title.slice(0, 160) },
    objects: [
      {
        id: 'title',
        kind: 'text',
        region: 'title',
        label: built.title.slice(0, 500),
      },
    ],
    timeline: [
      {
        id: 'title-in',
        at: 0,
        op: 'write',
        ref: 'title',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'hold',
        at: 1,
        op: 'hold',
        ref: 'title',
        runTime: Math.max(0.1, Number((duration - 1).toFixed(3))),
        ease: 'linear',
      },
    ],
    dependencies: ['Manim Community', 'LaTeX'],
    notes: built.beats.slice(0, 30),
  } as AnimationSpec;
}
