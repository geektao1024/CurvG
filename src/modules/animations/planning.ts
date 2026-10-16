import { z } from 'zod';

import {
  ChatProviderError,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatProvider,
  type ChatProviderDiagnostic,
  type ChatTurn,
} from '@/core/ai/chat';
import {
  getAnimationCompositionReasoningEffort,
  getAnimationReasoningEffort,
} from '@/config/animation-models';
import type {
  AnimationPlanningPhase,
  AnimationPlanningStageName,
  AnimationPlanningStageSummary,
  AnimationSpec,
  AnimationSubject,
} from '@/lib/animation';
import {
  isAnimationMathReviewApproved,
  mathReviewBlocks,
  mathReviewNeedsOnlyScene,
  type AnimationMathReview,
} from '@/lib/animation-math';
import {
  ANIMATION_PLANNING_STAGES,
  applySceneTargetedRepair,
  buildDeterministicAnimationPlanningProfile,
  buildDeterministicSceneArtifact,
  composeAnimationSpecFromArtifacts,
  normalizeAnimationPlanningArtifact,
  parseAnimationPlanningArtifact,
  PLAN_STAGE_NAMES,
  planArtifactSchema,
  planLimitsContract,
  planSceneTargetedRepair,
  sceneFieldContract,
  sceneResponseSchema,
  sceneTargetedRepairPrompt,
  splitPlanArtifact,
  supportsDeterministicSceneProfile,
  validateAnimationPlanningArtifact,
  type AnimationPlanningArtifacts,
  type AnimationPlanningStageDefinition,
  type AnimationPlanStageName,
  type SceneTargetedRepairItem,
} from '@/lib/animation-pipeline';
import { md5 } from '@/lib/hash';
import { compileAnimationSpec } from '@/lib/manim-compiler';
import { stripNullFields, toStrictJsonSchema } from '@/lib/strict-json-schema';
import { parseStructuredJsonObject } from '@/lib/structured-json';

import {
  cachePlanningStage,
  completePlanningStage,
  failPlanningStage,
  findReusablePlanningStage,
  planningStageSummary,
  recordPlanningAttempt,
  startPlanningStage,
} from './stages';

// 2: intent..storyboard come from one structured call (runPlanCall).
const PIPELINE_VERSION = 2;
// One call writes the whole plan, and reasoning shares the output budget on
// the Responses route, so both calls get room well above their artifacts.
const PLAN_MAX_OUTPUT_TOKENS = 40_000;
const SCENE_MAX_OUTPUT_TOKENS = 48_000;
const MAX_PLAN_REPAIRS = 2;
const PLAN_TARGET_TIMEOUT_MS = 290_000;
// Hedge points sit near twice the observed median (plan ~45s, scene 50-80s,
// 2026-10-15 smoke runs on gpt-6-luna): the tail, not the median, is what
// broke runs.
const PLAN_HEDGE_AFTER_MS = 100_000;
const SCENE_HEDGE_AFTER_MS = 120_000;
const PLAN_ROUND_WINDOW_MS = 300_000;
const PLAN_RESPONSE_FORMAT = {
  name: 'curvg_plan',
  schema: toStrictJsonSchema(planArtifactSchema),
};
const SCENE_RESPONSE_FORMAT = {
  name: 'curvg_scene',
  schema: sceneResponseSchema(),
};
// Format-repair budget per stage (2026-08 path B5): scene carries the most
// required structure and is the schema_validation hotspot, so it gets more
// bounded retries. The widened 1200s plan budget absorbs the extra rounds.
function maxStageFormatRepairs(stage: AnimationPlanningStageName): number {
  return stage === 'scene' ? 3 : 2;
}
const MAX_INTEGRATION_REPAIRS = 2;
// One revision, then unresolved findings go to the user as warnings.
const MAX_MATH_REVISIONS = 1;
// Reserve an equal share of the stage window for each of the two lead
// failover targets (2026-08-04). The scene stage produces the largest
// artifact by far — production showed both vendors cut at a flat 150s cap
// while still writing — so it gets a 300s per-target window inside a 600s
// stage window. Mathematics (the LaTeX dossier) sits between: successful
// runs land at 88-112s but the tail crossed 150s in production on
// 2026-08-04, so it gets 240s/480s. Small stages keep 150s/300s. Every
// window stays below the Worker's five-minute per-call cap at the provider
// request layer, and the plan's absolute deadline still bounds the sum.
const STAGE_PROVIDER_TIMEOUT_MS = 300_000;
const SCENE_STAGE_PROVIDER_TIMEOUT_MS = 600_000;
const MATHEMATICS_STAGE_PROVIDER_TIMEOUT_MS = 480_000;
const STAGE_TARGET_TIMEOUT_MS = 150_000;
const SCENE_STAGE_TARGET_TIMEOUT_MS = 300_000;
const MATHEMATICS_STAGE_TARGET_TIMEOUT_MS = 240_000;

function stageProviderWindowMs(stage: AnimationPlanningStageName): number {
  if (stage === 'scene') return SCENE_STAGE_PROVIDER_TIMEOUT_MS;
  if (stage === 'mathematics') return MATHEMATICS_STAGE_PROVIDER_TIMEOUT_MS;
  return STAGE_PROVIDER_TIMEOUT_MS;
}

function stageTargetTimeoutMs(stage: AnimationPlanningStageName): number {
  if (stage === 'scene') return SCENE_STAGE_TARGET_TIMEOUT_MS;
  if (stage === 'mathematics') return MATHEMATICS_STAGE_TARGET_TIMEOUT_MS;
  return STAGE_TARGET_TIMEOUT_MS;
}

const STAGE_CONTRACTS: Record<AnimationPlanningStageName, string> = {
  intent: `{
  "title": "short title",
  "summary": "what the animation proves or explains",
  "durationSeconds": 20,
  "assumptions": ["explicit mathematical assumption"],
  "intent": {
    "learningGoal": "one precise viewer capability",
    "hook": "visible opening question or surprise",
    "takeaway": "compact final idea"
  }
}`,
  knowledge: `{
  "knowledgeMap": [{
    "id": "unique_concept_id",
    "concept": "prerequisite or target concept",
    "dependsOn": ["other knowledge node ids"],
    "misconception": "specific misconception to avoid",
    "depth": 0,
    "assumed": false,
    "visualSeed": "the most filmable mental image of this concept"
  }],
  "spine": ["ordered node ids, foundations first, ending at the depth-0 target"]
}`,
  curriculum: `{
  "curriculum": [{
    "id": "unique_beat_id",
    "learningJob": "what the viewer learns",
    "dependsOn": ["knowledge node ids or earlier curriculum ids"],
    "visualEvidence": "observable evidence that teaches the job",
    "notationBudget": 2
  }]
}`,
  mathematics: `{
  "mathDossier": {
    "formulas": [{
      "id": "formula_id",
      "purpose": "why this formula appears on screen",
      "latexParts": [{"id": "part_id", "latex": "one independently renderable LaTeX chunk", "meaning": "plain-language meaning"}]
    }],
    "coreClaim": "exact scoped mathematical statement",
    "invariants": ["fact that must stay true"],
    "commonMisreading": "most likely conceptual mistake",
    "visualProof": "how motion or geometry establishes the claim",
    "definitions": [{"concept": "symbol", "statement": "exact definition and domain"}],
    "derivationSteps": ["ordered justified step", "next justified step"],
    "checks": [{"claim": "claim", "method": "independent check", "expected": "exact result"}],
    "limitations": ["scope or exceptional case"]
  }
}`,
  storyboard: `{
  "direction": {
    "preset": "clean-classroom|cinematic-math|geometric-proof|data-story",
    "frame": "16:9|9:16",
    "pacing": "calm|balanced|energetic",
    "textPolicy": {"maxWordsPerObject": 8, "maxSimultaneousText": 2}
  },
  "cinematography": {"scene": "static|moving-camera", "emphasis": "clean|spotlight|term-tour"},
  "shots": [{
    "id": "unique_shot_id",
    "beat": "hook|setup|mechanism|proof|payoff|memory",
    "purpose": "visible teaching change",
    "startAt": 0,
    "endAt": 4,
    "focusRef": "object id that the scene stage must create",
    "transition": "build|morph|emphasis|hold",
    "acceptance": ["observable condition"]
  }]
}`,
  scene: `{
  "style": {"background": "#0B0D14", "palette": ["#7C8CFF", "#62D9C3"], "camera": "camera description"},
  "objects": [{
    "id": "unique_object_id",
    "kind": "axes|curve|parametric|area|formula|text|series|matrix|circle|point|line|arrow|arc",
    "region": "title|formula|graph",
    "formulaId": "required for formula objects: the mathDossier formula this object renders",
    "startRef": "line/arrow only: point id the start follows every frame",
    "endRef": "line/arrow only: point id the end follows every frame",
    "projection": "line/arrow with startRef only: x_axis|y_axis drop line from the point"
  }],
  "timeline": [{
    "id": "unique_event_id",
    "shotId": "storyboard shot id",
    "at": 0,
    "op": "draw|write|fade_in|fade_out|transform|emphasize|spotlight|glow|camera_focus|camera_reset|move_along|hold",
    "ref": "object id",
    "pathRef": "move_along only: the curve/circle/arc/line to travel, from its domain start to end",
    "reverse": "move_along only: true travels the path from its end back to its start",
    "runTime": 1,
    "ease": "linear|smooth|there_and_back"
  }],
  "layout": {"regions": "single|left|right|top|bottom"},
  "dependencies": ["required capability"],
  "notes": ["implementation invariant"]
}
${sceneFieldContract()}`,
};

