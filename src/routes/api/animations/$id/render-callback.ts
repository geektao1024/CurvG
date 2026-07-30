import { createFileRoute } from '@tanstack/react-router';

import { AITaskStatus, updateTask } from '@/modules/ai-tasks/service';
import { updateRender } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { validateAnimationVisualQaReport } from '@/lib/animation-qa';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

import { hasBearerToken } from '../-shared';

const statuses = new Set(['rendering', 'completed', 'failed']);
const stages = new Set([
  'validating',
  'compiling',
  'transcoding',
  'reviewing',
  'uploading',
]);

class RenderCallbackValidationError extends Error {}

export function renderCallbackErrorResponse(error: unknown): Response {
  if (isRequestBodyTooLargeError(error)) {
    return respErr('Request body is too large', { status: 413 });
  }
  if (error instanceof RenderCallbackValidationError) {
    return respErr(error.message, { status: 400 });
  }
  return respErr('Render callback failed', { status: 500 });
}

function optionalArtifactUrl(
  value: unknown,
  origin: string,
  id: string,
  jobId: string,
  kind: 'video' | 'thumbnail' | 'contact-sheet' | 'qa-report'
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const url = new URL(value, origin);
  if (url.origin !== origin) {
    throw new RenderCallbackValidationError('Artifact URL origin is invalid');
  }
  const expectedPath = `/api/animations/${encodeURIComponent(id)}/artifact/${kind}`;
  if (
    url.pathname !== expectedPath ||
    url.searchParams.get('jobId') !== jobId
  ) {
    throw new RenderCallbackValidationError('Artifact URL is invalid');
  }
  return `${expectedPath}?jobId=${encodeURIComponent(jobId)}`;
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
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    if (typeof body.status !== 'string' || !statuses.has(body.status)) {
      return respErr('Invalid render status', { status: 400 });
    }
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      return respErr('Invalid render job', { status: 400 });
    }
    const origin = new URL(request.url).origin;
    const videoUrl = optionalArtifactUrl(
      body.videoUrl,
      origin,
      params.id,
      jobId,
      'video'
    );
    const thumbnailUrl = optionalArtifactUrl(
      body.thumbnailUrl,
      origin,
      params.id,
      jobId,
      'thumbnail'
    );
    const contactSheetUrl = optionalArtifactUrl(
      body.contactSheetUrl,
      origin,
      params.id,
      jobId,
      'contact-sheet'
    );
    const qaReportUrl = optionalArtifactUrl(
      body.qaReportUrl,
      origin,
      params.id,
      jobId,
      'qa-report'
    );
    let visualQa;
    if (body.visualQa !== undefined) {
      try {
        visualQa = validateAnimationVisualQaReport(body.visualQa);
      } catch (error) {
        // Deterministic QA is diagnostic metadata. A malformed report must not
        // downgrade a successfully rendered and uploaded video to failed.
        console.warn('[render-callback] ignored invalid visual QA report', {
          animationId: params.id,
          jobId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (body.status === 'completed' && !videoUrl) {
      return respErr('Completed render requires a video URL', { status: 400 });
    }
    const stage =
      typeof body.stage === 'string' && stages.has(body.stage)
        ? (body.stage as
            | 'validating'
            | 'compiling'
            | 'transcoding'
            | 'reviewing'
            | 'uploading')
        : undefined;
    const progress =
      typeof body.progress === 'number' && Number.isFinite(body.progress)
        ? Math.max(0, Math.min(100, body.progress))
        : undefined;
    const result = await updateRender({
      id: params.id,
      jobId,
      status: body.status as 'rendering' | 'completed' | 'failed',
      stage,
      progress,
      videoUrl,
      thumbnailUrl,
      contactSheetUrl,
      qaReportUrl: visualQa ? qaReportUrl : undefined,
      visualQa,
      error:
        typeof body.error === 'string' ? body.error.slice(0, 2000) : undefined,
    });
    if (
      result.creditTaskId &&
      (result.status === 'completed' || result.status === 'failed')
    ) {
      await updateTask({
        taskId: result.creditTaskId,
        status:
          result.status === 'completed'
            ? AITaskStatus.SUCCESS
            : AITaskStatus.FAILED,
      });
    }
    return respData({ cancelRequested: result.cancelRequested });
  } catch (error) {
    if (
      !isRequestBodyTooLargeError(error) &&
      !(error instanceof RenderCallbackValidationError)
    ) {
      console.error('[render-callback] failed', {
        animationId: params.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    // A non-2xx response is required so the renderer retries transient DB or
    // internal failures instead of permanently dropping a valid completion.
    return renderCallbackErrorResponse(error);
  }
}

export const Route = createFileRoute('/api/animations/$id/render-callback')({
  server: { handlers: { POST } },
});
