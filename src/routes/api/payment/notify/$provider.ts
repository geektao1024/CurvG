import { createFileRoute } from '@tanstack/react-router';

import {
  handleWebhook,
  PaymentWebhookVerificationBusyError,
} from '@/modules/payment/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readRequestBodyCapped,
  REQUEST_BODY_LIMITS,
  requestWithRawBody,
} from '@/lib/request-body';
import { respErr, respOk } from '@/lib/resp';

export const Route = createFileRoute('/api/payment/notify/$provider')({
  server: {
    handlers: {
      // Pass the untouched Request through — webhook signature
      // verification needs the raw body.
      POST: async ({ request, params }) => {
        const { provider } = params;

        try {
          if (provider === 'paypal') {
            const limited = enforceMinIntervalRateLimit(request, {
              intervalMs: 100,
              keyPrefix: 'paypal-webhook-verification',
              includeCookie: false,
            });
            if (limited) return limited;
          }
          const rawBody = await readRequestBodyCapped(
            request,
            REQUEST_BODY_LIMITS.paymentWebhook
          );
          const event = await handleWebhook({
            req: requestWithRawBody(request, rawBody),
            provider,
          });

          console.log(`Payment event [${provider}]: ${event.eventType}`);

          // Alipay expects plain text "success"
          if (provider === 'alipay') {
            return new Response('success', {
              status: 200,
              headers: { 'Content-Type': 'text/plain' },
            });
          }

          // WeChat expects JSON { code, message }
          if (provider === 'wechat') {
            return Response.json({ code: 'SUCCESS', message: 'OK' });
          }

          return respOk();
        } catch (error: unknown) {
          if (isRequestBodyTooLargeError(error)) {
            return respErr('Request body is too large', { status: 413 });
          }
          if (error instanceof PaymentWebhookVerificationBusyError) {
            return respErr('Webhook verification is busy', {
              status: error.status,
              headers: { 'Retry-After': '2' },
            });
          }
          const message =
            error instanceof Error ? error.message : 'Webhook handling failed';
          console.error('webhook error:', message);

          if (provider === 'alipay') {
            return new Response('fail', {
              status: 200,
              headers: { 'Content-Type': 'text/plain' },
            });
          }

          if (provider === 'wechat') {
            return Response.json(
              { code: 'FAIL', message: 'Webhook handling failed' },
              { status: 500 }
            );
          }

          // Stripe, Creem, and PayPal retry only when the endpoint returns a
          // non-2xx response. A JSON error envelope with HTTP 200 loses events.
          return respErr('Webhook handling failed', { status: 500 });
        }
      },
    },
  },
});
