import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAnimation } from '@/modules/animations/service';
import { respErr } from '@/lib/resp';

import { animationArtifactKind, readAnimationArtifact } from '../../-artifact';

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
    const kind = animationArtifactKind(params.kind);
    if (!kind) return respErr('Artifact not found', { status: 404 });
    const jobId = new URL(request.url).searchParams.get('jobId') || '';
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      return respErr('Artifact not found', { status: 404 });
    }
    if (detail.parts.render?.jobId !== jobId) {
      return respErr('Artifact version is not current', { status: 404 });
    }
    return readAnimationArtifact({
      request,
      animationId: params.id,
      jobId,
      kind,
    });
  } catch (error) {
    console.error('[animation-artifact] failed', {
      animationId: params.id,
      kind: params.kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return respErr('Artifact read failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/animations/$id/artifact/$kind')({
  server: { handlers: { GET } },
});
