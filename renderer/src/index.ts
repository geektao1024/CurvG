import { getSandbox, type Sandbox } from '@cloudflare/sandbox';

export { Sandbox } from '@cloudflare/sandbox';

interface RenderJob {
  animationId: string;
  callbackUrl: string;
  qualityGateUrl: string;
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

class NonRetryableRenderError extends Error {}
class CanceledRenderError extends Error {}

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
  const qualityGateValue =
    typeof body.qualityGateUrl === 'string' ? body.qualityGateUrl : '';
  if (!animationIdPattern.test(animationId)) {
    throw new Error('Invalid animation ID');
  }
  if (code.length < 100 || code.length > 60_000) {
    throw new Error('Invalid Manim code length');
  }
  if (!code.includes('from manim import')) {
    throw new Error('Manim import is required');
  }
  if (
    !/class\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
      code
    )
  ) {
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
  const qualityGateUrl = new URL(qualityGateValue);
  if (
    qualityGateUrl.protocol !== 'https:' &&
    qualityGateUrl.hostname !== 'localhost'
  ) {
    throw new Error('Quality gate URL must use HTTPS');
  }
  if (qualityGateUrl.origin !== allowedOrigin) {
    throw new Error('Quality gate origin is not allowed');
  }
  const expectedQualityPath = `/api/animations/${encodeURIComponent(animationId)}/quality-gate`;
  if (qualityGateUrl.pathname !== expectedQualityPath) {
    throw new Error('Quality gate path is invalid');
  }
  if (new URL(request.url).pathname !== '/render') {
    throw new Error('Not found');
  }
  return {
    animationId,
    code,
    callbackUrl: callbackUrl.toString(),
    qualityGateUrl: qualityGateUrl.toString(),
    jobId: crypto.randomUUID(),
  } satisfies RenderJob;
}

interface QualityGateResult {
  action: 'approve' | 'repair' | 'reject';
  code?: string;
}

async function requestQualityGate(
  job: RenderJob,
  env: Env,
  payload: Record<string, unknown>
): Promise<QualityGateResult> {
  const response = await fetch(job.qualityGateUrl, {
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
        : `Quality gate failed (${response.status})`
    );
  }
  const data =
    result.data && typeof result.data === 'object'
      ? (result.data as Record<string, unknown>)
      : undefined;
  const action = data?.action;
  if (action !== 'approve' && action !== 'repair' && action !== 'reject') {
    throw new Error('Quality gate returned an invalid action');
  }
  const code = typeof data?.code === 'string' ? data.code : undefined;
  if (action === 'repair') {
    if (
      !code ||
      code.length < 100 ||
      code.length > 60_000 ||
      !code.includes('from manim import') ||
      !/class\s+CurvGScene\s*\(\s*(?:Scene|MovingCameraScene|ThreeDScene)\s*\)/.test(
        code
      )
    ) {
      throw new Error('Quality gate returned invalid repaired code');
    }
  }
  return { action, code };
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
  const data =
    result.data && typeof result.data === 'object'
      ? (result.data as Record<string, unknown>)
      : undefined;
  return data?.cancelRequested === true;
}

async function notifyStage(
  job: RenderJob,
  env: Env,
  stage: 'validating' | 'compiling' | 'transcoding' | 'reviewing' | 'uploading',
  progress: number
) {
  if (await notify(job, env, { status: 'rendering', stage, progress })) {
    throw new CanceledRenderError(`Render canceled during ${stage}`);
  }
}

function artifactUrls(job: RenderJob, includeQaReport = true) {
  const base = `/api/animations/${encodeURIComponent(job.animationId)}/artifact`;
  return {
    videoUrl: `${base}/video?jobId=${encodeURIComponent(job.jobId)}`,
    thumbnailUrl: `${base}/thumbnail?jobId=${encodeURIComponent(job.jobId)}`,
    contactSheetUrl: `${base}/contact-sheet?jobId=${encodeURIComponent(job.jobId)}`,
    ...(includeQaReport
      ? {
          qaReportUrl: `${base}/qa-report?jobId=${encodeURIComponent(job.jobId)}`,
        }
      : {}),
  };
}

