import { createFileRoute } from '@tanstack/react-router';

import { listPublishedAnimations } from '@/modules/animations/service';
import { respData, respErr } from '@/lib/resp';

async function GET() {
  try {
    return respData(await listPublishedAnimations());
  } catch (error) {
    console.error('[animation-gallery] list failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respErr('Gallery is temporarily unavailable', { status: 500 });
  }
}

export const Route = createFileRoute('/api/gallery/animations')({
  server: { handlers: { GET } },
});
