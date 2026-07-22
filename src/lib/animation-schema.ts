import { z } from 'zod';

import type { AnimationSpec } from '@/lib/animation';

const sceneSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  purpose: z.string().min(1).max(1200),
  durationSeconds: z.number().min(0.5).max(120),
  math: z.array(z.string().max(1000)).max(20).default([]),
  visuals: z.array(z.string().max(1000)).min(1).max(30),
  actions: z.array(z.string().max(1000)).min(1).max(30),
});

const specSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(2400),
  durationSeconds: z.number().min(1).max(300),
  assumptions: z.array(z.string().max(1000)).max(20).default([]),
  formulas: z.array(z.string().max(1000)).max(40).default([]),
  style: z.object({
    background: z.string().min(1).max(120),
    palette: z.array(z.string().min(1).max(120)).min(1).max(12),
    camera: z.string().min(1).max(600),
  }),
  scenes: z.array(sceneSchema).min(1).max(16),
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
  return specSchema.parse(extractJson(value));
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
