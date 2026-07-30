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
  composeAnimationSpecFromArtifacts,
  parseAnimationPlanningArtifact,
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
  startPlanningStage,
} from './stages';

const PIPELINE_VERSION = 1;
const MAX_STAGE_FORMAT_REPAIRS = 1;
const MAX_INTEGRATION_REPAIRS = 2;
const MAX_MATH_REVISIONS = 2;
const STAGE_PROVIDER_TIMEOUT_MS = 300_000;

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
    "misconception": "specific misconception to avoid"
  }]
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
    "kind": "axes|curve|area|formula|text|series|matrix|circle|point|line|arrow|arc",
    "region": "title|formula|graph"
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
    'Build a dependency-aware concept map. Every dependsOn id must exist in this artifact, ids must be unique, and no node may depend on itself.',
  curriculum:
    'Order 3-12 teachable beats. Every dependency must refer to a knowledge node or an earlier curriculum beat.',
  mathematics:
    'Produce an exact, independently checkable mathematical dossier. State domains and limitations; never invent a theorem to fit a visual.',
  storyboard:
    'Translate the approved learning and mathematics artifacts into 3-6 non-overlapping shots. Begin with a hook at 0 and end with payoff or memory exactly at durationSeconds.',
  scene:
    'Declare the concrete visual objects and timed actions that realize every storyboard acceptance condition and the mathematical visual proof. Preserve every storyboard shot id exactly, create an object for every focusRef, and keep every timeline event inside its referenced shot.',
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
  const context = {
    originalRequest: params.prompt,
    subject: params.subject,
    priorConversation: compactHistory(params.history),
    currentApprovedSpec: params.currentSpec,
    completedArtifacts: params.artifacts,
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
    reasoningEffort:
      definition.name === 'scene'
        ? getAnimationCompositionReasoningEffort(planning.model)
        : getAnimationReasoningEffort(planning.model),
    signal: planning.signal,
    // A durable stage receives its own provider budget. Reusing the original
    // request deadline here would make later stages fail immediately after a
    // long first stage even though their artifacts can be resumed safely.
    deadlineAt: Math.max(
      planning.deadlineAt || 0,
      Date.now() + STAGE_PROVIDER_TIMEOUT_MS
    ),
  };
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
      repairAttempt <= MAX_STAGE_FORMAT_REPAIRS;
      repairAttempt += 1
    ) {
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
          ? input
          : {
              ...input,
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

export async function generatePersistentAnimationSpec(
  planning: PlanningParams
): Promise<{
  result: ChatCompletionResult;
  spec: AnimationSpec;
  mathReview?: AnimationMathReview;
}> {
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

  let mathReview = planning.audit ? await planning.audit(spec) : undefined;
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
