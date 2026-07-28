import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { cancelUserSubscription } from '@/modules/payment/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });

    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 1_000,
      keyPrefix: 'subscription-cancel',
      extraKey: session.user.id,
    });
    if (limited) return limited;

    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.subscriptionCancel
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    const subscriptionNo = body?.subscriptionNo;
    if (
      typeof subscriptionNo !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(subscriptionNo)
    ) {
      return respErr('Invalid subscription', { status: 400 });
    }

    const updated = await cancelUserSubscription({
      userId: session.user.id,
      subscriptionNo,
    });

    return respData(updated);
  } catch (error: unknown) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    const message = error instanceof Error ? error.message : '';
    if (message === 'Subscription not found') {
      return respErr('Subscription not found', { status: 404 });
    }
    if (message === 'Forbidden') {
      return respErr('Forbidden', { status: 403 });
    }
    if (message === 'Subscription renewal is being processed') {
      return respErr('Subscription is busy', { status: 409 });
    }
    console.error('[subscription-cancel] failed', { message });
    return respErr('Unable to cancel subscription', { status: 502 });
  }
}

export const Route = createFileRoute('/api/user/subscriptions/cancel')({
  server: {
    handlers: { POST },
  },
});
