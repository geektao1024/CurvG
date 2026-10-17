import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { getAllConfigs } from '@/modules/config/service';
import { consume, getBalance } from '@/modules/credits/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';
import { getWonder } from '@/content/wonders';

import { renderCreditCost } from '../animations/-shared';

/**
 * Wonder video exports (docs/MONETIZATION.md §5). The video is drawn and
 * encoded in the reader's browser, so the server never renders anything:
 * a 720p preview with a watermark is free for any signed-in account, and
 * the HD file (1080p60, no watermark) costs one video's credits
 * (`animation_render_credits`), charged here when the reader saves it.
 *
 * GET  → { signedIn, balance, cost }
 * POST { slug, kind, aspect } → { charged, balance }
 */
async function GET({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    const cost = renderCreditCost(await getAllConfigs());
    if (!session?.user) return respData({ signedIn: false, balance: 0, cost });
    const balance = await getBalance(session.user.id);
    return respData({ signedIn: true, balance, cost });
  } catch (error: any) {
    return respErr(error?.message || 'Failed to read export status');
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    // One charge per click: a double click must not pay twice.
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 3_000,
      keyPrefix: 'wonder-export',
      extraKey: session.user.id,
    });
    if (limited) return limited;

    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.animationAction
    );
    const slug = typeof body.slug === 'string' ? body.slug : '';
    const wonder = getWonder(slug);
    if (!wonder) return respErr('Unknown wonder', { status: 404 });
    const kind = body.kind === 'free' ? 'free' : 'story';
    const aspect = body.aspect === 'portrait' ? 'portrait' : 'landscape';

    const cost = renderCreditCost(await getAllConfigs());
    if (cost > 0) {
      const result = await consume({
        userId: session.user.id,
        userEmail: session.user.email,
        credits: cost,
        scene: 'wonder_export',
        description: `Wonder video (HD): ${wonder.slug}`,
        metadata: JSON.stringify({ slug: wonder.slug, kind, aspect }),
      });
      if (!result.success) {
        return respErr('Insufficient credits', { status: 402 });
      }
    }
    const balance = await getBalance(session.user.id);
    return respData({ charged: cost, balance });
  } catch (error: any) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body too large', { status: 413 });
    }
    return respErr(error?.message || 'Export failed');
  }
}

export const Route = createFileRoute('/api/wonders/export')({
  server: { handlers: { GET, POST } },
});
