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
  "layout": "compact ASCII layout showing the frame regions",
  "areas": [{
    "name": "frame region",
    "content": "what the viewer sees there",
    "implementation": "Manim objects and positioning rules"
  }],
  "dependencies": ["required Manim, LaTeX or font capabilities"],
  "notes": ["implementation constraints and mathematical invariants"],
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

Preserve mathematical correctness. State assumptions instead of inventing facts. Include coordinate ranges, labels, colors and timing when relevant. Make the layout, areas and notes concrete enough that a code generator can implement them without guessing. Do not return Python or Markdown.`;

const CODE_SYSTEM_PROMPT = `You are CurvG's Manim compiler. Convert the approved structured specification into deterministic Manim Community Python code.

Return valid JSON only: {"code":"..."}.

Requirements:
- Use "from manim import *".
- Define exactly one main class named CurvGScene(Scene).
- Keep formulas, axes and transformations faithful to the specification.
- Use only Manim and Python standard language features.
- Do not access files, environment variables, processes or the network.
- Do not use open, eval, exec, compile or dynamic imports.
- The Python must compile without duplicate keyword arguments or syntax errors.
- Use raw Python strings for every LaTeX expression.
- Convert mathematical coordinates with axes.c2p or axes.coords_to_point; do not place graph points using raw scene coordinates.
- Use NumberPlane directly when a grid is needed. Never call Axes.get_grid_line, Axes.get_grid_lines, Axes.get_axis_lines, or guessed Axes helper methods.
- CurvGScene inherits from the standard Scene class, so never access self.camera.frame. Fit the composition by scaling and positioning a root VGroup instead.
- Animate changing labels or numbers with pre-created mobjects and Transform at meaningful checkpoints; do not update text-derived mobjects every frame.
- Never construct Text, Tex or MathTex, call set_text, call refresh_bounding_box, or replace text with become inside any frame callback.
- Do not call add_updater or define custom updater classes or __call__ methods. Prefer ValueTracker and always_redraw only for lightweight geometry such as Dot and Line.
- Make every play duration explicit: either declare a positive run_time on self.play, or declare a positive run_time on every direct animation passed to that self.play. When parallel animations have individual durations, the play duration is their maximum. Every self.wait duration must also be greater than zero. Omit self.wait entirely when no hold is needed. Never use a scene timestamp or start time as run_time. The sum of all play durations and waits must match the specification duration.
- Do not call set_opacity(0) on an object that will be passed to FadeIn; FadeIn already handles the hidden start state.
- For sequential equation changes, repeatedly Transform the one equation object already displayed in the scene. A Transform target is not automatically a new displayed source variable.
- Keep equation labels outside any VGroup used to scale geometry. Before each Transform of a text or formula, explicitly position and size the pre-created target to the same anchor and visual scale as the displayed source so it cannot jump into or overlap the diagram.
- The standard Manim frame is about 14.2 by 8 scene units. Keep text centers inside y = -3.4 to 3.4. Prefer target.to_edge(UP, buff=0.35) for top equations instead of raw coordinates near y=4, and shift or scale the diagram below the label.
- For a formula sequence, keep the original displayed variable as the source in every Transform call, such as Transform(eq_display, eq2) then Transform(eq_display, eq3). Never reassign the source variable to a Transform target.
- MathTex has no get_scale_factor method. Use a shared font_size and the same positioning method for all formula targets; use match_height only when size matching is necessary.
- Return one clean implementation without dead, commented-out or alternative scene classes.
- Make timing explicit and keep the scene self-contained.`;

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
  };
  let streamedContent = '';
  let streamedSummary = '';
  const result =
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
  const spec = parseAnimationSpec(result.content);
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

async function generateManimCode(params: {
  provider: ChatProvider;
  model: string;
  spec: AnimationSpec;
  previousError?: string;
}): Promise<string> {
  const correctionContext = params.previousError
    ? `\n\nA previous render failed with this error:\n${params.previousError.slice(0, 2000)}\nGenerate a fresh implementation from the specification. Do not reuse or include the previous source.`
    : '';
  const messages: ChatTurn[] = [
    { role: 'system', content: CODE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${JSON.stringify(params.spec)}${correctionContext}`,
    },
  ];
  const first = await params.provider.complete({
    model: params.model,
    messages,
    temperature: 0.1,
    maxTokens: 8000,
  });
  try {
    return parseManimCode(first.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid output';
    const corrected = await params.provider.complete({
      model: params.model,
      messages: [
        ...messages,
        { role: 'assistant', content: first.content },
        {
          role: 'user',
          content: `The previous output failed validation: ${reason}. Return corrected JSON only. The Python code must contain the exact declaration "class CurvGScene(Scene):" and satisfy every original requirement.`,
        },
      ],
      temperature: 0,
      maxTokens: 8000,
    });
    return parseManimCode(corrected.content);
  }
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
  hooks?: AnimationGenerationHooks;
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
  params.hooks?.onStarted?.(await getAnimation(params.userId, id));
  try {
    const { result, spec } = await generateAnimationSpec({
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      subject: params.subject,
      onSummaryDelta: params.hooks?.onSummaryDelta,
    });
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
  hooks?: AnimationGenerationHooks;
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
  params.hooks?.onStarted?.(await getAnimation(params.userId, row.id));
  try {
    const { result, spec } = await generateAnimationSpec({
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      subject: current.subject,
      currentSpec: current.spec,
      history,
      onSummaryDelta: params.hooks?.onSummaryDelta,
    });
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
  const activeRow = {
    ...row,
    provider: params.provider.name,
    model: params.model,
  };
  const parts = animationParts(row);
  if (!parts.spec) throw new Error('Animation specification is missing');
  if (!['awaiting_approval', 'code_ready', 'failed'].includes(row.status)) {
    throw new Error('Animation is not ready for approval');
  }
  const previousError = parts.error;
  await db()
    .update(chat)
    .set({
      status: 'generating_code',
      provider: params.provider.name,
      model: params.model,
      parts: JSON.stringify({ ...parts, error: undefined }),
    })
    .where(eq(chat.id, row.id));
  let code = row.status === 'failed' ? undefined : parts.code;
  try {
    if (!code) {
      code = await generateManimCode({
        provider: params.provider,
        model: params.model,
        spec: parts.spec,
        previousError,
      });
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
    await setFailure(activeRow, { ...parts, code }, error);
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
