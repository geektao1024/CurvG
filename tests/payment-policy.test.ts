import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPricingProduct,
  isPublicSubscriptionProductId,
  resolveSubscriptionPricingProduct,
} from '../src/config/pricing';
import { PaymentManager } from '../src/core/payment/index';
import {
  PaymentInterval,
  SubscriptionCycleType,
  type PaymentProvider,
} from '../src/core/payment/types';
import {
  buildPaymentManager,
  classifyPaymentSuccess,
  classifyRefundedOrderAction,
  decideSubscriptionWebhookPeriod,
  getCheckoutProviderNames,
  getConfiguredPaymentProviderNames,
  isStaleCheckoutClaim,
  isStaleRenewalClaim,
  isStrictlyNewerSubscriptionPeriod,
  resolveCanonicalPaymentAmount,
} from '../src/modules/payment/service';

function fakeProvider(name: string): PaymentProvider {
  return {
    name,
    configs: {},
    async createPayment() {
      return {
        provider: name,
        checkoutParams: {},
        checkoutInfo: { sessionId: 'session', checkoutUrl: '/checkout' },
        checkoutResult: {},
        metadata: {},
      };
    },
    async getPaymentSession() {
      return { provider: name };
    },
    async getPaymentEvent() {
      throw new Error('not used');
    },
  };
}

test('an explicit unknown provider never falls back to the default', async () => {
  const manager = new PaymentManager();
  manager.addProvider(fakeProvider('stripe'), true);

  assert.equal(manager.getProvider('disabled-provider'), undefined);
  await assert.rejects(
    manager.createPayment({ order: {}, provider: 'disabled-provider' }),
    /not found/
  );
});

test('registration requires enabled=true and complete signed-webhook credentials', () => {
  const complete = {
    stripe_enabled: 'true',
    stripe_secret_key: 'sk_test',
    stripe_signing_secret: 'whsec_test',
    creem_enabled: 'true',
    creem_api_key: 'creem_test',
    creem_signing_secret: 'creem_signing_test',
    creem_product_ids_mapping: JSON.stringify({
      starter_monthly: 'creem_starter_month',
      starter_yearly: 'creem_starter_year',
      pro_monthly: 'creem_pro_month',
      pro_yearly: 'creem_pro_year',
    }),
    paypal_enabled: 'true',
    paypal_client_id: 'paypal_client',
    paypal_client_secret: 'paypal_secret',
    paypal_webhook_id: 'paypal_webhook',
    alipay_enabled: 'true',
    alipay_app_id: 'alipay_app',
    alipay_private_key: 'alipay_private',
    alipay_public_key: 'alipay_public',
    wechat_enabled: 'true',
    wechat_app_id: 'wechat_app',
    wechat_mch_id: 'wechat_mch',
    wechat_api_v3_key: 'wechat_v3',
    wechat_private_key: 'wechat_private',
    wechat_serial_no: 'wechat_serial',
    wechat_platform_cert: 'wechat_cert',
  };

  assert.deepEqual(getConfiguredPaymentProviderNames(complete), [
    'stripe',
    'creem',
    'paypal',
    'alipay',
    'wechat',
  ]);
  assert.deepEqual(getCheckoutProviderNames(complete), [
    'stripe',
    'creem',
    'paypal',
  ]);
  assert.deepEqual(
    getConfiguredPaymentProviderNames({
      ...complete,
      stripe_enabled: 'false',
      alipay_public_key: '',
      wechat_platform_cert: '',
    }),
    ['creem', 'paypal']
  );
  assert.deepEqual(
    getCheckoutProviderNames({
      ...complete,
      creem_product_ids_mapping: JSON.stringify({
        pro_monthly: 'creem_pro_month',
      }),
    }),
    ['stripe', 'paypal']
  );
  assert.deepEqual(
    getCheckoutProviderNames({
      ...complete,
      creem_product_ids_mapping: JSON.stringify({
        starter_monthly: 'creem_starter_month',
        starter_yearly: 'creem_starter_year',
        pro_monthly: 'duplicate',
        pro_yearly: 'duplicate',
      }),
    }),
    ['stripe', 'paypal']
  );
});

test('PayPal live and production config values both select the production API', () => {
  const credentials = {
    paypal_enabled: 'true',
    paypal_client_id: 'paypal_client',
    paypal_client_secret: 'paypal_secret',
    paypal_webhook_id: 'paypal_webhook',
  };

  for (const environment of ['live', 'production']) {
    const manager = buildPaymentManager({
      ...credentials,
      paypal_environment: environment,
    });
    assert.equal(
      manager.getProvider('paypal')?.configs.environment,
      'production'
    );
  }
});

test('only the four public recurring products are checkout-eligible', () => {
  assert.equal(isPublicSubscriptionProductId('starter_monthly'), true);
  assert.equal(isPublicSubscriptionProductId('starter_yearly'), true);
  assert.equal(isPublicSubscriptionProductId('pro_monthly'), true);
  assert.equal(isPublicSubscriptionProductId('pro_yearly'), true);
  assert.equal(isPublicSubscriptionProductId('pro_lifetime'), false);
  assert.equal(isPublicSubscriptionProductId('enterprise_monthly'), false);
});

test('the public catalog keeps the advertised prices and render allowances', () => {
  assert.deepEqual(
    ['starter_monthly', 'starter_yearly', 'pro_monthly', 'pro_yearly'].map(
      (productId) => {
        const product = getPricingProduct(productId);
        return product
          ? [
              product.productId,
              product.priceInCents,
              product.credits,
              product.creditsValidDays,
            ]
          : null;
      }
    ),
    [
      ['starter_monthly', 990, 300, 31],
      ['starter_yearly', 9500, 3600, 366],
      ['pro_monthly', 1890, 1000, 31],
      ['pro_yearly', 18100, 12000, 366],
    ]
  );
});

