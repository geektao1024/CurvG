import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';

import { db } from '@/core/db';
import { aiTask } from '@/config/db/schema';
import { consume, revoke } from '@/modules/credits/service';
import { getUuid } from '@/lib/hash';

export enum AITaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export interface CreateTaskParams {
  userId: string;
  mediaType: string;
  provider: string;
  model: string;
  prompt: string;
  costCredits?: number;
  options?: unknown;
}

export interface CreateTaskDependencies {
  database: {
    transaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
  };
  consumeCredits: typeof consume;
  createId: () => string;
}

/**
 * Create an AI task with optional credit consumption.
 */
export async function createTaskWithDependencies(
  params: CreateTaskParams,
  dependencies: CreateTaskDependencies
): Promise<any> {
  const { userId, mediaType, provider, model, prompt, costCredits, options } =
    params;

  return dependencies.database.transaction(async (tx: any) => {
    const taskId = dependencies.createId();
    const taskData: any = {
      id: taskId,
      userId,
      mediaType,
      provider,
      model,
      prompt,
      status: AITaskStatus.PENDING,
      costCredits: costCredits || 0,
      options: options ? JSON.stringify(options) : undefined,
    };

    // Reserve credits before inserting the task. Cloudflare D1 does not
    // provide rollback semantics for this interactive transaction callback,
    // so inserting first would leave an orphaned pending task whenever the
    // balance check fails.
    if (costCredits && costCredits > 0) {
      const result = await dependencies.consumeCredits({
        userId,
        credits: costCredits,
        scene: 'ai_task',
        description: `AI ${mediaType} generation`,
        metadata: JSON.stringify({ taskId }),
        tx,
      });

      if (!result.success) {
        throw new Error('Insufficient credits');
      }

      if (result.consumedCredit) {
        taskData.creditId = result.consumedCredit.id;
        taskData.taskInfo = JSON.stringify({
          creditId: result.consumedCredit.id,
        });
      }
    }

    const [task] = await tx.insert(aiTask).values(taskData).returning();
    return task;
  });
}

export async function createTask(params: CreateTaskParams): Promise<any> {
  return createTaskWithDependencies(params, {
    database: db(),
    consumeCredits: consume,
    createId: getUuid,
  });
}

/**
 * Update task status. Revokes credits on failure.
 */
export async function updateTask(params: {
  taskId: string;
  status: AITaskStatus;
  taskResult?: any;
}) {
  const { taskId, status, taskResult } = params;

  const [task] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);

  if (!task) throw new Error('Task not found');

  // Update task
  const updateData: any = { status };
  if (taskResult) {
    updateData.taskResult = JSON.stringify(taskResult);
  }

  await db().update(aiTask).set(updateData).where(eq(aiTask.id, taskId));

  // Failed and user-canceled renders do not consume credits. Revoke is
  // idempotent because it only accepts an active consumption record.
  if (
    [AITaskStatus.FAILED, AITaskStatus.CANCELED].includes(status) &&
    task.taskInfo
  ) {
    const info = JSON.parse(task.taskInfo as string) as {
      creditId?: unknown;
    };
    if (typeof info.creditId === 'string' && info.creditId) {
      await revoke(info.creditId);
    }
  }
}

/**
 * Get tasks for a user.
 */
export async function getTasks(params: {
  userId: string;
  mediaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, mediaType, status, page = 1, limit = 20 } = params;

  return db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, userId),
        mediaType ? eq(aiTask.mediaType, mediaType) : undefined,
        status ? eq(aiTask.status, status) : undefined,
        isNull(aiTask.deletedAt)
      )
    )
    .orderBy(desc(aiTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}

/**
 * Find task by ID.
 */
export async function findTask(taskId: string) {
  const [result] = await db()
    .select()
    .from(aiTask)
    .where(eq(aiTask.id, taskId))
    .limit(1);
  return result;
}

/**
 * Fail a user's tasks that have been pending or processing since before
 * `olderThan` and refund their credits. Each row moves only through a
 * conditional update, so a render that finishes at the same moment keeps its
 * success and is never refunded. Returns the number of tasks failed.
 */
export async function failStaleTasks(params: {
  userId: string;
  mediaType: string;
  olderThan: Date;
}): Promise<number> {
  const stale = await db()
    .select()
    .from(aiTask)
    .where(
      and(
        eq(aiTask.userId, params.userId),
        eq(aiTask.mediaType, params.mediaType),
        inArray(aiTask.status, [AITaskStatus.PENDING, AITaskStatus.PROCESSING]),
        lt(aiTask.updatedAt, params.olderThan),
        isNull(aiTask.deletedAt)
      )
    );
  let failed = 0;
  for (const task of stale) {
    await db()
      .update(aiTask)
      .set({ status: AITaskStatus.FAILED })
      .where(and(eq(aiTask.id, task.id), eq(aiTask.status, task.status)));
    const [current] = await db()
      .select({ status: aiTask.status })
      .from(aiTask)
      .where(eq(aiTask.id, task.id))
      .limit(1);
    if (current?.status !== AITaskStatus.FAILED) continue;
    failed += 1;
    const info = task.taskInfo
      ? (JSON.parse(task.taskInfo as string) as { creditId?: unknown })
      : {};
    if (typeof info.creditId === 'string' && info.creditId) {
      await revoke(info.creditId);
    }
  }
  return failed;
}
