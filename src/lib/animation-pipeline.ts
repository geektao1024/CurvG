import { z } from 'zod';

import type {
  AnimationObjectSpec,
  AnimationPlanningPhase,
  AnimationPlanningStageName,
  AnimationSpec,
} from '@/lib/animation';
import {
  v6AnimationSpecSchema,
  validateAnimationSpec,
} from '@/lib/animation-schema';
import { parseStructuredJsonObject } from '@/lib/structured-json';

export const intentArtifactSchema = v6AnimationSpecSchema.pick({
  title: true,
  summary: true,
  durationSeconds: true,
  assumptions: true,
  intent: true,
});

export const knowledgeArtifactSchema = v6AnimationSpecSchema.pick({
  knowledgeMap: true,
  spine: true,
});

export const curriculumArtifactSchema = v6AnimationSpecSchema.pick({
  curriculum: true,
});

export const mathematicsArtifactSchema = v6AnimationSpecSchema.pick({
  mathDossier: true,
});

export const storyboardArtifactSchema = v6AnimationSpecSchema.pick({
  direction: true,
  cinematography: true,
  shots: true,
});

export const sceneArtifactSchema = v6AnimationSpecSchema.pick({
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
    schemaVersion: 6,
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
    /(?:x\s*=\s*1|x=1)/iu.test(evidence) &&
    // Schema 6 ownership: the quadratic scene renders the four fixed
    // pedagogical formulas, so it may only run when the incoming dossier
    // actually authors them. A quadratic-looking request whose dossier
    // carries different formulas falls through to the generic scene, which
    // renders that dossier's own mathematics instead of contradicting it.
    dossierCarriesQuadraticFormulas(artifacts.mathematics.mathDossier.formulas)
  );
}

function dossierCarriesQuadraticFormulas(
  formulas: ApprovedPlanningArtifacts['mathematics']['mathDossier']['formulas']
) {
  return QUADRATIC_TANGENT_FORMULAS.every((required) => {
    const candidate = formulas.find((entry) => entry.id === required.id);
    if (!candidate) return false;
    const authored = candidate.latexParts.map((part) => part.latex).join('');
    const expected = required.latexParts.map((part) => part.latex).join('');
    return authored === expected;
  });
}

/**
 * The quadratic-tangent template walks a fixed pedagogical sequence: name the
 * two points, form the difference quotient, simplify it, then land the tangent.
 * Each step must show different mathematics — four beats rendering the same
 * LaTeX is worse than one beat, because the timeline implies progress that the
 * frame does not deliver.
 */
const QUADRATIC_FOCUS_ROLES = [
  'points',
  'quotient',
  'simplified',
  'payoff',
] as const;

type QuadraticFocusRole = (typeof QUADRATIC_FOCUS_ROLES)[number];

/**
 * Keyword hints only *prefer* a role. They are deliberately narrower than a
 * bare `点` / `P\b`, which matched nearly every Chinese beat in a tangent
 * lesson (切点, 定点, 邻近点, 交点…) and collapsed all four beats onto the
 * first branch.
 */
const QUADRATIC_ROLE_HINTS: Array<{
  role: QuadraticFocusRole;
  pattern: RegExp;
}> = [
  {
    role: 'payoff',
    pattern: /(?:tangent line|tangent slope|切线|结论|锁定)/iu,
  },
  {
    role: 'simplified',
    pattern: /(?:simplif|derive|化简|约分|2\s*\+\s*h)/iu,
  },
  {
    role: 'quotient',
    pattern: /(?:quotient|difference quotient|差商|斜率公式|平均变化率|建立)/iu,
  },
  {
    role: 'points',
    pattern:
      /(?:两点|定点|邻近点|坐标|\bP\s*=|\bQ\s*=|\bpoints?\b|\bcoordinates?\b)/iu,
  },
];

/**
 * The single owner of this template's mathematics.
 *
 * Schema 6 requires every formula the viewer sees to come from
 * `mathDossier.formulas`; scene objects reference one by `formulaId` and copy
 * its parts verbatim. Authoring the LaTeX here — once — is what makes it
 * impossible for two beats to invent the same text independently, which is
 * exactly how four beats once shipped rendering one formula.
 */
