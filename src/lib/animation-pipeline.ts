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

function deterministicDuration(prompt: string) {
  const match = prompt.match(
    /(?:^|\D)(\d{1,3})(?:\s*)(?:秒|seconds?|secs?)(?:\D|$)/iu
  );
  const requested = match ? Number(match[1]) : 12;
  return Math.min(30, Math.max(8, requested));
}

/**
 * A verified, provider-independent proof profile for the most common tangent
 * demonstration. This is deliberately narrow: an unfamiliar prompt must stay
 * on the model pipeline instead of receiving invented mathematics.
 */
export function buildDeterministicQuadraticTangentArtifacts(
  prompt: string
): AnimationPlanningArtifacts | undefined {
  const normalized = prompt.replaceAll('**', '^');
  const isQuadraticTangent =
    /(?:x\s*\^\s*2|x²)/iu.test(normalized) &&
    /(?:x\s*=\s*1|x=1)/iu.test(normalized) &&
    /(?:tangent|secant|derivative|slope|切线|割线|导数|斜率)/iu.test(
      normalized
    ) &&
    /(?:y\s*=\s*2\s*x\s*-\s*1|(?:slope|斜率).{0,24}2|2.{0,24}(?:slope|斜率))/iu.test(
      normalized
    );
  if (!isQuadraticTangent) return undefined;

  const durationSeconds = deterministicDuration(prompt);
  const quarter = durationSeconds / 4;
  const intent = intentArtifactSchema.parse({
    title: 'Quadratic tangent at x = 1',
    summary:
      'A moving secant on y=x² approaches the tangent y=2x-1, making the derivative value 2 visible and checkable.',
    durationSeconds,
    assumptions: ['h is nonzero before the limit h approaches zero.'],
    intent: {
      learningGoal:
        'See why the derivative of y=x² at x=1 is the tangent slope 2.',
      hook: 'What line does a shrinking secant become?',
      takeaway: 'The secant slope 2+h approaches 2.',
    },
  });
  const knowledge = knowledgeArtifactSchema.parse({
    knowledgeMap: [
      {
        id: 'quadratic_graph',
        concept: 'The graph y=x² contains P=(1,1).',
        dependsOn: [],
        misconception: 'The derivative is not the height of the point.',
      },
      {
        id: 'secant_slope',
        concept: 'A secant through P and Q has a difference-quotient slope.',
        dependsOn: ['quadratic_graph'],
        misconception: 'The secant is not yet the tangent while h is nonzero.',
      },
      {
        id: 'derivative_limit',
        concept: 'The tangent slope is the limit of secant slopes.',
        dependsOn: ['secant_slope'],
        misconception:
          'Substituting h=0 before simplifying causes division by zero.',
      },
    ],
  });
  const curriculum = curriculumArtifactSchema.parse({
    curriculum: [
      {
        id: 'locate_points',
        learningJob: 'Locate P and a nearby Q on the parabola.',
        dependsOn: ['quadratic_graph'],
        visualEvidence: 'P stays fixed while Q appears to its right.',
        notationBudget: 2,
      },
      {
        id: 'move_secant',
        learningJob: 'Relate the line through P and Q to the secant slope.',
        dependsOn: ['secant_slope', 'locate_points'],
        visualEvidence:
          'Q approaches P and the secant rotates toward one line.',
        notationBudget: 2,
      },
      {
        id: 'simplify_quotient',
        learningJob:
          'Simplify the difference quotient before taking the limit.',
        dependsOn: ['move_secant'],
        visualEvidence: 'The quotient transforms into 2+h with h nonzero.',
        notationBudget: 3,
      },
      {
        id: 'resolve_tangent',
        learningJob: 'Identify the limiting slope and tangent equation.',
        dependsOn: ['derivative_limit', 'simplify_quotient'],
        visualEvidence: 'The final line is labeled m=2 and y=2x-1.',
        notationBudget: 2,
      },
    ],
  });
  const mathematics = mathematicsArtifactSchema.parse({
    mathDossier: {
      coreClaim:
        'For f(x)=x² at x=1, the derivative is 2 and the tangent line is y=2x-1.',
      invariants: [
        'P remains fixed at (1,1).',
        'Q=(1+h,(1+h)²) remains on y=x².',
        'The secant slope equals 2+h for h not equal to zero.',
      ],
      commonMisreading:
        'h approaches zero; the difference quotient is simplified before evaluating the limit.',
      visualProof:
        'Move Q toward P while the secant slope 2+h approaches 2, then replace the limiting secant with y=2x-1.',
      definitions: [
        {
          concept: 'Secant slope',
          statement: 'm_sec=[f(1+h)-f(1)]/h for h≠0.',
        },
        {
          concept: 'Derivative at x=1',
          statement: "f'(1)=lim_{h→0}[f(1+h)-f(1)]/h.",
        },
      ],
      derivationSteps: [
        '[(1+h)²-1]/h=(2h+h²)/h for h≠0.',
        'The secant slope simplifies to 2+h.',
        'As h approaches 0, 2+h approaches 2.',
        'The line through (1,1) with slope 2 is y-1=2(x-1), hence y=2x-1.',
      ],
      checks: [
        {
          claim: 'The tangent slope is 2.',
          method: 'Differentiate x² independently.',
          expected: "f'(1)=2·1=2.",
        },
        {
          claim: 'The tangent passes through P.',
          method: 'Substitute x=1 into y=2x-1.',
          expected: 'y=1.',
        },
      ],
      limitations: [
        'This profile proves the claim specifically for f(x)=x² at x=1.',
      ],
    },
  });
  const storyboard = storyboardArtifactSchema.parse({
    direction: {
      preset: 'geometric-proof',
      frame: '16:9',
      pacing: 'balanced',
      textPolicy: { maxWordsPerObject: 8, maxSimultaneousText: 2 },
    },
    cinematography: { scene: 'static', emphasis: 'clean' },
    shots: [
      {
        id: 'shot_hook',
        beat: 'hook',
        purpose: 'Reveal the parabola with P and nearby Q.',
        startAt: 0,
        endAt: quarter,
        focusRef: 'point_pair',
        transition: 'build',
        acceptance: ['The parabola and both points are visible.'],
      },
      {
        id: 'shot_secant',
        beat: 'mechanism',
        purpose: 'Move the secant toward the tangent as Q approaches P.',
        startAt: quarter,
        endAt: quarter * 2,
        focusRef: 'secant_motion',
        transition: 'morph',
        acceptance: ['The secant visibly approaches one limiting direction.'],
      },
      {
        id: 'shot_quotient',
        beat: 'proof',
        purpose: 'Simplify the difference quotient to 2+h.',
        startAt: quarter * 2,
        endAt: quarter * 3,
        focusRef: 'difference_quotient',
        transition: 'emphasis',
        acceptance: ['The condition h≠0 and expression 2+h are readable.'],
      },
      {
        id: 'shot_payoff',
        beat: 'payoff',
        purpose: 'Resolve the tangent slope and exact tangent equation.',
        startAt: quarter * 3,
        endAt: durationSeconds,
        focusRef: 'tangent_result',
        transition: 'emphasis',
        acceptance: ['The final frame clearly shows m=2 and y=2x-1.'],
      },
    ],
  });
  const approved = { intent, knowledge, curriculum, mathematics, storyboard };
  const artifacts = {
    ...approved,
    scene: buildDeterministicSceneArtifact(approved),
  };
  composeAnimationSpecFromArtifacts(artifacts);
  return artifacts;
}