const STAGE_ROLES: Record<AnimationPlanningStageName, string> = {
  intent:
    'Clarify the exact learning goal, scope, assumptions, hook, takeaway, duration, title, and concise summary. If the request is ambiguous, underspecified, or contains a likely typo, choose the smallest mathematically coherent interpretation and record that choice in assumptions and summary; do not silently change the subject.',
  knowledge:
    'Build a dependency-aware concept map. Every dependsOn id must exist in this artifact, ids must be unique, and no node may depend on itself. Set depth 0 only on the target concept, increasing toward foundations. Mark concepts the audience already owns with assumed true — they get a nod, not a lesson. Give every node a visualSeed: the most filmable mental image of that concept, which the storyboard will harvest. Emit spine as the shortest honest path from foundations to the depth-0 target; the film walks the spine and everything else is texture.',
  curriculum:
    'Order 3-12 teachable beats. Every dependency must refer to a knowledge node or an earlier curriculum beat.',
  mathematics:
    'Produce an exact, independently checkable mathematical dossier. State domains and limitations; never invent a theorem to fit a visual. The dossier owns every formula the film may show: author each one exactly once in formulas, with ordered latexParts whose chunks compile independently and concatenate into the full formula. Downstream stages copy these verbatim and may not write LaTeX of their own.',
  storyboard:
    'Translate the approved learning and mathematics artifacts into 3-6 non-overlapping shots. Begin with a hook at 0 and end with payoff or memory exactly at durationSeconds. term-tour emphasis requires a moving-camera scene; never combine term-tour with static. When a claim depends on a quantity varying (a limit, a traced locus, a projection across a domain), the mechanism shot must show that variation as motion covering every case the claim covers (a two-sided limit approaches from both sides), and its acceptance must require every connector to stay attached to the moving point throughout the motion.',
  scene:
    'Declare the concrete visual objects and timed actions that realize every storyboard acceptance condition and the mathematical visual proof. Preserve every storyboard shot id exactly, create an object for every focusRef, and keep every timeline event inside its referenced shot. Every formula object must reference one mathDossier formula through formulaId; the pipeline derives its parts and expr from the dossier mechanically, so never author LaTeX in the scene and never render the same formula through two objects. Parametric curves require safe xExpr, yExpr and an increasing domain for t. Realize every varying quantity the storyboard requires as move_along motion of a point, on each side the claim covers; never replace motion with a single static sample. A line or arrow follows a moving point only when its startRef/endRef names that point (start/end stay its initial coordinates); use projection for a drop line from a point to an axis. A line without refs never moves with a point. move_along travels the whole pathRef from its domain start to its end (reverse: true for end to start); to approach a point from one side, travel an undrawn curve whose domain covers only that side. For a quantity the claim varies (h -> 0, n increasing, an angle sweeping), declare one tracker (initial value) and animate it with set_value; a point with trackerRef sits at (xExpr(t), yExpr(t)), a readout shows expr(t) live, a riemann object draws round(t) rectangles, and a trace draws the path of a point. Everything bound to one tracker moves together every frame, so linked views (a circle point and its graph point, a secant and its live slope) stay synchronized.',
};

export interface PersistentAnimationPlanningContext {
  userId: string;
  chatId: string;
  runId: string;
  onStage?: (stage: AnimationPlanningStageSummary) => void;
}

interface PlanningParams {
  context: PersistentAnimationPlanningContext;
  provider: ChatProvider;
  model: string;
  prompt: string;
  subject: AnimationSubject;
  currentSpec?: AnimationSpec;
  history?: ChatTurn[];
  signal?: AbortSignal;
  deadlineAt?: number;
  onPhase?: (phase: AnimationPlanningPhase) => void;
  onSummaryDelta?: (delta: string) => void;
  audit?: (spec: AnimationSpec) => Promise<AnimationMathReview>;
}

class AnimationPlanningStageError extends Error {
  constructor(
    readonly stage: AnimationPlanningStageName,
    cause: unknown
  ) {
    super(
      `Animation planning stage failed: ${stage}: ${planningFailureSummary(cause)}`,
      { cause }
    );
    this.name = 'AnimationPlanningStageError';
  }
}

function planningFailureSummary(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 1_000);
}

function compactHistory(history: ChatTurn[] | undefined): ChatTurn[] {
  return (history || []).slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, 2_000),
  }));
}

function safeDiagnostic(
  value: ChatCompletionResult['diagnostic'] | ChatProviderError['diagnostic']
): Record<string, unknown> | undefined {
  return value ? { ...value } : undefined;
}

function stageErrorCode(error: unknown) {
  if (error instanceof ChatProviderError) return error.code;
  if (error instanceof z.ZodError) return 'schema_validation';
  return /json/i.test(error instanceof Error ? error.message : String(error))
    ? 'invalid_json'
    : 'stage_failed';
}

/**
 * Reconciles the scene IR against itself.
 *
 * The scene stage decides what the viewer actually sees, and a scene can be
 * schema-valid, compile, render, and pass pixel QA while still being
 * incoherent. A production scene shipped four timeline beats — parabola base,
 * secant triangle, moving secant, tangent line — that all rendered the
 * identical LaTeX, so the film faded the same formula in and out for 17
 * seconds while implying four steps of progress. No gate objected.
 *
 * Structural reference integrity (unknown object, unknown shot focus) is
 * already enforced by the full-contract check in
 * `validateAnimationPlanningStageSemantics`; this adds only the semantic and
 * temporal consistency that the contract cannot express.
 */
