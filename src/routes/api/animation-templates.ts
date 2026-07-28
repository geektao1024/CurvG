import { createFileRoute } from '@tanstack/react-router';

import { listAnimationTemplates } from '@/modules/animation-templates/service';
import { respData, respErr } from '@/lib/resp';
import { getLocale } from '@/paraglide/runtime.js';

async function GET() {
  try {
    return respData(await listAnimationTemplates(getLocale()));
  } catch (error) {
    console.error('[animation-templates] list failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respErr('Template library is temporarily unavailable', {
      status: 500,
    });
  }
}

export const Route = createFileRoute('/api/animation-templates')({
  server: { handlers: { GET } },
});
