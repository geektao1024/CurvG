import { asc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  animationTemplate,
  type AnimationTemplate,
  type NewAnimationTemplate,
} from '@/config/db/schema';
import type { AnimationMathObjectType, AnimationSpec } from '@/lib/animation';
import { validateAnimationSpec } from '@/lib/animation-schema';
import type {
  AnimationTemplateParameter,
  AnimationTemplateSummary,
  InstantiatedAnimationTemplate,
} from '@/lib/animation-template';
import { formulaToLatex } from '@/lib/math-preview';

interface BuiltinTemplate extends NewAnimationTemplate {}

const sharedStyle = {
  background: '#0B0D14',
  palette: ['#7C8CFF', '#62D9C3', '#F3B35B'],
  camera: 'Fixed 16:9 frame; compiler-owned semantic regions.',
};

function parameters(
  formula: string,
  objectId: string,
  color = '#7C8CFF'
): AnimationTemplateParameter[] {
  return [
    {
      key: 'formula',
      type: 'formula',
      labelEn: 'Formula',
      labelZh: '公式',
      defaultValue: formula,
      objectId,
      field: 'expr',
    },
    {
      key: 'color',
      type: 'color',
      labelEn: 'Curve color',
      labelZh: '曲线颜色',
      defaultValue: color,
      objectId,
      field: 'color',
    },
  ];
}

function record(params: {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string;
  descriptionZh: string;
  mathObjectType: AnimationMathObjectType;
  previewFormula: string;
  parameters: AnimationTemplateParameter[];
  spec: AnimationSpec;
}): BuiltinTemplate {
  return {
    id: params.id,
    slug: params.slug,
    status: 'active',
    titleEn: params.titleEn,
    titleZh: params.titleZh,
    descriptionEn: params.descriptionEn,
    descriptionZh: params.descriptionZh,
    mathObjectType: params.mathObjectType,
    previewFormula: params.previewFormula,
    parameterSchema: JSON.stringify(params.parameters),
    spec: JSON.stringify(validateAnimationSpec(params.spec)),
  };
}