function validateSceneSemantics(scene: AnimationPlanningArtifacts['scene']) {
  const referenced = new Set(scene.timeline.map((event) => event.ref));

  // 1. A formula or caption the timeline never shows is a promise the film
  //    does not keep. Geometry is exempt: axes and similar scaffolding are
  //    laid out statically and legitimately carry no event of their own.
  for (const object of scene.objects) {
    if (!scenePresentationContent(object)) continue;
    if (!referenced.has(object.id)) {
      throw new Error(
        `Scene object ${object.id} carries content the timeline never shows`
      );
    }
  }

  // 2. Two beats that render the same thing are one beat plus a lie about
  //    progress. Only presentation objects are compared — geometry may
  //    legitimately repeat.
  const presentation = new Map<string, string>();
  for (const object of scene.objects) {
    const content = scenePresentationContent(object);
    if (!content) continue;
    const owner = presentation.get(content);
    if (owner) {
      throw new Error(
        `Scene objects ${owner} and ${object.id} render identical content: ${content}`
      );
    }
    presentation.set(content, object.id);
  }

  // 3. Removing or emphasising something the viewer has not been shown yet is
  //    a timeline ordering defect, not a style choice.
  const visible = new Set<string>();
  const ordered = [...scene.timeline].sort((left, right) => left.at - right.at);
  for (const event of ordered) {
    if (APPEARING_SCENE_OPS.has(event.op)) {
      visible.add(event.ref);
      continue;
    }
    // A point may enter by travelling along its path: Manim adds the mobject
    // when MoveAlongPath plays, so it is on screen for the whole motion.
    // Production (2026-10-14) burned twelve scene repairs on exactly this.
    if (event.op === 'move_along') {
      visible.add(event.ref);
      continue;
    }
    if (REQUIRES_VISIBLE_SCENE_OPS.has(event.op) && !visible.has(event.ref)) {
      throw new Error(
        `Scene timeline event ${event.id} applies ${event.op} to ${event.ref} before it appears`
      );
    }
    if (event.op === 'fade_out') visible.delete(event.ref);
  }
}

const APPEARING_SCENE_OPS = new Set(['draw', 'write', 'fade_in']);

const REQUIRES_VISIBLE_SCENE_OPS = new Set([
  'fade_out',
  'emphasize',
  'spotlight',
  'glow',
  'transform',
]);

/**
 * The viewer-visible content of an object, or undefined when the object is
 * geometry whose repetition carries no false promise.
 *
 * A formula may be written either as ordered `parts` (the term-tour form, so
 * the camera can address each piece) or as a single `expr`. Both are compared,
 * because a duplicate is equally misleading in either representation.
 */
function scenePresentationContent(
  object: AnimationPlanningArtifacts['scene']['objects'][number]
): string | undefined {
  if (object.kind === 'formula') {
    const fromParts = (object.parts || [])
      .map((part) => part.latex)
      .join('')
      .trim();
    const latex = fromParts || (object.expr || '').trim();
    return latex ? `formula:${latex}` : undefined;
  }
  if (object.kind === 'text') {
    const label = (object.label || '').trim();
    return label ? `text:${label}` : undefined;
  }
  return undefined;
}

export function validateAnimationPlanningStageSemantics(
  name: AnimationPlanningStageName,
  artifact: unknown,
  artifacts: Partial<AnimationPlanningArtifacts>
) {
  if (name === 'knowledge') {
    const value = artifact as AnimationPlanningArtifacts['knowledge'];
    const ids = new Set(value.knowledgeMap.map((node) => node.id));
    for (const node of value.knowledgeMap) {
      if (node.dependsOn.includes(node.id)) {
        throw new Error(`Knowledge node ${node.id} cannot depend on itself`);
      }
      for (const dependency of node.dependsOn) {
        if (!ids.has(dependency)) {
          throw new Error(
            `Knowledge node ${node.id} references unknown dependency ${dependency}`
          );
        }
      }
    }
  }
  if (name === 'curriculum') {
    const value = artifact as AnimationPlanningArtifacts['curriculum'];
    const available = new Set(
      artifacts.knowledge?.knowledgeMap.map((node) => node.id) || []
    );
    for (const beat of value.curriculum) {
      for (const dependency of beat.dependsOn) {
        if (!available.has(dependency)) {
          throw new Error(
            `Curriculum beat ${beat.id} references unavailable dependency ${dependency}`
          );
        }
      }
      if (available.has(beat.id)) {
        throw new Error(`Curriculum beat id ${beat.id} is not unique`);
      }
      available.add(beat.id);
    }
  }
  if (name === 'storyboard' && artifacts.intent) {
    const value = artifact as AnimationPlanningArtifacts['storyboard'];
    if (
      value.cinematography.emphasis === 'term-tour' &&
      value.cinematography.scene !== 'moving-camera'
    ) {
      throw new Error(
        'Storyboard term-tour emphasis requires a moving-camera scene'
      );
    }
    const shots = [...value.shots].sort(
      (left, right) => left.startAt - right.startAt
    );
    const ids = new Set<string>();
    for (const [index, shot] of shots.entries()) {
      if (ids.has(shot.id)) {
        throw new Error(`Duplicate storyboard shot id ${shot.id}`);
      }
      ids.add(shot.id);
      if (shot.startAt >= shot.endAt) {
        throw new Error(`Storyboard shot ${shot.id} has an invalid window`);
      }
      if (index > 0 && shot.startAt < shots[index - 1].endAt - 0.001) {
        throw new Error(`Storyboard shot ${shot.id} overlaps the prior shot`);
      }
    }
    if (shots[0].startAt !== 0 || shots[0].beat !== 'hook') {
      throw new Error('The storyboard must begin with a hook at 0 seconds');
    }
    const lastShot = shots.at(-1)!;
    if (
      Math.abs(lastShot.endAt - artifacts.intent.durationSeconds) > 0.001 ||
      !['payoff', 'memory'].includes(lastShot.beat)
    ) {
      throw new Error(
        'The final storyboard shot must be payoff or memory and end exactly at durationSeconds'
      );
    }
  }
  if (
    name === 'scene' &&
    artifacts.intent &&
    artifacts.knowledge &&
    artifacts.curriculum &&
    artifacts.mathematics &&
    artifacts.storyboard
  ) {
    // Scene is the first point where every cross-stage reference exists.
    // Validate the complete contract here so one targeted scene repair can
    // fix a bad focusRef/shotId/timestamp without restarting storyboard.
    composeAnimationSpecFromArtifacts({
      intent: artifacts.intent,
      knowledge: artifacts.knowledge,
      curriculum: artifacts.curriculum,
      mathematics: artifacts.mathematics,
      storyboard: artifacts.storyboard,
      scene: artifact as AnimationPlanningArtifacts['scene'],
    });
  }
  if (name === 'scene') {
    // Runs after the contract check above so the established cross-stage
    // messages (unknown shot focus, timestamps) stay the primary diagnosis.
    // These add the internal-consistency checks the contract does not cover.
    validateSceneSemantics(artifact as AnimationPlanningArtifacts['scene']);
  }
}