/**
 * A provider-independent cycloid profile. The unit circle rolls on y=0 while
 * a marked point traces one complete arch. The horizontal -pi translation is
 * only a framing choice; it keeps the two cusps centered in the 16:9 graph.
 */
export function buildDeterministicCycloidArtifacts(
  prompt: string
): AnimationPlanningArtifacts | undefined {
  const isCycloid =
    /(?:cycloid|摆线)/iu.test(prompt) &&
    /(?:rolling\s+circle|generat|滚动圆|生成|轨迹|trace)/iu.test(prompt);
  if (!isCycloid) return undefined;

  const durationSeconds = deterministicDuration(prompt);
  const quarter = durationSeconds / 4;
  const eventRuntime = Number(Math.min(1.35, quarter * 0.45).toFixed(3));
  const intent = intentArtifactSchema.parse({
    title: 'Cycloid from a rolling circle',
    summary:
      'A marked point on a unit circle rolls without slipping and traces one centered cycloid arch.',
    durationSeconds,
    assumptions: [
      'The circle has radius 1 and rolls without slipping on y=0.',
      'The parameter t is both the rotation angle and horizontal travel distance.',
    ],
    intent: {
      learningGoal:
        'Connect the rolling circle geometry to the cycloid parameterization.',
      hook: 'What curve does one point on a rolling wheel leave behind?',
      takeaway:
        'Combining translation with circular rotation produces a cycloid.',
    },
  });
  const knowledge = knowledgeArtifactSchema.parse({
    knowledgeMap: [
      {
        id: 'rolling_without_slip',
        concept:
          'For a unit circle rolling without slipping, rotation t equals horizontal travel t.',
        dependsOn: [],
        misconception:
          'The marked point does not move around a stationary circle.',
      },
      {
        id: 'marked_point_motion',
        concept:
          'The marked point combines center translation with a rotating radius vector.',
        dependsOn: ['rolling_without_slip'],
        misconception:
          'The cycloid is not the circular path relative to the moving center.',
      },
      {
        id: 'cycloid_arch',
        concept: 'One full turn traces a cusp-to-cusp cycloid arch.',
        dependsOn: ['marked_point_motion'],
        misconception:
          'The cusps occur when the marked point touches the baseline, not at the top.',
      },
    ],
  });
  const curriculum = curriculumArtifactSchema.parse({
    curriculum: [
      {
        id: 'establish_wheel',
        learningJob:
          'Identify the rolling circle, contact point, and baseline.',
        dependsOn: ['rolling_without_slip'],
        visualEvidence:
          'A unit circle begins with its marked point on the baseline.',
        notationBudget: 1,
      },
      {
        id: 'combine_motion',
        learningJob:
          'See the circle translate while the marked radius rotates.',
        dependsOn: ['marked_point_motion', 'establish_wheel'],
        visualEvidence:
          'The circle, radius, and marked point move together to the top of the arch.',
        notationBudget: 2,
      },
      {
        id: 'trace_arch',
        learningJob: 'Connect the moving point to the growing cycloid trace.',
        dependsOn: ['cycloid_arch', 'combine_motion'],
        visualEvidence:
          'The trace grows from the first cusp through the arch to the second cusp.',
        notationBudget: 2,
      },
      {
        id: 'read_parameterization',
        learningJob: 'Read the centered unit-cycloid parameterization.',
        dependsOn: ['trace_arch'],
        visualEvidence:
          'The final frame pairs the complete arch with x=t-pi-sin(t), y=1-cos(t).',
        notationBudget: 2,
      },
    ],
  });
  const mathematics = mathematicsArtifactSchema.parse({
    mathDossier: {
      coreClaim:
        'A marked point on a unit circle rolling without slipping along y=0 traces x=t-pi-sin(t), y=1-cos(t) for 0<=t<=2pi.',
      invariants: [
        'The rolling circle keeps radius 1 and its center stays one unit above y=0.',
        'The center horizontal coordinate is t-pi.',
        'The marked point remains exactly one unit from the moving center.',
      ],
      commonMisreading:
        'The -pi term only centers the arch; it does not change the cycloid shape.',
      visualProof:
        'Translate the center from -pi to pi while rotating the radius through one turn, and grow the marked point trace from cusp to cusp.',
      definitions: [
        {
          concept: 'Rolling without slipping',
          statement:
            'For radius 1, arc length t equals the center displacement t.',
        },
        {
          concept: 'Centered cycloid',
          statement: 'P(t)=(t-pi-sin(t), 1-cos(t)) for 0<=t<=2pi.',
        },
      ],
      derivationSteps: [
        'The rolling center is C(t)=(t-pi,1).',
        'The rotating radius from C to the marked point is (-sin(t),-cos(t)).',
        'Adding translation and rotation gives P(t)=(t-pi-sin(t),1-cos(t)).',
        'At t=0 and t=2pi the point lies on y=0, producing the two cusps.',
      ],
      checks: [
        {
          claim: 'The point stays on the rolling circle.',
          method: 'Subtract C(t) from P(t) and compute the squared length.',
          expected: 'sin(t)^2+cos(t)^2=1.',
        },
        {
          claim: 'The endpoints are cusps on the baseline.',
          method: 'Substitute t=0 and t=2pi.',
          expected: 'P(0)=(-pi,0) and P(2pi)=(pi,0).',
        },
      ],
      limitations: [
        'This deterministic profile uses a unit circle and displays one arch.',
      ],
    },
  });
  const storyboard = storyboardArtifactSchema.parse({
    direction: {
      preset: 'geometric-proof',
      frame: '16:9',
      pacing: 'balanced',
      textPolicy: { maxWordsPerObject: 8, maxSimultaneousText: 2 },
    },
    cinematography: { scene: 'static', emphasis: 'clean' },
    shots: [
      {
        id: 'cycloid_hook',
        beat: 'hook',
        purpose: 'Reveal the wheel, baseline, marked point, and first cusp.',
        startAt: 0,
        endAt: quarter,
        focusRef: 'rolling_circle',
        transition: 'build',
        acceptance: ['The marked point begins on the baseline.'],
      },
      {
        id: 'cycloid_roll',
        beat: 'mechanism',
        purpose: 'Move the rolling circle to the midpoint of the arch.',
        startAt: quarter,
        endAt: quarter * 2,
        focusRef: 'rolling_circle',
        transition: 'morph',
        acceptance: [
          'The circle, radius, point, and partial trace advance together.',
        ],
      },
      {
        id: 'cycloid_proof',
        beat: 'proof',
        purpose: 'Complete the turn and connect it to the parameterization.',
        startAt: quarter * 2,
        endAt: quarter * 3,
        focusRef: 'parametric_formula',
        transition: 'morph',
        acceptance: ['The trace reaches the second cusp at y=0.'],
      },
      {
        id: 'cycloid_payoff',
        beat: 'payoff',
        purpose: 'Leave the complete cycloid and its rolling-circle cause.',
        startAt: quarter * 3,
        endAt: durationSeconds,
        focusRef: 'cycloid_result',
        transition: 'emphasis',
        acceptance: [
          'The complete arch and exact parameterization remain readable.',
        ],
      },
    ],
  });
  const pi = Math.PI;
  const scene = sceneArtifactSchema.parse({
    style: {
      background: '#0B0D14',
      palette: ['#7C8CFF', '#62D9C3', '#F4C95D', '#F4EDE1'],
      camera: 'Fixed 16:9 rolling-geometry frame',
    },
    objects: [
      {
        id: 'cycloid_axes',
        kind: 'axes',
        region: 'graph',
        importance: 'context',
        color: '#8B92A8',
      },
      {
        id: 'cycloid_baseline',
        kind: 'line',
        region: 'graph',
        importance: 'context',
        start: [-4.4, 0],
        end: [4.4, 0],
        color: '#8B92A8',
      },
      {
        id: 'rolling_circle',
        kind: 'circle',
        region: 'graph',
        importance: 'hero',
        center: [-pi, 1],
        radius: 1,
        color: '#7C8CFF',
      },
      {
        id: 'rolling_circle_mid',
        kind: 'circle',
        region: 'graph',
        center: [0, 1],
        radius: 1,
        color: '#7C8CFF',
      },
      {
        id: 'rolling_circle_end',
        kind: 'circle',
        region: 'graph',
        center: [pi, 1],
        radius: 1,
        color: '#7C8CFF',
      },
      {
        id: 'generator_point',
        kind: 'point',
        region: 'graph',
        importance: 'hero',
        position: [-pi, 0],
        color: '#F4C95D',
      },
      {
        id: 'generator_point_mid',
        kind: 'point',
        region: 'graph',
        position: [0, 2],
        color: '#F4C95D',
      },
      {
        id: 'generator_point_end',
        kind: 'point',
        region: 'graph',
        position: [pi, 0],
        color: '#F4C95D',
      },
      {
        id: 'rolling_radius',
        kind: 'line',
        region: 'graph',
        start: [-pi, 1],
        end: [-pi, 0],
        color: '#F4C95D',
      },
      {
        id: 'rolling_radius_mid',
        kind: 'line',
        region: 'graph',
        start: [0, 1],
        end: [0, 2],
        color: '#F4C95D',
      },
      {
        id: 'rolling_radius_end',
        kind: 'line',
        region: 'graph',
        start: [pi, 1],
        end: [pi, 0],
        color: '#F4C95D',
      },
      {
        id: 'cycloid_trace',
        kind: 'parametric',
        region: 'graph',
        importance: 'hero',
        xExpr: 't-pi-sin(t)',
        yExpr: '1-cos(t)',
        domain: [0, 0.08],
        color: '#62D9C3',
      },
      {
        id: 'cycloid_trace_mid',
        kind: 'parametric',
        region: 'graph',
        xExpr: 't-pi-sin(t)',
        yExpr: '1-cos(t)',
        domain: [0, pi],
        color: '#62D9C3',
      },
      {
        id: 'cycloid_trace_full',
        kind: 'parametric',
        region: 'graph',
        xExpr: 't-pi-sin(t)',
        yExpr: '1-cos(t)',
        domain: [0, pi * 2],
        color: '#62D9C3',
      },
      {
        id: 'parametric_formula',
        kind: 'formula',
        region: 'formula',
        importance: 'hero',
        parts: [
          {
            id: 'cycloid_x',
            latex: 'x=t-\\pi-\\sin t,',
            meaning: 'translation minus horizontal rotation component',
            color: '#62D9C3',
          },
          {
            id: 'cycloid_y',
            latex: '\\quad y=1-\\cos t',
            meaning: 'vertical rotation component above the baseline',
            color: '#F4C95D',
          },
        ],
      },
      {
        id: 'cycloid_result',
        kind: 'formula',
        region: 'formula',
        importance: 'hero',
        parts: [
          {
            id: 'rolling_label',
            latex: '\\text{rolling circle}',
            meaning: 'the geometric generator',
            color: '#7C8CFF',
          },
          {
            id: 'cycloid_label',
            latex: '\\Longrightarrow\\text{cycloid}',
            meaning: 'the generated trace',
            color: '#62D9C3',
          },
        ],
      },
    ],
    timeline: [
      ...[
        ['cycloid_axes', 'draw'],
        ['cycloid_baseline', 'draw'],
        ['rolling_circle', 'draw'],
        ['generator_point', 'fade_in'],
        ['rolling_radius', 'draw'],
        ['cycloid_trace', 'draw'],
        ['parametric_formula', 'write'],
      ].map(([ref, op], index) => ({
        id: `cycloid_open_${index + 1}`,
        shotId: 'cycloid_hook',
        at: 0,
        op,
        ref,
        runTime: eventRuntime,
        ease: 'smooth',
      })),
      ...[
        ['rolling_circle', 'rolling_circle_mid'],
        ['generator_point', 'generator_point_mid'],
        ['rolling_radius', 'rolling_radius_mid'],
        ['cycloid_trace', 'cycloid_trace_mid'],
      ].map(([ref, targetRef], index) => ({
        id: `cycloid_mid_${index + 1}`,
        shotId: 'cycloid_roll',
        at: quarter,
        op: 'transform',
        ref,
        targetRef,
        runTime: eventRuntime,
        ease: 'smooth',
      })),
      ...[
        ['rolling_circle', 'rolling_circle_end'],
        ['generator_point', 'generator_point_end'],
        ['rolling_radius', 'rolling_radius_end'],
        ['cycloid_trace', 'cycloid_trace_full'],
      ].map(([ref, targetRef], index) => ({
        id: `cycloid_end_${index + 1}`,
        shotId: 'cycloid_proof',
        at: quarter * 2,
        op: 'transform',
        ref,
        targetRef,
        runTime: eventRuntime,
        ease: 'smooth',
      })),
      {
        id: 'cycloid_formula_emphasis',
        shotId: 'cycloid_proof',
        at: quarter * 2,
        op: 'emphasize',
        ref: 'parametric_formula',
        runTime: eventRuntime,
        ease: 'smooth',
      },
      {
        id: 'cycloid_formula_out',
        shotId: 'cycloid_payoff',
        at: quarter * 3,
        op: 'fade_out',
        ref: 'parametric_formula',
        runTime: eventRuntime,
        ease: 'smooth',
      },
      {
        id: 'cycloid_result_in',
        shotId: 'cycloid_payoff',
        at: quarter * 3,
        op: 'write',
        ref: 'cycloid_result',
        runTime: eventRuntime,
        ease: 'smooth',
      },
      {
        id: 'cycloid_trace_emphasis',
        shotId: 'cycloid_payoff',
        at: quarter * 3,
        op: 'glow',
        ref: 'cycloid_trace',
        runTime: eventRuntime,
        ease: 'smooth',
      },
    ],
    layout: { regions: 'left|right' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: [
      'Deterministic profile cycloid-v1.',
      'The centered parameterization is an exact horizontal translation of the standard unit cycloid.',
    ],
  });
  const artifacts = {
    intent,
    knowledge,
    curriculum,
    mathematics,
    storyboard,
    scene,
  };
  composeAnimationSpecFromArtifacts(artifacts);
  return artifacts;
}

/**
 * A verified, provider-independent heart-curve profile. The familiar heart
 * curve is scaled into CurvG's fixed graph viewport so the complete trace,
 * axes, and moving point remain visible without model-authored layout code.
 */
export function buildDeterministicHeartCurveArtifacts(
  prompt: string
): AnimationPlanningArtifacts | undefined {
  const normalized = prompt.replace(/\s+/gu, ' ').trim();
  const requestsHeartCurve =
    /(?:爱心|心形|心型).{0,40}(?:坐标|坐标轴|曲线|参数|函数|画|绘|描|动画)|(?:坐标|坐标轴|曲线|参数|函数|画|绘|描|动画).{0,40}(?:爱心|心形|心型)|(?:heart).{0,40}(?:curve|graph|axes|axis|plot|draw|trace)|(?:curve|graph|axes|axis|plot|draw|trace).{0,40}(?:heart)/iu.test(
      normalized
    );
  if (!requestsHeartCurve) return undefined;

  const chinese = /[\u3400-\u9fff]/u.test(normalized);
  const durationSeconds = Math.min(16, deterministicDuration(prompt));
  const traceStart = Math.min(1.2, durationSeconds * 0.1);
  const traceEnd = durationSeconds * 0.55;
  const formulaEnd = durationSeconds * 0.78;
  const traceRunTime = Number((traceEnd - traceStart - 0.15).toFixed(3));
  const formulaRunTime = Number(
    Math.min(1.15, formulaEnd - traceEnd - 0.2).toFixed(3)
  );
  const pulseRunTime = Number(
    Math.min(0.9, (durationSeconds - formulaEnd) * 0.32).toFixed(3)
  );
  const secondPulseAt = Number(
    Math.min(
      durationSeconds - pulseRunTime - 0.25,
      formulaEnd + pulseRunTime + 0.35
    ).toFixed(3)
  );
  const heartX = '4*sin(t)^3';
  const heartY = '2.6*cos(t)-cos(2*t)-0.4*cos(3*t)-0.2*cos(4*t)';

  const intent = intentArtifactSchema.parse({
    title: chinese
      ? '在坐标轴上画出一颗心'
      : 'Trace a heart on the coordinate plane',
    summary: chinese
      ? '坐标轴出现后，参数 t 驱动一个点沿心形曲线运动，并同步描出完整轮廓。'
      : 'After the axes appear, one parameter moves a point around the curve while the complete heart is traced.',
    durationSeconds,
    assumptions: [
      chinese
        ? '采用经典心形参数曲线的等比例视窗变体，参数范围为 0≤t≤2π。'
        : 'Use a viewport-scaled form of the classic heart parameterization for 0≤t≤2π.',
    ],
    intent: {
      learningGoal: chinese
        ? '看见同一个参数如何同时控制 x、y 坐标并描出闭合心形。'
        : 'See how one parameter controls both coordinates to trace a closed heart.',
      hook: chinese
        ? '一个移动的点，能不能画出一颗心？'
        : 'Can one moving point draw a heart?',
      takeaway: chinese
        ? '让 t 从 0 走到 2π，坐标就会闭合成心形。'
        : 'Let t run from 0 to 2π and the coordinates close into a heart.',
    },
  });
  const knowledge = knowledgeArtifactSchema.parse({
    knowledgeMap: [
      {
        id: 'coordinate_pair',
        concept: chinese
          ? '平面上的点由一对坐标 (x,y) 决定。'
          : 'A point in the plane is determined by a coordinate pair (x,y).',
        dependsOn: [],
        misconception: chinese
          ? 'x 与 y 不是两条互不相关的动画。'
          : 'x and y are not two unrelated animations.',
      },
      {
        id: 'shared_parameter',
        concept: chinese
          ? '同一个参数 t 同时产生 x(t) 与 y(t)。'
          : 'The same parameter t produces both x(t) and y(t).',
        dependsOn: ['coordinate_pair'],
        misconception: chinese
          ? '参数 t 不是额外的一条坐标轴。'
          : 'The parameter t is not an additional coordinate axis.',
      },
      {
        id: 'closed_trace',
        concept: chinese
          ? 't 从 0 变化到 2π 后回到起点，形成闭合曲线。'
          : 'As t runs from 0 to 2π, the point returns to its start and closes the curve.',
        dependsOn: ['shared_parameter'],
        misconception: chinese
          ? '心形轮廓不是静态图片，而是坐标点的连续轨迹。'
          : 'The heart outline is a continuous coordinate trace, not a static image.',
      },
    ],
  });
  const curriculum = curriculumArtifactSchema.parse({
    curriculum: [
      {
        id: 'establish_plane',
        learningJob: chinese
          ? '先建立 x-y 坐标平面和起始点。'
          : 'Establish the x-y plane and the starting point.',
        dependsOn: ['coordinate_pair'],
        visualEvidence: chinese
          ? '坐标轴和位于曲线起点的高亮点清楚可见。'
          : 'The axes and a highlighted point at the curve start are visible.',
        notationBudget: 0,
      },
      {
        id: 'trace_heart',
        learningJob: chinese
          ? '让参数点沿曲线运动并同步留下轨迹。'
          : 'Move the parameter point and reveal its path at the same time.',
        dependsOn: ['shared_parameter', 'establish_plane'],
        visualEvidence: chinese
          ? '运动点与逐步增长的心形轮廓保持同步。'
          : 'The moving point stays synchronized with the growing heart outline.',
        notationBudget: 1,
      },
      {
        id: 'show_rule',
        learningJob: chinese
          ? '把视觉轨迹和参数方程联系起来。'
          : 'Connect the visible trace to its parametric rule.',
        dependsOn: ['closed_trace', 'trace_heart'],
        visualEvidence: chinese
          ? '完整心形与两条参数方程同时保留。'
          : 'The completed heart remains visible beside both parameter equations.',
        notationBudget: 2,
      },
      {
        id: 'close_loop',
        learningJob: chinese
          ? '强调轨迹闭合并形成最终记忆画面。'
          : 'Emphasize closure and leave a memorable final image.',
        dependsOn: ['show_rule'],
        visualEvidence: chinese
          ? '心形连续脉冲两次，坐标轴仍作为参照。'
          : 'The heart pulses twice while the axes remain as reference.',
        notationBudget: 0,
      },
    ],
  });
  const mathematics = mathematicsArtifactSchema.parse({
    mathDossier: {
      coreClaim: chinese
        ? '参数曲线 x=4sin³t、y=2.6cos t−cos 2t−0.4cos 3t−0.2cos 4t（0≤t≤2π）描出一条关于 y 轴对称的闭合心形曲线。'
        : 'The parameterization x=4sin³t and y=2.6cos t−cos 2t−0.4cos 3t−0.2cos 4t for 0≤t≤2π traces a closed heart symmetric about the y-axis.',
      invariants: [
        chinese
          ? '运动点始终位于当前参数 t 对应的曲线上。'
          : 'The moving point remains on the curve for the current parameter t.',
        chinese
          ? 'x(2π−t)=−x(t)，y(2π−t)=y(t)，因此曲线关于 y 轴对称。'
          : 'x(2π−t)=−x(t) and y(2π−t)=y(t), so the curve is symmetric about the y-axis.',
        chinese
          ? 't=0 与 t=2π 得到同一点 (0,1)，轨迹闭合。'
          : 't=0 and t=2π give the same point (0,1), so the trace closes.',
      ],
      commonMisreading: chinese
        ? '这不是单值函数 y=f(x)；同一个 x 可能对应心形上下两处。'
        : 'This is not a single-valued y=f(x); one x-coordinate can occur on both halves of the heart.',
      visualProof: chinese
        ? '在固定坐标轴上让高亮点沿完整参数曲线运动，同时从起点连续描出轮廓；最后保留闭合曲线和参数方程。'
        : 'Move a highlighted point along the full parametric path on fixed axes while revealing the outline from its start, then retain the closed curve and equations.',
      definitions: [
        {
          concept: chinese ? '参数曲线' : 'Parametric curve',
          statement: chinese
            ? '每个参数值 t 同时指定一个坐标点 (x(t),y(t))。'
            : 'Each parameter value t specifies one point (x(t),y(t)).',
        },
      ],
      derivationSteps: [
        chinese
          ? '令 t 从 0 连续增加到 2π。'
          : 'Let t increase continuously from 0 to 2π.',
        chinese
          ? '用 x(t)=4sin³t 控制左右位置，用 y(t) 的余弦组合控制上下轮廓。'
          : 'Use x(t)=4sin³t for horizontal position and the cosine combination y(t) for the vertical outline.',
        chinese
          ? '将每一对 (x(t),y(t)) 连续连接，得到完整心形。'
          : 'Connect the coordinate pairs continuously to obtain the complete heart.',
      ],
      checks: [
        {
          claim: chinese ? '轨迹闭合。' : 'The trace closes.',
          method: chinese
            ? '分别代入 t=0 与 t=2π。'
            : 'Evaluate the parameterization at t=0 and t=2π.',
          expected: chinese
            ? '两次都得到 (0,1)。'
            : 'Both evaluations give (0,1).',
        },
        {
          claim: chinese
            ? '轨迹关于 y 轴对称。'
            : 'The trace is symmetric about the y-axis.',
          method: chinese
            ? '比较 t 与 2π−t 的坐标。'
            : 'Compare the coordinates at t and 2π−t.',
          expected: chinese
            ? 'x 变号而 y 不变。'
            : 'x changes sign while y remains unchanged.',
        },
      ],
      limitations: [
        chinese
          ? '这是经典心形参数曲线的视窗缩放版本，不代表真实心脏的解剖轮廓。'
          : 'This is a viewport-scaled classic heart curve, not an anatomical heart model.',
      ],
    },
  });
  const storyboard = storyboardArtifactSchema.parse({
    direction: {
      preset: 'cinematic-math',
      frame: '16:9',
      pacing: 'balanced',
      textPolicy: { maxWordsPerObject: 8, maxSimultaneousText: 1 },
    },
    cinematography: { scene: 'static', emphasis: 'clean' },
    shots: [
      {
        id: 'heart_setup',
        beat: 'hook',
        purpose: chinese
          ? '快速出现坐标轴和一颗准备运动的点。'
          : 'Reveal the axes and a point ready to move.',
        startAt: 0,
        endAt: traceStart,
        focusRef: 'heart_point',
        transition: 'build',
        acceptance: [
          chinese
            ? '第一秒内坐标轴和高亮点可见。'
            : 'The axes and highlighted point are visible within the first second.',
        ],
      },
      {
        id: 'heart_trace',
        beat: 'mechanism',
        purpose: chinese
          ? '让点沿参数路径运动并同步描出心形。'
          : 'Move the point along the parameter path while drawing the heart.',
        startAt: traceStart,
        endAt: traceEnd,
        focusRef: 'heart_curve',
        transition: 'build',
        acceptance: [
          chinese
            ? '运动点与曲线描边同时完成一个闭合周期。'
            : 'The moving point and curve drawing complete one closed cycle together.',
        ],
      },
      {
        id: 'heart_formula',
        beat: 'proof',
        purpose: chinese
          ? '显示产生当前轨迹的参数方程。'
          : 'Reveal the parameterization that produced the trace.',
        startAt: traceEnd,
        endAt: formulaEnd,
        focusRef: 'heart_formula',
        transition: 'emphasis',
        acceptance: [
          chinese
            ? '两条参数方程可读，心形仍保持完整。'
            : 'Both parameter equations are readable while the heart remains complete.',
        ],
      },
      {
        id: 'heart_payoff',
        beat: 'payoff',
        purpose: chinese
          ? '用两次轻微脉冲强化完整心形。'
          : 'Reinforce the complete heart with two subtle pulses.',
        startAt: formulaEnd,
        endAt: durationSeconds,
        focusRef: 'heart_curve',
        transition: 'emphasis',
        acceptance: [
          chinese
            ? '最终画面以大尺寸完整心形为主体，不依赖说明文字。'
            : 'The final frame is dominated by the complete heart without relying on prose.',
        ],
      },
    ],
  });
  const scene = sceneArtifactSchema.parse({
    style: {
      background: '#090B16',
      palette: ['#FF4D8D', '#FF8FB5', '#7C8CFF', '#F4EDE1'],
      camera:
        'Fixed 16:9 coordinate-plane composition with a centered hero curve.',
    },
    objects: [
      {
        id: 'heart_axes',
        kind: 'axes',
        region: 'graph',
        importance: 'context',
        color: '#8B92A8',
      },
      {
        id: 'heart_curve',
        kind: 'parametric',
        region: 'graph',
        importance: 'hero',
        xExpr: heartX,
        yExpr: heartY,
        domain: [0, Math.PI * 2],
        color: '#FF4D8D',
      },
      {
        id: 'heart_point',
        kind: 'point',
        region: 'graph',
        importance: 'hero',
        position: [0, 1],
        color: '#FFD7E5',
      },
      {
        id: 'heart_formula',
        kind: 'formula',
        region: 'formula',
        importance: 'supporting',
        parts: [
          {
            id: 'heart_x',
            latex: 'x=4\\sin^3 t,',
            meaning: 'horizontal coordinate',
            color: '#FF8FB5',
          },
          {
            id: 'heart_y',
            latex: '\\quad y=2.6\\cos t-\\cos 2t-0.4\\cos 3t-0.2\\cos 4t',
            meaning: 'vertical coordinate',
            color: '#F4EDE1',
          },
        ],
      },
    ],
    timeline: [
      {
        id: 'heart_axes_in',
        shotId: 'heart_setup',
        at: 0,
        op: 'draw',
        ref: 'heart_axes',
        runTime: Number(Math.min(0.85, traceStart - 0.15).toFixed(3)),
        ease: 'smooth',
      },
      {
        id: 'heart_point_in',
        shotId: 'heart_setup',
        at: 0,
        op: 'fade_in',
        ref: 'heart_point',
        runTime: Number(Math.min(0.85, traceStart - 0.15).toFixed(3)),
        ease: 'smooth',
      },
      {
        id: 'heart_curve_trace',
        shotId: 'heart_trace',
        at: traceStart,
        op: 'draw',
        ref: 'heart_curve',
        runTime: traceRunTime,
        ease: 'linear',
      },
      {
        id: 'heart_point_trace',
        shotId: 'heart_trace',
        at: traceStart,
        op: 'move_along',
        ref: 'heart_point',
        pathRef: 'heart_curve',
        runTime: traceRunTime,
        ease: 'linear',
      },
      {
        id: 'heart_formula_in',
        shotId: 'heart_formula',
        at: traceEnd,
        op: 'write',
        ref: 'heart_formula',
        runTime: formulaRunTime,
        ease: 'smooth',
      },
      {
        id: 'heart_formula_emphasis',
        shotId: 'heart_formula',
        at: Number((traceEnd + formulaRunTime + 0.2).toFixed(3)),
        op: 'emphasize',
        ref: 'heart_formula',
        runTime: Number(
          Math.min(0.85, formulaEnd - traceEnd - formulaRunTime - 0.25).toFixed(
            3
          )
        ),
        ease: 'there_and_back',
      },
      {
        id: 'heart_first_pulse',
        shotId: 'heart_payoff',
        at: formulaEnd,
        op: 'emphasize',
        ref: 'heart_curve',
        runTime: pulseRunTime,
        ease: 'there_and_back',
      },
      {
        id: 'heart_second_pulse',
        shotId: 'heart_payoff',
        at: secondPulseAt,
        op: 'emphasize',
        ref: 'heart_curve',
        runTime: pulseRunTime,
        ease: 'there_and_back',
      },
      {
        id: 'heart_final_hold',
        shotId: 'heart_payoff',
        at: Number((secondPulseAt + pulseRunTime + 0.1).toFixed(3)),
        op: 'hold',
        ref: 'heart_curve',
        runTime: Number(
          Math.max(
            0.15,
            durationSeconds - secondPulseAt - pulseRunTime - 0.1
          ).toFixed(3)
        ),
        ease: 'linear',
      },
    ],
    layout: { regions: 'single' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: [
      'Deterministic profile heart-curve-v1.',
      'The formula is the classic Fourier heart curve scaled to CurvG graph coordinates.',
      'The moving point and Create animation share the same linear parameter interval.',
    ],
  });
  const artifacts = {
    intent,
    knowledge,
    curriculum,
    mathematics,
    storyboard,
    scene,
  };
  composeAnimationSpecFromArtifacts(artifacts);
  return artifacts;
}

export interface DeterministicAnimationPlanningProfile {
  id: 'quadratic-tangent-v1' | 'cycloid-v1' | 'heart-curve-v1';
  artifacts: AnimationPlanningArtifacts;
}

function fallbackDisplayTitle(prompt: string, chinese: boolean) {
  const normalized = prompt.replace(/\s+/gu, ' ').trim();
  if (!normalized) return chinese ? '基础概念演示' : 'Concept overview';
  if (chinese) {
    return Array.from(normalized).slice(0, 28).join('');
  }
  return normalized.split(' ').slice(0, 10).join(' ').slice(0, 120);
}

/**
 * @deprecated Legacy artifact reader only. The planning pipeline must never
 * route new requests here: a generic explainer is not a successful answer to
 * an unmatched prompt. Kept temporarily so archived specifications and older
 * diagnostic fixtures remain understandable during migration.
 */
export function buildDeterministicDeliveryFallbackArtifacts(
  prompt: string
): AnimationPlanningArtifacts {
  const chinese = /[\u3400-\u9fff]/u.test(prompt);
  const variableRelationship =
    /(?:\bx\b.{0,80}\by\b|\by\b.{0,80}\bx\b|x\s*(?:和|与)\s*y|y\s*(?:和|与)\s*x)/iu.test(
      prompt
    );
  const requestedTitle = fallbackDisplayTitle(prompt, chinese);
  const title = variableRelationship
    ? chinese
      ? 'x 与 y：输入、规则、输出'
      : 'x and y: input, rule, output'
    : requestedTitle;
  const summary = chinese
    ? '这是自动启用的基础演示：先保留原问题，再用“观察—建立联系—检查结论”的顺序给出可播放结果，不补造题目没有提供的事实。'
    : 'This reliable fallback keeps the original question and presents it as observe, connect, and verify without inventing facts that were not supplied.';
  const coreClaim = variableRelationship
    ? chinese
      ? '只写出 x 和 y 不能唯一决定关系；还需要规则、表格、图像或成对数据。y=f(x) 表示“用某个规则把输入 x 变成输出 y”。'
      : 'The names x and y alone do not determine a relationship. A rule, table, graph, or paired data is still required; y=f(x) only says that a rule maps input x to output y.'
    : chinese
      ? '当问题缺少可验证的细节时，先区分已知信息、要建立的联系和可以检查的结论，不能补造未提供的事实。'
      : 'When a request lacks verifiable detail, separate known information, the proposed connection, and a checkable conclusion without inventing missing facts.';
  const formula = variableRelationship
    ? 'y=f(x)'
    : '\\text{observe}\\;\\to\\;\\text{connect}\\;\\to\\;\\text{verify}';
  const stepLabel = variableRelationship
    ? chinese
      ? '输入 · 规则 · 输出'
      : 'Input · rule · output'
    : chinese
      ? '观察 · 联系 · 检查'
      : 'Observe · connect · verify';
  const takeawayLabel = variableRelationship
    ? chinese
      ? '先找规则，再判断关系'
      : 'Find the rule before judging the relation'
    : chinese
      ? '只保留能够检查的结论'
      : 'Keep only conclusions that can be checked';

  const artifacts: AnimationPlanningArtifacts = {
    intent: {
      title,
      summary,
      durationSeconds: 12,
      assumptions: [
        chinese
          ? '未提供的公式、数值和因果关系均不作假设。'
          : 'No formula, value, or causal relationship is assumed unless supplied.',
      ],
      intent: {
        learningGoal: variableRelationship
          ? chinese
            ? '知道变量名不等于关系，并能用“输入—规则—输出”描述 x 与 y。'
            : 'Distinguish variable names from a rule and describe x and y as input, rule, and output.'
          : chinese
            ? '把问题拆成已知信息、待解释联系和可检查结论。'
            : 'Separate a question into known information, a connection, and a checkable conclusion.',
        hook: chinese
          ? `先看问题：${requestedTitle}`
          : `Start with: ${requestedTitle}`,
        takeaway: takeawayLabel,
      },
    },
    knowledge: {
      knowledgeMap: [
        {
          id: 'known_information',
          concept: chinese
            ? '题目明确给出的信息'
            : 'Information explicitly supplied',
          dependsOn: [],
          misconception: chinese
            ? '把没有出现的公式当成已知条件。'
            : 'Treating an unstated formula as known.',
        },
        {
          id: 'relationship_rule',
          concept: variableRelationship
            ? chinese
              ? '变量之间需要一个明确规则'
              : 'Variables need an explicit relationship rule'
            : chinese
              ? '信息之间需要可说明的联系'
              : 'Information needs an explainable connection',
          dependsOn: ['known_information'],
          misconception: chinese
            ? '只凭名称或画面猜测关系。'
            : 'Guessing a relationship from labels or appearance alone.',
        },
        {
          id: 'verification',
          concept: chinese
            ? '用例子或条件检查结论'
            : 'Check the conclusion with an example or condition',
          dependsOn: ['relationship_rule'],
          misconception: chinese
            ? '把一个示例误当成所有情况。'
            : 'Treating one example as every possible case.',
        },
      ],
    },
    curriculum: {
      curriculum: [
        {
          id: 'observe_prompt',
          learningJob: chinese
            ? '识别题目真正给了什么'
            : 'Identify what the request actually gives',
          dependsOn: ['known_information'],
          visualEvidence: chinese
            ? '原问题先出现并保持可见。'
            : 'The original topic appears first and stays visible.',
          notationBudget: 0,
        },
        {
          id: 'connect_ideas',
          learningJob: variableRelationship
            ? chinese
              ? '把 x、规则和 y 排成输入输出关系'
              : 'Arrange x, the rule, and y as an input-output relationship'
            : chinese
              ? '把观察、联系和检查排成顺序'
              : 'Order observation, connection, and verification',
          dependsOn: ['relationship_rule', 'observe_prompt'],
          visualEvidence: chinese
            ? '核心关系式在画面中央写出并被强调。'
            : 'The central relationship is written and emphasized.',
          notationBudget: variableRelationship ? 1 : 0,
        },
        {
          id: 'verify_takeaway',
          learningJob: chinese
            ? '记住不能补造缺失条件'
            : 'Remember not to invent missing conditions',
          dependsOn: ['verification', 'connect_ideas'],
          visualEvidence: chinese
            ? '结尾将标题变成可检查的行动提示。'
            : 'The final title becomes a checkable action cue.',
          notationBudget: 0,
        },
      ],
    },
    mathematics: {
      mathDossier: {
        coreClaim,
        invariants: [
          chinese
            ? '画面不声明题目未给出的具体函数或定理。'
            : 'The scene does not claim an unstated function or theorem.',
          chinese
            ? '示意关系只用于解释结构，不冒充唯一答案。'
            : 'The displayed relationship explains structure and is not presented as a unique answer.',
        ],
        commonMisreading: variableRelationship
          ? chinese
            ? '因为变量叫 x 和 y，就默认 y=x。'
            : 'Assuming y=x merely because the variables are named x and y.'
          : chinese
            ? '把通用解释框架误认为原问题的具体答案。'
            : 'Mistaking a general explanation framework for a specific factual answer.',
        visualProof: chinese
          ? '动画依次呈现题目、联系框架和检查提示；每一步只使用前一步已经明确的信息。'
          : 'The animation reveals the request, the connection framework, and a verification cue in order; every step uses only already stated information.',
        definitions: [
          {
            concept: variableRelationship ? 'y=f(x)' : 'verification',
            statement: variableRelationship
              ? chinese
                ? 'f 代表一个尚待说明的规则；该记号本身不指定 f 的具体形式。'
                : 'f denotes a rule that still must be specified; the notation alone does not choose its form.'
              : chinese
                ? '检查是把结论与题目给出的条件或一个明确示例进行比较。'
                : 'Verification compares a conclusion with supplied conditions or an explicit example.',
          },
        ],
        derivationSteps: [
          chinese
            ? '第一步只保留题目中明确出现的对象或目标。'
            : 'First retain only the objects or goal explicitly present in the request.',
          chinese
            ? '第二步用一个不增加额外事实的结构表示可能的联系。'
            : 'Then represent the possible connection without adding a new factual claim.',
          chinese
            ? '最后给出检查条件，提醒观众需要更多规则或证据才能得到具体结论。'
            : 'Finally add a check that makes clear when more rules or evidence are needed.',
        ],
        checks: [
          {
            claim: chinese
              ? '没有具体规则就不能推出唯一关系。'
              : 'No unique relationship follows without a specific rule.',
            method: chinese
              ? '列出两个都符合变量命名但不同的可能规则。'
              : 'Exhibit two different possible rules using the same variable names.',
            expected: variableRelationship
              ? chinese
                ? '例如 y=x 与 y=2x 都使用 x、y，但关系不同。'
                : 'For example, y=x and y=2x use the same names but define different relationships.'
              : chinese
                ? '不同补充条件会产生不同的具体结论。'
                : 'Different added conditions can produce different specific conclusions.',
          },
        ],
        limitations: [
          chinese
            ? '这是模型或严格审查失败时的基础保底演示，不替代针对具体题目的完整推导。'
            : 'This is a baseline delivery used when model planning or strict review fails; it does not replace a topic-specific derivation.',
        ],
      },
    },
    storyboard: {
      direction: {
        preset: 'clean-classroom',
        frame: '16:9',
        pacing: 'calm',
        textPolicy: { maxWordsPerObject: 12, maxSimultaneousText: 2 },
      },
      cinematography: { scene: 'static', emphasis: 'spotlight' },
      shots: [
        {
          id: 'fallback_hook',
          beat: 'hook',
          purpose: chinese
            ? '呈现原问题并建立注意力。'
            : 'Present the original topic and establish attention.',
          startAt: 0,
          endAt: 4,
          focusRef: 'topic_title',
          transition: 'build',
          acceptance: [
            chinese
              ? '标题与核心关系可见。'
              : 'The title and central relationship are visible.',
          ],
        },
        {
          id: 'fallback_mechanism',
          beat: 'mechanism',
          purpose: chinese
            ? '把解释压缩成三个明确步骤。'
            : 'Compress the explanation into three explicit steps.',
          startAt: 4,
          endAt: 8,
          focusRef: 'core_relation',
          transition: 'emphasis',
          acceptance: [
            chinese
              ? '核心关系得到一次聚焦强调。'
              : 'The central relationship receives a clear emphasis.',
          ],
        },
        {
          id: 'fallback_memory',
          beat: 'memory',
          purpose: chinese
            ? '留下一个不会误导的检查提示。'
            : 'Leave a non-misleading verification cue.',
          startAt: 8,
          endAt: 12,
          focusRef: 'topic_title',
          transition: 'morph',
          acceptance: [
            chinese
              ? '结尾提示与核心关系同时保留。'
              : 'The final cue and central relationship remain together.',
          ],
        },
      ],
    },
    scene: {
      style: {
        background: '#090B14',
        palette: ['#7C8CFF', '#62D9C3', '#F4C95D'],
        camera:
          'Static centered classroom composition with generous safe margins.',
      },
      objects: [
        {
          id: 'topic_title',
          kind: 'text',
          region: 'title',
          importance: 'hero',
          label: title,
          color: '#F4EDE1',
        },
        {
          id: 'step_title',
          kind: 'text',
          region: 'title',
          importance: 'hero',
          label: stepLabel,
          color: '#7C8CFF',
        },
        {
          id: 'takeaway_title',
          kind: 'text',
          region: 'title',
          importance: 'hero',
          label: takeawayLabel,
          color: '#62D9C3',
        },
        {
          id: 'core_relation',
          kind: 'formula',
          region: 'formula',
          importance: 'hero',
          expr: formula,
          color: '#F4C95D',
        },
      ],
      timeline: [
        {
          id: 'fallback_title_in',
          shotId: 'fallback_hook',
          at: 0,
          op: 'fade_in',
          ref: 'topic_title',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_relation_in',
          shotId: 'fallback_hook',
          at: 1,
          op: 'write',
          ref: 'core_relation',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_hook_emphasis',
          shotId: 'fallback_hook',
          at: 2,
          op: 'emphasize',
          ref: 'core_relation',
          runTime: 0.8,
          ease: 'there_and_back',
        },
        {
          id: 'fallback_steps',
          shotId: 'fallback_mechanism',
          at: 4,
          op: 'transform',
          ref: 'topic_title',
          targetRef: 'step_title',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_spotlight',
          shotId: 'fallback_mechanism',
          at: 5,
          op: 'spotlight',
          ref: 'core_relation',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_mechanism_hold',
          shotId: 'fallback_mechanism',
          at: 6,
          op: 'hold',
          ref: 'core_relation',
          runTime: 1.2,
          ease: 'linear',
        },
        {
          id: 'fallback_takeaway',
          shotId: 'fallback_memory',
          at: 8,
          op: 'transform',
          ref: 'topic_title',
          targetRef: 'takeaway_title',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_glow',
          shotId: 'fallback_memory',
          at: 9,
          op: 'glow',
          ref: 'core_relation',
          runTime: 0.8,
          ease: 'smooth',
        },
        {
          id: 'fallback_final_hold',
          shotId: 'fallback_memory',
          at: 10,
          op: 'hold',
          ref: 'core_relation',
          runTime: 1.5,
          ease: 'linear',
        },
      ],
      layout: { regions: 'top|bottom' },
      dependencies: ['Manim Community', 'LaTeX'],
      notes: [
        chinese
          ? '严格模型规划或数学审查未完成，已自动切换为本地可编译的基础演示。'
          : 'Strict model planning or mathematical review did not finish, so CurvG delivered a locally compilable baseline scene.',
      ],
    },
  };
  composeAnimationSpecFromArtifacts(artifacts);
  return artifacts;
}

export function buildDeterministicAnimationPlanningProfile(
  prompt: string
): DeterministicAnimationPlanningProfile | undefined {
  const heart = buildDeterministicHeartCurveArtifacts(prompt);
  if (heart) return { id: 'heart-curve-v1', artifacts: heart };
  const quadratic = buildDeterministicQuadraticTangentArtifacts(prompt);
  if (quadratic) return { id: 'quadratic-tangent-v1', artifacts: quadratic };
  const cycloid = buildDeterministicCycloidArtifacts(prompt);
  if (cycloid) return { id: 'cycloid-v1', artifacts: cycloid };
  return undefined;
}
