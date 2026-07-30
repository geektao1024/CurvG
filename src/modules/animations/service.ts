import { and, asc, desc, eq, ne } from 'drizzle-orm';

import {
  ChatProviderError,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatProvider,
  type ChatTurn,
} from '@/core/ai/chat';
import type { AnimationRenderer } from '@/core/animation-renderer';
import { db } from '@/core/db';
import { getAnimationReasoningEffort } from '@/config/animation-models';
import { chat, chatMessage, type Chat } from '@/config/db/schema';
import {
  isAnimationSpecRenderable,
  type AnimationCreationMode,
  type AnimationDetail,
  type AnimationFailure,
  type AnimationFailureStage,
  type AnimationMathObjectType,
  type AnimationMessage,
  type AnimationModelSelection,
  type AnimationParts,
  type AnimationPlanningPhase,
  type AnimationQualityControlState,
  type AnimationQualityGateAction,
  type AnimationSpec,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
  type AnimationVersion,
  type AnimationVisualQaReport,
  type AnimationVisualReview,
} from '@/lib/animation';
import {
  isAnimationMathReviewApproved,
  parseAnimationMathReview,
  type AnimationMathReview,
} from '@/lib/animation-math';
import {
  parseAnimationSpec,
  parseManimCode,
  validateAnimationSpec,
} from '@/lib/animation-schema';
import { getUuid, md5 } from '@/lib/hash';
import { compileAnimationSpec } from '@/lib/manim-compiler';

const ANIMATION_METADATA = JSON.stringify({ kind: 'animation' });
// A worker can disappear after claiming a row. Without a durable watchdog the
// UI would then poll a permanent generating/queued state forever. This TTL is
// deliberately longer than the normal AI + renderer budget, so it only
// reclaims work that has almost certainly lost its owner.
const STALE_ANIMATION_TTL_MS = 30 * 60_000;
const MAX_ANIMATION_VERSIONS = 20;
const MAX_ANIMATION_MESSAGES = 200;
const MAX_ANIMATIONS_PER_USER = 200;
// This budget is shared by planning, schema correction, an independent math
// audit, at most three specification rebuilds, provider retries, and Auto
// fallbacks. It remains one absolute deadline instead of multiplying a timeout
// per call, but gives the audited v5 pipeline enough room to finish.
export const ANIMATION_STAGE_TIMEOUT_MS = 300_000;
const MAX_SPEC_SCHEMA_REPAIRS = 2;
const MAX_MATH_SPEC_REPAIRS = 3;

export function animationStageDeadlineAt(now = Date.now()) {
  return now + ANIMATION_STAGE_TIMEOUT_MS;
}

interface StoredAnimationParts extends AnimationParts {
  operation?: {
    id: string;
    stage: 'spec' | 'code';
  };
  renderRepair?: {
    regenerateCode: boolean;
    context?: string;
  };
  renderCallback?: {
    id: string;
    jobId: string;
    status: 'rendering' | 'completed' | 'failed';
  };
  qualityControl?: AnimationQualityControlState;
}

const SPEC_SYSTEM_PROMPT = `You are CurvG's mathematical animation director. Convert the user's request into CurvG's strict v5 intermediate representation. You never write Python.

Return valid JSON only with this shape:
{
  "schemaVersion": 5,
  "title": "short title",
  "summary": "what the animation proves or explains",
  "durationSeconds": 20,
  "assumptions": ["mathematical assumptions"],
  "intent": {
    "learningGoal": "one precise capability the viewer gains",
    "hook": "the visible question or surprise in the first shot",
    "takeaway": "the compact idea the final frame should leave"
  },
  "direction": {
    "preset": "clean-classroom|cinematic-math|geometric-proof|data-story",
    "frame": "16:9|9:16",
    "pacing": "calm|balanced|energetic",
    "textPolicy": { "maxWordsPerObject": 8, "maxSimultaneousText": 2 }
  },
  "cinematography": {
    "scene": "static|moving-camera",
    "emphasis": "clean|spotlight|term-tour"
  },
  "knowledgeMap": [{
    "id": "concept identifier",
    "concept": "one prerequisite or target concept",
    "dependsOn": ["ids of prerequisite knowledge nodes"],
    "misconception": "a concrete misconception this concept must avoid"
  }],
  "curriculum": [{
    "id": "ordered teaching beat identifier",
    "learningJob": "what the viewer learns in this beat",
    "dependsOn": ["knowledge node ids or earlier curriculum beat ids"],
    "visualEvidence": "what must visibly happen to establish the learning job",
    "notationBudget": 2
  }],
  "mathDossier": {
    "coreClaim": "the exact mathematical statement the animation establishes",
    "invariants": ["facts that must remain true throughout every shot"],
    "commonMisreading": "the most likely conceptual mistake to prevent",
    "visualProof": "how visible motion or geometry proves the claim without prose",
    "definitions": [{"concept": "symbol or concept", "statement": "exact definition and domain"}],
    "derivationSteps": ["ordered, checkable step", "next justified step"],
    "checks": [{"claim": "claim to verify", "method": "substitution, differentiation, limiting case, or other check", "expected": "exact expected result"}],
    "limitations": ["scope limits or exceptional cases"]
  },
  "style": {
    "background": "#0B0D14",
    "palette": ["#7C8CFF", "#62D9C3"],
    "camera": "Fixed 16:9 frame"
  },
  "objects": [{
    "id": "axes",
    "kind": "axes|curve|area|formula|text|series|matrix|circle|point|line|arrow|arc",
    "region": "title|formula|graph",
    "importance": "hero|supporting|context",
    "label": "optional plain text",
    "expr": "safe math expression for curves, full LaTeX for formulas",
    "parts": [{
      "id": "semantic term id such as delta_x",
      "latex": "one independently renderable LaTeX chunk",
      "meaning": "what this term means in the explanation",
      "color": "#F4A261"
    }],
    "domain": [-6, 6],
    "color": "#7C8CFF",
    "values": [[1, 0], [0, 1]],
    "position": [1, 0],
    "center": [0, 0],
    "start": [0, 0],
    "end": [1, 0],
    "radius": 1,
    "startAngle": 0,
    "sweepAngle": 1.5708
  }],
  "timeline": [{
    "id": "draw-axes",
    "shotId": "hook",
    "at": 0,
    "op": "draw|write|fade_in|fade_out|transform|emphasize|spotlight|glow|camera_focus|camera_reset|move_along|hold",
    "ref": "axes",
    "targetRef": "only for transform",
    "pathRef": "circle, curve, arc or line id; required only for move_along",
    "partId": "optional formula part id for emphasize, spotlight, glow or camera_focus",
    "zoom": 1.8,
    "runTime": 1.5,
    "ease": "linear|smooth|there_and_back"
  }],
  "shots": [{
    "id": "hook",
    "beat": "hook|setup|mechanism|proof|payoff|memory",
    "purpose": "what changes visually and why it teaches the idea",
    "startAt": 0,
    "endAt": 4,
    "focusRef": "a valid object id",
    "transition": "build|morph|emphasis|hold",
    "acceptance": ["observable visual condition for this shot"]
  }],
  "layout": { "regions": "single|left|right|top|bottom", "title": "optional" },
  "dependencies": ["required Manim, LaTeX or font capabilities"],
  "notes": ["mathematical invariants"]
}

Preserve mathematical correctness and state assumptions instead of inventing facts. First build the dependency-ordered knowledgeMap, then the curriculum, then complete the mathDossier with definitions, an explicit derivation, and independent checks before committing to the visual sequence. Every curriculum dependency must refer to a knowledge node or an earlier beat. The shots must establish coreClaim, preserve every invariant, explicitly avoid commonMisreading, and realize visualProof. Build the explanation around one visible hero object. Use 3-6 non-overlapping shots: the first must be a hook beginning at 0, and the last must be payoff or memory ending exactly at durationSeconds. Every timeline event must name its shotId and stay inside that shot. Prefer motion, geometry, formulas, counters, and transformations over explanatory sentences. Keep text objects within textPolicy and never plan more than two simultaneous text/formula objects. Include one obvious visual change before the midpoint and a visually distinct payoff in the final third.

Every entity required by visualProof or a shot acceptance condition must exist as an explicit object and appear in the timeline. Use circle, point, line, arrow and arc for geometric evidence instead of hiding geometry in labels or prose. circle requires center and radius; point requires position; line and arrow require start and end; arc requires center, radius, startAngle and non-zero sweepAngle. All coordinates are mathematical graph coordinates and these primitives use region graph. Use move_along with pathRef only when a point must visibly travel along a circle, curve, arc or line; ref must be the point and pathRef must be its path. Never apply move_along to a projection line or connector: declare that line as an explicit object and require it to remain synchronized with the moving endpoints in visualProof and the mechanism shot acceptance. The scene composer owns that dynamic binding. For a projection argument, explicitly include the source point, the projection/connector line, the target curve or axis, and any angle arc needed to define the parameter.

Treat the camera as a teaching tool, not decoration. Choose moving-camera only when a local term, curve feature, or proof step benefits from a 1.4-2.4x focus. Pair the final camera_focus with camera_reset before the payoff. Use at most two camera_focus events in a short animation. Use spotlight or glow for brief evidence, never as a persistent effect. If emphasis is term-tour, include addressable formula parts and at least one camera_focus that names partId.

For formulas with multiple meaningful terms, always provide 2-8 parts as separate MathTex arguments. Each latex chunk must compile independently and concatenate into the intended formula. Reuse the same part id and color for the same mathematical role across formulas. Use ivory for neutral symbols and reserve coral, blue, teal, or gold for semantically important terms. The animation should remain understandable when prose text is hidden: formulas, geometry, motion, and color must carry the explanation.

Object IDs, shot IDs, and timeline IDs must be unique. Formula part IDs must be unique inside their formula. Curves use x and only these functions: sin, cos, tan, asin, acos, atan, sqrt, abs, exp, log, ln, sinh, cosh, tanh. Timeline events that should run concurrently must use exactly the same at value. After grouping equal at values and sorting the groups, every next group must satisfy next.at >= current.at + max(current group runTime); never stagger a new event before the current group finishes. Every event must end at or before durationSeconds and remain inside its declared shot. zoom is only valid for camera_focus. Camera operations require moving-camera. Include an axes object whenever a curve or area is present. Portrait scenes cannot use left|right layout. Layout declares only semantic regions; the compiler owns all coordinates, scaling, and safe zones. Keep internal reasoning brief and begin the final JSON as soon as the requirements are understood. Do not return Python, prose fields, Markdown, or any schemaVersion other than 5.`;

