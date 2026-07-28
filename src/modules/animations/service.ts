import { and, asc, desc, eq, ne } from 'drizzle-orm';

import {
  ChatProviderError,
  type ChatProvider,
  type ChatTurn,
} from '@/core/ai/chat';
import type { AnimationRenderer } from '@/core/animation-renderer';
import { db } from '@/core/db';
import { chat, chatMessage, type Chat } from '@/config/db/schema';
import {
  isAnimationSpecV2,
  type AnimationCreationMode,
  type AnimationDetail,
  type AnimationFailure,
  type AnimationFailureStage,
  type AnimationMathObjectType,
  type AnimationMessage,
  type AnimationModelSelection,
  type AnimationParts,
  type AnimationSpec,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
  type AnimationVersion,
} from '@/lib/animation';
import {
  parseAnimationSpec,
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
// This budget is shared by the initial model call, one schema-correction call,
// provider retries, and Auto fallbacks. It prevents a single stage from
// multiplying independent timeout windows under upstream saturation.
export const ANIMATION_STAGE_TIMEOUT_MS = 180_000;

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
}

const SPEC_SYSTEM_PROMPT = `You are CurvG's mathematical animation planner. Convert the user's request into CurvG's strict v2 intermediate representation. You never write Python.

Return valid JSON only with this shape:
{
  "schemaVersion": 2,
  "title": "short title",
  "summary": "what the animation proves or explains",
  "durationSeconds": 20,
  "assumptions": ["mathematical assumptions"],
  "style": {
    "background": "#0B0D14",
    "palette": ["#7C8CFF", "#62D9C3"],
    "camera": "Fixed 16:9 frame"
  },
  "objects": [{
    "id": "axes",
    "kind": "axes|curve|area|formula|text|series|matrix",
    "region": "title|formula|graph",
    "label": "optional plain text",
    "expr": "safe math expression for curves, LaTeX for formulas",
    "domain": [-6, 6],
    "color": "#7C8CFF",
    "values": [[1, 0], [0, 1]]
  }],
  "timeline": [{
    "id": "draw-axes",
    "at": 0,
    "op": "draw|write|fade_in|fade_out|transform|hold",
    "ref": "axes",
    "targetRef": "only for transform",
    "runTime": 1.5,
    "ease": "linear|smooth|there_and_back"
  }],
  "layout": { "regions": "single|left|right|top|bottom", "title": "optional" },
  "dependencies": ["required Manim, LaTeX or font capabilities"],
  "notes": ["mathematical invariants"]
}

Preserve mathematical correctness and state assumptions instead of inventing facts. Object IDs and timeline IDs must be unique. Curves use x and only these functions: sin, cos, tan, asin, acos, atan, sqrt, abs, exp, log, ln, sinh, cosh, tanh. Timeline groups may share the same start time, but groups must not overlap. Every event must end at or before durationSeconds. Include an axes object whenever a curve or area is present. Layout declares only semantic regions; the compiler owns all coordinates and scaling. Do not return Python, prose fields, Markdown, or any schemaVersion other than 2.`;

export interface AnimationGenerationHooks {
  onStarted?: (animation: AnimationDetail) => void;
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

async function generateAnimationSpec(params: {
  provider: ChatProvider;
  model: string;
  prompt: string;
  subject: AnimationSubject;
  currentSpec?: AnimationSpec;
  history?: ChatTurn[];
  signal?: AbortSignal;
  deadlineAt?: number;
  onSummaryDelta?: (delta: string) => void;
}) {
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
    maxTokens: 5000,
    signal: params.signal,
    deadlineAt: params.deadlineAt,
  };
  let streamedContent = '';
  let streamedSummary = '';
  let result =
    params.onSummaryDelta && params.provider.stream
      ? await params.provider.stream(input, (delta) => {
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
  let spec: AnimationSpec;
  try {
    spec = parseAnimationSpec(result.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid output';
    result = await params.provider.complete({
      ...input,
      messages: [
        ...input.messages,
        { role: 'assistant', content: result.content },
        {
          role: 'user',
          content: `The previous specification failed validation: ${reason}. Return one corrected JSON object only, preserving the original request and every required field.`,
        },
      ],
      temperature: 0,
    });
    spec = parseAnimationSpec(result.content);
  }
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
  PRO_REQUIRED: 'A Pro plan is required for this model.',
  INSUFFICIENT_CREDITS: 'There are not enough credits to render this video.',
  BUSY: 'Animation generation is busy. Please retry shortly.',
  UNKNOWN: 'CurvG could not finish this step.',
};

function animationFailure(
  error: unknown,
  stage: AnimationFailureStage
): AnimationFailure {
  if (error instanceof AnimationGenerationError) return error.failure;
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
  if (current.spec && !isAnimationSpecV2(current.spec)) {
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
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
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
  renderer?: AnimationRenderer;
  callbackUrl: string;
  creditTaskId?: string;
  signal?: AbortSignal;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  const parts = animationParts(row);
  if (!parts.spec) throw new Error('Animation specification is missing');
  if (!isAnimationSpecV2(parts.spec)) {
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
    code = compileAnimationSpec(parts.spec);
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
  if (parts.spec && !isAnimationSpecV2(parts.spec)) {
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
    publishedAt: undefined,
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
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
  if (!selected?.spec || !isAnimationSpecV2(selected.spec)) {
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
    publishedAt: undefined,
    render: undefined,
    error: undefined,
    failure: undefined,
    renderRepair: undefined,
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

export async function updateRender(params: {
  id: string;
  jobId: string;
  status: 'rendering' | 'completed' | 'failed';
  stage?: 'validating' | 'compiling' | 'transcoding' | 'uploading';
  progress?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
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
