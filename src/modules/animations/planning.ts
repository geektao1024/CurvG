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
  type AnimationMathReview,
} from '@/lib/animation-math';
import {
  ANIMATION_PLANNING_STAGES,
  buildDeterministicAnimationPlanningProfile,
  buildDeterministicSceneArtifact,
  composeAnimationSpecFromArtifacts,
  parseAnimationPlanningArtifact,
  supportsDeterministicSceneProfile,
  validateAnimationPlanningArtifact,
  type AnimationPlanningArtifacts,
  type AnimationPlanningStageDefinition,
} from '@/lib/animation-pipeline';
import { md5 } from '@/lib/hash';

import {
  cachePlanningStage,
  completePlanningStage,
  failPlanningStage,
  findReusablePlanningStage,
  planningStageSummary,
  recordPlanningAttempt,
  startPlanningStage,
} from './stages';

const PIPELINE_VERSION = 1;
// Format-repair budget per stage (2026-08 path B5): scene carries the most
// required structure and is the schema_validation hotspot, so it gets more
// bounded retries. The widened 1200s plan budget absorbs the extra rounds.
function maxStageFormatRepairs(stage: AnimationPlanningStageName): number {
  return stage === 'scene' ? 3 : 2;
}
const MAX_INTEGRATION_REPAIRS = 2;
const MAX_MATH_REVISIONS = 2;
// Reserve an equal share of the stage window for each of the two lead
// failover targets (2026-08-04). The scene stage produces the largest
// artifact by far — production showed both vendors cut at a flat 150s cap
// while still writing — so it gets a 300s per-target window inside a 600s
// stage window. Small stages keep 150s/300s. Every window stays below the
// Worker's five-minute per-call cap at the provider request layer, and the
// plan's absolute deadline still bounds the sum.
const STAGE_PROVIDER_TIMEOUT_MS = 300_000;
const SCENE_STAGE_PROVIDER_TIMEOUT_MS = 600_000;
const STAGE_TARGET_TIMEOUT_MS = 150_000;
const SCENE_STAGE_TARGET_TIMEOUT_MS = 300_000;

function stageProviderWindowMs(stage: AnimationPlanningStageName): number {
  return stage === 'scene'
    ? SCENE_STAGE_PROVIDER_TIMEOUT_MS
    : STAGE_PROVIDER_TIMEOUT_MS;
}