const MATH_REVIEW_SYSTEM_PROMPT = `You are CurvG's independent mathematical reviewer. Audit a proposed animation specification skeptically before any code is generated.

Verify the exact core claim, definitions and domains, every derivation step, formulas and plotted expressions, invariants, limiting or special cases, and whether each proposed visual actually proves rather than merely suggests its claim. Use the declared checks and independently recompute enough of them to expose contradictions. When a claim depends on a parameter varying over time, require an explicit timeline action that varies it; one static sample cannot establish a statement about motion, tracing, projection across a domain, or "for every" parameter value. In this IR, a point move_along event plus explicit connector/target objects and a mechanism-shot acceptance condition requiring synchronized endpoints is the declarative contract for a dynamic projection. Do not ask a line to move_along a fixed segment; the scene composer realizes the declared synchronization with per-frame geometry. Do not review aesthetics and do not repair the specification yourself.

Return JSON only:
{
  "status": "approved|needs_revision",
  "summary": "evidence-grounded verdict",
  "checkedClaims": ["specific claims independently checked"],
  "issues": [{
    "severity": "major|blocking",
    "claim": "the affected claim",
    "problem": "the exact contradiction, missing condition, or invalid step",
    "correction": "the mathematically correct replacement or required condition"
  }]
}

Approve only when no mathematical issue remains. If the request is ambiguous, require explicit assumptions instead of inventing certainty. Ambiguity alone is not a mathematical error when the specification states a conventional, coherent interpretation in its assumptions and limitations and keeps every claim consistent with that scope.`;

const CODE_SYSTEM_PROMPT = `You are CurvG's scene composer. Produce one complete, cinematic, teachable Manim Community Edition 0.20 scene from an approved mathematical specification.

Return Python source only. The source must import from manim, may import numpy or math, and must define exactly one class named CurvGScene whose single base is Scene, MovingCameraScene, or ThreeDScene. Do not use files, network, subprocesses, shell commands, eval, exec, dynamic imports, external assets, custom fonts, or add_updater. Every self.play call must have an explicit positive run_time.

Follow this production contract:
1. Reason backward from the viewer's learning goal and use the approved math dossier as the source of truth. Never change assumptions, constants, formulas, or the proof direction.
2. Build a visual argument, not a slide deck. Geometry, transformation, camera movement, and consistent semantic color must carry the explanation. Keep prose sparse.
3. Put the hero object or mathematical question on screen immediately and start meaningful motion within the first second. Do not open with a static title card.
4. Introduce plain-language meaning before dense notation. Build MathTex from multiple arguments when terms need independent color or emphasis.
5. Treat the camera as the narrator. Use MovingCameraScene camera.frame for focused 2D term tours. Use ThreeDScene move_camera and a top-down stage that tilts into true 3D only when depth proves something. Never animate self.camera directly.
6. For a term tour, dim context, emphasize the exact term, move the camera into it, then restore the whole formula before the payoff.
7. Use one house palette consistently: near-black #0c0c0b, ivory #faf9f5, coral #d97757, blue #6a9bcc, olive #788c5d, gold #d4a27f, secondary gray #b0aea5, unless the approved direction explicitly overrides it.
8. Keep at most two text/formula blocks visible together. Use safe margins, strong contrast, generous whitespace, readable phone-scale type, and one dominant motion per beat.
9. Preserve object continuity across transformations. Prefer TransformMatchingTex, ReplacementTransform, traced geometry, filled regions, comparison arrows, or camera reveals to clearing and rebuilding the whole frame.
10. Make the final third visibly different from the setup and end on a clean mathematical payoff that can hold without extra explanation.
11. Prebuild MathTex, Tex, and Text objects outside frame callbacks. ValueTracker and always_redraw are allowed, but never construct or mutate text per frame.
12. Keep the scene self-contained and renderable with Manim CE and TeX Live. Use only documented Manim APIs. Never pass substring_sieve_map to MathTex; construct separate arguments and color indexed parts after construction.
13. Treat every move_along timeline event as mandatory visible motion, not a suggestion. When it proves a projection or traced relationship, synchronize the source point, connector, derived point, and revealed locus throughout the motion with ValueTracker/always_redraw or an equivalent documented mechanism; a single static endpoint is not a valid substitute.

The wrapper owns validation, rendering, evidence extraction, and repair. Do not print explanations or wrap the code in Markdown.`;

export interface AnimationGenerationHooks {
  onStarted?: (animation: AnimationDetail) => void;
  onPhase?: (phase: AnimationPlanningPhase) => void;
  onSummaryDelta?: (delta: string) => void;
}

function partialJsonStringField(source: string, field: string): string {
  const match = new RegExp(`"${field}"\\s*:\\s*"`).exec(source);
  if (!match) return '';
  let output = '';
  for (let index = match.index + match[0].length; index < source.length; ) {
    const character = source[index];
    if (character === '"') break;
    if (character !== '\\') {
      output += character;
      index += 1;
      continue;
    }
    const escape = source[index + 1];
    if (!escape) break;
    if (escape === 'u') {
      const code = source.slice(index + 2, index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(code)) break;
      output += String.fromCharCode(Number.parseInt(code, 16));
      index += 6;
      continue;
    }
    const escapes: Record<string, string> = {
      '"': '"',
      '\\': '\\',
      '/': '/',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
    };
    output += escapes[escape] ?? escape;
    index += 2;
  }
  return output;
}

async function reviewAnimationMathematics(params: {
  provider: ChatProvider;
  model: string;
  prompt: string;
  spec: AnimationSpec;
  signal?: AbortSignal;
  deadlineAt?: number;
}): Promise<AnimationMathReview> {
  const input = {
    model: params.model,
    messages: [
      { role: 'system' as const, content: MATH_REVIEW_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: `ORIGINAL REQUEST:\n${params.prompt}\n\nPROPOSED SPECIFICATION:\n${JSON.stringify(params.spec)}`,
      },
    ],
    temperature: 0,
    maxTokens: 3_000,
    reasoningEffort: getAnimationReasoningEffort(params.model),
    signal: params.signal,
    deadlineAt: params.deadlineAt,
  };
  let result = await params.provider.complete(input);
  try {
    return parseAnimationMathReview(result.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid output';
    result = await params.provider.complete({
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: result.content },
        {
          role: 'user',
          content: `Your audit response failed validation: ${reason}. Return the same skeptical mathematical verdict as one valid JSON object with every required field. Do not approve an unresolved issue.`,
        },
      ],
      temperature: 0,
    });
    return parseAnimationMathReview(result.content);
  }
}

class AnimationMathAuditError extends Error {
  constructor(readonly review: AnimationMathReview) {
    super(`Mathematical audit still requires revision: ${review.summary}`);
    this.name = 'AnimationMathAuditError';
  }
}

export async function parseAnimationSpecWithRepairs(params: {
  provider: ChatProvider;
  input: ChatCompletionInput;
  result: ChatCompletionResult;
}): Promise<{ result: ChatCompletionResult; spec: AnimationSpec }> {
  let result = params.result;
  let lastError: unknown;
  for (
    let repairAttempt = 0;
    repairAttempt <= MAX_SPEC_SCHEMA_REPAIRS;
    repairAttempt += 1
  ) {
    try {
      return { result, spec: parseAnimationSpec(result.content) };
    } catch (error) {
      lastError = error;
      if (repairAttempt === MAX_SPEC_SCHEMA_REPAIRS) break;
      const reason = error instanceof Error ? error.message : 'invalid output';
      result = await params.provider.complete({
        ...params.input,
        messages: [
          ...params.input.messages,
          { role: 'assistant', content: result.content },
          {
            role: 'user',
            content: `The previous specification failed application validation (schema repair ${repairAttempt + 1} of ${MAX_SPEC_SCHEMA_REPAIRS}):\n${reason}\n\nReturn one complete corrected schemaVersion 5 JSON object only. Preserve the approved mathematical meaning and include every required field. Treat every validator issue as mandatory. For the timeline, events that run concurrently must have exactly the same at value; after grouping equal starts and sorting the groups, enforce next.at >= current.at + max(current group runTime), keep each event inside its shot, and keep the final event within durationSeconds.`,
          },
        ],
        temperature: 0,
      });
    }
  }
  throw lastError;
}