function artifactResponse(object: R2ObjectBody): Response {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'private, max-age=86400');
  headers.set('content-disposition', 'inline');
  let status = 200;
  const range = object.range;
  if (
    range &&
    'offset' in range &&
    'length' in range &&
    typeof range.offset === 'number' &&
    typeof range.length === 'number'
  ) {
    const start = range.offset;
    const end = start + range.length - 1;
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`);
    headers.set('content-length', String(range.length));
    status = 206;
  } else {
    headers.set('content-length', String(object.size));
  }
  return new Response(object.body, { status, headers });
}

async function serveArtifact(request: Request, env: Env): Promise<Response> {
  const match = new URL(request.url).pathname.match(
    /^\/artifact\/([A-Za-z0-9-]{1,80})\/([A-Za-z0-9-]{1,80})\/(video|thumbnail|contact-sheet|qa-report)$/
  );
  if (!match) {
    return Response.json({ error: 'Artifact not found' }, { status: 404 });
  }
  const [, animationId, jobId, kind] = match;
  const extension =
    kind === 'video'
      ? 'video.mp4'
      : kind === 'thumbnail'
        ? 'thumbnail.jpg'
        : kind === 'contact-sheet'
          ? 'contact-sheet.jpg'
          : 'qa-report.json';
  const object = await env.ARTIFACTS.get(
    `animations/${animationId}/${jobId}/${extension}`,
    { range: request.headers }
  );
  if (!object || !('body' in object)) {
    return Response.json({ error: 'Artifact not found' }, { status: 404 });
  }
  return artifactResponse(object);
}

function commandError(stderr: string, fallback: string): string {
  const message = stderr.trim();
  if (!message) return fallback;
  if (message.length <= 1900) return message;
  return `${message.slice(0, 300)}\n... traceback truncated ...\n${message.slice(-1550)}`;
}

const multipartPartSize = 5 * 1024 * 1024;

function combineChunks(chunks: Uint8Array[], size: number) {
  if (chunks.length === 1) return chunks[0];
  const combined = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

async function uploadBinaryFile(
  sandbox: Sandbox,
  bucket: R2Bucket,
  key: string,
  path: string,
  options: R2MultipartOptions
) {
  const file = await sandbox.readFile(path, { encoding: 'none' });
  const reader = file.content.getReader();
  const upload = await bucket.createMultipartUpload(key, options);
  const parts: R2UploadedPart[] = [];
  let chunks: Uint8Array[] = [];
  let bufferedSize = 0;
  let released = false;

  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        reader.releaseLock();
        released = true;
        break;
      }
      chunks.push(result.value);
      bufferedSize += result.value.byteLength;
      if (bufferedSize >= multipartPartSize) {
        parts.push(
          await upload.uploadPart(
            parts.length + 1,
            combineChunks(chunks, bufferedSize)
          )
        );
        chunks = [];
        bufferedSize = 0;
      }
    }
    if (bufferedSize > 0) {
      parts.push(
        await upload.uploadPart(
          parts.length + 1,
          combineChunks(chunks, bufferedSize)
        )
      );
    }
    if (parts.length === 0) throw new Error('Rendered artifact is empty');
    await upload.complete(parts);
  } catch (error) {
    await upload.abort().catch(() => undefined);
    throw error;
  } finally {
    if (!released) {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}

const MAX_QUALITY_REPAIRS = 2;

function attemptProgress(attempt: number, offset: number) {
  return Math.min(92, 10 + attempt * 28 + offset);
}

interface RenderEvidence {
  playbackPath: string;
  thumbnailPath: string;
  contactSheetPath: string;
  qaReportPath: string;
  visualQa: Record<string, unknown>;
}

async function prepareRenderEvidence(
  sandbox: Sandbox,
  mediaRoot: string
): Promise<RenderEvidence> {
  const locate = await sandbox.exec(
    `find ${mediaRoot} -type f -name 'CurvGScene.mp4' -print -quit`,
    { timeout: 10_000 }
  );
  const videoPath = locate.stdout.trim();
  const expectedPrefix = `${mediaRoot}/`;
  if (
    !videoPath.startsWith(expectedPrefix) ||
    !/^\/workspace\/[A-Za-z0-9_-]+\/[A-Za-z0-9_./-]+\.mp4$/.test(videoPath)
  ) {
    throw new NonRetryableRenderError('Rendered video path is invalid');
  }

  const playbackPath = '/workspace/video.mp4';
  const optimize = await sandbox.exec(
    `ffmpeg -y -i ${videoPath} -map 0:v:0 -an -c copy -movflags +faststart ${playbackPath}`,
    { timeout: 60_000 }
  );
  if (!optimize.success) {
    throw new NonRetryableRenderError(
      commandError(optimize.stderr, 'Video playback optimization failed')
    );
  }

  const thumbnailPath = '/workspace/thumbnail.jpg';
  const thumbnail = await sandbox.exec(
    `ffmpeg -y -ss 00:00:01 -i ${playbackPath} -frames:v 1 ${thumbnailPath}`,
    { timeout: 30_000 }
  );
  if (!thumbnail.success) {
    throw new NonRetryableRenderError(
      commandError(thumbnail.stderr, 'Thumbnail generation failed')
    );
  }

  const durationProbe = await sandbox.exec(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${playbackPath}`,
    { timeout: 15_000 }
  );
  const duration = Number.parseFloat(durationProbe.stdout.trim());
  if (!durationProbe.success || !Number.isFinite(duration) || duration <= 0) {
    throw new NonRetryableRenderError('Rendered video duration is invalid');
  }

  const contactSheetPath = '/workspace/contact-sheet.jpg';
  const sampleRate = (12 / duration).toFixed(8);
  const contactSheet = await sandbox.exec(
    `ffmpeg -y -i ${playbackPath} -vf "fps=${sampleRate},scale=360:-2:flags=lanczos,tile=4x3:padding=8:margin=8:color=0x0B0D14" -frames:v 1 -q:v 2 ${contactSheetPath}`,
    { timeout: 60_000 }
  );
  if (!contactSheet.success) {
    throw new NonRetryableRenderError(
      commandError(contactSheet.stderr, 'Visual QA contact sheet failed')
    );
  }

  const analysis = await sandbox.exec(
    `python3 /opt/curvg/analyze_contact_sheet.py ${contactSheetPath} ${playbackPath}`,
    { timeout: 240_000, cwd: '/workspace' }
  );
  let visualQa: Record<string, unknown> | undefined;
  if (analysis.success && analysis.stdout.length <= 20_000) {
    try {
      const parsed = JSON.parse(analysis.stdout) as Record<string, unknown>;
      if (
        parsed.analyzerVersion === 1 &&
        (parsed.status === 'pass' || parsed.status === 'review') &&
        Array.isArray(parsed.frames) &&
        parsed.frames.length === 12 &&
        typeof parsed.temporalSampleCount === 'number'
      ) {
        visualQa = parsed;
      }
    } catch {
      visualQa = undefined;
    }
  }
  if (!visualQa) {
    throw new Error(
      commandError(
        analysis.stderr,
        'Visual QA analyzer did not produce valid evidence'
      )
    );
  }
  const qaReportPath = '/workspace/qa-report.json';
  await sandbox.writeFile(qaReportPath, JSON.stringify(visualQa));
  return {
    playbackPath,
    thumbnailPath,
    contactSheetPath,
    qaReportPath,
    visualQa,
  };
}

