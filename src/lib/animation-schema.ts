import { z } from 'zod';

import type { AnimationSpec } from '@/lib/animation';
import { parseStructuredJsonObject } from '@/lib/structured-json';

const identifierSchema = z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,79}$/);

const formulaPartSchema = z.object({
  id: identifierSchema,
  latex: z.string().min(1).max(500),
  meaning: z.string().min(1).max(300),
  color: z.string().max(40).optional(),
});

const coordinateSchema = z.tuple([
  z.number().finite().min(-100).max(100),
  z.number().finite().min(-100).max(100),
]);

const objectSchema = z.object({
  id: identifierSchema,
  kind: z.enum([
    'axes',
    'curve',
    'parametric',
    'area',
    'formula',
    'text',
    'series',
    'matrix',
    'circle',
    'point',
    'line',
    'arrow',
    'arc',
  ]),
  region: z.enum(['title', 'formula', 'graph']),
  importance: z.enum(['hero', 'supporting', 'context']).optional(),
  label: z.string().max(500).optional(),
  expr: z.string().max(1000).optional(),
  xExpr: z.string().max(1000).optional(),
  yExpr: z.string().max(1000).optional(),
  domain: z
    .tuple([z.number().min(-100).max(100), z.number().min(-100).max(100)])
    .optional(),
  color: z.string().max(40).optional(),
  values: z
    .array(z.array(z.number().finite()).min(1).max(8))
    .min(1)
    .max(8)
    .optional(),
  position: coordinateSchema.optional(),
  center: coordinateSchema.optional(),
  start: coordinateSchema.optional(),
  end: coordinateSchema.optional(),
  radius: z.number().finite().min(0.01).max(100).optional(),
  startAngle: z.number().finite().min(-100).max(100).optional(),
  sweepAngle: z.number().finite().min(-100).max(100).optional(),
  parts: z.array(formulaPartSchema).min(2).max(16).optional(),
  /**
   * Schema 6: the `mathDossier.formulas` entry this object renders. Optional
   * on the shared object schema because versions 2-5 predate the dossier;
   * required for formula objects in the version 6 refinement.
   */
  formulaId: identifierSchema.optional(),
});

const timelineSchema = z.object({
  id: identifierSchema,
  shotId: identifierSchema.optional(),
  at: z.number().min(0).max(300),
  op: z.enum([
    'draw',
    'write',
    'fade_in',
    'fade_out',
    'transform',
    'emphasize',
    'spotlight',
    'glow',
    'camera_focus',
    'camera_reset',
    'move_along',
    'hold',
  ]),
  ref: identifierSchema,
  targetRef: identifierSchema.optional(),
  pathRef: identifierSchema.optional(),
  partId: identifierSchema.optional(),
  zoom: z.number().min(1.1).max(3.5).optional(),
  runTime: z.number().min(0.1).max(120),
  ease: z.enum(['linear', 'smooth', 'there_and_back']).default('smooth'),
});

const commonAnimationSpecSchema = z.object({
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
  layout: z.object({
    regions: z.enum(['single', 'left|right', 'top|bottom']),
    title: z.string().max(160).optional(),
  }),
  dependencies: z.array(z.string().max(500)).max(20).default([]),
  notes: z.array(z.string().max(1000)).max(30).default([]),
});

const v2AnimationSpecSchema = commonAnimationSpecSchema.extend({
  schemaVersion: z.literal(2),
  timeline: z.array(timelineSchema).min(1).max(80),
});

