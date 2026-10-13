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
const sha256DigestPattern = /^[a-f0-9]{64}$/;

class RenderCallbackValidationError extends Error {}

export function parseRenderCallbackVisualQa(params: {
  status: string;
  value: unknown;
  strictDelivery?: boolean;
}) {
  if (params.value === undefined) {
    if (params.status === 'completed' && params.strictDelivery) {
      throw new RenderCallbackValidationError(
        'Completed render requires a valid visual QA report'
      );
    }
    return undefined;
  }
  try {
    return validateAnimationVisualQaReport(params.value);
  } catch (error) {
    if (params.status === 'completed' && params.strictDelivery) {
      throw new RenderCallbackValidationError(
        'Completed render requires a valid visual QA report'
      );
    }
    console.warn('[render-callback] ignored invalid visual QA report', {
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

export function renderCallbackErrorResponse(error: unknown): Response {
  if (isRequestBodyTooLargeError(error)) {
    return respErr('Request body is too large', { status: 413 });
  }
  if (error instanceof RenderCallbackValidationError) {
    return respErr(error.message, { status: 400 });
  }
  return respErr('Render callback failed', { status: 500 });
}

export function optionalArtifactUrl(
  value: unknown,
  origin: string,
  id: string,
  jobId: string,
  kind:
    | 'video'
    | 'thumbnail'
    | 'contact-sheet'
    | 'qa-report'
    | 'events'
    | 'state-track'
    | 'run-manifest'
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    throw new RenderCallbackValidationError('Artifact URL is invalid');
  }
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
    const eventsUrl = optionalArtifactUrl(
      body.eventsUrl,
      origin,
      params.id,
      jobId,
      'events'
    );
    const stateTrackUrl = optionalArtifactUrl(
      body.stateTrackUrl,
      origin,
      params.id,
      jobId,
      'state-track'
    );
    const runManifestUrl = optionalArtifactUrl(
      body.runManifestUrl,
      origin,
      params.id,
      jobId,
      'run-manifest'
    );
    const productionMode =
      body.productionMode === 'simulation_short'
        ? 'simulation_short'
        : body.productionMode === 'explainer' ||
            body.productionMode === undefined
          ? 'explainer'
          : undefined;
    if (!productionMode) {
      return respErr('Invalid production mode', { status: 400 });
    }
    if (
      productionMode === 'explainer' &&
      [body.runDigest, body.compiledSourceDigest].some(
        (value) => value !== undefined
      )
    ) {
      return respErr('Explainer callback cannot include simulation digests', {
        status: 400,
      });
    }
    const runDigest =
      typeof body.runDigest === 'string' &&
      sha256DigestPattern.test(body.runDigest)
        ? body.runDigest
        : undefined;
    const compiledSourceDigest =
      typeof body.compiledSourceDigest === 'string' &&
      sha256DigestPattern.test(body.compiledSourceDigest)
        ? body.compiledSourceDigest
        : undefined;
    const videoDigest =
      typeof body.videoDigest === 'string' &&
      sha256DigestPattern.test(body.videoDigest)
        ? body.videoDigest
        : undefined;
    const strictDelivery = body.protocolVersion === 'curvg-renderer/v2';
    if (
      strictDelivery &&
      body.status === 'completed' &&
      (!videoDigest || body.videoDigest !== videoDigest)
    ) {
      return respErr('Completed v2 callback has an invalid video digest', {
        status: 400,
      });
    }
    if (
      productionMode === 'simulation_short' &&
      (!runDigest ||
        !compiledSourceDigest ||
        (body.status === 'completed' && !videoDigest) ||
        (body.videoDigest !== undefined && !videoDigest))
    ) {
      return respErr('Simulation callback digests are invalid', {
        status: 400,
      });
    }
    const simulationArtifactCount = [
      eventsUrl,
      stateTrackUrl,
      runManifestUrl,
    ].filter(Boolean).length;
    if (
      (productionMode === 'simulation_short' &&
        body.status === 'completed' &&
        simulationArtifactCount !== 3) ||
      (productionMode === 'explainer' && simulationArtifactCount !== 0)
    ) {
      return respErr('Simulation artifact URLs are incomplete', {
        status: 400,
      });
    }
    const visualQa = parseRenderCallbackVisualQa({
      status: body.status,
      value: body.visualQa,
      strictDelivery: body.protocolVersion === 'curvg-renderer/v2',
    });
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
      qaReportUrl,
      eventsUrl,
      stateTrackUrl,
      runManifestUrl,
      runDigest,
      compiledSourceDigest,
      videoDigest,
      productionMode,
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