function stagePrompt(params: {
  name: AnimationPlanningStageName;
  prompt: string;
  subject: AnimationSubject;
  currentSpec?: AnimationSpec;
  history?: ChatTurn[];
  artifacts: Partial<AnimationPlanningArtifacts>;
  feedback?: string;
}) {
  const completedArtifacts =
    params.name === 'scene'
      ? {
          intent: params.artifacts.intent,
          mathematics: params.artifacts.mathematics,
          storyboard: params.artifacts.storyboard,
        }
      : params.artifacts;
  const context = {
    originalRequest: params.prompt,
    subject: params.subject,
    priorConversation: compactHistory(params.history),
    currentApprovedSpec: params.currentSpec,
    // Scene composition needs the approved claim and shot contract, not the
    // intermediate concept-map prose. Keeping only the authoritative inputs
    // lowers provider latency without weakening cross-stage validation.
    completedArtifacts,
    mandatoryFeedback: params.feedback,
  };
  return `You are CurvG's ${params.name} planning specialist.

Your only task:
${STAGE_ROLES[params.name]}

Return exactly one JSON object matching this contract and no other fields:
${STAGE_CONTRACTS[params.name]}

Rules:
- Preserve the user's intent and all mathematically correct upstream artifacts.
- Treat completed artifacts as immutable evidence unless mandatoryFeedback explicitly identifies an integration conflict.
- Use stable ASCII ids matching ^[A-Za-z][A-Za-z0-9_-]{0,79}$.
- Do not return Markdown, Python, commentary, or private reasoning.
- Keep prose concise; visual evidence must be observable rather than aspirational.
- Never ask the user a follow-up question inside an artifact. When the request is incomplete, make the smallest reasonable assumption and let the intent stage state it explicitly; every later stage must follow that approved interpretation instead of reinterpreting the original wording.
- Keep the artifact compact enough for the stated output budget. Prefer the minimum complete set of nodes, beats, formulas, shots, objects, and timeline events; do not pad lists or repeat equivalent content.
- In the scene stage, copy storyboard shot ids and focusRef ids character-for-character: every focusRef must be an objects[].id, every timeline shotId must be a shots[].id, events must stay inside their shot window, and non-concurrent event groups must not overlap.

CONTEXT:
${JSON.stringify(context)}`;
}

const PLAN_SHARED_RULES = `Rules:
- The answer is one flat JSON object holding every top-level field of the five parts.
- Use stable ASCII ids matching ^[A-Za-z][A-Za-z0-9_-]{0,79}$, unique within their list.
- Every later part must follow the interpretation fixed in intent; never reinterpret the original wording.
- Never ask the user a question. When the request is incomplete, make the smallest reasonable assumption and state it in assumptions and summary.
- Keep prose concise and visual evidence observable. Prefer the minimum complete set of nodes, beats, formulas and shots; do not pad lists.
- Storyboard focusRef values name objects the scene step will create; keep them short and descriptive.
- An independent mathematical audit follows. It rejects visuals that merely suggest a claim: anything stated for a varying quantity must be shown varying, over every case the claim covers. The scene can attach a line's endpoints to a moving point and drive points, live numeric readouts, Riemann rectangles and traced paths from one animated parameter, so plan shots that show the variation itself.`;

function planPrompt(params: {
  prompt: string;
  subject: AnimationSubject;
  currentSpec?: AnimationSpec;
  history?: ChatTurn[];
  previousPlan?: Partial<AnimationPlanningArtifacts>;
  feedback?: string;
}) {
  const parts = PLAN_STAGE_NAMES.map(
    (name, index) =>
      `${index + 1}. ${name}: ${STAGE_ROLES[name]}\nFields: ${STAGE_CONTRACTS[name]}`
  ).join('\n\n');
  const context = {
    originalRequest: params.prompt,
    subject: params.subject,
    priorConversation: compactHistory(params.history),
    currentApprovedSpec: params.currentSpec,
    previousPlan: params.previousPlan,
    mandatoryFeedback: params.feedback,
  };
  return `You are CurvG's planning specialist. Write the complete teaching plan for one short mathematics animation, in five parts that build on each other in order:

${parts}

${PLAN_SHARED_RULES}
${planLimitsContract()}
${params.previousPlan ? '- previousPlan is the last approved plan. Keep every part that mandatoryFeedback does not require you to change.\n' : ''}
CONTEXT:
${JSON.stringify(context)}`;
}

/**
 * Parse one plan answer into the five stage artifacts, validating each stage
 * in pipeline order exactly as the old per-stage calls did: schema, the
 * mechanical normalizer, then cross-stage semantics against earlier parts.
 */
export function acceptPlanContent(content: string): {
  artifacts: Pick<AnimationPlanningArtifacts, AnimationPlanStageName>;
  corrections: Partial<Record<AnimationPlanStageName, string[]>>;
} {
  const parts = splitPlanArtifact(
    stripNullFields(parseStructuredJsonObject(content))
  );
  const accepted: Partial<AnimationPlanningArtifacts> = {};
  const corrections: Partial<Record<AnimationPlanStageName, string[]>> = {};
  for (const name of PLAN_STAGE_NAMES) {
    try {
      const parsed = validateAnimationPlanningArtifact(name, parts[name]);
      const normalized = normalizeAnimationPlanningArtifact(
        name,
        parsed,
        accepted
      );
      validateAnimationPlanningStageSemantics(
        name,
        normalized.artifact,
        accepted
      );
      (accepted as Record<string, unknown>)[name] = normalized.artifact;
      if (normalized.corrections.length) {
        corrections[name] = normalized.corrections.slice(0, 24);
      }
    } catch (error) {
      throw new Error(`${name}: ${planningFailureSummary(error)}`, {
        cause: error,
      });
    }
  }
  return {
    artifacts: accepted as Pick<
      AnimationPlanningArtifacts,
      AnimationPlanStageName
    >,
    corrections,
  };
}

function planStageDefinitions() {
  return PLAN_STAGE_NAMES.map((name) => definition(name));
}

/**
 * One structured call for intent, knowledge, curriculum, mathematics and
 * storyboard (2026-10-16). Six serial calls made every stage a separate
 * failure point on a flaky upstream; the merged call keeps the same five
 * persisted stage rows, so the progress UI and stage reuse are unchanged.
 */