test('provider test amounts can never discount a production checkout', () => {
  const configs = { paypal_test_amount: '1' };
  assert.equal(
    resolveCanonicalPaymentAmount({
      configs,
      provider: 'paypal',
      catalogAmount: 2900,
      production: true,
    }),
    2900
  );
  assert.equal(
    resolveCanonicalPaymentAmount({
      configs,
      provider: 'paypal',
      catalogAmount: 2900,
      production: false,
    }),
    1
  );
});

test('signed subscription attributes resolve exactly and unknown changes fail closed', () => {
  assert.equal(
    resolveSubscriptionPricingProduct({
      amount: 1890,
      currency: 'USD',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    })?.productId,
    'pro_monthly'
  );
  assert.equal(
    resolveSubscriptionPricingProduct({
      amount: 990,
      currency: 'USD',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    })?.productId,
    'starter_monthly'
  );
  assert.equal(
    resolveSubscriptionPricingProduct({
      amount: 1891,
      currency: 'usd',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    }),
    null
  );
  assert.equal(
    resolveSubscriptionPricingProduct({
      providerProductId: 'prod_pro_year',
      providerProductMapping: { pro_yearly: 'prod_pro_year' },
    })?.productId,
    'pro_yearly'
  );
  assert.equal(
    resolveSubscriptionPricingProduct({
      providerProductId: 'duplicate',
      providerProductMapping: {
        pro_monthly: 'duplicate',
        starter_monthly: 'duplicate',
      },
    }),
    null
  );
});

test('payment.success routes renewals explicitly and rejects unknown subscription cycles', () => {
  assert.equal(
    classifyPaymentSuccess({
      subscriptionId: 'sub_1',
      paymentInfo: {
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        subscriptionCycleType: SubscriptionCycleType.RENEWAL,
      },
    }),
    'renewal'
  );
  assert.equal(
    classifyPaymentSuccess({
      subscriptionId: 'sub_1',
      paymentInfo: {
        paymentAmount: 2900,
        paymentCurrency: 'usd',
        subscriptionCycleType: SubscriptionCycleType.CREATE,
      },
    }),
    'checkout'
  );
  assert.equal(classifyPaymentSuccess({}), 'checkout');
  assert.equal(classifyPaymentSuccess({ subscriptionId: 'sub_1' }), 'reject');
});

test('refund-before-success creates a terminal tombstone instead of granting later', () => {
  for (const status of ['pending', 'created', 'failed']) {
    assert.equal(classifyRefundedOrderAction(status), 'tombstone', status);
  }
  assert.equal(classifyRefundedOrderAction('paid'), 'revoke');
  assert.equal(classifyRefundedOrderAction('refunded'), 'revoke');
  assert.equal(
    classifyRefundedOrderAction(
      'processing:00000000-0000-0000-0000-000000000000'
    ),
    'retry'
  );
});

test('renewal periods only move forward and checkout claims expire', () => {
  const currentEnd = new Date('2026-08-01T00:00:00.000Z');
  assert.equal(
    isStrictlyNewerSubscriptionPeriod({
      currentPeriodEnd: currentEnd,
      nextPeriodStart: currentEnd,
      nextPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
    }),
    true
  );
  assert.equal(
    isStrictlyNewerSubscriptionPeriod({
      currentPeriodEnd: currentEnd,
      nextPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      nextPeriodEnd: currentEnd,
    }),
    false
  );

  const now = new Date('2026-08-01T00:10:00.000Z');
  assert.equal(
    isStaleCheckoutClaim(
      'processing:00000000-0000-0000-0000-000000000000',
      new Date('2026-08-01T00:04:59.999Z'),
      now
    ),
    true
  );
  assert.equal(
    isStaleCheckoutClaim('paid', new Date('2026-01-01T00:00:00.000Z'), now),
    false
  );
  assert.equal(
    isStaleRenewalClaim(
      'renewing:00000000-0000-0000-0000-000000000000',
      new Date('2026-08-01T00:05:00.000Z'),
      now
    ),
    true
  );
  assert.equal(
    isStaleRenewalClaim(
      'renewing:00000000-0000-0000-0000-000000000000',
      new Date('2026-08-01T00:05:00.001Z'),
      now
    ),
    false
  );
  assert.equal(
    isStaleRenewalClaim('active', new Date('2026-01-01T00:00:00.000Z'), now),
    false
  );
});

test('subscription webhook period policy rejects stale/replayed updates and only applies safe terminal events', () => {
  const currentStart = new Date('2026-08-01T00:00:00.000Z');
  const currentEnd = new Date('2026-09-01T00:00:00.000Z');

  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'update',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      incomingPeriodEnd: currentEnd,
      currentStatus: 'active',
    }),
    'ignore'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'update',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
      currentStatus: 'active',
    }),
    'apply'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'update',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'active',
      incomingStatus: 'paused',
    }),
    'apply'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'update',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'paused',
      incomingStatus: 'active',
    }),
    'ignore'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'cancel',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'active',
    }),
    'apply'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'cancel',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'canceled',
    }),
    'ignore'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'payment_problem',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'active',
    }),
    'apply'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'payment_problem',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: null,
      incomingPeriodEnd: null,
      currentStatus: 'active',
    }),
    'ignore'
  );
  assert.equal(
    decideSubscriptionWebhookPeriod({
      event: 'payment_problem',
      currentPeriodStart: currentStart,
      currentPeriodEnd: currentEnd,
      incomingPeriodStart: currentStart,
      incomingPeriodEnd: currentEnd,
      currentStatus: 'canceled',
    }),
    'ignore'
  );
});
