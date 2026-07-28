import assert from 'node:assert/strict';
import test from 'node:test';

import { mapCreemWebhookEventType } from '../src/core/payment/creem';
import {
  mapPayPalWebhookEventType,
  PayPalProvider,
} from '../src/core/payment/paypal';
import {
  mapStripeWebhookEventType,
  StripeProvider,
} from '../src/core/payment/stripe';
import {
  PaymentEventType,
  PaymentInterval,
  PaymentType,
  SubscriptionCycleType,
} from '../src/core/payment/types';

test('PayPal APPROVED is ignored rather than treated as a completed checkout', () => {
  assert.equal(
    mapPayPalWebhookEventType('CHECKOUT.ORDER.APPROVED'),
    PaymentEventType.IGNORED
  );
  assert.equal(
    mapPayPalWebhookEventType('CHECKOUT.ORDER.COMPLETED'),
    PaymentEventType.CHECKOUT_SUCCESS
  );
  assert.equal(
    mapPayPalWebhookEventType('PAYMENT.CAPTURE.COMPLETED'),
    PaymentEventType.PAYMENT_SUCCESS
  );
  assert.equal(
    mapPayPalWebhookEventType('BILLING.SUBSCRIPTION.ACTIVATED'),
    PaymentEventType.SUBSCRIBE_UPDATED
  );
});

test('Stripe async payment events have explicit success and failure actions', () => {
  assert.equal(
    mapStripeWebhookEventType('checkout.session.async_payment_succeeded'),
    PaymentEventType.PAYMENT_SUCCESS
  );
  assert.equal(
    mapStripeWebhookEventType('checkout.session.async_payment_failed'),
    PaymentEventType.PAYMENT_FAILED
  );
  assert.equal(
    mapStripeWebhookEventType('charge.refunded'),
    PaymentEventType.PAYMENT_REFUNDED
  );
});

test('verified but unsupported provider event types are safely ignored', () => {
  assert.equal(
    mapStripeWebhookEventType('charge.dispute.created'),
    PaymentEventType.IGNORED
  );
  assert.equal(
    mapCreemWebhookEventType('dispute.created'),
    PaymentEventType.IGNORED
  );
  assert.equal(
    mapPayPalWebhookEventType('CUSTOMER.DISPUTE.CREATED'),
    PaymentEventType.IGNORED
  );
});

test('Creem maps entitlement-reducing events and fail-closes new subscription states', async () => {
  for (const eventType of [
    'subscription.paused',
    'subscription.past_due',
    'subscription.expired',
    'subscription.scheduled_cancel',
    'subscription.trialing',
  ]) {
    assert.equal(
      mapCreemWebhookEventType(eventType),
      PaymentEventType.SUBSCRIBE_UPDATED,
      eventType
    );
  }
  assert.equal(
    mapCreemWebhookEventType('refund.created'),
    PaymentEventType.PAYMENT_REFUNDED
  );

  const provider = new (
    await import('../src/core/payment/creem')
  ).CreemProvider({ apiKey: 'creem_test' });
  const base = {
    id: 'sub_creem',
    product: {
      id: 'prod_creem',
      billing_period: 'every-month',
      price: 2900,
      currency: 'USD',
    },
    current_period_start_date: '2026-08-01T00:00:00.000Z',
    current_period_end_date: '2026-09-01T00:00:00.000Z',
    metadata: {},
  };
  const status = async (value: string) =>
    (provider as any).buildSubscriptionInfo({ ...base, status: value });
  assert.equal((await status('past_due')).status, 'paused');
  assert.equal((await status('expired')).status, 'expired');
  assert.equal((await status('scheduled_cancel')).status, 'pending_cancel');
  assert.equal((await status('future_unknown_state')).status, 'paused');
});

