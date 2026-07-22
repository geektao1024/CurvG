import { getSandbox, type Sandbox } from '@cloudflare/sandbox';

export { Sandbox } from '@cloudflare/sandbox';

interface RenderJob {
  animationId: string;
  callbackUrl: string;
  code: string;
  jobId: string;
}

interface Env {
  Sandbox: DurableObjectNamespace<Sandbox>;
  ARTIFACTS: R2Bucket;
  RENDER_QUEUE: Queue<RenderJob>;
  CALLBACK_ORIGIN: string;
  RENDERER_TOKEN: string;
}

const animationIdPattern = /^[A-Za-z0-9-]{1,80}$/;

function hasBearerToken(request: Request, expected: string): boolean {
  const value = request.headers.get('authorization') || '';
  const actual = value.startsWith('Bearer ') ? value.slice(7) : '';
  const left = new TextEncoder().encode(actual);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0 && right.length > 0;
}

function parseJob(request: Request, body: Record<string, unknown>, env: Env) {
  const animationId =
    typeof body.animationId === 'string' ? body.animationId : '';
  const code = typeof body.code === 'string' ? body.code : '';
  const callbackValue =
    typeof body.callbackUrl === 'string' ? body.callbackUrl : '';
  if (!animationIdPattern.test(animationId)) {
    throw new Error('Invalid animation ID');
  }
  if (code.length < 100 || code.length > 60_000) {
    throw new Error('Invalid Manim code length');
  }
  if (!code.includes('from manim import')) {
    throw new Error('Manim import is required');
  }
  if (!/class\s+CurvGScene\s*\(\s*Scene\s*\)/.test(code)) {
    throw new Error('CurvGScene is required');
  }
  const callbackUrl = new URL(callbackValue);
  const allowedOrigin = new URL(env.CALLBACK_ORIGIN).origin;
  if (
    callbackUrl.protocol !== 'https:' &&
    callbackUrl.hostname !== 'localhost'
  ) {
    throw new Error('Callback URL must use HTTPS');
  }
  if (callbackUrl.origin !== allowedOrigin) {
    throw new Error('Callback origin is not allowed');
  }
  const expectedPath = `/api/animations/${encodeURIComponent(animationId)}/render-callback`;
  if (callbackUrl.pathname !== expectedPath) {
    throw new Error('Callback path is invalid');
  }
  if (new URL(request.url).pathname !== '/render') {
    throw new Error('Not found');
  }
  return {
    animationId,
    code,
    callbackUrl: callbackUrl.toString(),
    jobId: crypto.randomUUID(),
  } satisfies RenderJob;
}

async function notify(
  job: RenderJob,
  env: Env,
  payload: Record<string, unknown>
) {
  const response = await fetch(job.callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RENDERER_TOKEN}`,
    },
    body: JSON.stringify({ ...payload, jobId: job.jobId }),
  });
  const result = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || result.code !== 0) {
    throw new Error(
      typeof result.message === 'string'
        ? result.message
        : `Callback failed (${response.status})`
    );
  }
}

function artifactUrls(job: RenderJob) {
  const origin = new URL(job.callbackUrl).origin;
  const base = `${origin}/api/animations/${encodeURIComponent(job.animationId)}/artifact`;
  return {
    videoUrl: `${base}/video?jobId=${encodeURIComponent(job.jobId)}`,
    thumbnailUrl: `${base}/thumbnail?jobId=${encodeURIComponent(job.jobId)}`,
  };
}

async function processJob(job: RenderJob, env: Env) {
  const artifactPrefix = `animations/${job.animationId}/${job.jobId}`;
  const videoKey = `${artifactPrefix}/video.mp4`;
  const thumbnailKey = `${artifactPrefix}/thumbnail.jpg`;
  const [existingVideo, existingThumbnail] = await Promise.all([
    env.ARTIFACTS.head(videoKey),
    env.ARTIFACTS.head(thumbnailKey),
  ]);
  if (existingVideo && existingThumbnail) {
    await notify(job, env, { status: 'completed', ...artifactUrls(job) });
    return;
  }

  await notify(job, env, { status: 'rendering' });
  const sandbox = getSandbox(env.Sandbox, job.jobId, {
    sleepAfter: '10m',
    labels: { workload: 'curvg-manim', animationId: job.animationId },
  });
  try {
    await sandbox.writeFile('/workspace/scene.py', job.code);
    const validation = await sandbox.exec(
      'python3 /opt/curvg/validate_scene.py /workspace/scene.py',
      { timeout: 30_000, cwd: '/workspace' }
    );
    if (!validation.success) {
      throw new Error(validation.stderr || 'Generated code failed validation');
    }
    const render = await sandbox.exec(
      'manim -qm --format=mp4 --disable_caching scene.py CurvGScene --media_dir /workspace/media',
      { timeout: 600_000, cwd: '/workspace' }
    );
    if (!render.success) {
      throw new Error(render.stderr || 'Manim render failed');
    }
    const locate = await sandbox.exec(
      "find /workspace/media -type f -name 'CurvGScene.mp4' -print -quit",
      { timeout: 10_000 }
    );
    const videoPath = locate.stdout.trim();
    if (!/^\/workspace\/media\/[A-Za-z0-9_./-]+\.mp4$/.test(videoPath)) {
      throw new Error('Rendered video path is invalid');
    }
    const thumbnailPath = '/workspace/thumbnail.jpg';
    const thumbnail = await sandbox.exec(
      `ffmpeg -y -ss 00:00:01 -i ${videoPath} -frames:v 1 ${thumbnailPath}`,
      { timeout: 30_000 }
    );
    if (!thumbnail.success) {
      throw new Error(thumbnail.stderr || 'Thumbnail generation failed');
    }
    const video = await sandbox.readFile(videoPath, { encoding: 'none' });
    await env.ARTIFACTS.put(videoKey, video.content, {
      httpMetadata: { contentType: 'video/mp4' },
      customMetadata: { animationId: job.animationId, jobId: job.jobId },
    });
    const image = await sandbox.readFile(thumbnailPath, { encoding: 'none' });
    await env.ARTIFACTS.put(thumbnailKey, image.content, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: { animationId: job.animationId, jobId: job.jobId },
    });
    await notify(job, env, { status: 'completed', ...artifactUrls(job) });
  } finally {
    await sandbox.destroy().catch(() => undefined);
  }
}

const worker: ExportedHandler<Env, RenderJob> = {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }
    if (!hasBearerToken(request, env.RENDERER_TOKEN)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const body = (await request.json()) as Record<string, unknown>;
      const job = parseJob(request, body, env);
      await env.RENDER_QUEUE.send(job, { delaySeconds: 1 });
      return Response.json({
        jobId: job.jobId,
        status: 'queued',
        provider: 'cloudflare-sandbox',
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid request' },
        { status: 400 }
      );
    }
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await processJob(message.body, env);
        message.ack();
      } catch (error) {
        if (message.attempts < 3) {
          message.retry({ delaySeconds: 30 });
          continue;
        }
        try {
          await notify(message.body, env, {
            status: 'failed',
            error:
              error instanceof Error
                ? error.message.slice(0, 2000)
                : 'Render failed',
          });
          message.ack();
        } catch {
          message.retry({ delaySeconds: 60 });
        }
      }
    }
  },
};

export default worker;