const builtinTemplates: BuiltinTemplate[] = [
  record({
    id: 'builtin-parabola',
    slug: 'parabola-rise',
    titleEn: 'Parabola, drawn cleanly',
    titleZh: '抛物线清晰生长',
    descriptionEn: 'Axes, curve, and equation in a verified six-second scene.',
    descriptionZh: '坐标轴、曲线与方程组成的 6 秒已验证场景。',
    mathObjectType: 'function',
    previewFormula: 'x^2',
    parameters: parameters('x^2', 'curve'),
    spec: {
      schemaVersion: 2,
      title: 'Parabola',
      summary: 'Draw a parabola and connect its shape to the equation.',
      durationSeconds: 6,
      assumptions: [],
      style: sharedStyle,
      layout: { regions: 'left|right', title: 'Parabola' },
      objects: [
        { id: 'axes', kind: 'axes', region: 'graph', color: '#8B92A8' },
        {
          id: 'curve',
          kind: 'curve',
          region: 'graph',
          expr: 'x^2',
          domain: [-2.2, 2.2],
          color: '#7C8CFF',
        },
        {
          id: 'equation',
          kind: 'formula',
          region: 'formula',
          expr: 'y=x^2',
          color: '#F7F8FC',
        },
      ],
      timeline: [
        {
          id: 'axes-in',
          at: 0,
          op: 'draw',
          ref: 'axes',
          runTime: 1,
          ease: 'smooth',
        },
        {
          id: 'curve-in',
          at: 1,
          op: 'draw',
          ref: 'curve',
          runTime: 2.5,
          ease: 'smooth',
        },
        {
          id: 'equation-in',
          at: 3.5,
          op: 'write',
          ref: 'equation',
          runTime: 1.2,
          ease: 'smooth',
        },
        {
          id: 'final-hold',
          at: 4.7,
          op: 'hold',
          ref: 'equation',
          runTime: 1.3,
          ease: 'linear',
        },
      ],
      dependencies: ['Manim Community', 'LaTeX'],
      notes: ['Template parameters never call an AI model.'],
    },
  }),
  record({
    id: 'builtin-wave',
    slug: 'sine-wave',
    titleEn: 'Sine wave reveal',
    titleZh: '正弦波展开',
    descriptionEn: 'A balanced graph-first template for periodic functions.',
    descriptionZh: '适合周期函数的图形优先模板。',
    mathObjectType: 'function',
    previewFormula: 'sin(x)',
    parameters: parameters('sin(x)', 'curve', '#62D9C3'),
    spec: {
      schemaVersion: 2,
      title: 'Sine wave',
      summary: 'Reveal a periodic curve and its defining expression.',
      durationSeconds: 7,
      assumptions: ['Angles are measured in radians.'],
      style: sharedStyle,
      layout: { regions: 'top|bottom', title: 'Sine wave' },
      objects: [
        { id: 'axes', kind: 'axes', region: 'graph', color: '#8B92A8' },
        {
          id: 'curve',
          kind: 'curve',
          region: 'graph',
          expr: 'sin(x)',
          domain: [-6, 6],
          color: '#62D9C3',
        },
        {
          id: 'equation',
          kind: 'formula',
          region: 'formula',
          expr: 'y=\\sin(x)',
          color: '#F7F8FC',
        },
      ],
      timeline: [
        {
          id: 'axes-in',
          at: 0,
          op: 'draw',
          ref: 'axes',
          runTime: 1,
          ease: 'smooth',
        },
        {
          id: 'equation-in',
          at: 1,
          op: 'write',
          ref: 'equation',
          runTime: 1,
          ease: 'smooth',
        },
        {
          id: 'curve-in',
          at: 2,
          op: 'draw',
          ref: 'curve',
          runTime: 3,
          ease: 'linear',
        },
        {
          id: 'final-hold',
          at: 5,
          op: 'hold',
          ref: 'curve',
          runTime: 2,
          ease: 'linear',
        },
      ],
      dependencies: ['Manim Community', 'LaTeX'],
      notes: [],
    },
  }),
  record({
    id: 'builtin-integral',
    slug: 'integral-area',
    titleEn: 'Integral as area',
    titleZh: '积分面积演示',
    descriptionEn: 'Reveal a curve, then fill the signed area below it.',
    descriptionZh: '先绘制曲线，再填充其下方的定积分面积。',
    mathObjectType: 'integral',
    previewFormula: 'int(x^2,x,0,2)',
    parameters: parameters('x^2', 'curve', '#F3B35B'),
    spec: {
      schemaVersion: 2,
      title: 'Integral as area',
      summary: 'Connect a definite integral to the area under a curve.',
      durationSeconds: 8,
      assumptions: ['The function is non-negative on the selected interval.'],
      style: sharedStyle,
      layout: { regions: 'left|right', title: 'Integral' },
      objects: [
        { id: 'axes', kind: 'axes', region: 'graph', color: '#8B92A8' },
        {
          id: 'curve',
          kind: 'curve',
          region: 'graph',
          expr: 'x^2',
          domain: [0, 2],
          color: '#F3B35B',
        },
        {
          id: 'area',
          kind: 'area',
          region: 'graph',
          expr: 'x^2',
          domain: [0, 2],
          color: '#F3B35B',
        },
        {
          id: 'equation',
          kind: 'formula',
          region: 'formula',
          expr: '\\int_0^2 x^2\\,dx',
          color: '#F7F8FC',
        },
      ],
      timeline: [
        {
          id: 'axes-in',
          at: 0,
          op: 'draw',
          ref: 'axes',
          runTime: 1,
          ease: 'smooth',
        },
        {
          id: 'curve-in',
          at: 1,
          op: 'draw',
          ref: 'curve',
          runTime: 2,
          ease: 'smooth',
        },
        {
          id: 'area-in',
          at: 3,
          op: 'fade_in',
          ref: 'area',
          runTime: 1.5,
          ease: 'smooth',
        },
        {
          id: 'equation-in',
          at: 4.5,
          op: 'write',
          ref: 'equation',
          runTime: 1.5,
          ease: 'smooth',
        },
        {
          id: 'final-hold',
          at: 6,
          op: 'hold',
          ref: 'area',
          runTime: 2,
          ease: 'linear',
        },
      ],
      dependencies: ['Manim Community', 'LaTeX'],
      notes: [],
    },
  }),
];

