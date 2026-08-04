import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { ChatAttemptReport } from '@/core/ai/chat';
import { db } from '@/core/db';
import {
  animationPlanningAttempt,
  animationPlanningStage,
  chat,
  type AnimationPlanningStage,
} from '@/config/db/schema';
import type {
  AnimationPlanningStageName,
  AnimationPlanningStageSummary,
} from '@/lib/animation';
import { ANIMATION_PLANNING_STAGES } from '@/lib/animation-pipeline';
import { getUuid, md5 } from '@/lib/hash';

function rowId(runId: string, stage: AnimationPlanningStageName) {
  return `APS_${md5(`${runId}:${stage}`)}`;
}

/**
 * Persist one provider attempt (path D observability). Never throws: losing a
 * telemetry row must not affect the planning attempt it describes.
 */
export async function recordPlanningAttempt(params: {
  userId: string;
  chatId: string;
  runId: string;
  stage: AnimationPlanningStageName;
  repairAttempt: number;
  report: ChatAttemptReport;
}): Promise<void> {
  try {
    await db()
      .insert(animationPlanningAttempt)
      .values({
        id: `APA_${getUuid()}`,
        chatId: params.chatId,
        userId: params.userId,
        runId: params.runId,
        stage: params.stage,
        repairAttempt: params.repairAttempt,
        attemptNo: params.report.attemptNo,
        provider: params.report.provider,
        model: params.report.model,
        status: params.report.ok ? 'ok' : 'failed',
        errorCode: params.report.errorCode || null,
        errorMessage: params.report.errorMessage?.slice(0, 500) || null,
        latencyMs: Math.max(0, Math.round(params.report.latencyMs)),
      });
  } catch (error) {
    console.warn('animation attempt telemetry insert failed', error);
  }
}

function isoDate(value: Date | string | number | null): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function planningStageSummary(
  row: AnimationPlanningStage
): AnimationPlanningStageSummary {
  return {
    name: row.stage as AnimationPlanningStageName,
    sequence: row.sequence,
    status: row.status as AnimationPlanningStageSummary['status'],
    attempt: row.attempt,
    errorCode: row.errorCode || undefined,
    requestId: row.requestId || undefined,
    startedAt: isoDate(row.startedAt),
    completedAt: isoDate(row.completedAt),
    artifact: summaryArtifact(row),
  };
}

/**
 * The scene artifact is excluded: it is the largest stage output and becomes
 * `parts.spec` immediately after planning, so repeating it in every summary
 * would bloat the detail payload for nothing the client cannot already read.
 */
function summaryArtifact(row: AnimationPlanningStage): unknown {
  if (row.stage === 'scene') return undefined;
  if (row.status !== 'completed' && row.status !== 'cached') return undefined;
  if (!row.artifact) return undefined;
  try {
    return JSON.parse(row.artifact);
  } catch {
    return undefined;
  }
}

export async function findReusablePlanningStage(params: {
  userId: string;
  chatId: string;
  stage: AnimationPlanningStageName;
  inputHash: string;
}) {
  const [row] = await db()
    .select()
    .from(animationPlanningStage)
    .where(
      and(
        eq(animationPlanningStage.userId, params.userId),
        eq(animationPlanningStage.chatId, params.chatId),
        eq(animationPlanningStage.stage, params.stage),
        eq(animationPlanningStage.inputHash, params.inputHash),
        inArray(animationPlanningStage.status, ['completed', 'cached'])
      )
    )
    .orderBy(desc(animationPlanningStage.completedAt))
    .limit(1);
  return row;
}

export async function startPlanningStage(params: {
  userId: string;
  chatId: string;
  runId: string;
  stage: AnimationPlanningStageName;
  sequence: number;
  inputHash: string;
  provider: string;
  model: string;
}) {
  const id = rowId(params.runId, params.stage);
  const [existing] = await db()
    .select()
    .from(animationPlanningStage)
    .where(eq(animationPlanningStage.id, id))
    .limit(1);
  const now = new Date();
  // Stage rows are the durable checkpoints; touching the parent chat is the
  // watchdog heartbeat so a long but healthy multi-stage run is not reclaimed
  // as a stale Worker.
  await db()
    .update(chat)
    .set({ updatedAt: now })
    .where(and(eq(chat.id, params.chatId), eq(chat.userId, params.userId)));
  if (existing) {
    const [updated] = await db()
      .update(animationPlanningStage)
      .set({
        status: 'running',
        attempt: existing.attempt + 1,
        inputHash: params.inputHash,
        outputHash: null,
        artifact: null,
        diagnostic: null,
        errorCode: null,
        errorMessage: null,
        requestId: null,
        provider: params.provider,
        model: params.model,
        startedAt: now,
        completedAt: null,
      })
      .where(eq(animationPlanningStage.id, id))
      .returning();
    return updated;
  }
  const [created] = await db()
    .insert(animationPlanningStage)
    .values({
      id,
      userId: params.userId,
      chatId: params.chatId,
      runId: params.runId,
      stage: params.stage,
      sequence: params.sequence,
      status: 'running',
      attempt: 1,
      inputHash: params.inputHash,
      provider: params.provider,
      model: params.model,
      startedAt: now,
    })
    .returning();
  return created;
}