export async function generateAnimationSpec(params: {
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
}) {
  params.onPhase?.('understanding');
  const input = {
    model: params.model,
    messages: [
      { role: 'system' as const, content: SPEC_SYSTEM_PROMPT },
      ...(params.history || []),
      {
        role: 'user' as const,
        content: specPrompt({
          prompt: params.prompt,
          subject: params.subject,
          currentSpec: params.currentSpec,
        }),
      },
    ],
    temperature: 0.15,
    maxTokens: 9_000,
    reasoningEffort: getAnimationReasoningEffort(params.model),
    signal: params.signal,
    deadlineAt: params.deadlineAt,
  };
  let streamedContent = '';
  let streamedSummary = '';
  let structureStarted = false;
  let result =
    params.onSummaryDelta && params.provider.stream
      ? await params.provider.stream(input, (delta) => {
          if (!structureStarted) {
            structureStarted = true;
            params.onPhase?.('structuring');
          }
          streamedContent += delta;
          const nextSummary = partialJsonStringField(
            streamedContent,
            'summary'
          );
          if (
            nextSummary.length > streamedSummary.length &&
            nextSummary.startsWith(streamedSummary)
          ) {
            params.onSummaryDelta?.(nextSummary.slice(streamedSummary.length));
            streamedSummary = nextSummary;
          }
        })
      : await params.provider.complete(input);
  if (!structureStarted) params.onPhase?.('structuring');
  const parsedInitialSpec = await parseAnimationSpecWithRepairs({
    provider: params.provider,
    input,
    result,
  });
  result = parsedInitialSpec.result;
  let spec = parsedInitialSpec.spec;
  params.onPhase?.('auditing');
  let mathReview = await reviewAnimationMathematics({
    provider: params.provider,
    model: params.model,
    prompt: params.prompt,
    spec,
    signal: params.signal,
    deadlineAt: params.deadlineAt,
  });
  for (
    let repairAttempt = 1;
    repairAttempt <= MAX_MATH_SPEC_REPAIRS &&
    !isAnimationMathReviewApproved(mathReview);
    repairAttempt += 1
  ) {
    params.onPhase?.('structuring');
    const repairInput: ChatCompletionInput = {
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: JSON.stringify(spec) },
        {
          role: 'user',
          content: `An independent mathematical audit rejected the specification (repair ${repairAttempt} of ${MAX_MATH_SPEC_REPAIRS}):\n${JSON.stringify(mathReview)}\n\nRebuild and return the complete corrected schemaVersion 5 JSON specification. Treat every audit issue as a mandatory acceptance criterion and correct it at the specification level instead of merely rephrasing it. Every visible entity required by the audit must be an explicit object with timeline evidence; use circle, point, line, arrow and arc geometry plus move_along/pathRef when appropriate. Do not claim an issue is fixed only in summary, visualProof, purpose, acceptance or notes. When the original request is underspecified, choose one conventional mathematical interpretation, state it explicitly in assumptions and limitations, narrow coreClaim to that scope, and keep every definition, derivation, check, shot, object and timeline event consistent with it. Preserve the user's intent and include every required field.`,
        },
      ],
      temperature: 0,
    };
    result = await params.provider.complete(repairInput);
    ({ result, spec } = await parseAnimationSpecWithRepairs({
      provider: params.provider,
      input: repairInput,
      result,
    }));
    params.onPhase?.('auditing');
    mathReview = await reviewAnimationMathematics({
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      spec,
      signal: params.signal,
      deadlineAt: params.deadlineAt,
    });
  }
  if (!isAnimationMathReviewApproved(mathReview)) {
    throw new AnimationMathAuditError(mathReview);
  }
  params.onPhase?.('finalizing');
  if (params.onSummaryDelta) {
    const remaining = spec.summary.startsWith(streamedSummary)
      ? spec.summary.slice(streamedSummary.length)
      : streamedSummary
        ? ''
        : spec.summary;
    if (remaining) params.onSummaryDelta(remaining);
  }
  return { result, spec };
}

function codeCompositionPrompt(params: {
  prompt: string;
  spec: AnimationSpec;
  currentCode?: string;
  repairEvidence?: string;
}) {
  const repair = params.currentCode
    ? `\n\nEXISTING SCENE TO REPAIR:\n${params.currentCode}\n\nREPAIR EVIDENCE:\n${(
        params.repairEvidence ||
        'Improve the scene without changing correct work.'
      ).slice(0, 8_000)}`
    : '';
  return `ORIGINAL USER REQUEST:\n${params.prompt}\n\nAPPROVED SPECIFICATION:\n${JSON.stringify(
    params.spec
  )}${repair}\n\nWrite the complete final Python scene now. Preserve correct work and change only what the specification or repair evidence requires.`;
}

async function requestAnimationCodeCompletion(
  provider: ChatProvider,
  input: ChatCompletionInput
): Promise<ChatCompletionResult> {
  // Gemini 3.6 can complete a long reasoning turn successfully while its
  // non-stream response exposes an empty final code field. The Kie streaming
  // adapter already separates reasoning from final output and accumulates the
  // complete answer, so use it for this model's large Python modules.
  if (input.model.toLowerCase() === 'gemini-3.6-flash' && provider.stream) {
    return provider.stream(input, () => {});
  }
  return provider.complete(input);
}

export async function composeAnimationCode(params: {
  provider: ChatProvider;
  model: string;
  prompt: string;
  spec: AnimationSpec;
  currentCode?: string;
  repairEvidence?: string;
  signal?: AbortSignal;
}) {
  const input = {
    model: params.model,
    messages: [
      { role: 'system' as const, content: CODE_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: codeCompositionPrompt(params),
      },
    ],
    temperature: params.currentCode ? 0 : 0.08,
    maxTokens: 14_000,
    signal: params.signal,
    deadlineAt: animationStageDeadlineAt(),
  };
  let result = await requestAnimationCodeCompletion(params.provider, input);
  let code: string;
  try {
    code = parseManimCode(result.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid output';
    result = await requestAnimationCodeCompletion(params.provider, {
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant' as const, content: result.content },
        {
          role: 'user' as const,
          content: `The previous scene failed the application-side source contract: ${reason}. Return one corrected complete Python module only. Preserve the approved mathematics and the requested visual repair.`,
        },
      ],
      temperature: 0,
    });
    try {
      code = parseManimCode(result.content);
    } catch (correctionError) {
      // A valid, independently audited specification is still executable even
      // when the model returns an empty or malformed code envelope twice. Only
      // use this fallback for initial composition; a visual-quality repair must
      // not silently replace an already-rendered scene with a generic compile.
      if (params.currentCode) throw correctionError;
      code = compileAnimationSpec(params.spec);
    }
  }
  return { result, code };
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isoDate(value: Date | string | number): string {
  return new Date(value).toISOString();
}

function initialParts(
  prompt: string,
  subject: AnimationSubject,
  modelSelection?: AnimationModelSelection,
  source?: {
    creationMode?: AnimationCreationMode;
    mathObjectType?: AnimationMathObjectType;
    sourceFormula?: string;
    templateId?: string;
  }
): StoredAnimationParts {
  return { subject, prompt, modelSelection, versions: [], ...source };
}

function animationParts(row: Chat): StoredAnimationParts {
  return parseJson(
    row.parts,
    initialParts(row.content || '', 'general' as AnimationSubject)
  );
}

function publicAnimationParts(parts: StoredAnimationParts): AnimationParts {
  const {
    operation: _operation,
    renderRepair: _renderRepair,
    renderCallback: _renderCallback,
    qualityControl: _qualityControl,
    ...publicParts
  } = parts;
  return publicParts;
}

export class AnimationConflictError extends Error {
  readonly status = 409;

  constructor() {
    super('Animation is already processing');
    this.name = 'AnimationConflictError';
  }
}

async function claimAnimationOperation(params: {
  row: Chat;
  parts: StoredAnimationParts;
  status: 'generating_spec' | 'generating_code';
  stage: 'spec' | 'code';
  provider: string;
  model: string;
  content?: string;
  subject?: AnimationSubject;
}) {
  const operationId = getUuid();
  const claimedParts: StoredAnimationParts = {
    ...params.parts,
    operation: { id: operationId, stage: params.stage },
  };
  await db()
    .update(chat)
    .set({
      status: params.status,
      provider: params.provider,
      model: params.model,
      content: params.content,
      subject: params.subject,
      parts: JSON.stringify(claimedParts),
    })
    .where(
      and(
        eq(chat.id, params.row.id),
        eq(chat.userId, params.row.userId),
        eq(chat.metadata, ANIMATION_METADATA),
        eq(chat.status, params.row.status)
      )
    );
  const claimedRow = await ownedRow(params.row.userId, params.row.id);
  if (animationParts(claimedRow).operation?.id !== operationId) {
    throw new AnimationConflictError();
  }
  return { row: claimedRow, parts: claimedParts };
}

function messageContent(parts: string): string {
  const parsed = parseJson<unknown>(parts, parts);
  if (typeof parsed === 'string') return parsed;
  if (parsed && typeof parsed === 'object') {
    const content = (parsed as Record<string, unknown>).content;
    if (typeof content === 'string') return content;
  }
  return '';
}

function toSummary(row: Chat): AnimationSummary {
  const parts = animationParts(row);
  return {
    id: row.id,
    title: row.title || parts.spec?.title || parts.prompt.slice(0, 80),
    status: row.status as AnimationStatus,
    model: row.model,
    provider: row.provider,
    subject: parts.subject,
    prompt: parts.prompt,
    videoUrl: parts.videoUrl,
    thumbnailUrl: parts.thumbnailUrl,
    contactSheetUrl: parts.contactSheetUrl,
    qaReportUrl: parts.qaReportUrl,
    createdAt: isoDate(row.createdAt),
    updatedAt: isoDate(row.updatedAt),
  };
}

function toMessage(row: typeof chatMessage.$inferSelect): AnimationMessage {
  return {
    id: row.id,
    role: row.role as AnimationMessage['role'],
    content: messageContent(row.parts),
    status: row.status,
    createdAt: isoDate(row.createdAt),
    metadata: parseJson<Record<string, unknown> | undefined>(
      row.metadata,
      undefined
    ),
  };
}

async function ownedRow(userId: string, id: string): Promise<Chat> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.id, id),
        eq(chat.userId, userId),
        eq(chat.metadata, ANIMATION_METADATA)
      )
    )
    .limit(1);
  if (!row || row.status === 'deleted') throw new Error('Animation not found');
  return reclaimStaleAnimation(row);
}