const v3AnimationSpecSchema = commonAnimationSpecSchema.extend({
  schemaVersion: z.literal(3),
  intent: z.object({
    learningGoal: z.string().min(1).max(500),
    hook: z.string().min(1).max(240),
    takeaway: z.string().min(1).max(240),
  }),
  direction: z.object({
    preset: z.enum([
      'clean-classroom',
      'cinematic-math',
      'geometric-proof',
      'data-story',
    ]),
    frame: z.enum(['16:9', '9:16']),
    pacing: z.enum(['calm', 'balanced', 'energetic']),
    textPolicy: z.object({
      maxWordsPerObject: z.number().int().min(1).max(14),
      maxSimultaneousText: z.number().int().min(1).max(3),
    }),
  }),
  shots: z
    .array(
      z.object({
        id: identifierSchema,
        beat: z.enum([
          'hook',
          'setup',
          'mechanism',
          'proof',
          'payoff',
          'memory',
        ]),
        purpose: z.string().min(1).max(500),
        startAt: z.number().min(0).max(300),
        endAt: z.number().min(0.1).max(300),
        focusRef: identifierSchema,
        transition: z.enum(['build', 'morph', 'emphasis', 'hold']),
        acceptance: z.array(z.string().min(1).max(300)).min(1).max(6),
      })
    )
    .min(3)
    .max(8),
  timeline: z
    .array(timelineSchema.extend({ shotId: identifierSchema }))
    .min(1)
    .max(80),
});

const v4AnimationSpecSchema = commonAnimationSpecSchema.extend({
  schemaVersion: z.literal(4),
  intent: v3AnimationSpecSchema.shape.intent,
  direction: v3AnimationSpecSchema.shape.direction,
  cinematography: z.object({
    scene: z.enum(['static', 'moving-camera']),
    emphasis: z.enum(['clean', 'spotlight', 'term-tour']),
  }),
  mathDossier: z.object({
    coreClaim: z.string().min(1).max(500),
    invariants: z.array(z.string().min(1).max(500)).min(1).max(8),
    commonMisreading: z.string().min(1).max(500),
    visualProof: z.string().min(1).max(800),
  }),
  shots: v3AnimationSpecSchema.shape.shots,
  timeline: z
    .array(timelineSchema.extend({ shotId: identifierSchema }))
    .min(1)
    .max(80),
});

const knowledgeNodeSchema = z.object({
  id: identifierSchema,
  concept: z.string().min(1).max(500),
  dependsOn: z.array(identifierSchema).max(12),
  misconception: z.string().min(1).max(500),
});

const curriculumBeatSchema = z.object({
  id: identifierSchema,
  learningJob: z.string().min(1).max(500),
  dependsOn: z.array(identifierSchema).max(12),
  visualEvidence: z.string().min(1).max(800),
  notationBudget: z.number().int().min(0).max(4),
});

export const v5AnimationSpecSchema = commonAnimationSpecSchema.extend({
  schemaVersion: z.literal(5),
  intent: v3AnimationSpecSchema.shape.intent,
  direction: v3AnimationSpecSchema.shape.direction,
  cinematography: v4AnimationSpecSchema.shape.cinematography,
  knowledgeMap: z.array(knowledgeNodeSchema).min(1).max(16),
  curriculum: z.array(curriculumBeatSchema).min(3).max(12),
  mathDossier: v4AnimationSpecSchema.shape.mathDossier.extend({
    definitions: z
      .array(
        z.object({
          concept: z.string().min(1).max(300),
          statement: z.string().min(1).max(800),
        })
      )
      .min(1)
      .max(16),
    derivationSteps: z.array(z.string().min(1).max(1000)).min(2).max(20),
    checks: z
      .array(
        z.object({
          claim: z.string().min(1).max(500),
          method: z.string().min(1).max(500),
          expected: z.string().min(1).max(500),
        })
      )
      .min(1)
      .max(12),
    limitations: z.array(z.string().min(1).max(500)).max(12).default([]),
  }),
  shots: v3AnimationSpecSchema.shape.shots,
  timeline: z
    .array(timelineSchema.extend({ shotId: identifierSchema }))
    .min(1)
    .max(80),
});

