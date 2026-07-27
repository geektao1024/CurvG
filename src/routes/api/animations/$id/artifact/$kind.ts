import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAnimation } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { respErr } from '@/lib/resp';

interface ArtifactBucket {
  get(key: string, options?: Record<string, unknown>): Promise<any>;
}

function artifactBucket(): ArtifactBucket | undefined {
  const bindings = (globalThis as any).__CF_ENV__;
  return bindings?.CURVG_ASSETS as ArtifactBucket | undefined;
}

async function proxyRendererArtifact(params: {
  request: Request;
  animationId: string;
  jobId: string;
  kind: 'video' | 'thumbnail';
}): Promise<Response> {
  const configs = await getAllConfigs();
  const baseUrl = configs.animation_renderer_url?.trim();
  const token = configs.animation_renderer_token?.trim();
  if (!baseUrl || !token) {
    return respErr('Artifact storage is unavailable', { status: 503 });
  }
  const target = new URL(
    `/artifact/${encodeURIComponent(params.animationId)}/${encodeURIComponent(params.jobId)}/${params.kind}`,
    baseUrl
  );
  if (!['http:', 'https:'].includes(target.protocol)) {
    return respErr('Artifact storage is unavailable', { status: 503 });
  }
  const requestHeaders = new Headers({
    Authorization: `Bearer ${token}`,
  });
  const range = params.request.headers.get('range');
  if (range) requestHeaders.set('range', range);
  const response = await fetch(target, {
    headers: requestHeaders,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body) {
    return respErr(
      response.status === 404 ? 'Artifact not found' : 'Artifact read failed',
      { status: response.status === 404 ? 404 : 502 }
    );
  }
  const headers = new Headers();
  for (const name of [
    'accept-ranges',
    'cache-control',
    'content-disposition',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
  ]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string; kind: string };
}) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const detail = await getAnimation(session.user.id, params.id);
    if (detail.status !== 'completed') {
      return respErr('Artifact is not ready', { status: 404 });
    }
    const extension =
      params.kind === 'video'
        ? 'video.mp4'
        : params.kind === 'thumbnail'
          ? 'thumbnail.jpg'
          : '';
    if (!extension) return respErr('Artifact not found', { status: 404 });
    const jobId = new URL(request.url).searchParams.get('jobId') || '';
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      return respErr('Artifact not found', { status: 404 });
    }
    if (detail.parts.render?.jobId !== jobId) {
      return respErr('Artifact version is not current', { status: 404 });
    }
    const bucket = artifactBucket();
    if (!bucket) {
      return proxyRendererArtifact({
        request,
        animationId: params.id,
        jobId,
        kind: params.kind as 'video' | 'thumbnail',
      });
    }
    const object = await bucket.get(
      `animations/${params.id}/${jobId}/${extension}`,
      { range: request.headers }
    );
    if (!object || !('body' in object)) {
      return respErr('Artifact not found', { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('accept-ranges', 'bytes');
    headers.set('cache-control', 'private, max-age=86400');
    let status = 200;
    if (object.range && 'offset' in object.range) {
      const start = object.range.offset;
      const end = start + object.range.length - 1;
      headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
      headers.set('content-length', String(object.range.length));
      status = 206;
    } else {
      headers.set('content-length', String(object.size));
    }
    return new Response(object.body, { status, headers });
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Internal error');
  }
}

export const Route = createFileRoute('/api/animations/$id/artifact/$kind')({
  server: { handlers: { GET } },
});
