import { and, asc, desc, eq, ne } from 'drizzle-orm';

import type { ChatProvider, ChatTurn } from '@/core/ai/chat';
import type { AnimationRenderer } from '@/core/animation-renderer';
import { db } from '@/core/db';
import { chat, chatMessage, type Chat } from '@/config/db/schema';
import {
  type AnimationDetail,
  type AnimationMessage,
  type AnimationParts,
  type AnimationSpec,
  type AnimationStatus,
  type AnimationSubject,
  type AnimationSummary,
  type AnimationVersion,
} from '@/lib/animation';
import { parseAnimationSpec, parseManimCode } from '@/lib/animation-schema';
import { getUuid } from '@/lib/hash';

const ANIMATION_METADATA = JSON.stringify({ kind: 'animation' });

const SPEC_SYSTEM_PROMPT = `You are CurvG's mathematical animation planner. Convert the user's request into a precise, inspectable animation specification before any code is written.

Return valid JSON only with this shape:
{
  "title": "short title",
  "summary": "what the animation proves or explains",
  "durationSeconds": 20,
  "assumptions": ["mathematical assumptions"],
  "formulas": ["LaTeX-compatible formulas"],
  "style": {
    "background": "visual background",
    "palette": ["named or hex colors"],
    "camera": "camera and framing rules"
  },
  "scenes": [{
    "id": "scene-1",
    "title": "scene title",
    "purpose": "mathematical purpose",
    "durationSeconds": 5,
    "math": ["equations or invariants"],
    "visuals": ["objects, labels, axes and colors"],
    "actions": ["ordered transformations and timing"]
  }]
}

Preserve mathematical correctness. State assumptions instead of inventing facts. Include coordinate ranges, labels, colors and timing when relevant. Do not return Python or Markdown.`;

const CODE_SYSTEM_PROMPT = `You are CurvG's Manim compiler. Convert the approved structured specification into deterministic Manim Community Python code.

Return valid JSON only: {"code":"..."}.

Requirements:
- Use "from manim import *".
- Define exactly one main class named CurvGScene(Scene).
- Keep formulas, axes and transformations faithful to the specification.
- Use only Manim and Python standard language features.
- Do not access files, environment variables, processes or the network.
- Do not use open, eval, exec, compile or dynamic imports.
- Make timing explicit and keep the scene self-contained.`;

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
  subject: AnimationSubject
): AnimationParts {
  return { subject, prompt, versions: [] };
}