export const QUADRATIC_TANGENT_FORMULAS = [
  {
    id: 'points',
    purpose: 'Name the fixed point and the nearby point that defines h.',
    latexParts: [
      {
        id: 'points_p',
        latex: 'P=(1,1)',
        meaning: 'fixed point on the parabola',
      },
      {
        id: 'points_q',
        latex: ',\\quad Q=(1+h,(1+h)^2)',
        meaning: 'nearby point on the parabola',
      },
    ],
  },
  {
    id: 'quotient',
    purpose: 'Form the secant slope as a difference quotient.',
    latexParts: [
      {
        id: 'quotient_label',
        latex: 'm_{\\mathrm{sec}}=',
        meaning: 'secant slope',
      },
      {
        id: 'quotient_value',
        latex: '\\frac{(1+h)^2-1}{h}',
        meaning: 'difference quotient',
      },
    ],
  },
  {
    id: 'simplified',
    purpose: 'Simplify the quotient so the limit can be read off.',
    latexParts: [
      {
        id: 'simplified_label',
        latex: 'm_{\\mathrm{sec}}=',
        meaning: 'secant slope',
      },
      { id: 'simplified_value', latex: '2+h', meaning: 'simplified slope' },
      {
        id: 'simplified_condition',
        latex: ',\\quad h\\ne 0',
        meaning: 'difference quotient domain',
      },
    ],
  },
  {
    id: 'payoff',
    purpose: 'State the tangent slope and the tangent line.',
    latexParts: [
      {
        id: 'payoff_slope',
        latex: 'm_{\\mathrm{tan}}=2',
        meaning: 'tangent slope',
      },
      { id: 'payoff_line', latex: ',\\quad y=2x-1', meaning: 'tangent line' },
    ],
  },
] as const;

const QUADRATIC_PART_COLORS: Record<string, string> = {
  points_p: '#F4C95D',
  points_q: '#62D9C3',
  quotient_label: '#F4EDE1',
  quotient_value: '#7C8CFF',
  simplified_label: '#F4EDE1',
  simplified_value: '#62D9C3',
  simplified_condition: '#F4C95D',
  payoff_slope: '#F4C95D',
  payoff_line: '#62D9C3',
};

/**
 * Builds the scene object for one role by copying the dossier formula
 * verbatim. Colour is presentation and may be assigned here; the LaTeX may
 * not be edited, or the schema 6 verbatim check rejects the spec.
 */
function quadraticFocusParts(
  focusRef: string,
  role: QuadraticFocusRole
): AnimationObjectSpec {
  const formula = QUADRATIC_TANGENT_FORMULAS.find(
    (entry) => entry.id === role
  )!;
  return {
    id: focusRef,
    kind: 'formula',
    region: 'formula',
    importance: 'hero',
    formulaId: formula.id,
    parts: formula.latexParts.map((part) => ({
      id: fallbackPartId(focusRef, part.id),
      latex: part.latex,
      meaning: part.meaning,
      color: QUADRATIC_PART_COLORS[part.id] || '#F4EDE1',
    })),
  };
}

/**
 * Resolves one storyboard shot to a focus object.
 *
 * `usedRoles` is shared across the shots of a single scene so two beats can
 * never render identical mathematics: a preferred role that is already spoken
 * for falls through to the next unused role in pedagogical order.
 */
