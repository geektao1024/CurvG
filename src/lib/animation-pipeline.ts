import { z } from 'zod';

import type {
  AnimationPlanningPhase,
  AnimationPlanningStageName,
  AnimationSpec,
} from '@/lib/animation';
import {
  v5AnimationSpecSchema,
  validateAnimationSpec,
} from '@/lib/animation-schema';
import { parseStructuredJsonObject } from '@/lib/structured-json';

export const intentArtifactSchema = v5AnimationSpecSchema.pick({
  title: true,
  summary: true,
  durationSeconds: true,
  assumptions: true,
  intent: true,
});

export const knowledgeArtifactSchema = v5AnimationSpecSchema.pick({
  knowledgeMap: true,
});

export const curriculumArtifactSchema = v5AnimationSpecSchema.pick({
  curriculum: true,
});

export const mathematicsArtifactSchema = v5AnimationSpecSchema.pick({
  mathDossier: true,
});

export const storyboardArtifactSchema = v5AnimationSpecSchema.pick({
  direction: true,
  cinematography: true,
  shots: true,
});

export const sceneArtifactSchema = v5AnimationSpecSchema.pick({
  style: true,
  objects: true,
  timeline: true,
  layout: true,
  dependencies: true,
  notes: true,
});

export interface AnimationPlanningArtifacts {
  intent: z.infer<typeof intentArtifactSchema>;
  knowledge: z.infer<typeof knowledgeArtifactSchema>;
  curriculum: z.infer<typeof curriculumArtifactSchema>;
  mathematics: z.infer<typeof mathematicsArtifactSchema>;
  storyboard: z.infer<typeof storyboardArtifactSchema>;
  scene: z.infer<typeof sceneArtifactSchema>;
}

export interface AnimationPlanningStageDefinition {
  name: AnimationPlanningStageName;
  sequence: number;
  phase: AnimationPlanningPhase;
  maxTokens: number;
}

export const ANIMATION_PLANNING_STAGES: AnimationPlanningStageDefinition[] = [
  { name: 'intent', sequence: 1, phase: 'understanding', maxTokens: 1_800 },
  { name: 'knowledge', sequence: 2, phase: 'structuring', maxTokens: 2_400 },
  {
    name: 'curriculum',
    sequence: 3,
    phase: 'structuring',
    maxTokens: 2_600,
  },
  {
    name: 'mathematics',
    sequence: 4,
    phase: 'auditing',
    maxTokens: 4_200,
  },
  {
    name: 'storyboard',
    sequence: 5,
    phase: 'structuring',
    maxTokens: 3_500,
  },
  { name: 'scene', sequence: 6, phase: 'finalizing', maxTokens: 6_000 },
];

const schemas: {
  [Name in AnimationPlanningStageName]: z.ZodType<
    AnimationPlanningArtifacts[Name]
  >;
} = {
  intent: intentArtifactSchema,
  knowledge: knowledgeArtifactSchema,
  curriculum: curriculumArtifactSchema,
  mathematics: mathematicsArtifactSchema,
  storyboard: storyboardArtifactSchema,
  scene: sceneArtifactSchema,
};

export function parseAnimationPlanningArtifact<
  Name extends AnimationPlanningStageName,
>(name: Name, value: string): AnimationPlanningArtifacts[Name] {
  return schemas[name].parse(
    parseStructuredJsonObject(value)
  ) as AnimationPlanningArtifacts[Name];
}

export function validateAnimationPlanningArtifact<
  Name extends AnimationPlanningStageName,
>(name: Name, value: unknown): AnimationPlanningArtifacts[Name] {
  return schemas[name].parse(value) as AnimationPlanningArtifacts[Name];
}

export function composeAnimationSpecFromArtifacts(
  artifacts: AnimationPlanningArtifacts
): AnimationSpec {
  return validateAnimationSpec({
    schemaVersion: 5,
    ...artifacts.intent,
    ...artifacts.knowledge,
    ...artifacts.curriculum,
    ...artifacts.mathematics,
    ...artifacts.storyboard,
    ...artifacts.scene,
  });
}
