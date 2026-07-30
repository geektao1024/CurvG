import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AITaskStatus,
  createTaskWithDependencies,
} from '../src/modules/ai-tasks/service';
import { affectedRowCount } from '../src/modules/credits/service';

test('credit revocation recognizes affected-row results from every database adapter', () => {
  assert.equal(affectedRowCount({ rowsAffected: 1 }), 1);
  assert.equal(affectedRowCount({ changes: 1 }), 1);
  assert.equal(affectedRowCount({ rowCount: 1 }), 1);
  assert.equal(affectedRowCount({ count: 1 }), 1);
  assert.equal(affectedRowCount({ meta: { changes: 1 } }), 1);
  assert.equal(affectedRowCount([{ affectedRows: 1 }]), 1);
});

test('credit revocation fails closed when a database result is ambiguous', () => {
  assert.throws(
    () => affectedRowCount({ ok: true }),
    /Unable to confirm credit revocation/
  );
});

test('insufficient credit checks do not leave orphaned pending AI tasks', async () => {
  let inserted = false;
  const database = {
    async transaction<T>(callback: (tx: any) => Promise<T>) {
      return callback({
        insert() {
          inserted = true;
          return {
            values() {
              return { returning: async () => [] };
            },
          };
        },
      });
    },
  };

  await assert.rejects(
    createTaskWithDependencies(
      {
        userId: 'user-1',
        mediaType: 'animation_render',
        provider: 'cloudflare-sandbox',
        model: 'deterministic-manim-v2',
        prompt: 'animation:animation-1',
        costCredits: 20,
      },
      {
        database,
        createId: () => 'task-1',
        consumeCredits: async () => ({ success: false }),
      }
    ),
    /Insufficient credits/
  );

  assert.equal(inserted, false);
});

test('successful reservations are linked to the inserted AI task', async () => {
  let insertedTask: Record<string, unknown> | undefined;
  const database = {
    async transaction<T>(callback: (tx: any) => Promise<T>) {
      return callback({
        insert() {
          return {
            values(value: Record<string, unknown>) {
              insertedTask = value;
              return { returning: async () => [value] };
            },
          };
        },
      });
    },
  };

  const task = await createTaskWithDependencies(
    {
      userId: 'user-1',
      mediaType: 'animation_render',
      provider: 'cloudflare-sandbox',
      model: 'deterministic-manim-v2',
      prompt: 'animation:animation-1',
      costCredits: 20,
      options: { animationId: 'animation-1' },
    },
    {
      database,
      createId: () => 'task-1',
      consumeCredits: async () => ({
        success: true,
        consumedCredit: { id: 'credit-1' },
      }),
    }
  );

  assert.equal(task.status, AITaskStatus.PENDING);
  assert.deepEqual(JSON.parse(String(insertedTask?.taskInfo)), {
    creditId: 'credit-1',
  });
  assert.deepEqual(JSON.parse(String(insertedTask?.options)), {
    animationId: 'animation-1',
  });
  assert.equal(insertedTask?.creditId, 'credit-1');
});
