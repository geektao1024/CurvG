import type { AnimationMathObjectType, AnimationSpec } from '@/lib/animation';

export interface AnimationTemplateParameter {
  key: string;
  type: 'formula' | 'color';
  labelEn: string;
  labelZh: string;
  defaultValue: string;
  objectId: string;
  field: 'expr' | 'color';
}

export interface AnimationTemplateSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  mathObjectType: AnimationMathObjectType;
  previewFormula: string;
  parameters: AnimationTemplateParameter[];
}

export interface InstantiatedAnimationTemplate {
  template: AnimationTemplateSummary;
  spec: AnimationSpec;
}