test('Creem revokes only a completed cumulative full refund', async () => {
  const provider = new (
    await import('../src/core/payment/creem')
  ).CreemProvider({ apiKey: 'creem_test' });
  const refund = {
    id: 'ref_1',
    status: 'succeeded',
    refund_amount: 2900,
    refund_currency: 'USD',
    transaction: {
      id: 'tran_1',
      amount: 2900,
      amount_paid: 2900,
      refunded_amount: 2900,
      currency: 'USD',
      subscription: 'sub_1',
      period_start: Date.parse('2026-08-01T00:00:00.000Z'),
      period_end: Date.parse('2026-09-01T00:00:00.000Z'),
      created_at: Date.parse('2026-08-01T00:00:01.000Z'),
    },
    subscription: {
      id: 'sub_1',
      product: 'prod_1',
      metadata: { source: 'subscription' },
    },
    checkout: {
      request_id: 'ORD_CREEM',
      metadata: { source: 'checkout' },
    },
  };

  const full = await (provider as any).buildPaymentSessionFromRefund(refund);
  assert.equal(full.paymentInfo.transactionId, 'tran_1');
  assert.equal(full.subscriptionId, 'sub_1');
  assert.equal(full.subscriptionInfo.status, 'paused');
  assert.equal(full.subscriptionInfo.productId, 'prod_1');
  assert.equal(full.metadata.orderNo, 'ORD_CREEM');
  assert.equal(full.metadata.source, 'checkout');

  const partial = await (provider as any).buildPaymentSessionFromRefund({
    ...refund,
    refund_amount: 500,
    transaction: { ...refund.transaction, refunded_amount: 500 },
  });
  assert.equal(partial, undefined);
});

test('Creem subscription.paid accepts the official subscription-only payload', async () => {
  const provider = new (
    await import('../src/core/payment/creem')
  ).CreemProvider({ apiKey: 'creem_test' });
  const paidSubscription = {
    id: 'sub_paid',
    product: {
      id: 'prod_monthly',
      name: 'Monthly',
      description: 'Monthly Pro',
      price: 2900,
      currency: 'USD',
      billing_period: 'every-month',
    },
    customer: {
      id: 'cust_1',
      email: 'customer@example.test',
      name: 'Customer',
    },
    status: 'active',
    last_transaction_id: 'tran_paid',
    last_transaction_date: '2026-08-01T00:00:07.000Z',
    current_period_start_date: '2026-08-01T00:00:00.000Z',
    current_period_end_date: '2026-09-01T00:00:00.000Z',
    created_at: '2026-08-01T00:00:05.000Z',
    metadata: { orderNo: 'ORD_CREEM_PAID' },
  };

  const initial = await (
    provider as any
  ).buildPaymentSessionFromPaidSubscription(paidSubscription);
  assert.equal(initial.paymentStatus, 'paid');
  assert.equal(initial.paymentInfo.transactionId, 'tran_paid');
  assert.equal(
    initial.paymentInfo.subscriptionCycleType,
    SubscriptionCycleType.CREATE
  );
  assert.equal(initial.subscriptionInfo.productId, 'prod_monthly');

  const renewal = await (
    provider as any
  ).buildPaymentSessionFromPaidSubscription({
    ...paidSubscription,
    last_transaction_id: 'tran_renewal',
    last_transaction_date: '2026-09-01T00:00:07.000Z',
    current_period_start_date: '2026-09-01T00:00:00.000Z',
    current_period_end_date: '2026-10-01T00:00:00.000Z',
  });
  assert.equal(
    renewal.paymentInfo.subscriptionCycleType,
    SubscriptionCycleType.RENEWAL
  );
});