async function runPlanCall(params: {
  planning: PlanningParams;
  artifacts: Partial<AnimationPlanningArtifacts>;
  feedback?: string;
  disableReuse?: boolean;
}): Promise<ChatCompletionResult> {
  const { planning } = params;
  const definitions = planStageDefinitions();
  const previousPlan = params.feedback
    ? Object.fromEntries(
        PLAN_STAGE_NAMES.filter((name) => params.artifacts[name]).map(
          (name) => [name, params.artifacts[name]]
        )
      )
    : undefined;
  const prompt = planPrompt({
    prompt: planning.prompt,
    subject: planning.subject,
    currentSpec: planning.currentSpec,
    history: planning.history,
    previousPlan,
    feedback: params.feedback,
  });
  const inputHash = md5(
    JSON.stringify({
      pipelineVersion: PIPELINE_VERSION,
      stage: 'plan',
      model: planning.model,
      prompt,
    })
  );
  planning.onPhase?.('understanding');

  const adopt = (
    accepted: Pick<AnimationPlanningArtifacts, AnimationPlanStageName>
  ) => {
    for (const name of PLAN_STAGE_NAMES) {
      (params.artifacts as Record<string, unknown>)[name] = accepted[name];
    }
    planning.onSummaryDelta?.(accepted.intent.summary);
    planning.onPhase?.('structuring');
  };

  if (!params.disableReuse) {
    const reusable = await Promise.all(
      definitions.map((item) =>
        findReusablePlanningStage({
          userId: planning.context.userId,
          chatId: planning.context.chatId,
          stage: item.name,
          inputHash,
        })
      )
    );
    if (reusable.every((row) => row?.artifact)) {
      try {
        const merged = Object.assign(
          {},
          ...reusable.map((row) => JSON.parse(row!.artifact!) as object)
        );
        const { artifacts } = acceptPlanContent(JSON.stringify(merged));
        for (const [index, item] of definitions.entries()) {
          const cached = await cachePlanningStage({
            userId: planning.context.userId,
            chatId: planning.context.chatId,
            runId: planning.context.runId,
            stage: item.name,
            sequence: item.sequence,
            inputHash,
            source: reusable[index]!,
          });
          planning.context.onStage?.(planningStageSummary(cached));
        }
        adopt(artifacts);
        const last = reusable[reusable.length - 1]!;
        return {
          content: JSON.stringify(merged),
          provider: last.provider,
          model: last.model,
        };
      } catch {
        // Corrupted or legacy rows: regenerate the plan.
      }
    }
  }

  const rows: Awaited<ReturnType<typeof startPlanningStage>>[] = [];
  for (const item of definitions) {
    const row = await startPlanningStage({
      userId: planning.context.userId,
      chatId: planning.context.chatId,
      runId: planning.context.runId,
      stage: item.name,
      sequence: item.sequence,
      inputHash,
      provider: planning.provider.name,
      model: planning.model,
    });
    rows.push(row);
    planning.context.onStage?.(planningStageSummary(row));
  }

  let telemetryRepairAttempt = 0;
  const input: ChatCompletionInput = {
    model: planning.model,
    messages: [
      {
        role: 'system',
        content:
          'Produce only the requested teaching plan as one JSON object. Do not design the scene objects or timeline.',
      },
      { role: 'user', content: prompt },
    ],
    maxTokens: PLAN_MAX_OUTPUT_TOKENS,
    perTargetTimeoutMs: PLAN_TARGET_TIMEOUT_MS,
    reasoningEffort: getAnimationReasoningEffort(planning.model),
    responseFormat: PLAN_RESPONSE_FORMAT,
    hedgeAfterMs: PLAN_HEDGE_AFTER_MS,
    signal: planning.signal,
    onAttempt: (report) =>
      recordPlanningAttempt({
        userId: planning.context.userId,
        chatId: planning.context.chatId,
        runId: planning.context.runId,
        stage: 'intent',
        repairAttempt: telemetryRepairAttempt,
        report,
      }),
  };
  const roundDeadlineAt = () =>
    Math.min(
      Date.now() + PLAN_ROUND_WINDOW_MS,
      planning.deadlineAt ?? Number.POSITIVE_INFINITY
    );

  let result: ChatCompletionResult | undefined;
  let lastError: unknown;
  // What each repaired round rejected, kept so prompts can be tuned from data.
  const validationErrors: string[] = [];
  try {
    for (
      let repairAttempt = 0;
      repairAttempt <= MAX_PLAN_REPAIRS;
      repairAttempt += 1
    ) {
      telemetryRepairAttempt = repairAttempt;
      result = await planning.provider.complete(
        repairAttempt === 0
          ? { ...input, deadlineAt: roundDeadlineAt() }
          : {
              ...input,
              deadlineAt: roundDeadlineAt(),
              messages: [
                ...input.messages,
                { role: 'assistant', content: result?.content || '' },
                {
                  role: 'user',
                  content: `The previous plan failed validation: ${
                    lastError instanceof Error
                      ? lastError.message.slice(0, 2_000)
                      : 'invalid output'
                  }. Return one complete corrected plan.`,
                },
              ],
            }
      );
      try {
        const { artifacts, corrections } = acceptPlanContent(result.content);
        for (const [index, item] of definitions.entries()) {
          const artifact = artifacts[item.name as AnimationPlanStageName];
          const stageCorrections =
            corrections[item.name as AnimationPlanStageName];
          const completed = await completePlanningStage({
            id: rows[index]!.id,
            artifact,
            outputHash: md5(JSON.stringify(artifact)),
            diagnostic: {
              ...(safeDiagnostic(result.diagnostic) || {}),
              ...(stageCorrections ? { corrections: stageCorrections } : {}),
              ...(repairAttempt
                ? { planRepairs: repairAttempt, validationErrors }
                : {}),
            },
            provider: result.provider,
            model: result.model,
          });
          planning.context.onStage?.(planningStageSummary(completed));
        }
        adopt(artifacts);
        return result;
      } catch (error) {
        lastError = error;
        const summary = planningFailureSummary(error).slice(0, 400);
        validationErrors.push(summary);
        console.warn('[animation-planning] plan failed validation', {
          chatId: planning.context.chatId,
          runId: planning.context.runId,
          repairAttempt,
          error: summary,
        });
      }
    }
    throw lastError;
  } catch (error) {
    const providerError =
      error instanceof ChatProviderError ? error : undefined;
    for (const row of rows) {
      const failed = await failPlanningStage({
        id: row.id,
        errorCode: stageErrorCode(error),
        errorMessage: error instanceof Error ? error.message : String(error),
        diagnostic: {
          ...(safeDiagnostic(providerError?.diagnostic || result?.diagnostic) ||
            {}),
          validationError: planningFailureSummary(error),
          ...(result?.content
            ? { outputPreview: result.content.slice(0, 2_000) }
            : {}),
        },
        requestId: providerError?.requestId,
      });
      planning.context.onStage?.(planningStageSummary(failed));
    }
    throw error;
  }
}

