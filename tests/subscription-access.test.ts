import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAnimationAccessTierFromRecords,
  SubscriptionStatus,
  type AnimationAccessSubscription,
} from '../src/modules/subscriptions/service';

const now = new Date('2026-07-28T04:00:00.000Z');

function subscription(
  overrides: Partial<AnimationAccessSubscription> = {}
): AnimationAccessSubscription {
  return {
    productId: 'pro_monthly',
    status: SubscriptionStatus.ACTIVE,
    currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
    canceledEndAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function tier(params: {
  subscriptions?: readonly AnimationAccessSubscription[];
}) {
  return getAnimationAccessTierFromRecords({
    subscriptions: params.subscriptions ?? [],
    now,
  });
}

test('Starter and unknown products remain free', () => {
  assert.equal(
    tier({ subscriptions: [subscription({ productId: 'starter_monthly' })] }),
    'free'
  );
  assert.equal(
    tier({ subscriptions: [subscription({ productId: 'unknown_product' })] }),
    'free'
  );
});

test('active Pro subscription is valid only inside its period', () => {
  assert.equal(tier({ subscriptions: [subscription()] }), 'pro');
  assert.equal(
    tier({
      subscriptions: [
        subscription({ currentPeriodEnd: new Date(now.getTime()) }),
      ],
    }),
    'free'
  );
  assert.equal(
    tier({
      subscriptions: [
        subscription({
          status: SubscriptionStatus.EXPIRED,
          currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ],
    }),
    'free'
  );
});

test('future subscription fails closed until its period starts', () => {
  assert.equal(
    tier({
      subscriptions: [
        subscription({
          currentPeriodStart: new Date(now.getTime() + 1),
          currentPeriodEnd: new Date('2026-09-01T00:00:00.000Z'),
        }),
      ],
    }),
    'free'
  );
});

test('trialing Pro and Enterprise inherit access only with a valid period', () => {
  assert.equal(
    tier({
      subscriptions: [
        subscription({
          productId: 'pro_yearly',
          status: SubscriptionStatus.TRIALING,
        }),
      ],
    }),
    'pro'
  );
  assert.equal(
    tier({
      subscriptions: [subscription({ productId: 'enterprise_monthly' })],
    }),
    'pro'
  );
  assert.equal(
    tier({ subscriptions: [subscription({ currentPeriodEnd: null })] }),
    'free'
  );
});

test('a newer Starter record does not mask another valid Pro subscription', () => {
  assert.equal(
    tier({
      subscriptions: [
        subscription({ productId: 'starter_monthly' }),
        subscription({ productId: 'pro_monthly' }),
      ],
    }),
    'pro'
  );
});

test('pending_cancel remains Pro only before the effective cancellation end', () => {
  assert.equal(
    tier({
      subscriptions: [
        subscription({
          status: SubscriptionStatus.PENDING_CANCEL,
          canceledEndAt: new Date(now.getTime() + 1),
        }),
      ],
    }),
    'pro'
  );
  assert.equal(
    tier({
      subscriptions: [
        subscription({
          status: SubscriptionStatus.PENDING_CANCEL,
          canceledEndAt: new Date(now.getTime()),
        }),
      ],
    }),
    'free'
  );
});

test('one-time and lifetime product IDs never grant Pro entitlement', () => {
  assert.equal(
    tier({ subscriptions: [subscription({ productId: 'pro_lifetime' })] }),
    'free'
  );
  assert.equal(
    tier({ subscriptions: [subscription({ productId: 'starter_lifetime' })] }),
    'free'
  );
});

test('soft-deleted subscriptions are ignored', () => {
  const deletedAt = new Date('2026-07-20T00:00:00.000Z');

  assert.equal(tier({ subscriptions: [subscription({ deletedAt })] }), 'free');
});