/**
 * Schema 6 gives two facts a single owner.
 *
 * `mathDossier.formulas` is the only place LaTeX is authored. Scene formula
 * objects reference a formula by `formulaId` and copy its `latexParts`
 * verbatim; they may not compose their own. Before this, the scene stage
 * derived formula content itself, and a deterministic template rendered four
 * distinct beats with identical LaTeX because nothing owned the text.
 *
 * `knowledgeMap` gains the fields that let a film skip and aim: `assumed`
 * marks what the audience already holds (a nod, not a lesson), `visualSeed`
 * carries the most filmable image of a concept forward to the storyboard, and
 * `depth` orders concepts from target (0) toward foundations. `spine` names
 * the shortest honest path through them — the film walks the spine and
 * everything else is texture.
 */
const v6KnowledgeNodeSchema = knowledgeNodeSchema.extend({
  depth: z.number().int().min(0).max(12),
  assumed: z.boolean(),
  visualSeed: z.string().min(1).max(300),
});

const dossierLatexPartSchema = z.object({
  id: identifierSchema,
  latex: z.string().min(1).max(400),
  meaning: z.string().min(1).max(300),
});

const dossierFormulaSchema = z.object({
  id: identifierSchema,
  purpose: z.string().min(1).max(300),
  latexParts: z.array(dossierLatexPartSchema).min(1).max(12),
});

export const v6AnimationSpecSchema = v5AnimationSpecSchema.extend({
  schemaVersion: z.literal(6),
  knowledgeMap: z.array(v6KnowledgeNodeSchema).min(1).max(16),
  spine: z.array(identifierSchema).min(1).max(16),
  mathDossier: v5AnimationSpecSchema.shape.mathDossier.extend({
    formulas: z.array(dossierFormulaSchema).min(1).max(12),
  }),
});

