import { checkExpression } from './expr';
import { derivativeTangent } from './templates/derivative-tangent';
import { fourierSeries } from './templates/fourier-series';
import { functionGraph } from './templates/function-graph';
import { functionTransform } from './templates/function-transform';
import { integralAccumulation } from './templates/integral-accumulation';
import { linearTransformation } from './templates/linear-transformation';
import { parametricCurve } from './templates/parametric-curve';
import { polarCurve } from './templates/polar-curve';
import { quadraticFunction } from './templates/quadratic-function';
import { riemannSum } from './templates/riemann-sum';
import { taylorSeries } from './templates/taylor-series';
import { unitCircleTrig } from './templates/unit-circle-trig';
import type {
  TemplateBuild,
  TemplateContext,
  TemplateFrame,
  TemplateLocale,
  TemplateParam,
  TemplateParamValues,
  TemplateTheme,
  VideoTemplate,
} from './types';

export type * from './types';

export const VIDEO_TEMPLATES: readonly VideoTemplate[] = [
  functionGraph,
  quadraticFunction,
  functionTransform,
  derivativeTangent,
  riemannSum,
  integralAccumulation,
  unitCircleTrig,
  taylorSeries,
  fourierSeries,
  parametricCurve,
  polarCurve,
  linearTransformation,
];

const byId = new Map(
  VIDEO_TEMPLATES.map((template) => [template.id, template])
);

export function getVideoTemplate(id: string): VideoTemplate | undefined {
  return byId.get(id);
}

export function defaultTemplateParams(
  template: VideoTemplate
): TemplateParamValues {
  return Object.fromEntries(
    template.params.map((param) => [param.key, param.default])
  );
}

export class TemplateParamError extends Error {
  constructor(
    message: string,
    readonly key?: string
  ) {
    super(message);
    this.name = 'TemplateParamError';
  }
}

function coerceParam(param: TemplateParam, raw: unknown): string | number {
  if (raw === undefined || raw === null || raw === '') return param.default;
  switch (param.type) {
    case 'expression': {
      if (typeof raw !== 'string' && typeof raw !== 'number') {
        throw new TemplateParamError(
          `${param.key} must be an expression`,
          param.key
        );
      }
      const check = checkExpression(String(raw), param.variables);
      if (!check.ok) {
        throw new TemplateParamError(`${param.key}: ${check.error}`, param.key);
      }
      return check.source;
    }
    case 'number': {
      const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
      if (!Number.isFinite(value)) {
        throw new TemplateParamError(
          `${param.key} must be a number`,
          param.key
        );
      }
      if (value < param.min || value > param.max) {
        throw new TemplateParamError(
          `${param.key} must be between ${param.min} and ${param.max}`,
          param.key
        );
      }
      if (param.integer && !Number.isInteger(value)) {
        throw new TemplateParamError(
          `${param.key} must be a whole number`,
          param.key
        );
      }
      return value;
    }
    case 'choice': {
      const value = String(raw);
      if (!param.options.some((option) => option.value === value)) {
        throw new TemplateParamError(
          `${param.key} must be one of ${param.options.map((option) => option.value).join(', ')}`,
          param.key
        );
      }
      return value;
    }
  }
}

/**
 * The one gate every parameter set passes, whoever wrote it (a form, the
 * matcher model, a lab link): unknown keys are dropped, missing keys take
 * their defaults, and the template's own cross-checks run last.
 */
export function resolveTemplateParams(
  template: VideoTemplate,
  raw: Record<string, unknown> | undefined
): TemplateParamValues {
  const values: TemplateParamValues = {};
  for (const param of template.params) {
    values[param.key] = coerceParam(param, raw?.[param.key]);
  }
  const problem = template.check?.(values);
  if (problem) throw new TemplateParamError(problem);
  return values;
}

export function resolveTemplateContext(raw: {
  locale?: unknown;
  frame?: unknown;
  theme?: unknown;
}): TemplateContext {
  const locale: TemplateLocale = String(raw.locale || '')
    .toLowerCase()
    .startsWith('zh')
    ? 'zh'
    : 'en';
  const frame: TemplateFrame = raw.frame === '9:16' ? '9:16' : '16:9';
  const theme: TemplateTheme = raw.theme === 'studio' ? 'studio' : 'paper';
  return { locale, frame, theme };
}

export interface BuiltVideoTemplate extends TemplateBuild {
  templateId: string;
  templateVersion: number;
  params: TemplateParamValues;
  context: TemplateContext;
}

export function buildVideoTemplate(params: {
  id: string;
  params?: Record<string, unknown>;
  context: TemplateContext;
}): BuiltVideoTemplate {
  const template = getVideoTemplate(params.id);
  if (!template) throw new TemplateParamError('Template not found');
  const values = resolveTemplateParams(template, params.params);
  const built = template.build(values, params.context);
  return {
    ...built,
    templateId: template.id,
    templateVersion: template.version,
    params: values,
    context: params.context,
  };
}