function isRecoverableStaleStatus(status: string) {
  return ['generating_spec', 'generating_code', 'queued', 'rendering'].includes(
    status
  );
}

async function reclaimStaleAnimation(row: Chat): Promise<Chat> {
  if (
    !isRecoverableStaleStatus(row.status) ||
    Date.now() - row.updatedAt.getTime() < STALE_ANIMATION_TTL_MS
  ) {
    return row;
  }

  const parts = animationParts(row);
  const stage: AnimationFailureStage =
    row.status === 'generating_spec'
      ? 'spec'
      : row.status === 'generating_code'
        ? 'code'
        : 'render';
  const failure: AnimationFailure = {
    stage,
    code: 'UPSTREAM_TIMEOUT',
    message:
      stage === 'render'
        ? 'The render job stopped responding. Retry to submit it again.'
        : 'The generation worker stopped responding. Retry this step.',
    retryable: true,
  };
  const { operation: _operation, ...withoutOperation } = parts;
  const nextParts: StoredAnimationParts = {
    ...withoutOperation,
    error: failure.message,
    failure,
    renderRepair:
      stage === 'render'
        ? { regenerateCode: false, context: 'stale render job' }
        : undefined,
  };
  await db()
    .update(chat)
    .set({ status: 'failed', parts: JSON.stringify(nextParts) })
    .where(
      and(
        eq(chat.id, row.id),
        eq(chat.status, row.status),
        eq(chat.updatedAt, row.updatedAt)
      )
    );
  const [fresh] = await db()
    .select()
    .from(chat)
    .where(eq(chat.id, row.id))
    .limit(1);
  return fresh && fresh.status !== 'deleted' ? fresh : row;
}

async function insertMessage(params: {
  userId: string;
  chatId: string;
  role: AnimationMessage['role'];
  content: string;
  model: string;
  provider: string;
  status?: string;
  metadata?: Record<string, unknown>;
}) {
  const [row] = await db()
    .insert(chatMessage)
    .values({
      id: getUuid(),
      userId: params.userId,
      chatId: params.chatId,
      status: params.status || 'completed',
      role: params.role,
      parts: JSON.stringify({ type: 'text', content: params.content }),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      model: params.model,
      provider: params.provider,
    })
    .returning();
  return row;
}

async function ensureRenderCompletedMessage(params: {
  userId: string;
  chatId: string;
  jobId: string;
  model: string;
  provider: string;
}) {
  const id = `RMSG_${md5(`${params.chatId}:${params.jobId}:completed`)}`;
  try {
    await db()
      .insert(chatMessage)
      .values({
        id,
        userId: params.userId,
        chatId: params.chatId,
        status: 'completed',
        role: 'assistant',
        parts: JSON.stringify({
          type: 'text',
          content: 'The animation has finished rendering.',
        }),
        metadata: JSON.stringify({ kind: 'render_completed' }),
        model: params.model,
        provider: params.provider,
      });
  } catch (error) {
    const [existing] = await db()
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .where(eq(chatMessage.id, id))
      .limit(1);
    if (!existing) throw error;
  }
}

const chatFailureCodes: Record<
  ChatProviderError['code'],
  AnimationFailure['code']
> = {
  upstream_saturated: 'UPSTREAM_SATURATED',
  upstream_timeout: 'UPSTREAM_TIMEOUT',
  upstream_unavailable: 'UPSTREAM_UNAVAILABLE',
  model_unavailable: 'UPSTREAM_UNAVAILABLE',
  upstream_auth: 'UPSTREAM_AUTH',
  upstream_quota: 'UPSTREAM_QUOTA',
  invalid_response: 'INVALID_OUTPUT',
  empty_response: 'INVALID_OUTPUT',
  stream_interrupted: 'STREAM_INTERRUPTED',
  unknown: 'UNKNOWN',
};

const failureMessages: Record<AnimationFailure['code'], string> = {
  UPSTREAM_SATURATED:
    'The selected AI model is at capacity. Please retry shortly.',
  UPSTREAM_TIMEOUT: 'The AI model timed out before finishing. Please retry.',
  UPSTREAM_UNAVAILABLE: 'The AI provider is temporarily unavailable.',
  UPSTREAM_AUTH: 'The AI provider configuration needs attention.',
  UPSTREAM_QUOTA: 'The AI provider quota is currently exhausted.',
  INVALID_OUTPUT:
    'The AI model returned an invalid result. Retry or choose another model.',
  STREAM_INTERRUPTED: 'The AI response was interrupted. Please retry.',
  RENDER_FAILED: 'The video renderer could not finish this scene.',
  PRO_REQUIRED: 'Your current plan does not include this model.',
  INSUFFICIENT_CREDITS: 'There are not enough credits to render this video.',
  BUSY: 'Animation generation is busy. Please retry shortly.',
  UNKNOWN: 'CurvG could not finish this step.',
};

function animationFailure(
  error: unknown,
  stage: AnimationFailureStage
): AnimationFailure {
  if (error instanceof AnimationGenerationError) return error.failure;
  if (error instanceof AnimationMathAuditError) {
    return {
      stage,
      code: 'INVALID_OUTPUT',
      message: failureMessages.INVALID_OUTPUT,
      retryable: true,
    };
  }
  if (error instanceof ChatProviderError) {
    const code = chatFailureCodes[error.code];
    return {
      stage,
      code,
      message: failureMessages[code],
      retryable: error.retryable && !error.partialOutput,
      requestId: error.requestId,
    };
  }
  if (stage === 'render') {
    return {
      stage,
      code: 'RENDER_FAILED',
      message: failureMessages.RENDER_FAILED,
      retryable: true,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  const invalidOutput = /invalid|json|schema|validation|python|code/i.test(
    message
  );
  const code: AnimationFailure['code'] = invalidOutput
    ? 'INVALID_OUTPUT'
    : 'UNKNOWN';
  return {
    stage,
    code,
    message: failureMessages[code],
    retryable: invalidOutput,
  };
}

export class AnimationGenerationError extends Error {
  constructor(
    readonly failure: AnimationFailure,
    cause?: unknown
  ) {
    super(failure.message, cause === undefined ? undefined : { cause });
    this.name = 'AnimationGenerationError';
  }
}

export function renderFailureRequiresCodeRegeneration(error?: string) {
  return (
    !!error &&
    /(?:traceback|syntaxerror|nameerror|typeerror|valueerror|attributeerror|importerror|modulenotfound|latex|tex\s+error|manim|python|compile|validation)/i.test(
      error
    )
  );
}

async function setFailure(
  row: Chat,
  parts: StoredAnimationParts,
  error: unknown,
  stage: AnimationFailureStage,
  expectedStatus: 'generating_spec' | 'generating_code' = stage === 'spec'
    ? 'generating_spec'
    : 'generating_code'
) {
  const failure = animationFailure(error, stage);
  const upstream = error instanceof ChatProviderError ? error : undefined;
  const diagnostic = (error instanceof Error ? error.message : String(error))
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 1_000);
  const { operation: _operation, ...failedParts } = parts;
  console.error('[animation-generation] failed', {
    animationId: row.id,
    userId: row.userId,
    stage,
    code: failure.code,
    retryable: failure.retryable,
    requestId: failure.requestId,
    provider: upstream?.provider || row.provider,
    model: upstream?.model || row.model,
    status: upstream?.status,
    error: diagnostic,
  });
  await db()
    .update(chat)
    .set({
      status: 'failed',
      provider: upstream?.provider || row.provider,
      model: upstream?.model || row.model,
      parts: JSON.stringify({
        ...failedParts,
        error: failure.message,
        failure,
        renderRepair:
          stage === 'render'
            ? {
                regenerateCode:
                  renderFailureRequiresCodeRegeneration(diagnostic),
                context: diagnostic,
              }
            : undefined,
      }),
    })
    .where(and(eq(chat.id, row.id), eq(chat.status, expectedStatus)));
  return failure;
}

export async function markAnimationProductionFailure(params: {
  userId: string;
  id: string;
  error: unknown;
}): Promise<void> {
  const row = await ownedRow(params.userId, params.id);
  if (row.status !== 'awaiting_approval') return;
  const parts = animationParts(row);
  const diagnostic = (
    params.error instanceof Error ? params.error.message : String(params.error)
  )
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 500);
  const code: AnimationFailure['code'] = /insufficient credits/i.test(
    diagnostic
  )
    ? 'INSUFFICIENT_CREDITS'
    : /busy|capacity/i.test(diagnostic)
      ? 'BUSY'
      : 'RENDER_FAILED';
  const failure: AnimationFailure = {
    stage: 'render',
    code,
    message: failureMessages[code],
    retryable: true,
  };
  await db()
    .update(chat)
    .set({
      status: 'failed',
      parts: JSON.stringify({
        ...parts,
        error: failure.message,
        failure,
        renderRepair: { regenerateCode: false, context: diagnostic },
      }),
    })
    .where(and(eq(chat.id, row.id), eq(chat.status, 'awaiting_approval')));
}

