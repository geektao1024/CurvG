import { z } from 'zod';

import type { AnimationSpec } from '@/lib/animation';

const identifierSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);

const objectSchema = z.object({
  id: identifierSchema,
  kind: z.enum([
    'axes',
    'curve',
    'area',
    'formula',
    'text',
    'series',
    'matrix',
  ]),
  region: z.enum(['title', 'formula', 'graph']),
  label: z.string().max(500).optional(),
  expr: z.string().max(1000).optional(),
  domain: z
    .tuple([z.number().min(-100).max(100), z.number().min(-100).max(100)])
    .optional(),
  color: z.string().max(40).optional(),
  values: z
    .array(z.array(z.number().finite()).min(1).max(8))
    .min(1)
    .max(8)
    .optional(),
});

const timelineSchema = z.object({
  id: identifierSchema,
  at: z.number().min(0).max(300),
  op: z.enum(['draw', 'write', 'fade_in', 'fade_out', 'transform', 'hold']),
  ref: identifierSchema,
  targetRef: identifierSchema.optional(),
  runTime: z.number().min(0.1).max(120),
  ease: z.enum(['linear', 'smooth', 'there_and_back']).default('smooth'),
});

export const animationSpecSchema = z
  .object({
    schemaVersion: z.literal(2),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(2400),
    durationSeconds: z.number().min(1).max(300),
    assumptions: z.array(z.string().max(1000)).max(20).default([]),
    style: z.object({
      background: z.string().min(1).max(120),
      palette: z.array(z.string().min(1).max(120)).min(1).max(12),
      camera: z.string().min(1).max(600),
    }),
    objects: z.array(objectSchema).min(1).max(40),
    timeline: z.array(timelineSchema).min(1).max(80),
    layout: z.object({
      regions: z.enum(['single', 'left|right', 'top|bottom']),
      title: z.string().max(160).optional(),
    }),
    dependencies: z.array(z.string().max(500)).max(20).default([]),
    notes: z.array(z.string().max(1000)).max(30).default([]),
  })
  .superRefine((spec, context) => {
    const objectIds = new Set<string>();
    for (const [index, object] of spec.objects.entries()) {
      if (objectIds.has(object.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate object id: ${object.id}`,
          path: ['objects', index, 'id'],
        });
      }
      objectIds.add(object.id);
      if (object.domain && object.domain[0] >= object.domain[1]) {
        context.addIssue({
          code: 'custom',
          message: 'Object domain must be increasing',
          path: ['objects', index, 'domain'],
        });
      }
      if (
        ['curve', 'area', 'formula', 'series'].includes(object.kind) &&
        !object.expr
      ) {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} requires expr`,
          path: ['objects', index, 'expr'],
        });
      }
      if (object.kind === 'matrix' && !object.values) {
        context.addIssue({
          code: 'custom',
          message: 'matrix requires values',
          path: ['objects', index, 'values'],
        });
      }
    }

    const eventIds = new Set<string>();
    for (const [index, event] of spec.timeline.entries()) {
      if (eventIds.has(event.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate timeline id: ${event.id}`,
          path: ['timeline', index, 'id'],
        });
      }
      eventIds.add(event.id);
      if (event.op !== 'hold' && !objectIds.has(event.ref)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown object reference: ${event.ref}`,
          path: ['timeline', index, 'ref'],
        });
      }
      if (
        event.op === 'transform' &&
        (!event.targetRef || !objectIds.has(event.targetRef))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Transform requires a valid targetRef',
          path: ['timeline', index, 'targetRef'],
        });
      }
      if (event.at + event.runTime > spec.durationSeconds + 0.001) {
        context.addIssue({
          code: 'custom',
          message: 'Timeline event exceeds the animation duration',
          path: ['timeline', index],
        });
      }
    }
    const groups = [...spec.timeline]
      .sort((left, right) => left.at - right.at)
      .reduce<Array<{ at: number; duration: number }>>((result, event) => {
        const current = result.at(-1);
        if (current && Math.abs(current.at - event.at) < 0.001) {
          current.duration = Math.max(current.duration, event.runTime);
        } else {
          result.push({ at: event.at, duration: event.runTime });
        }
        return result;
      }, []);
    for (let index = 1; index < groups.length; index += 1) {
      const previous = groups[index - 1];
      if (groups[index].at < previous.at + previous.duration - 0.001) {
        context.addIssue({
          code: 'custom',
          message: 'Overlapping start times are not supported yet',
          path: ['timeline'],
        });
        break;
      }
    }
  });

function extractJson(value: string): unknown {
  const trimmed = value.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI returned invalid JSON');
    return JSON.parse(unfenced.slice(start, end + 1));
  }
}

export function parseAnimationSpec(value: string): AnimationSpec {
  return animationSpecSchema.parse(extractJson(value));
}

export function validateAnimationSpec(value: unknown): AnimationSpec {
  return animationSpecSchema.parse(value);
}

export function parseManimCode(value: string): string {
  let code = '';
  try {
    const parsed = extractJson(value);
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed as Record<string, unknown>).code;
      if (typeof candidate === 'string') code = candidate;
    }
  } catch {
    code = value
      .trim()
      .replace(/^```(?:python)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
  }
  if (!code) throw new Error('AI returned empty Manim code');
  if (code.length < 100 || code.length > 60_000) {
    throw new Error('Generated Manim code has an invalid length');
  }
  if (!/\bfrom\s+manim\s+import\b/.test(code)) {
    throw new Error('Generated code does not import Manim');
  }
  const sceneClasses = [
    ...code.matchAll(
      /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*Scene\s*\)\s*:/g
    ),
  ];
  if (
    !/\bclass\s+CurvGScene\s*\(\s*Scene\s*\)/.test(code) &&
    sceneClasses.length === 1
  ) {
    const [declaration, className] = sceneClasses[0];
    code = code.replace(
      declaration,
      declaration.replace(`class ${className}`, 'class CurvGScene')
    );
  }
  if (!/\bclass\s+CurvGScene\s*\(\s*Scene\s*\)/.test(code)) {
    throw new Error('Generated code must define CurvGScene');
  }
  const blocked = [
    /\b(?:import|from)\s+(?:os|subprocess|socket|requests|urllib|httpx|pathlib|shutil)\b/,
    /\b(?:open|eval|exec|compile|__import__)\s*\(/,
    /\b(?:Popen|run|call|check_output|system)\s*\(/,
  ];
  if (blocked.some((pattern) => pattern.test(code))) {
    throw new Error('Generated code contains blocked operations');
  }
  return code;
}