test('Creem checkout.completed waits for a signed billing period before granting Pro', async () => {
  const provider = new (
    await import('../src/core/payment/creem')
  ).CreemProvider({ apiKey: 'creem_test' });
  const checkout = {
    id: 'ch_official',
    request_id: 'ORD_CREEM_CHECKOUT',
    status: 'completed',
    order: {
      id: 'ord_provider',
      amount: 2900,
      amount_paid: 2900,
      currency: 'USD',
      status: 'paid',
      type: 'recurring',
      created_at: '2026-08-01T00:00:00.000Z',
    },
    product: {
      id: 'prod_monthly',
      price: 2900,
      currency: 'USD',
      billing_period: 'every-month',
    },
    customer: { id: 'cust_1', email: 'customer@example.test' },
    subscription: {
      id: 'sub_without_period',
      product: 'prod_monthly',
      status: 'active',
      created_at: '2026-08-01T00:00:05.000Z',
      metadata: { orderNo: 'ORD_CREEM_CHECKOUT' },
    },
    metadata: { orderNo: 'ORD_CREEM_CHECKOUT' },
  };

  const session = await (
    provider as any
  ).buildPaymentSessionFromCheckoutSession(checkout);
  assert.equal(session.paymentStatus, 'processing');
  assert.equal(session.subscriptionId, 'sub_without_period');
  assert.equal(session.subscriptionInfo, undefined);
});

test('Creem synchronization-only active event without a period is acknowledged', async () => {
  const signingSecret = 'creem_signing_test';
  const provider = new (
    await import('../src/core/payment/creem')
  ).CreemProvider({ apiKey: 'creem_test', signingSecret });
  const rawBody = JSON.stringify({
    id: 'evt_active',
    eventType: 'subscription.active',
    object: {
      id: 'sub_active',
      product: {
        id: 'prod_monthly',
        price: 2900,
        currency: 'USD',
        billing_period: 'every-month',
      },
      status: 'active',
      created_at: '2026-08-01T00:00:00.000Z',
      metadata: {},
    },
  });
  const signature = await (provider as any).generateSignature(
    rawBody,
    signingSecret
  );
  const event = await provider.getPaymentEvent({
    req: new Request('https://example.test/webhook', {
      method: 'POST',
      headers: { 'creem-signature': signature },
      body: rawBody,
    }),
  });
  assert.equal(event.eventType, PaymentEventType.IGNORED);
  assert.equal(event.paymentSession, undefined);
});

test('Stripe writes the same server order number to durable webhook objects', async () => {
  const provider = new StripeProvider({
    secretKey: 'sk_test_fake',
    publishableKey: 'pk_test_fake',
  });
  const calls: Array<{ params: any; options: any }> = [];
  (provider as any).client = {
    checkout: {
      sessions: {
        create: async (params: any, options: any) => {
          calls.push({ params, options });
          return { id: `cs_${calls.length}`, url: 'https://example.test/pay' };
        },
      },
    },
  };

  await provider.createPayment({
    order: {
      type: PaymentType.SUBSCRIPTION,
      requestId: 'ORD_SUB',
      price: { amount: 2900, currency: 'USD' },
      plan: { name: 'Pro Monthly', interval: PaymentInterval.MONTH },
      metadata: { orderNo: 'ORD_SUB' },
    },
  });
  await provider.createPayment({
    order: {
      type: PaymentType.ONE_TIME,
      requestId: 'ORD_ONCE',
      price: { amount: 2900, currency: 'USD' },
      metadata: { orderNo: 'ORD_ONCE' },
    },
  });

  assert.deepEqual(calls[0].params.metadata, { orderNo: 'ORD_SUB' });
  assert.deepEqual(calls[0].params.subscription_data?.metadata, {
    orderNo: 'ORD_SUB',
  });
  assert.equal(calls[0].options.idempotencyKey, 'ORD_SUB');
  assert.deepEqual(calls[1].params.metadata, { orderNo: 'ORD_ONCE' });
  assert.deepEqual(calls[1].params.payment_intent_data?.metadata, {
    orderNo: 'ORD_ONCE',
  });
  assert.equal(calls[1].options.idempotencyKey, 'ORD_ONCE');
});

test('PayPal subscription APPROVED stays pending at the provider status layer', () => {
  const provider = new PayPalProvider({
    clientId: 'client',
    clientSecret: 'secret',
  });

  assert.equal((provider as any).mapPayPalStatus('APPROVED'), 'processing');
  assert.equal(
    (provider as any).mapPayPalSubscriptionStatus('APPROVED'),
    'paused'
  );
  assert.equal(
    (provider as any).mapPayPalSubscriptionStatus('NEW_UNKNOWN_STATUS'),
    'paused'
  );
});