async function preserveBestRenderEvidence(
  sandbox: Sandbox,
  evidence: RenderEvidence
): Promise<RenderEvidence> {
  const copy = await sandbox.exec(
    'cp /workspace/video.mp4 /workspace/best-video.mp4 && cp /workspace/thumbnail.jpg /workspace/best-thumbnail.jpg && cp /workspace/contact-sheet.jpg /workspace/best-contact-sheet.jpg && cp /workspace/qa-report.json /workspace/best-qa-report.json',
    { timeout: 30_000, cwd: '/workspace' }
  );
  if (!copy.success) {
    throw new NonRetryableRenderError(
      commandError(copy.stderr, 'Best render snapshot failed')
    );
  }
  return {
    playbackPath: '/workspace/best-video.mp4',
    thumbnailPath: '/workspace/best-thumbnail.jpg',
    contactSheetPath: '/workspace/best-contact-sheet.jpg',
    qaReportPath: '/workspace/best-qa-report.json',
    visualQa: evidence.visualQa,
  };
}

function visualQaCandidateRank(evidence: RenderEvidence): number {
  const value = evidence.visualQa.score;
  const score =
    typeof value === 'number' && Number.isFinite(value) ? value : -1;
  const hardCodes = new Set([
    'empty_frame',
    'edge_risk',
    'static_sequence',
    'black_segment',
    'flash_frame',
    'frozen_segment',
  ]);
  const issues = Array.isArray(evidence.visualQa.issues)
    ? evidence.visualQa.issues
    : [];
  const frames = Array.isArray(evidence.visualQa.frames)
    ? evidence.visualQa.frames
    : [];
  const hasHardDefect =
    issues.some(
      (issue) =>
        issue &&
        typeof issue === 'object' &&
        hardCodes.has((issue as Record<string, unknown>).code as string)
    ) ||
    frames.some(
      (frame) =>
        frame &&
        typeof frame === 'object' &&
        (frame as Record<string, unknown>).edgeRisk === true
    ) ||
    ['blackSegments', 'frozenSegments', 'flashTimestamps'].some((key) => {
      const entries = evidence.visualQa[key];
      return Array.isArray(entries) && entries.length > 0;
    });
  return hasHardDefect ? score - 1_000 : score;
}

