import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import {
  getPricingProduct,
  isPublicSubscriptionProductId,
} from '@/config/pricing';
import { getAllConfigs } from '@/modules/config/service';
import {
  createCheckout,
  getCheckoutProviderNames,
  PaymentCheckoutBusyError,
} from '@/modules/payment/service';
import { getCurrentSubscription } from '@/modules/subscriptions/service';
import { enforceMinIntervalRateLimit } from '@/lib/rate-limit';
import {
  isRequestBodyTooLargeError,
  readJsonBodyCapped,
  REQUEST_BODY_LIMITS,
} from '@/lib/request-body';
import { respData, respErr } from '@/lib/resp';

function safeSameOriginPath(
  input: string | undefined | null,
  fallbackPath: string,
  baseUrl: string
): string {
  if (!input) return fallbackPath;
  try {
    const appUrl = new URL(baseUrl);
    const candidate = new URL(input, appUrl);
    if (candidate.origin !== appUrl.origin) return fallbackPath;
    return candidate.pathname + candidate.search + candidate.hash;
  } catch {
    return fallbackPath;
  }
}

async function POST({ request }: { request: Request }) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return respErr('Unauthorized', { status: 401 });
    }
    // Use the verified session identity. IP/cookie-only keys can be rotated
    // by an authenticated caller and allow duplicate remote checkout sessions.
    const limited = enforceMinIntervalRateLimit(request, {
      intervalMs: 1_000,
      keyPrefix: 'checkout',
      extraKey: session.user.id,
    });
    if (limited) return limited;

    const body = await readJsonBodyCapped<Record<string, unknown>>(
      request,
      REQUEST_BODY_LIMITS.paymentCheckout
    ).catch((error: unknown) => {
      if (isRequestBodyTooLargeError(error)) throw error;
      return {} as Record<string, unknown>;
    });
    const product_id =
      typeof body.product_id === 'string' ? body.product_id : undefined;
    const payment_provider =
      typeof body.payment_provider === 'string'
        ? body.payment_provider.trim() || undefined
        : undefined;
    const redirect =
      typeof body.redirect === 'string' ? body.redirect : undefined;
    const cancel_redirect =
      typeof body.cancel_redirect === 'string'
        ? body.cancel_redirect
        : undefined;

    if (!product_id || typeof product_id !== 'string') {
      return respErr('Missing product_id', { status: 400 });
    }

    // Look up product in the authoritative server-side catalog.
    // We DO NOT trust price / credits / plan from the request body.
    const product = getPricingProduct(product_id);
    if (!product || !isPublicSubscriptionProductId(product.productId)) {
      return respErr('Unknown product', { status: 400 });
    }
    if (await getCurrentSubscription(session.user.id)) {
      return respErr(
        'A paid plan is already active. Manage it before switching plans.',
        { status: 409 }
      );
    }

    const configs = await getAllConfigs();
    const availableProviders = getCheckoutProviderNames(configs);
    const configuredDefault = configs.default_payment_provider?.trim();
    const providerKey =
      payment_provider || configuredDefault || availableProviders[0];
    if (!providerKey || !availableProviders.includes(providerKey)) {
      return respErr(
        payment_provider
          ? 'Payment provider is not available for this product'
          : 'No payment provider is available for this product',
        { status: payment_provider ? 400 : 503 }
      );
    }
    // Build success/cancel URLs — only accept same-origin redirects.
    const baseUrl = configs.app_url || 'http://localhost:3000';
    const safeRedirectPath = safeSameOriginPath(
      redirect,
      '/settings/billing',
      baseUrl
    );
    const safeCancelPath = safeSameOriginPath(
      cancel_redirect,
      '/pricing',
      baseUrl
    );
    // createCheckout adds the payment callback exactly once. This value is the
    // final same-origin destination after that callback completes.
    const successUrl = new URL(safeRedirectPath, baseUrl).toString();
    const cancelUrl = new URL(safeCancelPath, baseUrl).toString();

    const checkout = await createCheckout({
      userId: session.user.id,
      userEmail: session.user.email,
      productName: product.productName,
      planName: product.planName,
      credits: product.credits,
      creditsValidDays: product.creditsValidDays,
      paymentOrder: {
        productId: product.productId,
        price: { amount: product.priceInCents, currency: product.currency },
        type: product.type,
        description: product.description,
        successUrl,
        cancelUrl,
        customer: {
          email: session.user.email,
          name: session.user.name,
        },
        plan: product.plan
          ? {
              name: product.plan.name,
              interval: product.plan.interval,
              intervalCount: product.plan.intervalCount,
            }
          : undefined,
      },
      provider: providerKey,
    });

    return respData({ checkout_url: checkout.checkoutInfo.checkoutUrl });
  } catch (error: unknown) {
    if (isRequestBodyTooLargeError(error)) {
      return respErr('Request body is too large', { status: 413 });
    }
    if (error instanceof PaymentCheckoutBusyError) {
      return respErr(error.message, { status: error.status });
    }
    console.error('[payment-checkout] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respErr('Checkout failed', { status: 500 });
  }
}

export const Route = createFileRoute('/api/payment/checkout')({
  server: {
    handlers: { POST },
  },
});