test('Stripe non-current subscription states fail closed instead of leaving Pro active', async () => {
  const provider = new StripeProvider({
    secretKey: 'sk_test_fake',
    publishableKey: 'pk_test_fake',
  });
  const base = {
    id: 'sub_status',
    cancel_at: null,
    canceled_at: null,
    cancellation_details: null,
    current_period_start: 1_700_000_000,
    current_period_end: 1_702_678_400,
    metadata: {},
    items: {
      data: [
        {
          price: {
            product: 'prod_1',
            id: 'price_1',
            unit_amount: 2900,
            currency: 'usd',
          },
          plan: { interval: 'month', interval_count: 1 },
        },
      ],
    },
  };
  const status = async (value: string) =>
    (provider as any).buildSubscriptionInfo({ ...base, status: value });

  assert.equal((await status('trialing')).status, 'trialing');
  for (const value of ['past_due', 'unpaid', 'paused', 'incomplete']) {
    assert.equal((await status(value)).status, 'paused', value);
  }
  assert.equal((await status('incomplete_expired')).status, 'expired');
  assert.equal((await status('future_unknown_state')).status, 'paused');
});

test('Stripe full refunds carry the signed invoice period, while partial refunds are ignored', async () => {
  const provider = new StripeProvider({
    secretKey: 'sk_test_fake',
    publishableKey: 'pk_test_fake',
    signingSecret: 'whsec_test',
  });
  const subscription = {
    id: 'sub_1',
    status: 'active',
    cancel_at: null,
    canceled_at: null,
    cancellation_details: null,
    current_period_start: 1_800_000_000,
    current_period_end: 1_802_678_400,
    metadata: { orderNo: 'ORD_SUB' },
    items: {
      data: [
        {
          current_period_start: 1_800_000_000,
          current_period_end: 1_802_678_400,
          price: {
            product: 'prod_1',
            id: 'price_1',
            unit_amount: 2900,
            currency: 'usd',
          },
          plan: { interval: 'month', interval_count: 1 },
        },
      ],
    },
  };
  const invoice = {
    id: 'in_1',
    currency: 'usd',
    amount_paid: 2900,
    created: 1_799_999_900,
    billing_reason: 'subscription_cycle',
    metadata: {},
    lines: {
      data: [
        {
          subscription: 'sub_1',
          period: { start: 1_700_000_000, end: 1_702_678_400 },
        },
      ],
    },
  };
  let stripeEvent: any = {
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_1',
        amount: 2900,
        amount_refunded: 2900,
        refunded: true,
        currency: 'usd',
        payment_intent: 'pi_1',
        metadata: {},
      },
    },
  };
  let invoiceLookups = 0;
  (provider as any).client = {
    webhooks: { constructEvent: () => stripeEvent },
    invoicePayments: {
      list: async () => {
        invoiceLookups += 1;
        return { data: [{ invoice }] };
      },
    },
    invoices: { retrieve: async () => invoice },
    subscriptions: { retrieve: async () => subscription },
  };
  const request = () =>
    new Request('https://curvg.test/api/payment/notify/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'signed' },
      body: '{}',
    });

  const fullRefund = await provider.getPaymentEvent({ req: request() });
  assert.equal(fullRefund.eventType, PaymentEventType.PAYMENT_REFUNDED);
  assert.equal(fullRefund.paymentSession?.subscriptionId, 'sub_1');
  assert.equal(
    fullRefund.paymentSession?.subscriptionInfo?.currentPeriodStart.toISOString(),
    new Date(1_700_000_000 * 1000).toISOString()
  );
  assert.equal(
    fullRefund.paymentSession?.subscriptionInfo?.currentPeriodEnd.toISOString(),
    new Date(1_702_678_400 * 1000).toISOString()
  );

  stripeEvent = {
    type: 'charge.refunded',
    data: {
      object: {
        id: 'ch_partial',
        amount: 2900,
        amount_refunded: 100,
        refunded: false,
        currency: 'usd',
        payment_intent: 'pi_2',
        metadata: {},
      },
    },
  };
  const partialRefund = await provider.getPaymentEvent({ req: request() });
  assert.equal(partialRefund.eventType, PaymentEventType.IGNORED);
  assert.equal(partialRefund.paymentSession, undefined);
  assert.equal(invoiceLookups, 1);
});

