/**
 * End-to-end planning smoke test against the real KIE model, on the local
 * database: plan call -> scene call -> mathematics audit -> deterministic
 * Manim compile. Reports wall time, per-attempt outcomes and Kie credits for
 * each prompt. Rendering is out of scope (it needs the renderer container).
 *
 * Usage (reads KIE_API_KEY from .env.development; never printed):
 *   pnpm tsx scripts/with-env.ts tsx scripts/smoke-animation-plan.ts
 *   SMOKE_MODEL=gpt-6-luna SMOKE_ONLY=0,2 pnpm tsx scripts/with-env.ts tsx scripts/smoke-animation-plan.ts
 *   SMOKE_PROMPT="Explain the Pythagorean theorem" ...
 *
 * Each prompt costs a few Kie credits.
 */
import { asc, eq } from 'drizzle-orm';

import type { ChatProvider } from '@/core/ai/chat';
import { KieChatProvider } from '@/core/ai/kie-chat';
import { OpenCodeChatProvider } from '@/core/ai/opencode-chat';
import { db } from '@/core/db';
import {
  animationPlanningAttempt,
  animationPlanningStage,
  chat,
  user,
} from '@/config/db/schema';
import { generateAnimationSpec } from '@/modules/animations/service';
import { getUuid } from '@/lib/hash';
import { compileAnimationSpec } from '@/lib/manim-compiler';

const GOLDEN_PROMPTS = [
  'Animate why the derivative is the slope of a tangent line.',
  '用动画解释为什么 sin 函数的图像是单位圆上一点的纵坐标随角度变化的轨迹。',
  'Show how Riemann sums approach the area under y = x^2 from 0 to 1.',
  'Prove the Pythagorean theorem visually by rearranging four right triangles.',
];

const providerName = process.env.SMOKE_PROVIDER || 'kie';
const apiKey =
  providerName === 'opencode'
    ? process.env.OPENCODE_API_KEY || process.env.opencode_API_KEY
    : process.env.KIE_API_KEY;
if (!apiKey) {
  console.error(
    `${providerName === 'opencode' ? 'OPENCODE_API_KEY' : 'KIE_API_KEY'} is not set (add it to .env.development).`
  );
  process.exit(1);
}
const model =
  process.env.SMOKE_MODEL ||
  (providerName === 'opencode' ? 'claude-haiku-5-5' : 'gpt-6-luna');
const only = (process.env.SMOKE_ONLY || '')
  .split(',')
  .filter(Boolean)
  .map(Number);
const prompts = process.env.SMOKE_PROMPT
  ? [process.env.SMOKE_PROMPT]
  : GOLDEN_PROMPTS.filter((_, index) => !only.length || only.includes(index));

const upstream =
  providerName === 'opencode'
    ? new OpenCodeChatProvider({
        apiKey,
        maxAttempts: 3,
        requestTimeoutMs: 240_000,
        overallTimeoutMs: 300_000,
      })
    : new KieChatProvider({
        apiKey,
        baseUrl: process.env.KIE_BASE_URL || 'https://api.kie.ai',
        maxAttempts: 2,
        requestTimeoutMs: 290_000,
        overallTimeoutMs: 600_000,
      });

// Log every model call; print the mathematics audit verdict in full, since
// it is otherwise only visible as a one-line failure summary.
const provider: ChatProvider = {
  name: upstream.name,
  async complete(input) {
    const label =
      input.responseFormat?.name ||
      input.messages[0]?.content.replace(/\s+/g, ' ').slice(0, 40);
    const started = Date.now();
    try {
      const result = await upstream.complete(input);
      console.log(
        `    call [${label}] ok ${Date.now() - started}ms ${result.content.length}ch tokens=${result.usage?.inputTokens ?? '?'}/${result.usage?.outputTokens ?? '?'} credits=${result.usage?.providerCredits ?? '?'}`
      );
      if (result.content.includes('"checkedClaims"')) {
        console.log(`      audit: ${result.content.slice(0, 12_000)}`);
      }
      return result;
    } catch (error) {
      console.log(
        `    call [${label}] FAILED ${Date.now() - started}ms ${String(
          error instanceof Error ? error.message : error
        ).slice(0, 200)}`
      );
      throw error;
    }
  },
};