export async function cachePlanningStage(params: {
  userId: string;
  chatId: string;
  runId: string;
  stage: AnimationPlanningStageName;
  sequence: number;
  inputHash: string;
  source: AnimationPlanningStage;
}) {
  const started = await startPlanningStage({
    userId: params.userId,
    chatId: params.chatId,
    runId: params.runId,
    stage: params.stage,
    sequence: params.sequence,
    inputHash: params.inputHash,
    provider: params.source.provider,
    model: params.source.model,
  });
  const [cached] = await db()
    .update(animationPlanningStage)
    .set({
      status: 'cached',
      outputHash: params.source.outputHash,
      artifact: params.source.artifact,
      diagnostic: params.source.diagnostic,
      requestId: params.source.requestId,
      completedAt: new Date(),
    })
    .where(eq(animationPlanningStage.id, started.id))
    .returning();
  return cached;
}

export async function completePlanningStage(params: {
  id: string;
  artifact: unknown;
  outputHash: string;
  diagnostic?: Record<string, unknown>;
  requestId?: string;
  provider: string;
  model: string;
}) {
  const [row] = await db()
    .update(animationPlanningStage)
    .set({
      status: 'completed',
      artifact: JSON.stringify(params.artifact),
      outputHash: params.outputHash,
      diagnostic: params.diagnostic ? JSON.stringify(params.diagnostic) : null,
      requestId: params.requestId || null,
      provider: params.provider,
      model: params.model,
      errorCode: null,
      errorMessage: null,
      completedAt: new Date(),
    })
    .where(eq(animationPlanningStage.id, params.id))
    .returning();
  return row;
}

export async function failPlanningStage(params: {
  id: string;
  errorCode: string;
  errorMessage: string;
  diagnostic?: Record<string, unknown>;
  requestId?: string;
}) {
  const [row] = await db()
    .update(animationPlanningStage)
    .set({
      status: 'failed',
      errorCode: params.errorCode.slice(0, 191),
      errorMessage: params.errorMessage
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 1_000),
      diagnostic: params.diagnostic ? JSON.stringify(params.diagnostic) : null,
      requestId: params.requestId || null,
      completedAt: new Date(),
    })
    .where(eq(animationPlanningStage.id, params.id))
    .returning();
  return row;
}

export async function failRunningPlanningStages(params: {
  userId: string;
  chatId: string;
  runId: string;
  errorCode: string;
  errorMessage: string;
}) {
  await db()
    .update(animationPlanningStage)
    .set({
      status: 'failed',
      errorCode: params.errorCode.slice(0, 191),
      errorMessage: params.errorMessage
        .replace(/[\r\n]+/g, ' ')
        .slice(0, 1_000),
      completedAt: new Date(),
    })
    .where(
      and(
        eq(animationPlanningStage.userId, params.userId),
        eq(animationPlanningStage.chatId, params.chatId),
        eq(animationPlanningStage.runId, params.runId),
        eq(animationPlanningStage.status, 'running')
      )
    );
}

export async function listPlanningStages(params: {
  userId: string;
  chatId: string;
  runId: string;
}): Promise<AnimationPlanningStageSummary[]> {
  const rows = await db()
    .select()
    .from(animationPlanningStage)
    .where(
      and(
        eq(animationPlanningStage.userId, params.userId),
        eq(animationPlanningStage.chatId, params.chatId),
        eq(animationPlanningStage.runId, params.runId)
      )
    )
    .orderBy(asc(animationPlanningStage.sequence));
  const byName = new Map<AnimationPlanningStageName, AnimationPlanningStage>(
    rows.map((row: AnimationPlanningStage) => [
      row.stage as AnimationPlanningStageName,
      row,
    ])
  );
  return ANIMATION_PLANNING_STAGES.map((definition) => {
    const row = byName.get(definition.name);
    return row
      ? planningStageSummary(row)
      : {
          name: definition.name,
          sequence: definition.sequence,
          status: 'pending',
          attempt: 0,
        };
  });
}
