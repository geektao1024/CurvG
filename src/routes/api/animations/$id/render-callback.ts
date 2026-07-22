import { createFileRoute } from '@tanstack/react-router';

import { updateRender } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { respErr, respOk } from '@/lib/resp';

import { hasBearerToken } from '../-shared';

const statuses = new Set(['rendering', 'completed', 'failed']);

function optionalArtifactUrl(
  value: unknown,
  origin: string,
  id: string,
  jobId: string,
  kind: 'video' | 'thumbnail'
): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const url = new URL(value);
  if (url.origin !== origin) {
    throw new Error('Artifact URL origin is invalid');
  }
  const expectedPath = `/api/animations/${encodeURIComponent(id)}/artifact/${kind}`;
  if (
    url.pathname !== expectedPath ||
    url.searchParams.get('jobId') !== jobId
  ) {
    throw new Error('Artifact URL is invalid');
  }
  return url.toString();
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
    const body = await request.json().catch(() => ({}));
    if (typeof body.status !== 'string' || !statuses.has(body.status)) {
      return respErr('Invalid render status');
    }
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      return respErr('Invalid render job');
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
    if (body.status === 'completed' && !videoUrl) {
      return respErr('Completed render requires a video URL');
    }
    await updateRender({
      id: params.id,
      jobId,
      status: body.status as 'rendering' | 'completed' | 'failed',
      videoUrl,
      thumbnailUrl,
      error:
        typeof body.error === 'string' ? body.error.slice(0, 2000) : undefined,
    });
    return respOk();
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations/$id/render-callback')({
  server: { handlers: { POST } },
});