async function conversation(chatId: string): Promise<ChatTurn[]> {
  const rows = await db()
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.chatId, chatId))
    .orderBy(asc(chatMessage.createdAt));
  return rows
    .filter(
      (row: typeof chatMessage.$inferSelect) =>
        row.role === 'user' || row.role === 'assistant'
    )
    .slice(-16)
    .map((row: typeof chatMessage.$inferSelect) => ({
      role: row.role as 'user' | 'assistant',
      content: messageContent(row.parts),
    }));
}

function specPrompt(params: {
  prompt: string;
  subject: AnimationSubject;
  currentSpec?: AnimationSpec;
}): string {
  return [
    `Subject: ${params.subject}`,
    params.currentSpec
      ? `Current approved specification:\n${JSON.stringify(params.currentSpec)}`
      : '',
    `User request: ${params.prompt}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function snapshot(parts: AnimationParts): AnimationVersion | null {
  if (!parts.spec && !parts.code && !parts.videoUrl) return null;
  return {
    version: parts.versions.length + 1,
    createdAt: new Date().toISOString(),
    prompt: parts.prompt,
    spec: parts.spec,
    code: parts.code,
    videoUrl: parts.videoUrl,
    thumbnailUrl: parts.thumbnailUrl,
    contactSheetUrl: parts.contactSheetUrl,
    qaReportUrl: parts.qaReportUrl,
    visualQa: parts.visualQa,
    visualReview: parts.visualReview,
  };
}

export async function listAnimations(
  userId: string
): Promise<AnimationSummary[]> {
  const rows = await db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.userId, userId),
        eq(chat.metadata, ANIMATION_METADATA),
        ne(chat.status, 'deleted')
      )
    )
    .orderBy(desc(chat.updatedAt))
    .limit(MAX_ANIMATIONS_PER_USER);
  const recovered = await Promise.all(rows.map(reclaimStaleAnimation));
  return recovered.map(toSummary);
}

export async function getAnimation(
  userId: string,
  id: string
): Promise<AnimationDetail> {
  const row = await ownedRow(userId, id);
  const messages = await db()
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.chatId, id))
    .orderBy(desc(chatMessage.createdAt))
    .limit(MAX_ANIMATION_MESSAGES);
  return {
    ...toSummary(row),
    parts: publicAnimationParts(animationParts(row)),
    messages: messages.reverse().map(toMessage),
  };
}

export async function renameAnimation(params: {
  userId: string;
  id: string;
  title: string;
}): Promise<AnimationDetail> {
  const title = params.title.replace(/\s+/g, ' ').trim();
  if (!title) throw new Error('Title is required');
  if (Array.from(title).length > 160) {
    throw new Error('Title must be 160 characters or fewer');
  }

  const row = await ownedRow(params.userId, params.id);
  await db().update(chat).set({ title }).where(eq(chat.id, row.id));
  return getAnimation(params.userId, params.id);
}

export async function createAnimation(params: {
  userId: string;
  prompt: string;
  subject: AnimationSubject;
  creationMode?: Exclude<AnimationCreationMode, 'template'>;
  mathObjectType?: AnimationMathObjectType;
  sourceFormula?: string;
  modelSelection: AnimationModelSelection;
  provider: ChatProvider;
  model: string;
  signal?: AbortSignal;
  hooks?: AnimationGenerationHooks;
}): Promise<AnimationDetail> {
  const id = getUuid();
  const parts = initialParts(
    params.prompt,
    params.subject,
    params.modelSelection,
    {
      creationMode: params.creationMode || 'description',
      mathObjectType: params.mathObjectType,
      sourceFormula: params.sourceFormula,
    }
  );
  const [row] = await db()
    .insert(chat)
    .values({
      id,
      userId: params.userId,
      status: 'generating_spec',
      model: params.model,
      provider: params.provider.name,
      title: params.prompt.slice(0, 80),
      parts: JSON.stringify(parts),
      metadata: ANIMATION_METADATA,
      content: params.prompt,
    })
    .returning();
  try {
    await insertMessage({
      userId: params.userId,
      chatId: id,
      role: 'user',
      content: params.prompt,
      model: params.model,
      provider: params.provider.name,
    });
    params.hooks?.onStarted?.(await getAnimation(params.userId, id));
    const { result, spec } = await generateAnimationSpec({
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      subject: params.subject,
      signal: params.signal,
      deadlineAt: animationStageDeadlineAt(),
      onPhase: params.hooks?.onPhase,
      onSummaryDelta: params.hooks?.onSummaryDelta,
    });
    await db()
      .update(chat)
      .set({
        title: spec.title,
        status: 'awaiting_approval',
        model: result.model,
        provider: result.provider,
        parts: JSON.stringify({
          ...parts,
          spec,
          error: undefined,
          failure: undefined,
        }),
      })
      .where(and(eq(chat.id, id), eq(chat.status, 'generating_spec')));
    await insertMessage({
      userId: params.userId,
      chatId: id,
      role: 'assistant',
      content: spec.summary,
      model: result.model,
      provider: result.provider,
      metadata: { kind: 'spec_ready' },
    });
    return getAnimation(params.userId, id);
  } catch (error) {
    const failure = await setFailure(row, parts, error, 'spec');
    throw new AnimationGenerationError(failure, error);
  }
}

export async function createAnimationFromTemplate(params: {
  userId: string;
  templateId: string;
  title: string;
  prompt: string;
  mathObjectType: AnimationMathObjectType;
  spec: AnimationSpec;
}): Promise<AnimationDetail> {
  const spec = validateAnimationSpec(params.spec);
  const id = getUuid();
  const code = compileAnimationSpec(spec);
  const parts: StoredAnimationParts = {
    ...initialParts(params.prompt, 'math', undefined, {
      creationMode: 'template',
      mathObjectType: params.mathObjectType,
      templateId: params.templateId,
    }),
    spec,
    code,
  };
  await db()
    .insert(chat)
    .values({
      id,
      userId: params.userId,
      status: 'code_ready',
      model: 'deterministic-template',
      provider: 'curvg-compiler',
      title: params.title,
      parts: JSON.stringify(parts),
      metadata: ANIMATION_METADATA,
      content: params.prompt,
    });
  await insertMessage({
    userId: params.userId,
    chatId: id,
    role: 'user',
    content: params.prompt,
    model: 'deterministic-template',
    provider: 'curvg-compiler',
    metadata: { kind: 'template', templateId: params.templateId },
  });
  await insertMessage({
    userId: params.userId,
    chatId: id,
    role: 'assistant',
    content: spec.summary,
    model: 'deterministic-template',
    provider: 'curvg-compiler',
    metadata: { kind: 'code_ready' },
  });
  return getAnimation(params.userId, id);
}

export async function reviseAnimation(params: {
  userId: string;
  id: string;
  prompt: string;
  subject?: AnimationSubject;
  modelSelection: AnimationModelSelection;
  provider: ChatProvider;
  model: string;
  signal?: AbortSignal;
  hooks?: AnimationGenerationHooks;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  const current = animationParts(row);
  if (current.spec && !isAnimationSpecRenderable(current.spec)) {
    throw new Error('Legacy animations are read-only archives');
  }
  if (current.creationMode === 'template') {
    throw new Error('Template animations cannot be revised by an AI model');
  }
  if (
    ['generating_spec', 'generating_code', 'queued', 'rendering'].includes(
      row.status
    )
  ) {
    throw new Error('Animation is currently processing');
  }
  const nextSubject = params.subject ?? current.subject;
  const previous = snapshot(current);
  const history = await conversation(row.id);
  const nextParts: StoredAnimationParts = {
    ...current,
    subject: nextSubject,
    prompt: params.prompt,
    modelSelection: params.modelSelection,
    versions: previous
      ? [...current.versions, previous].slice(-MAX_ANIMATION_VERSIONS)
      : current.versions.slice(-MAX_ANIMATION_VERSIONS),
    spec: undefined,
    code: undefined,
    videoUrl: undefined,
    thumbnailUrl: undefined,
    contactSheetUrl: undefined,
    qaReportUrl: undefined,
    visualQa: undefined,
    visualReview: undefined,
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
    qualityControl: undefined,
  };
  const claimed = await claimAnimationOperation({
    row,
    parts: nextParts,
    status: 'generating_spec',
    stage: 'spec',
    provider: params.provider.name,
    model: params.model,
    content: params.prompt,
    subject: nextSubject,
  });
  try {
    await insertMessage({
      userId: params.userId,
      chatId: row.id,
      role: 'user',
      content: params.prompt,
      model: params.model,
      provider: params.provider.name,
      metadata: previous
        ? { kind: 'revision', version: previous.version }
        : { kind: 'revision' },
    });
    params.hooks?.onStarted?.(await getAnimation(params.userId, row.id));
    const { result, spec } = await generateAnimationSpec({
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      subject: nextSubject,
      currentSpec: current.spec,
      history,
      signal: params.signal,
      deadlineAt: animationStageDeadlineAt(),
      onPhase: params.hooks?.onPhase,
      onSummaryDelta: params.hooks?.onSummaryDelta,
    });
    const { operation: _operation, ...completedParts } = claimed.parts;
    await db()
      .update(chat)
      .set({
        title: spec.title,
        status: 'awaiting_approval',
        model: result.model,
        provider: result.provider,
        parts: JSON.stringify({
          ...completedParts,
          spec,
          error: undefined,
          failure: undefined,
        }),
      })
      .where(and(eq(chat.id, row.id), eq(chat.status, 'generating_spec')));
    await insertMessage({
      userId: params.userId,
      chatId: row.id,
      role: 'assistant',
      content: spec.summary,
      model: result.model,
      provider: result.provider,
      metadata: { kind: 'spec_ready' },
    });
    return getAnimation(params.userId, row.id);
  } catch (error) {
    const failure = await setFailure(claimed.row, claimed.parts, error, 'spec');
    throw new AnimationGenerationError(failure, error);
  }
}

export async function approveAnimation(params: {
  userId: string;
  id: string;
  provider?: ChatProvider;
  model?: string;
  renderer?: AnimationRenderer;
  callbackUrl: string;
  qualityGateUrl: string;
  creditTaskId?: string;
  signal?: AbortSignal;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  const parts = animationParts(row);
  if (!parts.spec) throw new Error('Animation specification is missing');
  if (!isAnimationSpecRenderable(parts.spec)) {
    throw new Error('Legacy animations are read-only archives');
  }
  if (!['awaiting_approval', 'code_ready', 'failed'].includes(row.status)) {
    throw new Error('Animation is not ready for approval');
  }
  if (
    row.status === 'failed' &&
    (parts.failure?.retryable !== true || parts.failure.stage === 'spec')
  ) {
    throw new Error('Animation failure is not retryable from approval');
  }
  const claimed = await claimAnimationOperation({
    row,
    parts: {
      ...parts,
      error: undefined,
      failure: undefined,
    },
    status: 'generating_code',
    stage: 'code',
    provider: row.provider,
    model: row.model,
  });
  let code: string | undefined;
  let failureStage: AnimationFailureStage = 'code';
  try {
    const repairEvidence = parts.renderRepair?.regenerateCode
      ? parts.renderRepair.context
      : undefined;
    const shouldCompose =
      !!params.provider &&
      !!params.model &&
      (row.status === 'awaiting_approval' ||
        !parts.code ||
        parts.renderRepair?.regenerateCode === true);
    if (shouldCompose) {
      const composed = await composeAnimationCode({
        provider: params.provider!,
        model: params.model!,
        prompt: parts.prompt,
        spec: parts.spec,
        currentCode: repairEvidence ? parts.code : undefined,
        repairEvidence,
        signal: params.signal,
      });
      code = composed.code;
    } else {
      code = parts.code || compileAnimationSpec(parts.spec);
    }
    if (!params.renderer) {
      const {
        operation: _operation,
        renderRepair: _renderRepair,
        ...completedParts
      } = claimed.parts;
      const nextParts: StoredAnimationParts = {
        ...completedParts,
        code,
        error: undefined,
        failure: undefined,
      };
      await db()
        .update(chat)
        .set({
          status: 'code_ready',
          model: row.model,
          provider: row.provider,
          parts: JSON.stringify(nextParts),
        })
        .where(and(eq(chat.id, row.id), eq(chat.status, 'generating_code')));
      await insertMessage({
        userId: row.userId,
        chatId: row.id,
        role: 'assistant',
        content:
          'Manim code is ready. Configure the Sandbox renderer to produce the video.',
        model: row.model,
        provider: row.provider,
        metadata: { kind: 'code_ready' },
      });
      return getAnimation(params.userId, row.id);
    }
    failureStage = 'render';
    const render = await params.renderer.render({
      animationId: row.id,
      code,
      callbackUrl: params.callbackUrl,
      qualityGateUrl: params.qualityGateUrl,
      signal: params.signal,
    });
    const {
      operation: _operation,
      renderRepair: _renderRepair,
      ...completedParts
    } = claimed.parts;
    await db()
      .update(chat)
      .set({
        status: 'queued',
        model: row.model,
        provider: row.provider,
        parts: JSON.stringify({
          ...completedParts,
          code,
          error: undefined,
          failure: undefined,
          render: {
            ...render,
            stage: 'queued',
            progress: 8,
            startedAt: new Date().toISOString(),
            creditTaskId: params.creditTaskId,
          },
          qualityControl: {
            status: 'pending',
            attempt: 0,
            maxRepairs: 2,
            attempts: [],
          },
        }),
      })
      .where(and(eq(chat.id, row.id), eq(chat.status, 'generating_code')));
    return getAnimation(params.userId, row.id);
  } catch (error) {
    const failure = await setFailure(
      claimed.row,
      { ...claimed.parts, code },
      error,
      failureStage
    );
    throw new AnimationGenerationError(failure, error);
  }
}

function appendVersion(
  parts: AnimationParts,
  previous: AnimationVersion | null
): AnimationVersion[] {
  return previous
    ? [...parts.versions, previous].slice(-MAX_ANIMATION_VERSIONS)
    : parts.versions.slice(-MAX_ANIMATION_VERSIONS);
}

export async function updateAnimationSpec(params: {
  userId: string;
  id: string;
  spec: unknown;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  if (isRecoverableStaleStatus(row.status)) {
    throw new Error('Animation is currently processing');
  }
  const parts = animationParts(row);
  if (parts.spec && !isAnimationSpecRenderable(parts.spec)) {
    throw new Error('Legacy animations are read-only archives');
  }
  const spec = validateAnimationSpec(params.spec);
  const code = compileAnimationSpec(spec);
  const previous = snapshot(parts);
  const nextParts: StoredAnimationParts = {
    ...parts,
    spec,
    code,
    versions: appendVersion(parts, previous),
    videoUrl: undefined,
    thumbnailUrl: undefined,
    contactSheetUrl: undefined,
    qaReportUrl: undefined,
    visualQa: undefined,
    visualReview: undefined,
    publishedAt: undefined,
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
    qualityControl: undefined,
  };
  await db()
    .update(chat)
    .set({
      title: spec.title,
      status: 'code_ready',
      parts: JSON.stringify(nextParts),
    })
    .where(and(eq(chat.id, row.id), eq(chat.status, row.status)));
  await insertMessage({
    userId: row.userId,
    chatId: row.id,
    role: 'assistant',
    content:
      'Specification fields were updated and compiled deterministically.',
    model: row.model,
    provider: 'curvg-compiler',
    metadata: { kind: 'spec_compiled' },
  });
  return getAnimation(params.userId, params.id);
}

export async function restoreAnimationVersion(params: {
  userId: string;
  id: string;
  version: number;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  if (isRecoverableStaleStatus(row.status)) {
    throw new Error('Animation is currently processing');
  }
  const parts = animationParts(row);
  const selected = parts.versions.find(
    (version) => version.version === params.version
  );
  if (!selected?.spec || !isAnimationSpecRenderable(selected.spec)) {
    throw new Error('Version cannot be restored');
  }
  const spec = validateAnimationSpec(selected.spec);
  const previous = snapshot(parts);
  const nextParts: StoredAnimationParts = {
    ...parts,
    prompt: selected.prompt,
    spec,
    code: compileAnimationSpec(spec),
    versions: appendVersion(parts, previous),
    videoUrl: undefined,
    thumbnailUrl: undefined,
    contactSheetUrl: undefined,
    qaReportUrl: undefined,
    visualQa: undefined,
    visualReview: undefined,
    publishedAt: undefined,
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
    qualityControl: undefined,
  };
  await db()
    .update(chat)
    .set({
      title: spec.title,
      status: 'code_ready',
      content: selected.prompt,
      parts: JSON.stringify(nextParts),
    })
    .where(and(eq(chat.id, row.id), eq(chat.status, row.status)));
  return getAnimation(params.userId, params.id);
}

export async function cancelAnimationRender(
  userId: string,
  id: string
): Promise<{ animation: AnimationDetail; creditTaskId?: string }> {
  const row = await ownedRow(userId, id);
  const parts = animationParts(row);
  if (
    row.status === 'code_ready' &&
    parts.render?.status === 'canceled' &&
    parts.render.cancelRequested
  ) {
    return {
      animation: await getAnimation(userId, id),
      creditTaskId: parts.render.creditTaskId,
    };
  }
  if (!['queued', 'rendering'].includes(row.status)) {
    throw new Error('Animation is not rendering');
  }
  const now = new Date();
  const startedAt = parts.render?.startedAt
    ? new Date(parts.render.startedAt).getTime()
    : now.getTime();
  const nextParts: StoredAnimationParts = {
    ...parts,
    render: {
      ...parts.render,
      status: 'canceled',
      cancelRequested: true,
      canceledAt: now.toISOString(),
      elapsedMs: Math.max(0, now.getTime() - startedAt),
    },
    error: undefined,
    failure: undefined,
  };
  await db()
    .update(chat)
    .set({ status: 'code_ready', parts: JSON.stringify(nextParts) })
    .where(and(eq(chat.id, row.id), eq(chat.status, row.status)));
  return {
    animation: await getAnimation(userId, id),
    creditTaskId: parts.render?.creditTaskId,
  };
}

export async function publishAnimation(
  userId: string,
  id: string
): Promise<AnimationDetail> {
  const row = await ownedRow(userId, id);
  const parts = animationParts(row);
  if (row.status !== 'completed' || !parts.videoUrl) {
    throw new Error('Only completed animations can be published');
  }
  await db()
    .update(chat)
    .set({
      parts: JSON.stringify({
        ...parts,
        publishedAt: new Date().toISOString(),
      }),
    })
    .where(eq(chat.id, row.id));
  return getAnimation(userId, id);
}

export async function listPublishedAnimations(): Promise<AnimationSummary[]> {
  const rows = await db()
    .select()
    .from(chat)
    .where(
      and(eq(chat.metadata, ANIMATION_METADATA), eq(chat.status, 'completed'))
    )
    .orderBy(desc(chat.updatedAt))
    .limit(60);
  return rows
    .filter((row: Chat) => !!animationParts(row).publishedAt)
    .slice(0, 24)
    .map((row: Chat) => {
      const summary = toSummary(row);
      const jobId = animationParts(row).render?.jobId;
      if (!jobId) return summary;
      const basePath = `/api/gallery/animations/${encodeURIComponent(row.id)}/artifact`;
      return {
        ...summary,
        videoUrl: `${basePath}/video?jobId=${encodeURIComponent(jobId)}`,
        thumbnailUrl: `${basePath}/thumbnail?jobId=${encodeURIComponent(jobId)}`,
      };
    });
}

export async function getPublishedAnimationArtifact(
  id: string,
  jobId: string
): Promise<{ animationId: string; jobId: string } | null> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.id, id),
        eq(chat.metadata, ANIMATION_METADATA),
        eq(chat.status, 'completed')
      )
    )
    .limit(1);
  if (!row) return null;
  const parts = animationParts(row);
  if (!parts.publishedAt || parts.render?.jobId !== jobId) return null;
  return { animationId: row.id, jobId };
}

export async function isCurrentAnimationRender(
  id: string,
  jobId: string
): Promise<boolean> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.metadata, ANIMATION_METADATA)))
    .limit(1);
  return (
    !!row &&
    row.status !== 'deleted' &&
    animationParts(row).render?.jobId === jobId
  );
}

export interface AnimationQualityContext {
  userId: string;
  id: string;
  jobId: string;
  prompt: string;
  spec: AnimationSpec;
  code: string;
  provider: string;
  model: string;
  modelSelection?: AnimationModelSelection;
  qualityControl: AnimationQualityControlState;
}

export async function getAnimationQualityContext(
  id: string,
  jobId: string
): Promise<AnimationQualityContext> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(and(eq(chat.id, id), eq(chat.metadata, ANIMATION_METADATA)))
    .limit(1);
  if (!row || row.status === 'deleted') throw new Error('Animation not found');
  const parts = animationParts(row);
  if (
    !['queued', 'rendering'].includes(row.status) ||
    parts.render?.jobId !== jobId ||
    !parts.spec ||
    !parts.code
  ) {
    throw new Error('Animation quality gate is not current');
  }
  return {
    userId: row.userId,
    id: row.id,
    jobId,
    prompt: parts.prompt,
    spec: parts.spec,
    code: parts.code,
    provider: row.provider,
    model: row.model,
    modelSelection: parts.modelSelection,
    qualityControl: parts.qualityControl || {
      status: 'pending',
      attempt: 0,
      maxRepairs: 2,
      attempts: [],
    },
  };
}

export async function composeAnimationQualityRepair(params: {
  context: AnimationQualityContext;
  provider: ChatProvider;
  model: string;
  evidence: string;
  signal?: AbortSignal;
}) {
  return composeAnimationCode({
    provider: params.provider,
    model: params.model,
    prompt: params.context.prompt,
    spec: params.context.spec,
    currentCode: params.context.code,
    repairEvidence: params.evidence,
    signal: params.signal,
  });
}

export async function composeAnimationMathematicalRepair(params: {
  context: AnimationQualityContext;
  provider: ChatProvider;
  model: string;
  review: AnimationVisualReview;
  signal?: AbortSignal;
}): Promise<{ spec: AnimationSpec; code: string }> {
  const deadlineAt = animationStageDeadlineAt();
  const input: ChatCompletionInput = {
    model: params.model,
    messages: [
      { role: 'system', content: SPEC_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `ORIGINAL USER REQUEST:\n${params.context.prompt}\n\nCURRENT REJECTED SPECIFICATION:\n${JSON.stringify(params.context.spec)}\n\nPOST-RENDER MATHEMATICAL REVIEW:\n${JSON.stringify(params.review)}\n\nRebuild the complete schemaVersion 5 specification so the mathematical defect is corrected at its source. Return JSON only.`,
      },
    ],
    temperature: 0,
    maxTokens: 9_000,
    reasoningEffort: getAnimationReasoningEffort(params.model),
    signal: params.signal,
    deadlineAt,
  };
  let result = await params.provider.complete(input);
  let parsed = await parseAnimationSpecWithRepairs({
    provider: params.provider,
    input,
    result,
  });
  result = parsed.result;
  let spec = parsed.spec;
  let mathReview = await reviewAnimationMathematics({
    provider: params.provider,
    model: params.model,
    prompt: params.context.prompt,
    spec,
    signal: params.signal,
    deadlineAt,
  });
  for (
    let repairAttempt = 1;
    repairAttempt <= MAX_MATH_SPEC_REPAIRS &&
    !isAnimationMathReviewApproved(mathReview);
    repairAttempt += 1
  ) {
    const repairInput: ChatCompletionInput = {
      ...input,
      messages: [
        { role: 'system', content: SPEC_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `ORIGINAL USER REQUEST:\n${params.context.prompt}\n\nCURRENT REJECTED SPECIFICATION:\n${JSON.stringify(spec)}\n\nPOST-RENDER MATHEMATICAL REVIEW:\n${JSON.stringify(params.review)}\n\nINDEPENDENT MATHEMATICAL AUDIT (repair ${repairAttempt} of ${MAX_MATH_SPEC_REPAIRS}):\n${JSON.stringify(mathReview)}\n\nRebuild the complete schemaVersion 5 specification. Treat every post-render issue and independent audit correction as mandatory. Correct the visual proof at its source: the timeline and shots must visibly demonstrate the core claim, not merely place correct formulas beside static geometry. Preserve already-correct definitions and return JSON only.`,
        },
      ],
      temperature: 0,
    };
    result = await params.provider.complete(repairInput);
    parsed = await parseAnimationSpecWithRepairs({
      provider: params.provider,
      input: repairInput,
      result,
    });
    result = parsed.result;
    spec = parsed.spec;
    mathReview = await reviewAnimationMathematics({
      provider: params.provider,
      model: params.model,
      prompt: params.context.prompt,
      spec,
      signal: params.signal,
      deadlineAt,
    });
  }
  if (!isAnimationMathReviewApproved(mathReview)) {
    throw new AnimationMathAuditError(mathReview);
  }
  const composed = await composeAnimationCode({
    provider: params.provider,
    model: params.model,
    prompt: params.context.prompt,
    spec,
    repairEvidence: JSON.stringify(params.review),
    signal: params.signal,
  });
  return { spec, code: composed.code };
}

export async function recordAnimationQualityGate(params: {
  id: string;
  jobId: string;
  attempt: number;
  kind: 'render_error' | 'visual_review' | 'final_review';
  action: AnimationQualityGateAction;
  visualQa?: AnimationVisualQaReport;
  visualReview?: AnimationVisualReview;
  spec?: AnimationSpec;
  code?: string;
}): Promise<AnimationQualityContext> {
  return persistAnimationQualityGate(params, 0);
}

async function persistAnimationQualityGate(
  params: {
    id: string;
    jobId: string;
    attempt: number;
    kind: 'render_error' | 'visual_review' | 'final_review';
    action: AnimationQualityGateAction;
    visualQa?: AnimationVisualQaReport;
    visualReview?: AnimationVisualReview;
    spec?: AnimationSpec;
    code?: string;
  },
  conflictAttempt: number
): Promise<AnimationQualityContext> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(and(eq(chat.id, params.id), eq(chat.metadata, ANIMATION_METADATA)))
    .limit(1);
  if (!row || row.status === 'deleted') throw new Error('Animation not found');
  const parts = animationParts(row);
  if (
    !['queued', 'rendering'].includes(row.status) ||
    parts.render?.jobId !== params.jobId ||
    !parts.spec ||
    !parts.code
  ) {
    throw new Error('Animation quality gate is not current');
  }
  const qualityControl = parts.qualityControl || {
    status: 'pending' as const,
    attempt: 0,
    maxRepairs: 2,
    attempts: [],
  };
  const existing = qualityControl.attempts.find(
    (entry) => entry.attempt === params.attempt && entry.kind === params.kind
  );
  if (existing) return getAnimationQualityContext(params.id, params.jobId);

  const status =
    params.action === 'approve'
      ? 'approved'
      : params.action === 'repair'
        ? 'repairing'
        : 'rejected';
  const nextParts: StoredAnimationParts = {
    ...parts,
    spec: params.spec || parts.spec,
    code: params.code || parts.code,
    visualQa: params.visualQa || parts.visualQa,
    visualReview: params.visualReview || parts.visualReview,
    qualityControl: {
      ...qualityControl,
      status,
      attempt: params.attempt,
      attempts: [
        ...qualityControl.attempts,
        {
          attempt: params.attempt,
          kind: params.kind,
          action: params.action,
          deterministicScore: params.visualQa?.score,
          reviewStatus: params.visualReview?.status,
          issueCount:
            params.visualReview?.issues.length ||
            params.visualQa?.issues.length ||
            0,
          createdAt: new Date().toISOString(),
        },
      ].slice(-6),
    },
  };
  await db()
    .update(chat)
    .set({
      status: 'rendering',
      parts: JSON.stringify(nextParts),
    })
    .where(
      and(
        eq(chat.id, row.id),
        eq(chat.status, row.status),
        eq(chat.updatedAt, row.updatedAt)
      )
    );
  const persisted = await getAnimationQualityContext(params.id, params.jobId);
  const recorded = persisted.qualityControl.attempts.some(
    (entry) => entry.attempt === params.attempt && entry.kind === params.kind
  );
  if (!recorded) {
    if (conflictAttempt >= 3) {
      throw new Error('Animation quality gate update conflicted');
    }
    return persistAnimationQualityGate(params, conflictAttempt + 1);
  }
  return persisted;
}

export async function updateRender(params: {
  id: string;
  jobId: string;
  status: 'rendering' | 'completed' | 'failed';
  stage?:
    | 'validating'
    | 'compiling'
    | 'transcoding'
    | 'reviewing'
    | 'uploading';
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  contactSheetUrl?: string;
  qaReportUrl?: string;
  visualQa?: AnimationVisualQaReport;
  error?: string;
}): Promise<{
  cancelRequested: boolean;
  creditTaskId?: string;
  status: 'rendering' | 'completed' | 'failed' | 'canceled';
}> {
  const [row] = await db()
    .select()
    .from(chat)
    .where(and(eq(chat.id, params.id), eq(chat.metadata, ANIMATION_METADATA)))
    .limit(1);
  if (!row || row.status === 'deleted') throw new Error('Animation not found');
  const parts = animationParts(row);
  if (parts.render?.jobId && params.jobId !== parts.render.jobId) {
    throw new Error('Render job does not match the animation');
  }
  if (parts.render?.cancelRequested) {
    return {
      cancelRequested: true,
      creditTaskId: parts.render.creditTaskId,
      status: 'canceled',
    };
  }
  if (['completed', 'failed'].includes(row.status)) {
    // The first terminal callback wins. A completed replay also repairs the
    // deterministic message if the earlier request committed state and then
    // failed before inserting the conversation entry.
    if (row.status === 'completed' && params.status === 'completed') {
      const replayParts: StoredAnimationParts = {
        ...parts,
        videoUrl: params.videoUrl || parts.videoUrl,
        thumbnailUrl: params.thumbnailUrl || parts.thumbnailUrl,
        contactSheetUrl: params.contactSheetUrl || parts.contactSheetUrl,
        qaReportUrl: params.qaReportUrl || parts.qaReportUrl,
        visualQa: params.visualQa || parts.visualQa,
      };
      if (JSON.stringify(replayParts) !== JSON.stringify(parts)) {
        await db()
          .update(chat)
          .set({ parts: JSON.stringify(replayParts) })
          .where(and(eq(chat.id, row.id), eq(chat.status, 'completed')));
      }
      await ensureRenderCompletedMessage({
        userId: row.userId,
        chatId: row.id,
        jobId: params.jobId,
        model: row.model,
        provider: row.provider,
      });
    }
    return {
      cancelRequested: false,
      creditTaskId: parts.render?.creditTaskId,
      status: row.status as 'completed' | 'failed',
    };
  }
  if (!['queued', 'rendering'].includes(row.status)) {
    throw new Error('Animation is not awaiting a render update');
  }
  if (params.status === 'completed') {
    const finalApproval = parts.qualityControl?.attempts.some(
      (entry) => entry.kind === 'final_review' && entry.action === 'approve'
    );
    if (parts.qualityControl?.status !== 'approved' || !finalApproval) {
      throw new Error(
        'Final high-quality render has not passed quality review'
      );
    }
  }
  const renderDiagnostic = params.error
    ?.replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, 2_000);
  const regenerateCode =
    renderFailureRequiresCodeRegeneration(renderDiagnostic);
  const renderFailure: AnimationFailure | undefined =
    params.status === 'failed'
      ? {
          stage: 'render',
          code: 'RENDER_FAILED',
          message: failureMessages.RENDER_FAILED,
          retryable: true,
        }
      : undefined;
  const callbackId = getUuid();
  const startedAt = parts.render?.startedAt || new Date().toISOString();
  const nextParts: StoredAnimationParts = {
    ...parts,
    videoUrl: params.videoUrl || parts.videoUrl,
    thumbnailUrl: params.thumbnailUrl || parts.thumbnailUrl,
    contactSheetUrl: params.contactSheetUrl || parts.contactSheetUrl,
    qaReportUrl: params.qaReportUrl || parts.qaReportUrl,
    visualQa: params.visualQa || parts.visualQa,
    // Keep the latest semantic verdict through progress and failure callbacks.
    // New render attempts explicitly clear it when they are queued, so erasing
    // it here only destroys the evidence needed to diagnose a rejected repair.
    visualReview: parts.visualReview,
    error: renderFailure?.message,
    failure: renderFailure,
    renderRepair: renderFailure
      ? { regenerateCode, context: renderDiagnostic }
      : undefined,
    render: {
      ...parts.render,
      jobId: params.jobId,
      status: params.status,
      stage:
        params.status === 'completed'
          ? 'completed'
          : params.stage || parts.render?.stage || 'validating',
      progress:
        params.status === 'completed'
          ? 100
          : Math.max(
              0,
              Math.min(99, params.progress ?? parts.render?.progress ?? 12)
            ),
      startedAt,
      elapsedMs: Math.max(0, Date.now() - new Date(startedAt).getTime()),
    },
    renderCallback: {
      id: callbackId,
      jobId: params.jobId,
      status: params.status,
    },
  };
  await db()
    .update(chat)
    .set({ status: params.status, parts: JSON.stringify(nextParts) })
    .where(
      and(
        eq(chat.id, row.id),
        eq(chat.status, row.status),
        eq(chat.updatedAt, row.updatedAt)
      )
    );
  const [persisted] = await db()
    .select()
    .from(chat)
    .where(eq(chat.id, row.id))
    .limit(1);
  if (!persisted) throw new Error('Animation not found');
  const persistedParts = animationParts(persisted);
  if (persistedParts.renderCallback?.id !== callbackId) {
    if (
      params.status !== 'rendering' &&
      persisted.status === 'rendering' &&
      persistedParts.render?.jobId === params.jobId
    ) {
      // A progress callback won the first CAS; retry the terminal transition
      // against its new version.
      return updateRender(params);
    }
    // Another terminal callback already won, or this was duplicate progress.
    return {
      cancelRequested: persistedParts.render?.cancelRequested === true,
      creditTaskId: persistedParts.render?.creditTaskId,
      status: persisted.status as 'rendering' | 'completed' | 'failed',
    };
  }
  if (renderFailure) {
    console.error('[animation-render] failed', {
      animationId: row.id,
      jobId: params.jobId,
      error: renderDiagnostic || 'Render failed',
    });
  }
  if (params.status === 'completed') {
    await ensureRenderCompletedMessage({
      userId: row.userId,
      chatId: row.id,
      jobId: params.jobId,
      model: row.model,
      provider: row.provider,
    });
  }
  return {
    cancelRequested: false,
    creditTaskId: nextParts.render?.creditTaskId,
    status: params.status,
  };
}

export async function removeAnimation(userId: string, id: string) {
  const row = await ownedRow(userId, id);
  await db().update(chat).set({ status: 'deleted' }).where(eq(chat.id, row.id));
}