test('PayPal rejects headerless webhooks before OAuth and builds refund subscription context', async () => {
  const provider = new PayPalProvider({
    clientId: 'client',
    clientSecret: 'secret',
    webhookId: 'webhook',
  });
  let oauthCalls = 0;
  (provider as any).ensureAccessToken = async () => {
    oauthCalls += 1;
  };
  await assert.rejects(
    provider.getPaymentEvent({
      req: new Request('https://curvg.test/api/payment/notify/paypal', {
        method: 'POST',
        body: JSON.stringify({ event_type: 'PAYMENT.SALE.REFUNDED' }),
      }),
    }),
    /Missing PayPal webhook signature headers/
  );
  assert.equal(oauthCalls, 0);

  const subscription = {
    id: 'I-SUB',
    status: 'ACTIVE',
    plan_id: 'P-PLAN',
    custom_id: JSON.stringify({ orderNo: 'ORD_SUB' }),
    start_time: '2026-07-01T00:00:00.000Z',
    billing_info: {
      last_payment: {
        time: '2026-07-28T00:00:00.000Z',
        amount: { value: '29.00', currency_code: 'USD' },
      },
      next_billing_time: '2026-08-28T00:00:00.000Z',
      cycle_executions: [{ cycles_completed: 2 }],
    },
  };
  const plan = {
    product_id: 'PAYPAL_PRO',
    name: 'Pro',
    billing_cycles: [
      {
        tenure_type: 'REGULAR',
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        pricing_scheme: {
          fixed_price: { value: '29.00', currency_code: 'USD' },
        },
      },
    ],
  };
  (provider as any).makeRequest = async (endpoint: string) => {
    if (endpoint.includes('verify-webhook-signature')) {
      return { verification_status: 'SUCCESS' };
    }
    if (endpoint === '/v1/payments/sale/sale_original') {
      return {
        id: 'sale_original',
        state: 'refunded',
        billing_agreement_id: 'I-SUB',
        create_time: '2026-07-28T00:00:00.000Z',
        amount: { total: '29.00', currency: 'USD' },
      };
    }
    if (endpoint.includes('/subscriptions/')) return subscription;
    if (endpoint.includes('/plans/')) return plan;
    throw new Error(`Unexpected PayPal endpoint: ${endpoint}`);
  };
  const refund = await provider.getPaymentEvent({
    req: new Request('https://curvg.test/api/payment/notify/paypal', {
      method: 'POST',
      headers: {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.paypal.com/cert',
        'paypal-transmission-id': 'tx',
        'paypal-transmission-sig': 'sig',
        'paypal-transmission-time': '2026-07-28T00:00:00Z',
      },
      body: JSON.stringify({
        event_type: 'PAYMENT.SALE.REFUNDED',
        resource: {
          id: 'refund_1',
          status: 'COMPLETED',
          sale_id: 'sale_original',
          billing_agreement_id: 'I-SUB',
          create_time: '2026-07-28T00:00:00.000Z',
          amount: { value: '29.00', currency_code: 'USD' },
        },
      }),
    }),
  });
  assert.equal(refund.eventType, PaymentEventType.PAYMENT_REFUNDED);
  assert.equal(refund.paymentSession?.subscriptionId, 'I-SUB');
  assert.equal(refund.paymentSession?.paymentStatus, 'failed');
  assert.equal(
    refund.paymentSession?.paymentInfo?.transactionId,
    'sale_original'
  );
});

