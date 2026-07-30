import { createFileRoute } from '@tanstack/react-router';

import {
  composeAnimationMathematicalRepair,
  composeAnimationQualityRepair,
  getAnimation,
  getAnimationQualityContext,
  recordAnimationQualityGate,
} from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import type { AnimationSpec, AnimationVisualReview } from '@/lib/animation';
import {
  decideAnimationQualityGate,
  deterministicReviewFromQa,
  isAnimationVisualQaReviewable,
  validateAnimationVisualQaReport,
} from '@/lib/animation-qa';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

import { runAnimationSemanticReview } from '../-quality';
import {
  hasBearerToken,
  resolveAnimationOrchestrator,
  resolveChatProvider,
  withAnimationGenerationCapacity,
} from '../-shared';

function renderErrorReview(params: {
  jobId: string;
  error: string;
}): AnimationVisualReview {
  return {
    status: 'needs_revision',
    model: 'curvg-render-validator',
    summary: 'The scene did not pass validation or rendering.',
    strengths: [],
    issues: [
      {
        category: 'legibility',
        severity: 'blocking',
        frames: [],
        problem: params.error,
        suggestion:
          'Repair only the failing Manim source while preserving the approved mathematics, visual argument, and correct scene structure.',
      },
    ],
    reviewedAt: new Date().toISOString(),
    jobId: params.jobId,
  };
}

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const configs = await getAllConfigs();
    if (!hasBearerToken(request, configs.animation_renderer_token || '')) {
      return respErr('Unauthorized', { status: 401 });
    }
    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.renderCallback
    );
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    const kind = body.kind;
    const attempt = body.attempt;
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      return respErr('Invalid render job', { status: 400 });
    }
    if (
      kind !== 'render_error' &&
      kind !== 'visual_review' &&
      kind !== 'final_review'
    ) {
      return respErr('Invalid quality gate kind', { status: 400 });
    }
    if (
      !Number.isInteger(attempt) ||
      Number(attempt) < 0 ||
      Number(attempt) > 5
    ) {
      return respErr('Invalid quality gate attempt', { status: 400 });
    }

    const context = await getAnimationQualityContext(params.id, jobId);
    const attemptNumber = Number(attempt);
    if (attemptNumber > context.qualityControl.maxRepairs) {
      return respErr('Quality repair budget exceeded', { status: 409 });
    }
    const existing = context.qualityControl.attempts.find(
      (entry) => entry.attempt === attemptNumber && entry.kind === kind
    );
    if (existing) {
      return respData({
        action: existing.action,
        attempt: attemptNumber,
        ...(existing.action === 'repair' ? { code: context.code } : {}),
      });
    }

    let visualQa;
    let review: AnimationVisualReview;
    let renderError: string | undefined;
    const approvedCode =
      typeof body.approvedCode === 'string' ? body.approvedCode : undefined;
    if (
      approvedCode !== undefined &&
      (kind !== 'final_review' ||
        approvedCode.length < 100 ||
        approvedCode.length > 60_000 ||
        !approvedCode.includes('from manim import') ||
        !/class\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
          approvedCode
        ))
    ) {
      return respErr('Invalid approved render code', { status: 400 });
    }
    if (kind === 'render_error') {
      renderError =
        typeof body.error === 'string'
          ? body.error
              .replace(/[\u0000-\u001f\u007f]+/g, ' ')
              .trim()
              .slice(0, 2_000)
          : 'Manim validation or rendering failed';
      review = renderErrorReview({ jobId, error: renderError });
    } else {
      visualQa = validateAnimationVisualQaReport(body.visualQa);
      if (isAnimationVisualQaReviewable(visualQa)) {
        const detail = await getAnimation(context.userId, context.id);
        detail.parts.visualQa = visualQa;
        const origin = configs.app_url?.trim()
          ? new URL(configs.app_url).origin
          : new URL(request.url).origin;
        try {
          review = await runAnimationSemanticReview({
            detail,
            configs,
            origin,
            signal: request.signal,
          });
        } catch (error) {
          console.warn('[animation-quality-gate] semantic review degraded', {
            animationId: context.id,
            jobId,
            attempt: attemptNumber,
            error: error instanceof Error ? error.message : String(error),
          });
          review = deterministicReviewFromQa({ qa: visualQa, jobId });
        }
      } else {
        review = deterministicReviewFromQa({ qa: visualQa, jobId });
      }
    }

    const action = decideAnimationQualityGate({
      qa: visualQa,
      review,
      attempt: attemptNumber,
      maxRepairs: context.qualityControl.maxRepairs,
      renderError,
    });
    let code: string | undefined;
    let spec: AnimationSpec | undefined;
    if (action === 'repair') {
      let orchestrator;
      try {
        orchestrator = resolveAnimationOrchestrator(configs);
      } catch (error) {
        console.error('[animation-quality-gate] orchestrator degraded', {
          animationId: context.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      const selection = context.modelSelection || { choice: 'auto' as const };
      const resolution = await resolveChatProvider(
        configs,
        context.userId,
        selection.choice,
        selection.model
      );
      const hasMathDefect = review.issues.some(
        (issue) => issue.category === 'math_fidelity'
      );
      if (hasMathDefect) {
        const repaired = await withAnimationGenerationCapacity(
          context.userId,
          () =>
            composeAnimationMathematicalRepair({
              context,
              provider: resolution.provider,
              model: resolution.model,
              review,
              orchestrator,
              signal: request.signal,
            })
        );
        spec = repaired.spec;
        code = repaired.code;
      } else {
        const evidence = JSON.stringify(
          {
            repairPass: attemptNumber + 1,
            approvedSpecification: context.spec,
            deterministicFrameMetrics: visualQa || null,
            cinematographerReview: review,
            renderError: renderError || null,
            instruction:
              'Preserve correct work. Repair only the evidenced defects. Return a complete self-contained CurvGScene.',
          },
          null,
          2
        );
        const repaired = await withAnimationGenerationCapacity(
          context.userId,
          () =>
            composeAnimationQualityRepair({
              context,
              provider: resolution.provider,
              model: resolution.model,
              evidence,
              orchestrator,
              signal: request.signal,
            })
        );
        code = repaired.code;
      }
    } else if (action === 'approve' && approvedCode) {
      // The renderer may select a previously rendered higher-quality
      // candidate after later autonomous repairs regress. Persist the exact
      // source that produced the approved artifact.
      code = approvedCode;
    }
    const persisted = await recordAnimationQualityGate({
      id: params.id,
      jobId,
      attempt: attemptNumber,
      kind,
      action,
      visualQa,
      visualReview: review,
      spec,
      code,
    });
    return respData({
      action,
      attempt: attemptNumber,
      ...(action === 'repair' ? { code: persisted.code } : {}),
    });
  } catch (error) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    console.error('[animation-quality-gate] failed', {
      animationId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return respErr('Animation quality gate failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/animations/$id/quality-gate')({
  server: { handlers: { POST } },
});
