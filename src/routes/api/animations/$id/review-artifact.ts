import { createFileRoute } from '@tanstack/react-router';

import { isCurrentAnimationRender } from '@/modules/animations/service';
import { getAllConfigs } from '@/modules/config/service';
import { respErr } from '@/lib/resp';
import { verifyAnimationReviewArtifact } from '@/lib/signed-animation-artifact';

import { readAnimationArtifact } from '../-artifact';

async function GET({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId') || '';
  const expires = Number(url.searchParams.get('expires'));
  const suppliedSignature = url.searchParams.get('signature') || '';
  const configs = await getAllConfigs();
  const valid = await verifyAnimationReviewArtifact({
    secret: configs.animation_renderer_token || '',
    id: params.id,
    jobId,
    expires,
    signature: suppliedSignature,
  });
  if (!valid)
    return respErr('Artifact link is invalid or expired', { status: 403 });
  if (!(await isCurrentAnimationRender(params.id, jobId))) {
    return respErr('Artifact version is not current', { status: 404 });
  }
  return readAnimationArtifact({
    request,
    animationId: params.id,
    jobId,
    kind: 'contact-sheet',
    cacheControl: 'private, no-store',
  });
}

export const Route = createFileRoute('/api/animations/$id/review-artifact')({
  server: { handlers: { GET } },
});
