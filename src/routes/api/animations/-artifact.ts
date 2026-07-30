import { getAllConfigs } from '@/modules/config/service';
import { respErr } from '@/lib/resp';

export type AnimationArtifactKind =
  | 'video'
  | 'thumbnail'
  | 'contact-sheet'
  | 'qa-report';

interface ArtifactBucket {
  get(key: string, options?: Record<string, unknown>): Promise<any>;
}

const extensions: Record<AnimationArtifactKind, string> = {
  video: 'video.mp4',
  thumbnail: 'thumbnail.jpg',
  'contact-sheet': 'contact-sheet.jpg',
  'qa-report': 'qa-report.json',
};

export function animationArtifactKind(
  value: string
): AnimationArtifactKind | undefined {
  return Object.hasOwn(extensions, value)
    ? (value as AnimationArtifactKind)
    : undefined;
}

function artifactBucket(): ArtifactBucket | undefined {
  const bindings = (globalThis as any).__CF_ENV__;
  return bindings?.CURVG_ASSETS as ArtifactBucket | undefined;
}

async function proxyRendererArtifact(params: {
  request: Request;
  animationId: string;
  jobId: string;
  kind: AnimationArtifactKind;
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
  const requestHeaders = new Headers({ Authorization: `Bearer ${token}` });
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

export async function readAnimationArtifact(params: {
  request: Request;
  animationId: string;
  jobId: string;
  kind: AnimationArtifactKind;
  cacheControl?: string;
}): Promise<Response> {
  const bucket = artifactBucket();
  if (!bucket) return proxyRendererArtifact(params);

  const object = await bucket.get(
    `animations/${params.animationId}/${params.jobId}/${extensions[params.kind]}`,
    { range: params.request.headers }
  );
  if (!object || !('body' in object)) {
    return respErr('Artifact not found', { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('content-disposition', 'inline');
  headers.set('cache-control', params.cacheControl || 'private, max-age=86400');
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
}