function animationParts(row: Chat): AnimationParts {
  return parseJson(
    row.parts,
    initialParts(row.content || '', 'general' as AnimationSubject)
  );
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
  return row;
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

async function setFailure(row: Chat, parts: AnimationParts, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await db()
    .update(chat)
    .set({
      status: 'failed',
      parts: JSON.stringify({ ...parts, error: message }),
    })
    .where(eq(chat.id, row.id));
  await insertMessage({
    userId: row.userId,
    chatId: row.id,
    role: 'assistant',
    content: message,
    model: row.model,
    provider: row.provider,
    status: 'failed',
    metadata: { kind: 'error' },
  });
}

async function conversation(chatId: string): Promise<ChatTurn[]> {
  const rows = await db()
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.chatId, chatId))
    .orderBy(asc(chatMessage.createdAt));
  return rows
    .filter((row) => row.role === 'user' || row.role === 'assistant')
    .slice(-16)
    .map((row) => ({
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
    .orderBy(desc(chat.updatedAt));
  return rows.map(toSummary);
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
    .orderBy(asc(chatMessage.createdAt));
  return {
    ...toSummary(row),
    parts: animationParts(row),
    messages: messages.map(toMessage),
  };
}

export async function createAnimation(params: {
  userId: string;
  prompt: string;
  subject: AnimationSubject;
  provider: ChatProvider;
  model: string;
}): Promise<AnimationDetail> {
  const id = getUuid();
  const parts = initialParts(params.prompt, params.subject);
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
  await insertMessage({
    userId: params.userId,
    chatId: id,
    role: 'user',
    content: params.prompt,
    model: params.model,
    provider: params.provider.name,
  });
  try {
    const result = await params.provider.complete({
      model: params.model,
      messages: [
        { role: 'system', content: SPEC_SYSTEM_PROMPT },
        {
          role: 'user',
          content: specPrompt({
            prompt: params.prompt,
            subject: params.subject,
          }),
        },
      ],
      temperature: 0.15,
      maxTokens: 5000,
    });
    const spec = parseAnimationSpec(result.content);
    await db()
      .update(chat)
      .set({
        title: spec.title,
        status: 'awaiting_approval',
        model: result.model,
        provider: result.provider,
        parts: JSON.stringify({ ...parts, spec, error: undefined }),
      })
      .where(eq(chat.id, id));
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
    await setFailure(row, parts, error);
    throw error;
  }
}

export async function reviseAnimation(params: {
  userId: string;
  id: string;
  prompt: string;
  provider: ChatProvider;
  model: string;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  const current = animationParts(row);
  if (
    ['generating_spec', 'generating_code', 'queued', 'rendering'].includes(
      row.status
    )
  ) {
    throw new Error('Animation is currently processing');
  }
  const previous = snapshot(current);
  const history = await conversation(row.id);
  const nextParts: AnimationParts = {
    ...current,
    prompt: params.prompt,
    versions: previous ? [...current.versions, previous] : current.versions,
    code: undefined,
    videoUrl: undefined,
    thumbnailUrl: undefined,
    render: undefined,
    error: undefined,
  };
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
  await db()
    .update(chat)
    .set({
      status: 'generating_spec',
      model: params.model,
      provider: params.provider.name,
      content: params.prompt,
      parts: JSON.stringify(nextParts),
    })
    .where(eq(chat.id, row.id));
  try {
    const result = await params.provider.complete({
      model: params.model,
      messages: [
        { role: 'system', content: SPEC_SYSTEM_PROMPT },
        ...history,
        {
          role: 'user',
          content: specPrompt({
            prompt: params.prompt,
            subject: current.subject,
            currentSpec: current.spec,
          }),
        },
      ],
      temperature: 0.15,
      maxTokens: 5000,
    });
    const spec = parseAnimationSpec(result.content);
    await db()
      .update(chat)
      .set({
        title: spec.title,
        status: 'awaiting_approval',
        model: result.model,
        provider: result.provider,
        parts: JSON.stringify({ ...nextParts, spec }),
      })
      .where(eq(chat.id, row.id));
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
    await setFailure(row, nextParts, error);
    throw error;
  }
}

export async function approveAnimation(params: {
  userId: string;
  id: string;
  provider: ChatProvider;
  model: string;
  renderer?: AnimationRenderer;
  callbackUrl: string;
}): Promise<AnimationDetail> {
  const row = await ownedRow(params.userId, params.id);
  const parts = animationParts(row);
  if (!parts.spec) throw new Error('Animation specification is missing');
  if (!['awaiting_approval', 'code_ready', 'failed'].includes(row.status)) {
    throw new Error('Animation is not ready for approval');
  }
  await db()
    .update(chat)
    .set({ status: 'generating_code', parts: JSON.stringify({ ...parts }) })
    .where(eq(chat.id, row.id));
  let code = parts.code;
  try {
    if (!code) {
      const result = await params.provider.complete({
        model: params.model,
        messages: [
          { role: 'system', content: CODE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: JSON.stringify(parts.spec),
          },
        ],
        temperature: 0.1,
        maxTokens: 8000,
      });
      code = parseManimCode(result.content);
    }
    if (!params.renderer) {
      const nextParts = { ...parts, code, error: undefined };
      await db()
        .update(chat)
        .set({ status: 'code_ready', parts: JSON.stringify(nextParts) })
        .where(eq(chat.id, row.id));
      await insertMessage({
        userId: row.userId,
        chatId: row.id,
        role: 'assistant',
        content:
          'Manim code is ready. Configure the Sandbox renderer to produce the video.',
        model: params.model,
        provider: params.provider.name,
        metadata: { kind: 'code_ready' },
      });
      return getAnimation(params.userId, row.id);
    }
    const render = await params.renderer.render({
      animationId: row.id,
      code,
      callbackUrl: params.callbackUrl,
    });
    await db()
      .update(chat)
      .set({
        status: 'queued',
        parts: JSON.stringify({
          ...parts,
          code,
          error: undefined,
          render,
        }),
      })
      .where(eq(chat.id, row.id));
    return getAnimation(params.userId, row.id);
  } catch (error) {
    await setFailure(row, { ...parts, code }, error);
    throw error;
  }
}

export async function updateRender(params: {
  id: string;
  jobId: string;
  status: 'rendering' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}) {
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
  if (row.status === 'completed' && params.status === 'completed') return;
  if (!['queued', 'rendering'].includes(row.status)) {
    throw new Error('Animation is not awaiting a render update');
  }
  const nextParts: AnimationParts = {
    ...parts,
    videoUrl: params.videoUrl || parts.videoUrl,
    thumbnailUrl: params.thumbnailUrl || parts.thumbnailUrl,
    error:
      params.status === 'failed' ? params.error || 'Render failed' : undefined,
    render: {
      ...parts.render,
      jobId: params.jobId,
      status: params.status,
    },
  };
  await db()
    .update(chat)
    .set({ status: params.status, parts: JSON.stringify(nextParts) })
    .where(eq(chat.id, row.id));
  if (params.status === 'completed') {
    await insertMessage({
      userId: row.userId,
      chatId: row.id,
      role: 'assistant',
      content: 'The animation has finished rendering.',
      model: row.model,
      provider: row.provider,
      metadata: { kind: 'render_completed' },
    });
  }
}

export async function removeAnimation(userId: string, id: string) {
  const row = await ownedRow(userId, id);
  await db().update(chat).set({ status: 'deleted' }).where(eq(chat.id, row.id));
}