const SMOKE_USER = 'smoke-planning-user';

async function ensureUser() {
  await db()
    .insert(user)
    .values({
      id: SMOKE_USER,
      name: 'Planning smoke test',
      email: 'smoke-planning@localhost.invalid',
    })
    .onConflictDoNothing();
}

async function runOne(prompt: string) {
  const chatId = getUuid();
  const runId = getUuid();
  await db()
    .insert(chat)
    .values({
      id: chatId,
      userId: SMOKE_USER,
      status: 'generating_spec',
      model,
      provider: providerName,
      title: prompt.slice(0, 48),
      parts: JSON.stringify({ prompt }),
      metadata: JSON.stringify({ kind: 'animation', smoke: true }),
    });

  const started = Date.now();
  const phases: string[] = [];
  let outcome = 'ok';
  let detail = '';
  try {
    const { spec } = await generateAnimationSpec({
      provider,
      model,
      prompt,
      subject: 'general',
      deadlineAt: Date.now() + 20 * 60_000,
      onPhase: (phase) => {
        phases.push(`${phase}@${Math.round((Date.now() - started) / 1000)}s`);
      },
      planningContext: { userId: SMOKE_USER, chatId, runId },
    });
    const code = compileAnimationSpec(spec);
    detail = `shots=${spec.shots?.length ?? 0} objects=${spec.objects?.length ?? 0} timeline=${spec.timeline?.length ?? 0} formulas=${spec.mathDossier?.formulas?.length ?? 0} manim=${code.length}B`;
  } catch (error) {
    outcome = 'FAILED';
    detail = (error instanceof Error ? error.message : String(error))
      .replace(/\s+/g, ' ')
      .slice(0, 400);
  }
  const seconds = Math.round((Date.now() - started) / 1000);

  const attempts: (typeof animationPlanningAttempt.$inferSelect)[] = await db()
    .select()
    .from(animationPlanningAttempt)
    .where(eq(animationPlanningAttempt.chatId, chatId))
    .orderBy(asc(animationPlanningAttempt.createdAt));
  const stages: { stage: string; status: string; model: string | null }[] =
    await db()
      .select({
        stage: animationPlanningStage.stage,
        status: animationPlanningStage.status,
        model: animationPlanningStage.model,
      })
      .from(animationPlanningStage)
      .where(eq(animationPlanningStage.chatId, chatId));

  const credits =
    attempts.reduce((sum, row) => sum + (row.providerMillicredits ?? 0), 0) /
    1000;
  console.log(`\n=== ${outcome} ${seconds}s  ${prompt}`);
  console.log(`    ${detail}`);
  console.log(`    phases: ${phases.join(' -> ')}`);
  console.log(
    `    stages: ${stages.map((row) => `${row.stage}:${row.status}`).join(' ')}`
  );
  for (const row of attempts) {
    console.log(
      `    attempt ${row.stage}#${row.repairAttempt} ${row.status} ${row.latencyMs}ms out=${row.outputTokens ?? '?'}${
        row.errorCode
          ? ` ${row.errorCode}: ${String(row.errorMessage).slice(0, 160)}`
          : ''
      }`
    );
  }
  console.log(`    kie credits: ${credits.toFixed(2)}`);
  return { outcome, seconds, credits };
}

await ensureUser();
console.log(
  `provider=${providerName} model=${model} prompts=${prompts.length}`
);
const results = [];
for (const prompt of prompts) results.push(await runOne(prompt));
const ok = results.filter((result) => result.outcome === 'ok');
console.log(
  `\nSUMMARY ${ok.length}/${results.length} ok; seconds ${results
    .map((result) => result.seconds)
    .join(
      ','
    )}; credits ${results.map((result) => result.credits.toFixed(2)).join(',')}`
);
process.exit(0);
