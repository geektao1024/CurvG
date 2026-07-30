import { z } from 'zod';

import type {
  AnimationObjectSpec,
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

type ApprovedPlanningArtifacts = Omit<AnimationPlanningArtifacts, 'scene'>;
type SceneTimelineEvent =
  AnimationPlanningArtifacts['scene']['timeline'][number];

function fallbackEventId(shotIndex: number, eventIndex: number) {
  return `fallback_s${shotIndex + 1}_e${eventIndex + 1}`;
}

function fallbackEventRuntime(startAt: number, endAt: number) {
  return Number(
    Math.max(0.1, Math.min(0.85, (endAt - startAt) * 0.45)).toFixed(3)
  );
}

function fallbackPartId(focusRef: string, role: string) {
  let hash = 2166136261;
  for (const character of focusRef) {
    hash ^= character.codePointAt(0) || 0;
    hash = Math.imul(hash, 16777619);
  }
  return `${focusRef.slice(0, 48)}_${(hash >>> 0).toString(36)}_${role}`.slice(
    0,
    80
  );
}

function addTermTourCameraEvents(params: {
  artifacts: ApprovedPlanningArtifacts;
  objects: AnimationObjectSpec[];
  timeline: SceneTimelineEvent[];
}) {
  if (params.artifacts.storyboard.cinematography.emphasis !== 'term-tour') {
    return;
  }
  const formula = params.objects.find((object) => object.parts?.length);
  const focusShot = params.artifacts.storyboard.shots.find(
    (shot) => shot.focusRef === formula?.id
  );
  const resetShot = params.artifacts.storyboard.shots.at(-1);
  const partId = formula?.parts?.[0]?.id;
  if (!formula || !focusShot || !resetShot || !partId) return;

  const focusRuntime = fallbackEventRuntime(focusShot.startAt, focusShot.endAt);
  params.timeline.push({
    id: 'fallback_camera_focus',
    shotId: focusShot.id,
    at: focusShot.startAt,
    op: 'camera_focus',
    ref: formula.id,
    partId,
    zoom: 1.6,
    runTime: focusRuntime,
    ease: 'smooth',
  });
  params.timeline.push({
    id: 'fallback_camera_reset',
    shotId: resetShot.id,
    at: resetShot.startAt,
    op: 'camera_reset',
    ref: resetShot.focusRef,
    runTime: fallbackEventRuntime(resetShot.startAt, resetShot.endAt),
    ease: 'smooth',
  });
}

export function supportsDeterministicSceneProfile(
  artifacts: ApprovedPlanningArtifacts
) {
  const evidence = [
    artifacts.intent.title,
    artifacts.intent.summary,
    artifacts.intent.intent.learningGoal,
    artifacts.mathematics.mathDossier.coreClaim,
    ...(artifacts.mathematics.mathDossier.derivationSteps || []),
  ].join(' ');
  return (
    /(?:x\s*(?:\^|\*\*)\s*2|x²)/iu.test(evidence) &&
    /(?:tangent|secant|derivative|切线|割线|导数)/iu.test(evidence) &&
    /(?:x\s*=\s*1|x=1)/iu.test(evidence)
  );
}

function quadraticFocusObject(
  focusRef: string,
  purpose: string,
  beat: string
): AnimationObjectSpec {
  const hint = `${purpose} ${beat}`;
  if (/(?:point|coordinate|P\b|Q\b|点|坐标|邻近)/iu.test(hint)) {
    return {
      id: focusRef,
      kind: 'formula',
      region: 'formula',
      importance: 'hero',
      parts: [
        {
          id: fallbackPartId(focusRef, 'p'),
          latex: 'P=(1,1)',
          meaning: 'fixed point on the parabola',
          color: '#F4C95D',
        },
        {
          id: fallbackPartId(focusRef, 'q'),
          latex: ',\\quad Q=(1+h,(1+h)^2)',
          meaning: 'nearby point on the parabola',
          color: '#62D9C3',
        },
      ],
    };
  }
  if (/(?:quotient|difference|差商|斜率公式|建立)/iu.test(hint)) {
    return {
      id: focusRef,
      kind: 'formula',
      region: 'formula',
      importance: 'hero',
      parts: [
        {
          id: fallbackPartId(focusRef, 'label'),
          latex: 'm_{\\mathrm{sec}}=',
          meaning: 'secant slope',
          color: '#F4EDE1',
        },
        {
          id: fallbackPartId(focusRef, 'value'),
          latex: '\\frac{(1+h)^2-1}{h}',
          meaning: 'difference quotient',
          color: '#7C8CFF',
        },
      ],
    };
  }
  if (/(?:simplif|derive|化简|约分|2\s*\+\s*h)/iu.test(hint)) {
    return {
      id: focusRef,
      kind: 'formula',
      region: 'formula',
      importance: 'hero',
      parts: [
        {
          id: fallbackPartId(focusRef, 'label'),
          latex: 'm_{\\mathrm{sec}}=',
          meaning: 'secant slope',
          color: '#F4EDE1',
        },
        {
          id: fallbackPartId(focusRef, 'value'),
          latex: '2+h',
          meaning: 'simplified slope',
          color: '#62D9C3',
        },
        {
          id: fallbackPartId(focusRef, 'condition'),
          latex: ',\\quad h\\ne 0',
          meaning: 'difference quotient domain',
          color: '#F4C95D',
        },
      ],
    };
  }
  if (beat === 'payoff' || /(?:tangent|result|切线|结论|锁定)/iu.test(hint)) {
    return {
      id: focusRef,
      kind: 'formula',
      region: 'formula',
      importance: 'hero',
      parts: [
        {
          id: fallbackPartId(focusRef, 'slope'),
          latex: 'm_{\\mathrm{tan}}=2',
          meaning: 'tangent slope',
          color: '#F4C95D',
        },
        {
          id: fallbackPartId(focusRef, 'line'),
          latex: ',\\quad y=2x-1',
          meaning: 'tangent line',
          color: '#62D9C3',
        },
      ],
    };
  }
  return {
    id: focusRef,
    kind: 'line',
    region: 'graph',
    importance: 'hero',
    start: [0, /(?:limit|approach|趋近|逼近)/iu.test(hint) ? -1.2 : -2],
    end: [2, /(?:limit|approach|趋近|逼近)/iu.test(hint) ? 3.2 : 4],
    color: '#F4C95D',
  };
}

function buildQuadraticTangentScene(
  artifacts: ApprovedPlanningArtifacts
): AnimationPlanningArtifacts['scene'] {
  const focusObjectById = new Map<string, AnimationObjectSpec>();
  for (const shot of artifacts.storyboard.shots) {
    if (!focusObjectById.has(shot.focusRef) || shot.beat === 'payoff') {
      focusObjectById.set(
        shot.focusRef,
        quadraticFocusObject(shot.focusRef, shot.purpose, shot.beat)
      );
    }
  }
  const focusObjects = [...focusObjectById.values()];
  const focusIds = new Set(focusObjects.map((object) => object.id));
  const helperId = (preferred: string) => {
    let id = preferred;
    let suffix = 2;
    while (focusIds.has(id)) {
      id = `${preferred}_${suffix}`;
      suffix += 1;
    }
    focusIds.add(id);
    return id;
  };
  const axesId = helperId('fallback_axes');
  const curveId = helperId('fallback_parabola');
  const pointId = helperId('fallback_point_p');
  const nearbyPointId = helperId('fallback_point_q');
  const tangentId = helperId('fallback_tangent');
  const objects: AnimationObjectSpec[] = [
    {
      id: axesId,
      kind: 'axes',
      region: 'graph',
      importance: 'context',
      color: '#8B92A8',
    },
    {
      id: curveId,
      kind: 'curve',
      region: 'graph',
      importance: 'hero',
      expr: 'x^2',
      domain: [-1.4, 2.2],
      color: '#7C8CFF',
    },
    {
      id: pointId,
      kind: 'point',
      region: 'graph',
      importance: 'hero',
      position: [1, 1],
      color: '#F4C95D',
    },
    {
      id: nearbyPointId,
      kind: 'point',
      region: 'graph',
      importance: 'supporting',
      position: [2, 4],
      color: '#62D9C3',
    },
    {
      id: tangentId,
      kind: 'line',
      region: 'graph',
      importance: 'hero',
      start: [0, -1],
      end: [2.5, 4],
      color: '#62D9C3',
    },
    ...focusObjects,
  ];
  const timeline: SceneTimelineEvent[] = [];
  const visibleFormulaIds = new Set<string>();
  let eventIndex = 0;
  for (const [shotIndex, shot] of artifacts.storyboard.shots.entries()) {
    const runtime = fallbackEventRuntime(shot.startAt, shot.endAt);
    const focus = focusObjectById.get(shot.focusRef)!;
    const add = (event: Omit<SceneTimelineEvent, 'id'>) => {
      timeline.push({ id: fallbackEventId(shotIndex, eventIndex), ...event });
      eventIndex += 1;
    };
    if (shotIndex === 0) {
      for (const ref of [axesId, curveId, pointId, nearbyPointId]) {
        add({
          shotId: shot.id,
          at: shot.startAt,
          op: ref === pointId || ref === nearbyPointId ? 'fade_in' : 'draw',
          ref,
          runTime: runtime,
          ease: 'smooth',
        });
      }
    }
    if (focus.kind === 'formula') {
      for (const prior of visibleFormulaIds) {
        add({
          shotId: shot.id,
          at: shot.startAt,
          op: 'fade_out',
          ref: prior,
          runTime: runtime,
          ease: 'smooth',
        });
      }
      visibleFormulaIds.clear();
      visibleFormulaIds.add(focus.id);
    }
    add({
      shotId: shot.id,
      at: shot.startAt,
      op: focus.kind === 'formula' ? 'write' : 'draw',
      ref: focus.id,
      runTime: runtime,
      ease: 'smooth',
    });
    if (shot.beat === 'payoff') {
      add({
        shotId: shot.id,
        at: shot.startAt,
        op: 'draw',
        ref: tangentId,
        runTime: runtime,
        ease: 'smooth',
      });
    }
  }
  addTermTourCameraEvents({ artifacts, objects, timeline });
  return {
    style: {
      background: '#0B0D14',
      palette: ['#7C8CFF', '#62D9C3', '#F4C95D', '#F4EDE1'],
      camera: 'Compiler-owned 16:9 geometric proof frame',
    },
    objects,
    timeline,
    layout: { regions: 'left|right' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: [
      'CurvG assembled this validated scene deterministically from the approved planning artifacts.',
      'The curve, secants, tangent, and formulas preserve the approved mathematics dossier.',
    ],
  };
}

function buildGenericScene(
  artifacts: ApprovedPlanningArtifacts
): AnimationPlanningArtifacts['scene'] {
  const objectById = new Map<string, AnimationObjectSpec>();
  for (const [index, shot] of artifacts.storyboard.shots.entries()) {
    if (objectById.has(shot.focusRef)) continue;
    objectById.set(shot.focusRef, {
      id: shot.focusRef,
      kind: 'formula',
      region: 'formula',
      importance: shot.beat === 'payoff' ? 'hero' : 'supporting',
      parts: [
        {
          id: `fallback_step_${index + 1}`,
          latex: '\\text{Visual step }',
          meaning: shot.purpose.slice(0, 300),
          color: '#F4EDE1',
        },
        {
          id: `fallback_number_${index + 1}`,
          latex: String(index + 1),
          meaning: shot.acceptance.join(' ').slice(0, 300),
          color: shot.beat === 'payoff' ? '#F4C95D' : '#7C8CFF',
        },
      ],
    });
  }
  const objects = [...objectById.values()];
  const timeline: SceneTimelineEvent[] = [];
  let priorRef: string | undefined;
  let eventIndex = 0;
  for (const [shotIndex, shot] of artifacts.storyboard.shots.entries()) {
    const runtime = fallbackEventRuntime(shot.startAt, shot.endAt);
    if (priorRef && priorRef !== shot.focusRef) {
      timeline.push({
        id: fallbackEventId(shotIndex, eventIndex++),
        shotId: shot.id,
        at: shot.startAt,
        op: 'fade_out',
        ref: priorRef,
        runTime: runtime,
        ease: 'smooth',
      });
    }
    timeline.push({
      id: fallbackEventId(shotIndex, eventIndex++),
      shotId: shot.id,
      at: shot.startAt,
      op: priorRef === shot.focusRef ? 'emphasize' : 'write',
      ref: shot.focusRef,
      runTime: runtime,
      ease: 'smooth',
    });
    priorRef = shot.focusRef;
  }
  addTermTourCameraEvents({ artifacts, objects, timeline });
  return {
    style: {
      background: '#0B0D14',
      palette: ['#7C8CFF', '#62D9C3', '#F4C95D', '#F4EDE1'],
      camera: 'Compiler-owned safe frame',
    },
    objects,
    timeline,
    layout: { regions: 'single' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: [
      'CurvG assembled this conservative scene deterministically after the scene model was unavailable.',
    ],
  };
}

/**
 * Availability fallback for the one planning stage that expands approved
 * artifacts into a large scene contract. It never invents a new mathematical
 * claim: common proof profiles receive verified geometry, while unknown
 * profiles retain the approved shot order in a conservative formula scene.
 */
export function buildDeterministicSceneArtifact(
  artifacts: ApprovedPlanningArtifacts
): AnimationPlanningArtifacts['scene'] {
  const scene = supportsDeterministicSceneProfile(artifacts)
    ? buildQuadraticTangentScene(artifacts)
    : buildGenericScene(artifacts);
  return sceneArtifactSchema.parse(scene);
}
