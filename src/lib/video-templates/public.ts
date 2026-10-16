import { VIDEO_TEMPLATES } from './index';
import type {
  TemplateCategory,
  TemplateLocale,
  TemplateParamValues,
} from './types';

/** A template as the creator's gallery and parameter form see it. */
export interface PublicVideoTemplate {
  id: string;
  category: TemplateCategory;
  title: string;
  summary: string;
  defaults: TemplateParamValues;
  /** Example requests, for the composer's suggestions. */
  examples: Array<{ prompt: string; params: TemplateParamValues }>;
  params: Array<
    | {
        key: string;
        type: 'expression';
        label: string;
        help?: string;
        variables: string[];
        default: string;
      }
    | {
        key: string;
        type: 'number';
        label: string;
        help?: string;
        default: number;
        min: number;
        max: number;
        step?: number;
        integer?: boolean;
      }
    | {
        key: string;
        type: 'choice';
        label: string;
        help?: string;
        default: string;
        options: Array<{ value: string; label: string }>;
      }
  >;
}

export function publicVideoTemplates(
  locale: TemplateLocale
): PublicVideoTemplate[] {
  return VIDEO_TEMPLATES.map((template) => ({
    id: template.id,
    category: template.category,
    title: template.title[locale],
    summary: template.summary[locale],
    defaults: Object.fromEntries(
      template.params.map((param) => [param.key, param.default])
    ),
    examples: template.examples.map((example) => ({
      prompt: example.prompt,
      params: example.params,
    })),
    params: template.params.map((param) => {
      const base = {
        key: param.key,
        label: param.label[locale],
        help: param.help?.[locale],
      };
      switch (param.type) {
        case 'expression':
          return {
            ...base,
            type: 'expression' as const,
            variables: [...param.variables],
            default: param.default,
          };
        case 'number':
          return {
            ...base,
            type: 'number' as const,
            default: param.default,
            min: param.min,
            max: param.max,
            step: param.step,
            integer: param.integer,
          };
        case 'choice':
          return {
            ...base,
            type: 'choice' as const,
            default: param.default,
            options: param.options.map((option) => ({
              value: option.value,
              label: option.label[locale],
            })),
          };
      }
    }),
  }));
}
