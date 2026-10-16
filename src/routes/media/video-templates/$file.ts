import { createFileRoute } from '@tanstack/react-router';

import { getVideoTemplate } from '@/lib/video-templates';

/**
 * Template sample films from R2 (`video-templates/<id>-<locale>.mp4`), made
 * by `scripts/video-template-samples.ts --publish`. Only known template ids
 * are served; Range requests pass through so the player can seek.
 */

const FILE = /^([a-z0-9-]{1,80})-(zh|en)\.mp4$/;

interface MediaBucket {
  get(key: string, options?: Record<string, unknown>): Promise<any>;
}

const notFound = () => new Response('Not found', { status: 404 });

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { file: string };
}) {
  const match = FILE.exec(params.file);
  if (!match || !getVideoTemplate(match[1])) return notFound();
  const bucket = (globalThis as any).__CF_ENV__?.CURVG_ASSETS as
    | MediaBucket
    | undefined;
  if (!bucket) return notFound();
  const object = await bucket.get(`video-templates/${params.file}`, {
    range: request.headers,
  });
  if (!object || !('body' in object)) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', 'video/mp4');
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=86400');
  let status = 200;
  if (object.range && 'offset' in object.range) {
    const start = object.range.offset;
    headers.set(
      'content-range',
      `bytes ${start}-${start + object.range.length - 1}/${object.size}`
    );
    headers.set('content-length', String(object.range.length));
    status = 206;
  } else {
    headers.set('content-length', String(object.size));
  }
  return new Response(object.body, { status, headers });
}

export const Route = createFileRoute('/media/video-templates/$file')({
  server: { handlers: { GET } },
});