async function uploadReviewEvidence(params: {
  sandbox: Sandbox;
  env: Env;
  job: RenderJob;
  contactSheetKey: string;
  qaReportKey: string;
  evidence: RenderEvidence;
  attempt: number;
  phase: 'preview' | 'final';
}) {
  await uploadBinaryFile(
    params.sandbox,
    params.env.ARTIFACTS,
    params.contactSheetKey,
    params.evidence.contactSheetPath,
    {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: {
        animationId: params.job.animationId,
        jobId: params.job.jobId,
        sampleCount: '12',
        attempt: String(params.attempt),
        phase: params.phase,
      },
    }
  );
  await uploadBinaryFile(
    params.sandbox,
    params.env.ARTIFACTS,
    params.qaReportKey,
    params.evidence.qaReportPath,
    {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: {
        animationId: params.job.animationId,
        jobId: params.job.jobId,
        analyzerVersion: '1',
        attempt: String(params.attempt),
        phase: params.phase,
      },
    }
  );
}

async function processJob(job: RenderJob, env: Env) {
  const artifactPrefix = `animations/${job.animationId}/${job.jobId}`;
  const videoKey = `${artifactPrefix}/video.mp4`;
  const thumbnailKey = `${artifactPrefix}/thumbnail.jpg`;
  const contactSheetKey = `${artifactPrefix}/contact-sheet.jpg`;
  const qaReportKey = `${artifactPrefix}/qa-report.json`;
  const [
    existingVideo,
    existingThumbnail,
    existingContactSheet,
    existingQaReport,
  ] = await Promise.all([
    env.ARTIFACTS.head(videoKey),
    env.ARTIFACTS.head(thumbnailKey),
    env.ARTIFACTS.head(contactSheetKey),
    env.ARTIFACTS.head(qaReportKey),
  ]);
  if (existingVideo && existingThumbnail && existingContactSheet) {
    const reportObject = existingQaReport
      ? await env.ARTIFACTS.get(qaReportKey)
      : undefined;
    const visualQa = reportObject
      ? await reportObject
          .json<Record<string, unknown>>()
          .catch(() => undefined)
      : undefined;
    await notify(job, env, {
      status: 'completed',
      ...artifactUrls(job, !!visualQa),
      ...(visualQa ? { visualQa } : {}),
    });
    return;
  }

  const sandbox = getSandbox(env.Sandbox, job.jobId, {
    sleepAfter: '10m',
    labels: { workload: 'curvg-manim', animationId: job.animationId },
  });
  let currentCode = job.code;
  let bestCode = currentCode;
  let bestEvidence: RenderEvidence | undefined;
  let bestAttempt = 0;
  let bestRank = -1_001;
  try {
    for (let attempt = 0; attempt <= MAX_QUALITY_REPAIRS; attempt += 1) {
      await sandbox.exec(
        'rm -rf /workspace/media /workspace/video.mp4 /workspace/thumbnail.jpg /workspace/contact-sheet.jpg /workspace/qa-report.json',
        { timeout: 30_000, cwd: '/workspace' }
      );
      await sandbox.writeFile('/workspace/scene.py', currentCode);
      await notifyStage(job, env, 'validating', attemptProgress(attempt, 2));
      const validation = await sandbox.exec(
        'python3 /opt/curvg/validate_scene.py /workspace/scene.py',
        { timeout: 30_000, cwd: '/workspace' }
      );
      if (!validation.success) {
        const error = commandError(
          validation.stderr,
          'Generated code failed validation'
        );
        const gate = await requestQualityGate(job, env, {
          kind: 'render_error',
          attempt,
          error,
        });
        if (gate.action !== 'repair' || !gate.code) {
          throw new NonRetryableRenderError(
            `Autonomous source repair was exhausted: ${error}`
          );
        }
        currentCode = gate.code;
        continue;
      }

      await notifyStage(job, env, 'compiling', attemptProgress(attempt, 10));
      const render = await sandbox.exec(
        'manim -ql --format=mp4 --disable_caching scene.py CurvGScene --media_dir /workspace/media',
        { timeout: 600_000, cwd: '/workspace' }
      );
      if (!render.success) {
        const error = commandError(render.stderr, 'Manim render failed');
        const gate = await requestQualityGate(job, env, {
          kind: 'render_error',
          attempt,
          error,
        });
        if (gate.action !== 'repair' || !gate.code) {
          throw new NonRetryableRenderError(
            `Autonomous render repair was exhausted: ${error}`
          );
        }
        currentCode = gate.code;
        continue;
      }

      await notifyStage(job, env, 'transcoding', attemptProgress(attempt, 18));
      await notifyStage(job, env, 'reviewing', attemptProgress(attempt, 24));
      const previewEvidence = await prepareRenderEvidence(
        sandbox,
        '/workspace/media'
      );
      const currentRank = visualQaCandidateRank(previewEvidence);
      if (!bestEvidence || currentRank > bestRank) {
        bestEvidence = await preserveBestRenderEvidence(
          sandbox,
          previewEvidence
        );
        bestCode = currentCode;
        bestAttempt = attempt;
        bestRank = currentRank;
      }
      // On the last autonomous pass, review and deliver the strongest rendered
      // candidate instead of allowing a regressive repair to overwrite it.
      const reviewEvidence =
        attempt === MAX_QUALITY_REPAIRS && bestEvidence
          ? bestEvidence
          : previewEvidence;
      const selectedCode =
        attempt === MAX_QUALITY_REPAIRS ? bestCode : currentCode;
      const selectedAttempt =
        attempt === MAX_QUALITY_REPAIRS ? bestAttempt : attempt;
      await notifyStage(job, env, 'reviewing', attemptProgress(attempt, 28));
      await uploadReviewEvidence({
        sandbox,
        env,
        job,
        contactSheetKey,
        qaReportKey,
        evidence: reviewEvidence,
        attempt: selectedAttempt,
        phase: 'preview',
      });
      const finalGate = await requestQualityGate(job, env, {
        kind: 'final_review',
        attempt,
        visualQa: reviewEvidence.visualQa,
        approvedCode: selectedCode,
      });
      if (finalGate.action === 'repair' && finalGate.code) {
        currentCode = finalGate.code;
        continue;
      }
      if (finalGate.action !== 'approve') {
        throw new NonRetryableRenderError(
          'Final deliverable did not pass autonomous review'
        );
      }

      // The autonomous repair loop uses a low-quality render for speed. Only
      // after a candidate passes the quality gate do we spend the medium
      // render budget. Evidence is regenerated from this formal MP4 so the
      // uploaded QA report describes the actual deliverable.
      await sandbox.exec(
        'rm -rf /workspace/media /workspace/video.mp4 /workspace/thumbnail.jpg /workspace/contact-sheet.jpg /workspace/qa-report.json',
        { timeout: 30_000, cwd: '/workspace' }
      );
      await sandbox.writeFile('/workspace/scene.py', selectedCode);
      await notifyStage(job, env, 'compiling', 90);
      const formalRender = await sandbox.exec(
        'manim -qm --format=mp4 --disable_caching scene.py CurvGScene --media_dir /workspace/media',
        { timeout: 600_000, cwd: '/workspace' }
      );
      if (!formalRender.success) {
        throw new Error(
          commandError(formalRender.stderr, 'Formal Manim render failed')
        );
      }
      await notifyStage(job, env, 'reviewing', 94);
      const deliveryEvidence = await prepareRenderEvidence(
        sandbox,
        '/workspace/media'
      );
      await uploadReviewEvidence({
        sandbox,
        env,
        job,
        contactSheetKey,
        qaReportKey,
        evidence: deliveryEvidence,
        attempt: selectedAttempt,
        phase: 'final',
      });

      await notifyStage(job, env, 'uploading', 96);
      await uploadBinaryFile(
        sandbox,
        env.ARTIFACTS,
        videoKey,
        deliveryEvidence.playbackPath,
        {
          httpMetadata: { contentType: 'video/mp4' },
          customMetadata: {
            animationId: job.animationId,
            jobId: job.jobId,
            quality: '720p30',
          },
        }
      );
      await uploadBinaryFile(
        sandbox,
        env.ARTIFACTS,
        thumbnailKey,
        deliveryEvidence.thumbnailPath,
        {
          httpMetadata: { contentType: 'image/jpeg' },
          customMetadata: { animationId: job.animationId, jobId: job.jobId },
        }
      );
      await notify(job, env, {
        status: 'completed',
        ...artifactUrls(job, true),
        visualQa: deliveryEvidence.visualQa,
      });
      return;
    }
    throw new NonRetryableRenderError(
      'Autonomous quality repair budget was exhausted'
    );
  } finally {
    await sandbox.destroy().catch(() => undefined);
  }
}

const worker: ExportedHandler<Env, RenderJob> = {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (request.method === 'GET' && pathname.startsWith('/artifact/')) {
      if (!hasBearerToken(request, env.RENDERER_TOKEN)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      try {
        return await serveArtifact(request, env);
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Artifact read failed',
          },
          { status: 500 }
        );
      }
    }
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
        if (error instanceof CanceledRenderError) {
          message.ack();
          continue;
        }
        if (
          !(error instanceof NonRetryableRenderError) &&
          message.attempts < 3
        ) {
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
