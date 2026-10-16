import { createFileRoute } from '@tanstack/react-router';

import { respData } from '@/lib/resp';
import { resolveTemplateContext } from '@/lib/video-templates';
import { publicVideoTemplates } from '@/lib/video-templates/public';
import { getLocale } from '@/paraglide/runtime.js';

/** The verified template library, localized. Public: the gallery needs no account. */
async function GET({ request }: { request: Request }) {
  // API paths carry no /zh prefix, so the client names its locale.
  const locale = new URL(request.url).searchParams.get('locale') || getLocale();
  return respData(
    publicVideoTemplates(resolveTemplateContext({ locale }).locale)
  );
}

export const Route = createFileRoute('/api/video-templates')({
  server: { handlers: { GET } },
});