test('PayPal one-time refund resolves the original capture and ignores partial refunds', async () => {
  const provider = new PayPalProvider({
    clientId: 'client',
    clientSecret: 'secret',
    webhookId: 'webhook',
  });
  (provider as any).ensureAccessToken = async () => undefined;
  let originalStatus = 'REFUNDED';
  (provider as any).makeRequest = async (endpoint: string) => {
    if (endpoint.includes('verify-webhook-signature')) {
      return { verification_status: 'SUCCESS' };
    }
    if (endpoint === '/v2/payments/captures/CAPTURE_ORIGINAL') {
      return {
        id: 'CAPTURE_ORIGINAL',
        status: originalStatus,
        amount: { value: '29.00', currency_code: 'USD' },
        create_time: '2026-07-28T00:00:00.000Z',
        supplementary_data: {
          related_ids: { order_id: 'PAYPAL_ORDER' },
        },
      };
    }
    if (endpoint === '/v2/checkout/orders/PAYPAL_ORDER') {
      return {
        purchase_units: [
          { custom_id: JSON.stringify({ orderNo: 'ORD_PAYPAL_ONCE' }) },
        ],
      };
    }
    throw new Error(`Unexpected PayPal endpoint: ${endpoint}`);
  };
  const request = () =>
    new Request('https://curvg.test/api/payment/notify/paypal', {
      method: 'POST',
      headers: {
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.paypal.com/cert',
        'paypal-transmission-id': 'tx',
        'paypal-transmission-sig': 'sig',
        'paypal-transmission-time': '2026-07-28T00:00:00Z',
      },
      body: JSON.stringify({
        event_type: 'PAYMENT.CAPTURE.REFUNDED',
        resource: {
          id: 'REFUND_ID',
          status: 'COMPLETED',
          amount: { value: '29.00', currency_code: 'USD' },
          links: [
            {
              rel: 'up',
              href: 'https://api-m.paypal.com/v2/payments/captures/CAPTURE_ORIGINAL',
            },
          ],
        },
      }),
    });

  const full = await provider.getPaymentEvent({ req: request() });
  assert.equal(full.eventType, PaymentEventType.PAYMENT_REFUNDED);
  assert.equal(
    full.paymentSession?.paymentInfo?.transactionId,
    'CAPTURE_ORIGINAL'
  );
  assert.equal(full.paymentSession?.metadata?.orderNo, 'ORD_PAYPAL_ONCE');
  assert.equal(full.paymentSession?.paymentResult?.id, 'REFUND_ID');

  originalStatus = 'PARTIALLY_REFUNDED';
  const partial = await provider.getPaymentEvent({ req: request() });
  assert.equal(partial.eventType, PaymentEventType.IGNORED);
  assert.equal(partial.paymentSession, undefined);
});

test('PayPal and Creem receive the server order id as their provider idempotency key', async () => {
  const paypal = new PayPalProvider({
    clientId: 'client',
    clientSecret: 'secret',
  });
  (paypal as any).ensureAccessToken = async () => undefined;
  let paypalRequestId = '';
  (paypal as any).makeRequest = async (
    _endpoint: string,
    _method: string,
    _payload: unknown,
    requestId: string
  ) => {
    paypalRequestId = requestId;
    return {
      id: 'ORDER',
      links: [{ rel: 'approve', href: 'https://paypal.test/approve' }],
    };
  };
  await paypal.createPayment({
    order: {
      requestId: 'ORD_PAYPAL',
      price: { amount: 2900, currency: 'USD' },
      metadata: { orderNo: 'ORD_PAYPAL' },
    },
  });
  assert.equal(paypalRequestId, 'PPO_ORD_PAYPAL');

  const { CreemProvider } = await import('../src/core/payment/creem');
  const creem = new CreemProvider({ apiKey: 'creem' });
  let creemPayload: any;
  (creem as any).makeRequest = async (
    _endpoint: string,
    _method: string,
    payload: any
  ) => {
    creemPayload = payload;
    return { id: 'checkout', checkout_url: 'https://creem.test/checkout' };
  };
  await creem.createPayment({
    order: {
      requestId: 'ORD_CREEM',
      productId: 'prod_creem',
      price: { amount: 2900, currency: 'USD' },
    },
  });
  assert.equal(creemPayload.request_id, 'ORD_CREEM');
});