async function runStage<Name extends AnimationPlanningStageName>(params: {
  definition: AnimationPlanningStageDefinition & { name: Name };
  planning: PlanningParams;
  artifacts: Partial<AnimationPlanningArtifacts>;
  feedback?: string;
  disableReuse?: boolean;
}): Promise<{
  artifact: AnimationPlanningArtifacts[Name];
  result: ChatCompletionResult;
}> {
  const { definition, planning } = params;
  const prompt = stagePrompt({
    name: definition.name,
    prompt: planning.prompt,
    subject: planning.subject,
    currentSpec: planning.currentSpec,
    history: planning.history,
    artifacts: params.artifacts,
    feedback: params.feedback,
  });
  const inputHash = md5(
    JSON.stringify({
      pipelineVersion: PIPELINE_VERSION,
      stage: definition.name,
      model: planning.model,
      prompt,
    })
  );

  if (!params.disableReuse) {
    const reusable = await findReusablePlanningStage({
      userId: planning.context.userId,
      chatId: planning.context.chatId,
      stage: definition.name,
      inputHash,
    });
    if (reusable?.artifact) {
      try {
        const artifact = validateAnimationPlanningArtifact(
          definition.name,
          JSON.parse(reusable.artifact) as unknown
        );
        validateAnimationPlanningStageSemantics(
          definition.name,
          artifact,
          params.artifacts
        );
        const cached = await cachePlanningStage({
          userId: planning.context.userId,
          chatId: planning.context.chatId,
          runId: planning.context.runId,
          stage: definition.name,
          sequence: definition.sequence,
          inputHash,
          source: reusable,
        });
        planning.context.onStage?.(planningStageSummary(cached));
        return {
          artifact,
          result: {
            content: JSON.stringify(artifact),
            provider: cached.provider,
            model: cached.model,
            diagnostic: reusable.diagnostic
              ? (JSON.parse(reusable.diagnostic) as ChatProviderDiagnostic)
              : undefined,
          },
        };
      } catch {
        // Ignore corrupted legacy/cache data and regenerate this one stage.
      }
    }
  }

  if (
    definition.name === 'scene' &&
    params.artifacts.intent &&
    params.artifacts.knowledge &&
    params.artifacts.curriculum &&
    params.artifacts.mathematics &&
    params.artifacts.storyboard &&
    supportsDeterministicSceneProfile({
      intent: params.artifacts.intent,
      knowledge: params.artifacts.knowledge,
      curriculum: params.artifacts.curriculum,
      mathematics: params.artifacts.mathematics,
      storyboard: params.artifacts.storyboard,
    })
  ) {
    const approvedArtifacts = {
      intent: params.artifacts.intent,
      knowledge: params.artifacts.knowledge,
      curriculum: params.artifacts.curriculum,
      mathematics: params.artifacts.mathematics,
      storyboard: params.artifacts.storyboard,
    };
    const latestRow = await startPlanningStage({
      userId: planning.context.userId,
      chatId: planning.context.chatId,
      runId: planning.context.runId,
      stage: definition.name,
      sequence: definition.sequence,
      inputHash,
      provider: 'curvg',
      model: 'deterministic-scene-v1',
    });
    planning.context.onStage?.(planningStageSummary(latestRow));
    const artifact = buildDeterministicSceneArtifact(approvedArtifacts);
    validateAnimationPlanningStageSemantics(
      'scene',
      artifact,
      params.artifacts
    );
    const completed = await completePlanningStage({
      id: latestRow.id,
      artifact,
      outputHash: md5(JSON.stringify(artifact)),
      provider: 'curvg',
      model: 'deterministic-scene-v1',
    });
    planning.context.onStage?.(planningStageSummary(completed));
    console.info('[animation-planning] used deterministic scene profile', {
      chatId: planning.context.chatId,
      runId: planning.context.runId,
    });
    return {
      artifact: artifact as AnimationPlanningArtifacts[Name],
      result: {
        content: JSON.stringify(artifact),
        provider: 'curvg',
        model: 'deterministic-scene-v1',
      },
    };
  }

  const stageRepairLimit = maxStageFormatRepairs(definition.name);
  let telemetryRepairAttempt = 0;
  const input: ChatCompletionInput = {
    model: planning.model,
    messages: [
      {
        role: 'system',
        content:
          'Produce only the requested stage artifact. Do not solve downstream stages early.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    maxTokens:
      definition.name === 'scene'
        ? SCENE_MAX_OUTPUT_TOKENS
        : definition.maxTokens,
    ...(definition.name === 'scene'
      ? {
          responseFormat: SCENE_RESPONSE_FORMAT,
          hedgeAfterMs: SCENE_HEDGE_AFTER_MS,
        }
      : {}),
    perTargetTimeoutMs: stageTargetTimeoutMs(definition.name),
    reasoningEffort:
      definition.name === 'scene'
        ? getAnimationCompositionReasoningEffort(planning.model)
        : getAnimationReasoningEffort(planning.model),
    signal: planning.signal,
    // Path D observability: persist every failover attempt, including ones a
    // later target recovers from, keyed to the repair round in flight. The
    // report is built synchronously inside the round, so the closure variable
    // is always the round that made the call.
    onAttempt: (report) =>
      recordPlanningAttempt({
        userId: planning.context.userId,
        chatId: planning.context.chatId,
        runId: planning.context.runId,
        stage: definition.name,
        repairAttempt: telemetryRepairAttempt,
        report,
      }),
  };
  // Keep every provider call below the Worker's five-minute execution cap.
  // Durable retries resume from completed checkpoints instead of letting one
  // slow upstream request terminate the whole Workflow invocation.
  // All six stages and their audits share the plan's absolute deadline.
  // Scene has a deterministic recovery boundary, so its model/format-repair
  // loop gets one total provider window instead of being allowed to consume
  // the entire plan budget. The remaining absolute budget is left for the
  // independent mathematics audit and the final state transition.
  const sceneStageDeadlineAt =
    definition.name === 'scene'
      ? Math.min(
          planning.deadlineAt ?? Number.POSITIVE_INFINITY,
          Date.now() + SCENE_STAGE_PROVIDER_TIMEOUT_MS
        )
      : planning.deadlineAt;
  const roundDeadlineAt = () =>
    Math.min(
      Date.now() + stageProviderWindowMs(definition.name),
      sceneStageDeadlineAt ?? Number.POSITIVE_INFINITY
    );
  let latestRow = await startPlanningStage({
    userId: planning.context.userId,
    chatId: planning.context.chatId,
    runId: planning.context.runId,
    stage: definition.name,
    sequence: definition.sequence,
    inputHash,
    provider: planning.provider.name,
    model: planning.model,
  });
  planning.context.onStage?.(planningStageSummary(latestRow));
  let result: ChatCompletionResult | undefined;
  let lastError: unknown;
  const stageValidationErrors: string[] = [];
  // Path B5: when a scene failure maps cleanly onto objects[i]/timeline[j],
  // the next round resends only those items instead of the whole artifact.
  let targetedRepair:
    | {
        items: SceneTargetedRepairItem[];
        base: AnimationPlanningArtifacts['scene'];
      }
    | undefined;
  try {
    for (
      let repairAttempt = 0;
      repairAttempt <= stageRepairLimit;
      repairAttempt += 1
    ) {
      telemetryRepairAttempt = repairAttempt;
      if (repairAttempt > 0) {
        latestRow = await startPlanningStage({
          userId: planning.context.userId,
          chatId: planning.context.chatId,
          runId: planning.context.runId,
          stage: definition.name,
          sequence: definition.sequence,
          inputHash,
          provider: planning.provider.name,
          model: planning.model,
        });
        planning.context.onStage?.(planningStageSummary(latestRow));
      }
      result = await planning.provider.complete(
        repairAttempt === 0
          ? { ...input, deadlineAt: roundDeadlineAt() }
          : targetedRepair
            ? {
                ...input,
                deadlineAt: roundDeadlineAt(),
                temperature: 0,
                // The fragment repair answers a different shape.
                responseFormat: undefined,
                messages: [
                  ...input.messages,
                  {
                    role: 'user',
                    content: sceneTargetedRepairPrompt(targetedRepair.items),
                  },
                ],
              }
            : {
                ...input,
                deadlineAt: roundDeadlineAt(),
                temperature: 0,
                messages: [
                  ...input.messages,
                  { role: 'assistant', content: result?.content || '' },
                  {
                    role: 'user',
                    content: `The previous ${definition.name} artifact failed validation: ${
                      lastError instanceof Error
                        ? lastError.message.slice(0, 2_000)
                        : 'invalid output'
                    }. Return one complete corrected JSON object matching the original contract.`,
                  },
                ],
              }
      );
      let candidate: AnimationPlanningArtifacts[Name] | undefined;
      try {
        candidate = targetedRepair
          ? (applySceneTargetedRepair(
              targetedRepair.base,
              result.content,
              targetedRepair.items
            ) as AnimationPlanningArtifacts[Name])
          : parseAnimationPlanningArtifact(definition.name, result.content);
        targetedRepair = undefined;
        const normalized = normalizeAnimationPlanningArtifact(
          definition.name,
          candidate,
          params.artifacts
        );
        candidate = normalized.artifact;
        validateAnimationPlanningStageSemantics(
          definition.name,
          candidate,
          params.artifacts
        );
        const completed = await completePlanningStage({
          id: latestRow.id,
          artifact: candidate,
          outputHash: md5(JSON.stringify(candidate)),
          diagnostic: {
            ...(safeDiagnostic(result.diagnostic) || {}),
            ...(normalized.corrections.length
              ? { corrections: normalized.corrections.slice(0, 24) }
              : {}),
            ...(stageValidationErrors.length
              ? { validationErrors: stageValidationErrors }
              : {}),
          },
          provider: result.provider,
          model: result.model,
        });
        planning.context.onStage?.(planningStageSummary(completed));
        return { artifact: candidate, result };
      } catch (error) {
        lastError = error;
        targetedRepair = undefined;
        const summary = planningFailureSummary(error).slice(0, 400);
        stageValidationErrors.push(summary);
        console.warn('[animation-planning] stage failed validation', {
          chatId: planning.context.chatId,
          runId: planning.context.runId,
          stage: definition.name,
          repairAttempt,
          error: summary,
        });
        if (definition.name === 'scene' && candidate) {
          const items = planSceneTargetedRepair(
            error,
            candidate as AnimationPlanningArtifacts['scene']
          );
          if (items) {
            targetedRepair = {
              items,
              base: candidate as AnimationPlanningArtifacts['scene'],
            };
          }
        }
      }
    }
    throw lastError;
  } catch (error) {
    // Do not recover here: this row must retain the provider failure and its
    // retryable classification. The caller may recover only from a scene
    // failure after all five upstream artifacts have passed validation, using
    // the lineage-preserving deterministic builder below. Earlier-stage
    // failures must reach the Workflow queue rather than becoming unrelated
    // content.
    const providerError =
      error instanceof ChatProviderError ? error : undefined;
    const failed = await failPlanningStage({
      id: latestRow.id,
      errorCode: stageErrorCode(error),
      errorMessage: error instanceof Error ? error.message : String(error),
      diagnostic: {
        ...(safeDiagnostic(providerError?.diagnostic || result?.diagnostic) ||
          {}),
        validationError: planningFailureSummary(error),
        ...(result?.content
          ? { outputPreview: result.content.slice(0, 2_000) }
          : {}),
      },
      requestId: providerError?.requestId,
    });
    planning.context.onStage?.(planningStageSummary(failed));
    throw error;
  }
}

function definition<Name extends AnimationPlanningStageName>(name: Name) {
  return ANIMATION_PLANNING_STAGES.find(
    (candidate) => candidate.name === name
  ) as AnimationPlanningStageDefinition & { name: Name };
}

export function deterministicMathReviewForScene(
  spec: AnimationSpec,
  result: ChatCompletionResult
): AnimationMathReview | undefined {
  if (
    result.provider !== 'curvg' ||
    result.model !== 'deterministic-scene-v1' ||
    (spec.schemaVersion !== 5 && spec.schemaVersion !== 6) ||
    !spec.mathDossier
  ) {
    return undefined;
  }
  const evidence = [
    spec.title,
    spec.summary,
    spec.mathDossier.coreClaim,
    ...(spec.mathDossier.derivationSteps || []),
  ].join(' ');
  const hasQuadraticClaim =
    /(?:x\s*(?:\^|\*\*)\s*2|x²)/iu.test(evidence) &&
    /(?:x\s*=\s*1|x=1)/iu.test(evidence) &&
    /(?:slope|derivative|tangent|斜率|导数|切线).{0,80}2|2.{0,80}(?:slope|derivative|tangent|斜率|导数|切线)/iu.test(
      evidence
    );
  const hasQuadraticCurve = spec.objects?.some(
    (object) =>
      object.kind === 'curve' &&
      object.expr?.replaceAll(' ', '').replaceAll('**', '^') === 'x^2'
  );
  const hasExactTangent = spec.objects?.some((object) => {
    if (object.kind !== 'line' || !object.start || !object.end) return false;
    const dx = object.end[0] - object.start[0];
    if (Math.abs(dx) < 1e-9) return false;
    const slope = (object.end[1] - object.start[1]) / dx;
    const intercept = object.start[1] - slope * object.start[0];
    return Math.abs(slope - 2) < 1e-9 && Math.abs(intercept + 1) < 1e-9;
  });
  const hasExactFormula = spec.objects?.some(
    (object) =>
      object.kind === 'formula' &&
      [object.expr, ...(object.parts?.map((part) => part.latex) || [])]
        .filter(Boolean)
        .join('')
        .replaceAll('\\quad', '')
        .replaceAll(' ', '')
        .includes('y=2x-1')
  );
  if (
    hasQuadraticClaim &&
    hasQuadraticCurve &&
    hasExactTangent &&
    hasExactFormula
  ) {
    return {
      status: 'approved',
      summary:
        'The deterministic quadratic-tangent profile preserves the approved dossier and exact y=x^2 / y=2x-1 geometry.',
      checkedClaims: (spec.mathDossier.checks || [])
        .map((check) => check.claim)
        .slice(0, 20),
      issues: [],
    };
  }
  const heart = spec.objects?.find(
    (object) => object.kind === 'parametric' && object.id === 'heart_curve'
  );
  const normalizedHeartX = heart?.xExpr
    ?.replaceAll(' ', '')
    .replaceAll('**', '^');
  const normalizedHeartY = heart?.yExpr
    ?.replaceAll(' ', '')
    .replaceAll('**', '^');
  const hasExactHeart =
    /(?:heart|爱心|心形)/iu.test(evidence) &&
    normalizedHeartX === '4*sin(t)^3' &&
    normalizedHeartY === '2.6*cos(t)-cos(2*t)-0.4*cos(3*t)-0.2*cos(4*t)' &&
    Math.abs((heart?.domain?.[0] || 0) - 0) < 1e-9 &&
    Math.abs((heart?.domain?.[1] || 0) - Math.PI * 2) < 1e-9 &&
    spec.objects?.some((object) => object.kind === 'axes') &&
    spec.timeline?.some(
      (event) =>
        event.op === 'move_along' &&
        event.ref === 'heart_point' &&
        event.pathRef === 'heart_curve'
    );
  if (hasExactHeart) {
    return {
      status: 'approved',
      summary:
        'The deterministic heart profile preserves the closed, y-axis-symmetric parameterization and synchronized trace motion.',
      checkedClaims: (spec.mathDossier.checks || [])
        .map((check) => check.claim)
        .slice(0, 20),
      issues: [],
    };
  }
  const cycloid = spec.objects?.find(
    (object) =>
      object.kind === 'parametric' && object.id === 'cycloid_trace_full'
  );
  const normalizedX = cycloid?.xExpr?.replaceAll(' ', '');
  const normalizedY = cycloid?.yExpr?.replaceAll(' ', '');
  const hasExactCycloid =
    /(?:cycloid|摆线)/iu.test(evidence) &&
    normalizedX === 't-pi-sin(t)' &&
    normalizedY === '1-cos(t)' &&
    Math.abs((cycloid?.domain?.[0] || 0) - 0) < 1e-9 &&
    Math.abs((cycloid?.domain?.[1] || 0) - Math.PI * 2) < 1e-9 &&
    spec.objects?.some(
      (object) => object.kind === 'circle' && object.radius === 1
    );
  if (!hasExactCycloid) return undefined;
  return {
    status: 'approved',
    summary:
      'The deterministic cycloid profile preserves the unit rolling-circle invariant and exact centered parameterization.',
    checkedClaims: (spec.mathDossier.checks || [])
      .map((check) => check.claim)
      .slice(0, 20),
    issues: [],
  };
}

async function runFromStage(params: {
  planning: PlanningParams;
  artifacts: Partial<AnimationPlanningArtifacts>;
  startAt: AnimationPlanningStageName;
  feedback?: string;
  disableReuse?: boolean;
}) {
  let lastResult: ChatCompletionResult | undefined;
  if (params.startAt !== 'scene') {
    try {
      lastResult = await runPlanCall({
        planning: params.planning,
        artifacts: params.artifacts,
        feedback: params.feedback,
        disableReuse: params.disableReuse,
      });
    } catch (error) {
      throw new AnimationPlanningStageError(params.startAt, error);
    }
  }
  params.planning.onPhase?.('finalizing');
  try {
    const completed = await runStage({
      definition: definition('scene'),
      planning: params.planning,
      artifacts: params.artifacts,
      // Integration feedback usually concerns ids the scene must honour.
      feedback: params.feedback,
      disableReuse: params.disableReuse,
    });
    params.artifacts.scene = completed.artifact;
    lastResult = completed.result;
  } catch (error) {
    throw new AnimationPlanningStageError('scene', error);
  }
  return lastResult;
}

async function runFromStageStrict(params: Parameters<typeof runFromStage>[0]) {
  // Verified profiles are selected inside runPlanningStage before any scene
  // provider call. For every other topic, a failed scene stage must remain a
  // failed plan: replacing an unknown visual proof with formula cards can be
  // renderable while being semantically unrelated to the request.
  return runFromStage(params);
}

interface PersistentPlanningResult {
  result: ChatCompletionResult;
  spec: AnimationSpec;
  mathReview?: AnimationMathReview;
}

async function persistDeterministicArtifacts(params: {
  planning: PlanningParams;
  artifacts: AnimationPlanningArtifacts;
  profile: string;
  model: 'deterministic-scene-v1';
}): Promise<PersistentPlanningResult> {
  let result: ChatCompletionResult | undefined;
  const completedArtifacts: Partial<AnimationPlanningArtifacts> = {};
  for (const item of ANIMATION_PLANNING_STAGES) {
    params.planning.onPhase?.(item.phase);
    const artifact = params.artifacts[item.name];
    validateAnimationPlanningStageSemantics(
      item.name,
      artifact,
      completedArtifacts
    );
    const inputHash = md5(
      JSON.stringify({
        pipelineVersion: PIPELINE_VERSION,
        profile: params.profile,
        stage: item.name,
        prompt: params.planning.prompt,
      })
    );
    const started = await startPlanningStage({
      userId: params.planning.context.userId,
      chatId: params.planning.context.chatId,
      runId: params.planning.context.runId,
      stage: item.name,
      sequence: item.sequence,
      inputHash,
      provider: 'curvg',
      model: params.model,
    });
    params.planning.context.onStage?.(planningStageSummary(started));
    const completed = await completePlanningStage({
      id: started.id,
      artifact,
      outputHash: md5(JSON.stringify(artifact)),
      provider: 'curvg',
      model: params.model,
    });
    params.planning.context.onStage?.(planningStageSummary(completed));
    (completedArtifacts as Record<string, unknown>)[item.name] = artifact;
    result = {
      content: JSON.stringify(artifact),
      provider: 'curvg',
      model: params.model,
    };
    if (item.name === 'intent') {
      params.planning.onSummaryDelta?.(params.artifacts.intent.summary);
    }
  }
  const spec = composeAnimationSpecFromArtifacts(params.artifacts);
  console.info('[animation-planning] used deterministic profile', {
    chatId: params.planning.context.chatId,
    runId: params.planning.context.runId,
    profile: params.profile,
  });
  return {
    result: result!,
    spec,
    mathReview:
      params.model === 'deterministic-scene-v1'
        ? deterministicMathReviewForScene(spec, result!)
        : undefined,
  };
}

async function generatePersistentAnimationSpecStrict(
  planning: PlanningParams
): Promise<PersistentPlanningResult> {
  const deterministicProfile = buildDeterministicAnimationPlanningProfile(
    planning.prompt,
    {
      currentSpec: planning.currentSpec,
      hasPriorConversation: Boolean(planning.history?.length),
    }
  );
  if (deterministicProfile) {
    return persistDeterministicArtifacts({
      planning,
      artifacts: deterministicProfile.artifacts,
      profile: deterministicProfile.id,
      model: 'deterministic-scene-v1',
    });
  }

  const artifacts: Partial<AnimationPlanningArtifacts> = {};
  let result = await runFromStageStrict({
    planning,
    artifacts,
    startAt: 'intent',
  });
  let spec: AnimationSpec | undefined;
  let integrationError: unknown;
  for (let repair = 0; repair <= MAX_INTEGRATION_REPAIRS; repair += 1) {
    try {
      spec = composeAnimationSpecFromArtifacts(
        artifacts as AnimationPlanningArtifacts
      );
      // Compile now: an unsupported expression name used to surface only
      // after the audit, failing a finished plan (2026-10-16 smoke run).
      compileAnimationSpec(spec);
      break;
    } catch (error) {
      spec = undefined;
      integrationError = error;
      if (repair === MAX_INTEGRATION_REPAIRS) throw error;
      console.warn('[animation-planning] repairing integration contract', {
        chatId: planning.context.chatId,
        runId: planning.context.runId,
        repair: repair + 1,
        error:
          error instanceof Error
            ? error.message.replace(/[\r\n]+/g, ' ').slice(0, 1_000)
            : String(error).slice(0, 1_000),
      });
      result = await runFromStageStrict({
        planning,
        artifacts,
        startAt: 'storyboard',
        feedback: `The composed specification failed integration validation: ${
          error instanceof Error
            ? error.message.slice(0, 3_000)
            : 'invalid spec'
        }. Correct the storyboard and downstream scene while preserving approved intent, knowledge, curriculum, and mathematics.`,
        disableReuse: true,
      });
    }
  }
  if (!spec) throw integrationError;

  let mathReview = deterministicMathReviewForScene(spec, result);
  if (!mathReview && planning.audit) {
    mathReview = await planning.audit(spec);
  }
  // Visual-only findings get one scene revision, then ship as warnings;
  // mathematical findings keep the full revision budget and still block.
  let visualRevisions = 0;
  for (
    let revision = 0;
    planning.audit &&
    mathReview &&
    !isAnimationMathReviewApproved(mathReview) &&
    revision < MAX_MATH_REVISIONS &&
    (mathReviewBlocks(mathReview) || visualRevisions < 1);
    revision += 1
  ) {
    // Visual-only findings keep the approved plan and redo just the scene;
    // re-planning for them doubled each revision on a slow upstream.
    const sceneOnly = mathReviewNeedsOnlyScene(mathReview);
    if (sceneOnly) visualRevisions += 1;
    result = await runFromStageStrict({
      planning,
      artifacts,
      startAt: sceneOnly ? 'scene' : 'mathematics',
      feedback: `Independent mathematical audit requires revision: ${JSON.stringify(
        mathReview
      ).slice(0, 5_000)}. ${
        sceneOnly
          ? 'The plan is approved; correct the scene so it shows the claim.'
          : 'Correct the mathematical dossier and rebuild all downstream artifacts.'
      }`,
      disableReuse: true,
    });
    spec = composeAnimationSpecFromArtifacts(
      artifacts as AnimationPlanningArtifacts
    );
    try {
      compileAnimationSpec(spec);
    } catch (error) {
      // Classified as retryable invalid output, so the Workflow queue retries.
      throw new Error(
        `Scene validation failed after revision: ${planningFailureSummary(error)}`,
        { cause: error }
      );
    }
    mathReview = await planning.audit(spec);
  }

  // Unresolved mathematical findings no longer fail the run (2026-10-16):
  // the caller turns them into warnings and the user decides.
  if (mathReview && mathReviewBlocks(mathReview)) {
    console.info('[animation-planning] awaiting user decision on math audit', {
      chatId: planning.context.chatId,
      runId: planning.context.runId,
      findings: mathReview.issues.map((issue) => issue.problem.slice(0, 200)),
    });
  } else if (mathReview && !isAnimationMathReviewApproved(mathReview)) {
    console.info('[animation-planning] shipped with visual audit warnings', {
      chatId: planning.context.chatId,
      runId: planning.context.runId,
      warnings: mathReview.issues.map((issue) => issue.problem.slice(0, 200)),
    });
  }

  return {
    result: result || {
      content: JSON.stringify(spec),
      provider: planning.provider.name,
      model: planning.model,
    },
    spec,
    mathReview,
  };
}

export async function generatePersistentAnimationSpec(
  planning: PlanningParams
): Promise<PersistentPlanningResult> {
  // Completed stages remain durable and are reused by runStage on a Workflow
  // retry. Only the scene stage has a deterministic recovery boundary, and it
  // can consume the already-approved upstream artifacts without inventing a
  // new mathematical claim.
  return generatePersistentAnimationSpecStrict(planning);
}