function parseParameters(value: string): AnimationTemplateParameter[] {
  const parsed = JSON.parse(value) as AnimationTemplateParameter[];
  return Array.isArray(parsed) ? parsed : [];
}

function summary(
  row: typeof animationTemplate.$inferSelect,
  locale: string
): AnimationTemplateSummary {
  const chinese = locale.toLowerCase().startsWith('zh');
  return {
    id: row.id,
    slug: row.slug,
    title: chinese ? row.titleZh : row.titleEn,
    description: chinese ? row.descriptionZh : row.descriptionEn,
    mathObjectType: row.mathObjectType as AnimationMathObjectType,
    previewFormula: row.previewFormula,
    parameters: parseParameters(row.parameterSchema),
  };
}

async function ensureBuiltinTemplates() {
  const existing = new Set(
    (
      await db().select({ id: animationTemplate.id }).from(animationTemplate)
    ).map((row: Pick<AnimationTemplate, 'id'>) => row.id)
  );
  for (const template of builtinTemplates) {
    if (existing.has(template.id)) continue;
    try {
      await db().insert(animationTemplate).values(template);
    } catch (error) {
      const duplicate = /unique|duplicate|constraint/i.test(
        error instanceof Error ? error.message : String(error)
      );
      if (!duplicate) throw error;
    }
  }
}

export async function listAnimationTemplates(
  locale: string
): Promise<AnimationTemplateSummary[]> {
  await ensureBuiltinTemplates();
  const rows = await db()
    .select()
    .from(animationTemplate)
    .where(eq(animationTemplate.status, 'active'))
    .orderBy(asc(animationTemplate.slug));
  return rows.map((row: AnimationTemplate) => summary(row, locale));
}

export async function instantiateAnimationTemplate(params: {
  id: string;
  locale: string;
  values?: Record<string, unknown>;
}): Promise<InstantiatedAnimationTemplate> {
  await ensureBuiltinTemplates();
  const [row] = await db()
    .select()
    .from(animationTemplate)
    .where(eq(animationTemplate.id, params.id))
    .limit(1);
  if (!row || row.status !== 'active') throw new Error('Template not found');
  const template = summary(row, params.locale);
  const spec = validateAnimationSpec(JSON.parse(row.spec));
  const objects = spec.objects?.map((object) => ({ ...object })) ?? [];
  for (const parameter of template.parameters) {
    const raw = params.values?.[parameter.key];
    const value = typeof raw === 'string' ? raw.trim() : parameter.defaultValue;
    if (!value || value.length > 1000) {
      throw new Error(`Invalid template parameter: ${parameter.key}`);
    }
    if (parameter.type === 'color' && !/^#[0-9A-Fa-f]{6}$/.test(value)) {
      throw new Error(`Invalid template color: ${parameter.key}`);
    }
    const object = objects.find(
      (candidate) => candidate.id === parameter.objectId
    );
    if (!object) throw new Error('Template parameter target is missing');
    object[parameter.field] =
      parameter.type === 'formula' && object.kind === 'formula'
        ? formulaToLatex(value)
        : value;
    if (parameter.key === 'formula') {
      const equation = objects.find((candidate) => candidate.id === 'equation');
      if (equation?.kind === 'formula') {
        equation.expr = `y=${formulaToLatex(value)}`;
      }
      const area = objects.find((candidate) => candidate.kind === 'area');
      if (area) area.expr = value;
    }
  }
  return {
    template,
    spec: validateAnimationSpec({
      ...spec,
      title: template.title,
      summary: template.description,
      objects,
    }),
  };
}