export const animationSpecSchema = z
  .discriminatedUnion('schemaVersion', [
    v2AnimationSpecSchema,
    v3AnimationSpecSchema,
    v4AnimationSpecSchema,
    v5AnimationSpecSchema,
    v6AnimationSpecSchema,
  ])
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
      const addressableFormula =
        ['formula', 'series'].includes(object.kind) &&
        object.parts &&
        object.parts.length > 0;
      if (
        ['curve', 'area', 'formula', 'series'].includes(object.kind) &&
        !object.expr &&
        !addressableFormula
      ) {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} requires expr`,
          path: ['objects', index, 'expr'],
        });
      }
      if (
        object.kind === 'parametric' &&
        (!object.xExpr || !object.yExpr || !object.domain)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'parametric requires xExpr, yExpr and domain',
          path: ['objects', index],
        });
      }
      if (object.kind === 'matrix' && !object.values) {
        context.addIssue({
          code: 'custom',
          message: 'matrix requires values',
          path: ['objects', index, 'values'],
        });
      }
      const geometryKinds = new Set([
        'parametric',
        'circle',
        'point',
        'line',
        'arrow',
        'arc',
      ]);
      if (geometryKinds.has(object.kind) && object.region !== 'graph') {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} must use the graph region`,
          path: ['objects', index, 'region'],
        });
      }
      if (object.kind === 'point' && !object.position) {
        context.addIssue({
          code: 'custom',
          message: 'point requires position',
          path: ['objects', index, 'position'],
        });
      }
      if (
        (object.kind === 'circle' || object.kind === 'arc') &&
        (!object.center || !object.radius)
      ) {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} requires center and radius`,
          path: ['objects', index],
        });
      }
      if (
        (object.kind === 'line' || object.kind === 'arrow') &&
        (!object.start || !object.end)
      ) {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} requires start and end`,
          path: ['objects', index],
        });
      }
      if (
        (object.kind === 'line' || object.kind === 'arrow') &&
        object.start &&
        object.end &&
        object.start[0] === object.end[0] &&
        object.start[1] === object.end[1]
      ) {
        context.addIssue({
          code: 'custom',
          message: `${object.kind} start and end must differ`,
          path: ['objects', index, 'end'],
        });
      }
      if (
        object.kind === 'arc' &&
        (object.startAngle === undefined ||
          object.sweepAngle === undefined ||
          Math.abs(object.sweepAngle) < 0.001)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'arc requires startAngle and a non-zero sweepAngle',
          path: ['objects', index],
        });
      }
      if (object.parts && !['formula', 'series'].includes(object.kind)) {
        context.addIssue({
          code: 'custom',
          message: 'Only formula and series objects can declare parts',
          path: ['objects', index, 'parts'],
        });
      }
      const partIds = new Set<string>();
      for (const [partIndex, part] of (object.parts || []).entries()) {
        if (partIds.has(part.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate formula part id: ${part.id}`,
            path: ['objects', index, 'parts', partIndex, 'id'],
          });
        }
        partIds.add(part.id);
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
      if (event.op === 'move_along') {
        const subject = spec.objects.find((object) => object.id === event.ref);
        const path = spec.objects.find((object) => object.id === event.pathRef);
        if (subject?.kind !== 'point') {
          context.addIssue({
            code: 'custom',
            message:
              'move_along requires a point ref; connector lines must stay synchronized by the scene composer instead of moving along a fixed path',
            path: ['timeline', index, 'ref'],
          });
        }
        if (
          !path ||
          !['circle', 'curve', 'parametric', 'arc', 'line'].includes(path.kind)
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'move_along requires a valid circle, curve, arc or line pathRef',
            path: ['timeline', index, 'pathRef'],
          });
        }
      } else if (event.pathRef) {
        context.addIssue({
          code: 'custom',
          message: 'pathRef is only supported by move_along',
          path: ['timeline', index, 'pathRef'],
        });
      }
      const referencedObject = spec.objects.find(
        (object) => object.id === event.ref
      );
      if (
        event.partId &&
        !referencedObject?.parts?.some((part) => part.id === event.partId)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Unknown formula part reference: ${event.partId}`,
          path: ['timeline', index, 'partId'],
        });
      }
      if (event.zoom && event.op !== 'camera_focus') {
        context.addIssue({
          code: 'custom',
          message: 'zoom is only supported by camera_focus',
          path: ['timeline', index, 'zoom'],
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
        const previousEnd = Number(
          (previous.at + previous.duration).toFixed(3)
        );
        context.addIssue({
          code: 'custom',
          message: `Overlapping start times are not supported yet: the group at ${groups[index].at}s starts before the previous group ends at ${previousEnd}s; concurrent events must use exactly the same start time`,
          path: ['timeline'],
        });
        break;
      }
    }

    const cinematicOps = new Set([
      'spotlight',
      'glow',
      'camera_focus',
      'camera_reset',
    ]);
    if (
      spec.schemaVersion !== 4 &&
      spec.schemaVersion !== 5 &&
      spec.schemaVersion !== 6
    ) {
      for (const [index, event] of spec.timeline.entries()) {
        if (!cinematicOps.has(event.op)) continue;
        context.addIssue({
          code: 'custom',
          message: 'Cinematography operations require schemaVersion 4, 5 or 6',
          path: ['timeline', index, 'op'],
        });
      }
    }

    if (
      spec.schemaVersion !== 3 &&
      spec.schemaVersion !== 4 &&
      spec.schemaVersion !== 5 &&
      spec.schemaVersion !== 6
    )
      return;
    if (
      spec.direction.frame === '9:16' &&
      spec.layout.regions === 'left|right'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Portrait scenes cannot use a left|right layout',
        path: ['layout', 'regions'],
      });
    }
    const shots = [...spec.shots].sort(
      (left, right) => left.startAt - right.startAt
    );
    const shotIds = new Set<string>();
    for (const [index, shot] of shots.entries()) {
      if (shotIds.has(shot.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate shot id: ${shot.id}`,
          path: ['shots', index, 'id'],
        });
      }
      shotIds.add(shot.id);
      if (!objectIds.has(shot.focusRef)) {
        context.addIssue({
          code: 'custom',
          message: `Unknown shot focus: ${shot.focusRef}`,
          path: ['shots', index, 'focusRef'],
        });
      }
      if (shot.startAt >= shot.endAt) {
        context.addIssue({
          code: 'custom',
          message: 'Shot endAt must be later than startAt',
          path: ['shots', index, 'endAt'],
        });
      }
      if (shot.endAt > spec.durationSeconds + 0.001) {
        context.addIssue({
          code: 'custom',
          message: 'Shot exceeds the animation duration',
          path: ['shots', index, 'endAt'],
        });
      }
      if (index > 0 && shot.startAt < shots[index - 1].endAt - 0.001) {
        context.addIssue({
          code: 'custom',
          message: 'Shots cannot overlap',
          path: ['shots', index, 'startAt'],
        });
      }
    }
    if (Math.abs(shots[0].startAt) > 0.001) {
      context.addIssue({
        code: 'custom',
        message: 'The first shot must begin at 0',
        path: ['shots', 0, 'startAt'],
      });
    }
    if (shots[0].beat !== 'hook') {
      context.addIssue({
        code: 'custom',
        message: 'The first shot must be the hook',
        path: ['shots', 0, 'beat'],
      });
    }
    const lastShot = shots.at(-1)!;
    if (Math.abs(lastShot.endAt - spec.durationSeconds) > 0.001) {
      context.addIssue({
        code: 'custom',
        message: 'The final shot must end at durationSeconds',
        path: ['shots', shots.length - 1, 'endAt'],
      });
    }
    if (!['payoff', 'memory'].includes(lastShot.beat)) {
      context.addIssue({
        code: 'custom',
        message: 'The final shot must be a payoff or memory beat',
        path: ['shots', shots.length - 1, 'beat'],
      });
    }
    for (const [index, event] of spec.timeline.entries()) {
      const shot = spec.shots.find(
        (candidate) => candidate.id === event.shotId
      );
      if (!shot) {
        context.addIssue({
          code: 'custom',
          message: `Unknown timeline shot: ${event.shotId}`,
          path: ['timeline', index, 'shotId'],
        });
        continue;
      }
      if (
        event.at < shot.startAt - 0.001 ||
        event.at + event.runTime > shot.endAt + 0.001
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Timeline event must stay inside its shot',
          path: ['timeline', index],
        });
      }
    }
    for (const [index, object] of spec.objects.entries()) {
      if (object.kind !== 'text' || !object.label) continue;
      const wordCount = object.label
        .trim()
        .split(/\s+/u)
        .filter(Boolean).length;
      if (wordCount > spec.direction.textPolicy.maxWordsPerObject) {
        context.addIssue({
          code: 'custom',
          message: 'Text object exceeds the director text budget',
          path: ['objects', index, 'label'],
        });
      }
    }
    if (
      spec.schemaVersion !== 4 &&
      spec.schemaVersion !== 5 &&
      spec.schemaVersion !== 6
    )
      return;

    const semanticPartColors = new Map<string, string>();
    for (const [objectIndex, object] of spec.objects.entries()) {
      for (const [partIndex, part] of (object.parts || []).entries()) {
        if (!part.color) continue;
        const prior = semanticPartColors.get(part.id);
        if (prior && prior.toUpperCase() !== part.color.toUpperCase()) {
          context.addIssue({
            code: 'custom',
            message: `Formula part ${part.id} must keep one semantic color`,
            path: ['objects', objectIndex, 'parts', partIndex, 'color'],
          });
        }
        semanticPartColors.set(part.id, part.color);
      }
    }
    for (const [index, event] of spec.timeline.entries()) {
      if (
        ['camera_focus', 'camera_reset'].includes(event.op) &&
        spec.cinematography.scene !== 'moving-camera'
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Camera operations require a moving-camera scene',
          path: ['timeline', index, 'op'],
        });
      }
      if (
        event.partId &&
        !['spotlight', 'glow', 'camera_focus', 'emphasize'].includes(event.op)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'This operation cannot target a formula part',
          path: ['timeline', index, 'partId'],
        });
      }
    }
    const cameraEvents = [...spec.timeline]
      .filter((event) => ['camera_focus', 'camera_reset'].includes(event.op))
      .sort((left, right) => left.at - right.at);
    const cameraFocusCount = cameraEvents.filter(
      (event) => event.op === 'camera_focus'
    ).length;
    if (cameraFocusCount > 2) {
      context.addIssue({
        code: 'custom',
        message: 'Short animations support at most two camera focus moves',
        path: ['timeline'],
      });
    }
    if (cameraFocusCount > 0 && cameraEvents.at(-1)?.op !== 'camera_reset') {
      context.addIssue({
        code: 'custom',
        message: 'The final camera focus must be followed by camera_reset',
        path: ['timeline'],
      });
    }
    if (
      spec.cinematography.emphasis === 'term-tour' &&
      !spec.timeline.some(
        (event) => !!event.partId && event.op === 'camera_focus'
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'term-tour emphasis requires a camera_focus on a formula part',
        path: ['cinematography', 'emphasis'],
      });
    }

    if (spec.schemaVersion !== 5 && spec.schemaVersion !== 6) return;
    const knowledgeIds = new Set<string>();
    for (const [index, node] of spec.knowledgeMap.entries()) {
      if (knowledgeIds.has(node.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate knowledge node id: ${node.id}`,
          path: ['knowledgeMap', index, 'id'],
        });
      }
      knowledgeIds.add(node.id);
    }
    for (const [index, node] of spec.knowledgeMap.entries()) {
      for (const dependency of node.dependsOn) {
        if (dependency === node.id || !knowledgeIds.has(dependency)) {
          context.addIssue({
            code: 'custom',
            message: `Invalid knowledge dependency: ${dependency}`,
            path: ['knowledgeMap', index, 'dependsOn'],
          });
        }
      }
    }

    const availableCurriculumDependencies = new Set(knowledgeIds);
    const curriculumIds = new Set<string>();
    for (const [index, beat] of spec.curriculum.entries()) {
      if (curriculumIds.has(beat.id) || knowledgeIds.has(beat.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate curriculum beat id: ${beat.id}`,
          path: ['curriculum', index, 'id'],
        });
      }
      for (const dependency of beat.dependsOn) {
        if (!availableCurriculumDependencies.has(dependency)) {
          context.addIssue({
            code: 'custom',
            message: `Curriculum dependency must refer to a knowledge node or earlier beat: ${dependency}`,
            path: ['curriculum', index, 'dependsOn'],
          });
        }
      }
      curriculumIds.add(beat.id);
      availableCurriculumDependencies.add(beat.id);
    }

    const proofLanguage = [
      spec.intent.learningGoal,
      spec.intent.takeaway,
      spec.mathDossier.coreClaim,
      spec.mathDossier.visualProof,
      ...spec.curriculum.map((beat) => beat.visualEvidence),
      ...spec.shots.flatMap((shot) => [shot.purpose, ...shot.acceptance]),
    ].join(' ');
    const hasCircle = spec.objects.some((object) => object.kind === 'circle');
    const hasPoint = spec.objects.some((object) => object.kind === 'point');
    const requiresCircularPointMotion =
      hasCircle &&
      hasPoint &&
      (/(?:point|marker|dot).{0,80}(?:mov|travel|rotat|revolv|sweep|trac)[a-z]*.{0,80}(?:circle|circular)|(?:mov|travel|rotat|revolv|sweep|trac)[a-z]*.{0,80}(?:point|marker|dot).{0,80}(?:circle|circular)|(?:circle|circular).{0,80}(?:point|marker|dot).{0,80}(?:mov|travel|rotat|revolv|sweep|trac)[a-z]*/iu.test(
        proofLanguage
      ) ||
        /(?:圆周点|运动点|旋转点|转动点|沿(?:着)?圆|绕(?:着)?圆).{0,60}(?:运动|移动|旋转|转动|绕行|轨迹|扫过|描迹)?/u.test(
          proofLanguage
        ));
    const hasCircularPointMotion = spec.timeline.some((event) => {
      if (event.op !== 'move_along') return false;
      const subject = spec.objects.find((object) => object.id === event.ref);
      const path = spec.objects.find((object) => object.id === event.pathRef);
      return subject?.kind === 'point' && path?.kind === 'circle';
    });
    const objectById = new Map(
      spec.objects.map((object) => [object.id, object] as const)
    );
    const pointOnCircle = (
      point: (typeof spec.objects)[number] | undefined,
      circle: (typeof spec.objects)[number] | undefined
    ) => {
      if (
        point?.kind !== 'point' ||
        !point.position ||
        circle?.kind !== 'circle' ||
        !circle.center ||
        !circle.radius
      ) {
        return false;
      }
      const dx = point.position[0] - circle.center[0];
      const dy = point.position[1] - circle.center[1];
      return Math.abs(Math.hypot(dx, dy) - circle.radius) < 1e-6;
    };
    const synchronizedRollingSteps = spec.timeline.filter((pointEvent) => {
      if (pointEvent.op !== 'transform') return false;
      const sourcePoint = objectById.get(pointEvent.ref);
      const targetPoint = objectById.get(pointEvent.targetRef || '');
      if (sourcePoint?.kind !== 'point' || targetPoint?.kind !== 'point') {
        return false;
      }
      const circleEvent = spec.timeline.find(
        (candidate) =>
          candidate.op === 'transform' &&
          Math.abs(candidate.at - pointEvent.at) < 0.001 &&
          objectById.get(candidate.ref)?.kind === 'circle' &&
          objectById.get(candidate.targetRef || '')?.kind === 'circle'
      );
      const traceEvent = spec.timeline.find(
        (candidate) =>
          candidate.op === 'transform' &&
          Math.abs(candidate.at - pointEvent.at) < 0.001 &&
          objectById.get(candidate.ref)?.kind === 'parametric' &&
          objectById.get(candidate.targetRef || '')?.kind === 'parametric'
      );
      if (!circleEvent || !traceEvent) return false;
      return (
        pointOnCircle(sourcePoint, objectById.get(circleEvent.ref)) &&
        pointOnCircle(targetPoint, objectById.get(circleEvent.targetRef || ''))
      );
    });
    const hasSynchronizedRollingMotion =
      new Set(synchronizedRollingSteps.map((event) => event.at)).size >= 2;
    if (
      requiresCircularPointMotion &&
      !hasCircularPointMotion &&
      !hasSynchronizedRollingMotion
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A claimed moving or rotating circle point requires either point move_along on a circle or at least two synchronized point, circle, and parametric-trace transformations; a static sample does not prove the dynamic relationship',
        path: ['timeline'],
      });
    }

    if (spec.schemaVersion !== 6) return;

    // The spine is the film's through-line. An id that names no concept, or a
    // spine that never reaches the target, is a claim the knowledge map does
    // not support.
    const nodeById = new Map(spec.knowledgeMap.map((node) => [node.id, node]));
    const seenSpine = new Set<string>();
    for (const [index, id] of spec.spine.entries()) {
      if (!nodeById.has(id)) {
        context.addIssue({
          code: 'custom',
          message: `Spine references unknown knowledge node: ${id}`,
          path: ['spine', index],
        });
      }
      if (seenSpine.has(id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate spine entry: ${id}`,
          path: ['spine', index],
        });
      }
      seenSpine.add(id);
    }
    const spineTarget = nodeById.get(spec.spine.at(-1) ?? '');
    if (spineTarget && spineTarget.depth !== 0) {
      context.addIssue({
        code: 'custom',
        message:
          'The spine must end at the target concept (depth 0); it walks foundations forward to the claim',
        path: ['spine'],
      });
    }
    if (!spec.knowledgeMap.some((node) => node.depth === 0)) {
      context.addIssue({
        code: 'custom',
        message: 'The knowledge map needs one target node at depth 0',
        path: ['knowledgeMap'],
      });
    }

    // The dossier owns every formula. Scene formula objects reference one and
    // copy its parts verbatim, so the same mathematics cannot be authored
    // twice with different text — or, as shipped once, four times with the
    // same text.
    const formulaById = new Map<
      string,
      (typeof spec.mathDossier.formulas)[number]
    >();
    for (const [index, formula] of spec.mathDossier.formulas.entries()) {
      if (formulaById.has(formula.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate dossier formula id: ${formula.id}`,
          path: ['mathDossier', 'formulas', index, 'id'],
        });
      }
      formulaById.set(formula.id, formula);
      const partIds = new Set<string>();
      for (const [partIndex, part] of formula.latexParts.entries()) {
        if (partIds.has(part.id)) {
          context.addIssue({
            code: 'custom',
            message: `Duplicate latex part id in ${formula.id}: ${part.id}`,
            path: ['mathDossier', 'formulas', index, 'latexParts', partIndex],
          });
        }
        partIds.add(part.id);
      }
    }

    for (const [index, object] of spec.objects.entries()) {
      if (object.kind !== 'formula') continue;
      if (!object.formulaId) {
        context.addIssue({
          code: 'custom',
          message: `Formula object ${object.id} must reference a mathDossier formula through formulaId`,
          path: ['objects', index, 'formulaId'],
        });
        continue;
      }
      const formula = formulaById.get(object.formulaId);
      if (!formula) {
        context.addIssue({
          code: 'custom',
          message: `Formula object ${object.id} references unknown dossier formula ${object.formulaId}`,
          path: ['objects', index, 'formulaId'],
        });
        continue;
      }
      const authored = formula.latexParts.map((part) => part.latex).join('');
      const rendered = object.parts
        ? object.parts.map((part) => part.latex).join('')
        : (object.expr ?? '');
      if (rendered !== authored) {
        context.addIssue({
          code: 'custom',
          message: `Formula object ${object.id} does not match dossier formula ${object.formulaId} verbatim`,
          path: ['objects', index],
        });
      }
    }
  });

function extractJson(value: string): unknown {
  return parseStructuredJsonObject(value);
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
  if (/\bsubstring_sieve_map\s*=/.test(code)) {
    throw new Error(
      'Generated code uses unsupported Manim argument substring_sieve_map; color MathTex parts after construction instead'
    );
  }
  if (/\.\s*add_updater\s*\(/.test(code)) {
    throw new Error(
      'Generated code installs a frame updater; use always_redraw or TracedPath instead of add_updater'
    );
  }
  const sceneClasses = [
    ...code.matchAll(
      /\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*(Scene|MovingCameraScene|ThreeDScene)\s*\)\s*:/g
    ),
  ];
  if (
    !/\bclass\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
      code
    ) &&
    sceneClasses.length === 1
  ) {
    const [declaration, className] = sceneClasses[0];
    code = code.replace(
      declaration,
      declaration.replace(`class ${className}`, 'class CurvGScene')
    );
  }
  if (
    !/\bclass\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
      code
    )
  ) {
    throw new Error('Generated code must define CurvGScene');
  }
  const blocked = [
    /\b(?:import|from)\s+(?:os|subprocess|socket|requests|urllib|httpx|pathlib|shutil)\b/,
    /\b(?:open|eval|exec|compile|__import__|getattr|setattr|delattr|globals|locals|vars)\s*\(/,
    /\b(?:Popen|run|call|check_output|system)\s*\(/,
    /\b(?:ImageMobject|OpenGLImageMobject|SVGMobject|Code)\s*\(/,
    /\b(?:np|numpy)\.(?:fromfile|genfromtxt|load|loadtxt|memmap|save|savetxt)\s*\(/,
    /\\(?:include|includegraphics|input|lstinputlisting|openin|openout|read|verbatiminput|write|write18)\b/i,
  ];
  if (blocked.some((pattern) => pattern.test(code))) {
    throw new Error('Generated code contains blocked operations');
  }
  return code;
}
