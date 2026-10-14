import { createFileRoute } from '@tanstack/react-router';

import { getLab } from '@/content/labs';

/**
 * Lab film media from R2 (`labs/videos/<slug>/<file>`): the MP4s, posters
 * and captions `pnpm video:labs` renders and `pnpm video:labs:publish`
 * uploads. Too large for git, so they live outside `public/`. Only the
 * fixed file names below are served; Range requests pass through so the
 * player can seek. Needs the Worker's R2 binding: under `pnpm dev` it 404s,
 * use `wrangler dev` with a local bucket to preview.
 */

const FILE = /^(zh|en)-(landscape|portrait)\.(mp4|jpg)$|^(zh|en)\.vtt$/;

const TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
  vtt: 'text/vtt; charset=utf-8',
};

interface MediaBucket {
  get(key: string, options?: Record<string, unknown>): Promise<any>;
}

function mediaBucket(): MediaBucket | undefined {
  const bindings = (globalThis as any).__CF_ENV__;
  return bindings?.CURVG_ASSETS as MediaBucket | undefined;
}

const notFound = () => new Response('Not found', { status: 404 });

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { slug: string; file: string };
}) {
  if (!getLab(params.slug) || !FILE.test(params.file)) return notFound();
  const type = TYPES[params.file.split('.').pop()!];

  const bucket = mediaBucket();
  if (!bucket) return notFound();

  const object = await bucket.get(`labs/videos/${params.slug}/${params.file}`, {
    range: request.headers,
  });
  if (!object || !('body' in object)) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', type);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  // Re-renders overwrite the same key; a day keeps edits from sticking long.
  headers.set('cache-control', 'public, max-age=86400');
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

export const Route = createFileRoute('/media/labs/$slug/$file')({
  server: { handlers: { GET } },
});
