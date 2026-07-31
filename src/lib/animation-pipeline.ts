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

export interface DeterministicAnimationPlanningProfile {
  id: 'quadratic-tangent-v1' | 'cycloid-v1';
  artifacts: AnimationPlanningArtifacts;
}

export function buildDeterministicAnimationPlanningProfile(
  prompt: string
): DeterministicAnimationPlanningProfile | undefined {
  const quadratic = buildDeterministicQuadraticTangentArtifacts(prompt);
  if (quadratic) return { id: 'quadratic-tangent-v1', artifacts: quadratic };
  const cycloid = buildDeterministicCycloidArtifacts(prompt);
  if (cycloid) return { id: 'cycloid-v1', artifacts: cycloid };
  return undefined;
}