function quadraticFocusObject(
  focusRef: string,
  purpose: string,
  beat: string,
  usedRoles: Set<QuadraticFocusRole>,
  reservePayoff: boolean
): AnimationObjectSpec {
  const hint = `${purpose} ${beat}`;
  const isPayoffBeat = beat === 'payoff';
  const matched = QUADRATIC_ROLE_HINTS.find((entry) =>
    entry.pattern.test(hint)
  )?.role;
  // When a real payoff beat exists, an earlier beat that merely mentions 切线
  // must not consume the conclusion slot.
  const preferred = isPayoffBeat
    ? 'payoff'
    : matched === 'payoff' && reservePayoff
      ? undefined
      : matched;

  const available = (candidate: QuadraticFocusRole) =>
    !usedRoles.has(candidate) &&
    (isPayoffBeat || candidate !== 'payoff' || !reservePayoff);

  let role: QuadraticFocusRole | undefined =
    preferred && available(preferred) ? preferred : undefined;

  if (!role) role = QUADRATIC_FOCUS_ROLES.find(available);

  if (!role) {
    // Every formula role is spoken for. Emit the geometric secant instead of
    // repeating a formula that is already on screen.
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

  usedRoles.add(role);
  return quadraticFocusParts(focusRef, role);
}

function buildQuadraticTangentScene(
  artifacts: ApprovedPlanningArtifacts
): AnimationPlanningArtifacts['scene'] {
  const focusOrder: string[] = [];
  const focusShotById = new Map<string, { purpose: string; beat: string }>();
  for (const shot of artifacts.storyboard.shots) {
    if (!focusShotById.has(shot.focusRef)) {
      focusOrder.push(shot.focusRef);
      focusShotById.set(shot.focusRef, {
        purpose: shot.purpose,
        beat: shot.beat,
      });
    } else if (shot.beat === 'payoff') {
      focusShotById.set(shot.focusRef, {
        purpose: shot.purpose,
        beat: shot.beat,
      });
    }
  }
  const reservePayoff = [...focusShotById.values()].some(
    (shot) => shot.beat === 'payoff'
  );
  // Shared across the whole scene so no two beats render the same formula.
  const usedFocusRoles = new Set<QuadraticFocusRole>();
  const focusObjectById = new Map<string, AnimationObjectSpec>();
  for (const focusRef of focusOrder) {
    const shot = focusShotById.get(focusRef)!;
    focusObjectById.set(
      focusRef,
      quadraticFocusObject(
        focusRef,
        shot.purpose,
        shot.beat,
        usedFocusRoles,
        reservePayoff
      )
    );
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
  // Schema 6: the dossier owns every formula the film may show, so the
  // fallback renders the dossier's own formulas instead of the earlier
  // "Visual step N" placeholders that carried no mathematics. Shots beyond
  // the dossier's formula count fall back to plain-text step cards, whose
  // numbered labels keep every beat visually distinct.
  const dossierFormulas = artifacts.mathematics.mathDossier.formulas;
  let nextFormula = 0;
  const objectById = new Map<string, AnimationObjectSpec>();
  for (const [index, shot] of artifacts.storyboard.shots.entries()) {
    if (objectById.has(shot.focusRef)) continue;
    const importance = shot.beat === 'payoff' ? 'hero' : 'supporting';
    const formula = dossierFormulas[nextFormula];
    if (formula) {
      nextFormula += 1;
      objectById.set(shot.focusRef, {
        id: shot.focusRef,
        kind: 'formula',
        region: 'formula',
        importance,
        formulaId: formula.id,
        // Verbatim copy — the schema rejects any deviation. A single-part
        // formula uses the expr representation because object parts require
        // at least two entries.
        ...(formula.latexParts.length >= 2
          ? {
              parts: formula.latexParts.map((part) => ({
                id: fallbackPartId(shot.focusRef, part.id),
                latex: part.latex,
                meaning: part.meaning,
                color: shot.beat === 'payoff' ? '#F4C95D' : '#F4EDE1',
              })),
            }
          : {
              expr: formula.latexParts.map((part) => part.latex).join(''),
            }),
      });
    } else {
      // The step-card label must fit the director's per-object word budget,
      // which the schema enforces. "Step N" fits any budget of two or more;
      // a bare number fits even a budget of one. Numbering keeps every card
      // distinct for the duplicate-content check.
      const wordBudget =
        artifacts.storyboard.direction.textPolicy.maxWordsPerObject;
      objectById.set(shot.focusRef, {
        id: shot.focusRef,
        kind: 'text',
        region: 'formula',
        importance,
        label: wordBudget >= 2 ? `Step ${index + 1}` : `${index + 1}`,
        color: shot.beat === 'payoff' ? '#F4C95D' : '#F4EDE1',
      });
    }
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
        depth: 2,
        assumed: true,
        visualSeed: 'A parabola with one point pinned to its side.',
      },
      {
        id: 'secant_slope',
        concept: 'A secant through P and Q has a difference-quotient slope.',
        dependsOn: ['quadratic_graph'],
        misconception: 'The secant is not yet the tangent while h is nonzero.',
        depth: 1,
        assumed: false,
        visualSeed: 'A straight line pivoting through two points on the curve.',
      },
      {
        id: 'derivative_limit',
        concept: 'The tangent slope is the limit of secant slopes.',
        dependsOn: ['secant_slope'],
        misconception:
          'Substituting h=0 before simplifying causes division by zero.',
        depth: 0,
        assumed: false,
        visualSeed: 'The pivoting line settling into one resting position.',
      },
    ],
    spine: ['quadratic_graph', 'secant_slope', 'derivative_limit'],
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
      formulas: QUADRATIC_TANGENT_FORMULAS,
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
        depth: 2,
        assumed: true,
        visualSeed: 'A wheel pressed to a line, turning without sliding.',
      },
      {
        id: 'marked_point_motion',
        concept:
          'The marked point combines center translation with a rotating radius vector.',
        dependsOn: ['rolling_without_slip'],
        misconception:
          'The cycloid is not the circular path relative to the moving center.',
        depth: 1,
        assumed: false,
        visualSeed: 'One painted dot on the rim, carried along by the turn.',
      },
      {
        id: 'cycloid_arch',
        concept: 'One full turn traces a cusp-to-cusp cycloid arch.',
        dependsOn: ['marked_point_motion'],
        misconception:
          'The cusps occur when the marked point touches the baseline, not at the top.',
        depth: 0,
        assumed: false,
        visualSeed: 'The dot leaving an arch behind it, cusp to cusp.',
      },
    ],
    spine: ['rolling_without_slip', 'marked_point_motion', 'cycloid_arch'],
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
      formulas: [
        {
          id: 'cycloid_parametric',
          purpose:
            'State the traced point as translation minus the rotating radius.',
          latexParts: [
            {
              id: 'cycloid_parametric_x',
              latex: 'x=t-\\pi-\\sin t,',
              meaning: 'translation minus horizontal rotation component',
            },
            {
              id: 'cycloid_parametric_y',
              latex: '\\quad y=1-\\cos t',
              meaning: 'vertical rotation component above the baseline',
            },
          ],
        },
        {
          id: 'cycloid_generation',
          purpose: 'Name the generating relationship the film demonstrates.',
          latexParts: [
            {
              id: 'cycloid_generation_circle',
              latex: '\\text{rolling circle}',
              meaning: 'the geometric generator',
            },
            {
              id: 'cycloid_generation_trace',
              latex: '\\Longrightarrow\\text{cycloid}',
              meaning: 'the generated trace',
            },
          ],
        },
      ],
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
        formulaId: 'cycloid_parametric',
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
        formulaId: 'cycloid_generation',
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
        depth: 2,
        assumed: true,
        visualSeed: chinese
          ? '两个刻度盘共同牵引一支画笔。'
          : 'Two dials feeding one moving pen.',
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
        depth: 1,
        assumed: false,
        visualSeed: chinese
          ? '一根滑杆同时驱动两个刻度盘。'
          : 'A single slider driving both dials at once.',
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
        depth: 0,
        assumed: false,
        visualSeed: chinese
          ? '画笔绕行一周后精确回到起点。'
          : 'The pen returning exactly to where it started.',
      },
    ],
    spine: ['coordinate_pair', 'shared_parameter', 'closed_trace'],
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
      formulas: [
        {
          id: 'heart_parametric',
          purpose: chinese
            ? '给出画笔逐点走过的心形参数方程。'
            : 'State the parameterization the pen traces point by point.',
          latexParts: [
            {
              id: 'heart_parametric_x',
              latex: 'x=4\\sin^3 t,',
              meaning: 'horizontal coordinate',
            },
            {
              id: 'heart_parametric_y',
              latex: '\\quad y=2.6\\cos t-\\cos 2t-0.4\\cos 3t-0.2\\cos 4t',
              meaning: 'vertical coordinate',
            },
          ],
        },
      ],
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
        formulaId: 'heart_parametric',
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