function stageTargetTimeoutMs(stage: AnimationPlanningStageName): number {
  return stage === 'scene'
    ? SCENE_STAGE_TARGET_TIMEOUT_MS
    : STAGE_TARGET_TIMEOUT_MS;
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
    "formulaId": "required for formula objects: the mathDossier formula this object renders"
  }],
  "timeline": [{
    "id": "unique_event_id",
    "shotId": "storyboard shot id",
    "at": 0,
    "op": "draw|write|fade_in|fade_out|transform|emphasize|spotlight|glow|camera_focus|camera_reset|move_along|hold",
    "ref": "object id",
    "runTime": 1,
    "ease": "linear|smooth|there_and_back"
  }],
  "layout": {"regions": "single|left|right|top|bottom"},
  "dependencies": ["required capability"],
  "notes": ["implementation invariant"]
}`,
};

const STAGE_ROLES: Record<AnimationPlanningStageName, string> = {
  intent:
    'Clarify the exact learning goal, scope, assumptions, hook, takeaway, duration, title, and concise summary.',
  knowledge:
    'Build a dependency-aware concept map. Every dependsOn id must exist in this artifact, ids must be unique, and no node may depend on itself. Set depth 0 only on the target concept, increasing toward foundations. Mark concepts the audience already owns with assumed true — they get a nod, not a lesson. Give every node a visualSeed: the most filmable mental image of that concept, which the storyboard will harvest. Emit spine as the shortest honest path from foundations to the depth-0 target; the film walks the spine and everything else is texture.',
  curriculum:
    'Order 3-12 teachable beats. Every dependency must refer to a knowledge node or an earlier curriculum beat.',
  mathematics:
    'Produce an exact, independently checkable mathematical dossier. State domains and limitations; never invent a theorem to fit a visual. The dossier owns every formula the film may show: author each one exactly once in formulas, with ordered latexParts whose chunks compile independently and concatenate into the full formula. Downstream stages copy these verbatim and may not write LaTeX of their own.',
  storyboard:
    'Translate the approved learning and mathematics artifacts into 3-6 non-overlapping shots. Begin with a hook at 0 and end with payoff or memory exactly at durationSeconds. term-tour emphasis requires a moving-camera scene; never combine term-tour with static.',
  scene:
    'Declare the concrete visual objects and timed actions that realize every storyboard acceptance condition and the mathematical visual proof. Preserve every storyboard shot id exactly, create an object for every focusRef, and keep every timeline event inside its referenced shot. Every formula object must reference one mathDossier formula through formulaId and copy its latexParts verbatim into parts (or expr when the formula has a single part); never author new LaTeX in the scene, and never render the same formula through two objects. Parametric curves require safe xExpr, yExpr and an increasing domain for t.',
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
  'move_along',
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
- In the scene stage, copy storyboard shot ids and focusRef ids character-for-character: every focusRef must be an objects[].id, every timeline shotId must be a shots[].id, events must stay inside their shot window, and non-concurrent event groups must not overlap.

CONTEXT:
${JSON.stringify(context)}`;
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
    maxTokens: definition.maxTokens,
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
  // Recomputed per repair round: a round that follows a slow failed round
  // still gets its own provider window, bounded only by the plan deadline.
  const roundDeadlineAt = () =>
    Math.min(
      Date.now() + stageProviderWindowMs(definition.name),
      planning.deadlineAt ?? Number.POSITIVE_INFINITY
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
      try {
        const artifact = parseAnimationPlanningArtifact(
          definition.name,
          result.content
        );
        validateAnimationPlanningStageSemantics(
          definition.name,
          artifact,
          params.artifacts
        );
        const completed = await completePlanningStage({
          id: latestRow.id,
          artifact,
          outputHash: md5(JSON.stringify(artifact)),
          diagnostic: safeDiagnostic(result.diagnostic),
          provider: result.provider,
          model: result.model,
        });
        planning.context.onStage?.(planningStageSummary(completed));
        return { artifact, result };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  } catch (error) {
    // 2026-08-02 product decision: a stage that fails after its provider
    // failover no longer substitutes a deterministic scene. Substitution made
    // the run look successful while delivering content that could ignore the
    // request (71% of one day's completions). The error propagates with its
    // retryable classification instead, and the Workflow queues patient
    // retries; the only deterministic scene left is the pre-matched verified
    // profile above, which the schema-6 dossier gate keeps honest.
    const providerError =
      error instanceof ChatProviderError ? error : undefined;
    const failed = await failPlanningStage({
      id: latestRow.id,
      errorCode: stageErrorCode(error),
      errorMessage: error instanceof Error ? error.message : String(error),
      diagnostic: safeDiagnostic(
        providerError?.diagnostic || result?.diagnostic
      ),
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
  const startSequence = definition(params.startAt).sequence;
  let lastResult: ChatCompletionResult | undefined;
  for (const item of ANIMATION_PLANNING_STAGES) {
    if (item.sequence < startSequence) continue;
    params.planning.onPhase?.(item.phase);
    const completed = await runStage({
      definition: item,
      planning: params.planning,
      artifacts: params.artifacts,
      feedback: item.name === params.startAt ? params.feedback : undefined,
      disableReuse: params.disableReuse,
    });
    (params.artifacts as Record<string, unknown>)[item.name] =
      completed.artifact;
    lastResult = completed.result;
    if (item.name === 'intent') {
      params.planning.onSummaryDelta?.(
        (completed.artifact as AnimationPlanningArtifacts['intent']).summary
      );
    }
  }
  return lastResult;
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
    planning.prompt
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
  let result = await runFromStage({
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
      break;
    } catch (error) {
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
      result = await runFromStage({
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
  for (
    let revision = 0;
    planning.audit &&
    mathReview &&
    !isAnimationMathReviewApproved(mathReview) &&
    revision < MAX_MATH_REVISIONS;
    revision += 1
  ) {
    result = await runFromStage({
      planning,
      artifacts,
      startAt: 'mathematics',
      feedback: `Independent mathematical audit requires revision: ${JSON.stringify(
        mathReview
      ).slice(
        0,
        5_000
      )}. Correct the mathematical dossier and rebuild all downstream artifacts.`,
      disableReuse: true,
    });
    spec = composeAnimationSpecFromArtifacts(
      artifacts as AnimationPlanningArtifacts
    );
    mathReview = await planning.audit(spec);
  }

  if (mathReview && !isAnimationMathReviewApproved(mathReview)) {
    throw new Error(
      `Strict mathematical audit was not approved: ${mathReview.summary}`
    );
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
  // retry. Do not replace them with a generic scene when a later stage or the
  // upstream provider fails: an unrelated video is not a successful result.
  return generatePersistentAnimationSpecStrict(planning);
}
