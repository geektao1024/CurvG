import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/core/db';
import { PaymentType } from '@/core/payment/types';
import type { AnimationAccessTier } from '@/config/animation-models';
import { subscription } from '@/config/db/schema';
import {
  listPricingProducts,
  productIncludesProModels,
} from '@/config/pricing';
import { getSnowId, getUuid } from '@/lib/hash';

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PENDING_CANCEL = 'pending_cancel',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export type NewSubscription = typeof subscription.$inferInsert;
export type UpdateSubscription = Partial<
  Omit<NewSubscription, 'id' | 'subscriptionNo' | 'createdAt'>
>;

export type { AnimationAccessTier } from '@/config/animation-models';

const ANIMATION_SUBSCRIPTION_PRODUCTS = listPricingProducts().filter(
  (product) => product.type === PaymentType.SUBSCRIPTION && product.plan
);

const ANIMATION_SUBSCRIPTION_PRODUCT_IDS = ANIMATION_SUBSCRIPTION_PRODUCTS.map(
  (product) => product.productId
);

const ANIMATION_SUBSCRIPTION_ACCESS = new Map<string, AnimationAccessTier>(
  ANIMATION_SUBSCRIPTION_PRODUCTS.map((product) => [
    product.productId,
    productIncludesProModels(product.productId) ? 'pro' : 'starter',
  ])
);

const ANIMATION_SUBSCRIPTION_STATUSES = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.PENDING_CANCEL,
] as const;

export interface AnimationAccessSubscription {
  productId: string | null;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledEndAt: Date | null;
  deletedAt: Date | null;
}

/**
 * Resolve animation access from already-loaded billing records.
 *
 * This is intentionally pure so the date and status boundaries can be tested
 * without a database. Unknown products, malformed periods, and deleted rows
 * fail closed to the free tier.
 */
export function getAnimationAccessTierFromRecords(params: {
  subscriptions: readonly AnimationAccessSubscription[];
  now?: Date;
}): AnimationAccessTier {
  const now = (params.now || new Date()).getTime();
  const subscriptionStatuses = new Set<string>(ANIMATION_SUBSCRIPTION_STATUSES);

  let resolvedTier: AnimationAccessTier = 'free';
  for (const candidate of params.subscriptions) {
    const candidateTier = candidate.productId
      ? ANIMATION_SUBSCRIPTION_ACCESS.get(candidate.productId)
      : undefined;
    if (
      candidate.deletedAt ||
      !candidateTier ||
      !subscriptionStatuses.has(candidate.status)
    ) {
      continue;
    }

    const periodStart = candidate.currentPeriodStart?.getTime();
    const periodEnd = candidate.currentPeriodEnd?.getTime();
    if (
      periodStart === undefined ||
      periodEnd === undefined ||
      !Number.isFinite(periodStart) ||
      !Number.isFinite(periodEnd)
    ) {
      continue;
    }

    const canceledEnd = candidate.canceledEndAt?.getTime();
    const effectiveEnd =
      canceledEnd !== undefined && Number.isFinite(canceledEnd)
        ? Math.min(periodEnd, canceledEnd)
        : periodEnd;

    if (periodStart <= now && now < effectiveEnd) {
      if (candidateTier === 'pro') return 'pro';
      resolvedTier = 'starter';
    }
  }

  return resolvedTier;
}

export async function getAnimationAccessTier(
  userId: string
): Promise<AnimationAccessTier> {
  const subscriptions = await db()
    .select({
      productId: subscription.productId,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      canceledEndAt: subscription.canceledEndAt,
      deletedAt: subscription.deletedAt,
    })
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        isNull(subscription.deletedAt),
        inArray(subscription.productId, [
          ...ANIMATION_SUBSCRIPTION_PRODUCT_IDS,
        ]),
        inArray(subscription.status, [...ANIMATION_SUBSCRIPTION_STATUSES])
      )
    );

  return getAnimationAccessTierFromRecords({ subscriptions });
}

export async function createSubscription(data: NewSubscription) {
  const [result] = await db().insert(subscription).values(data).returning();
  return result;
}

export async function updateBySubscriptionNo(
  subscriptionNo: string,
  data: UpdateSubscription
) {
  const [result] = await db()
    .update(subscription)
    .set(data)
    .where(eq(subscription.subscriptionNo, subscriptionNo))
    .returning();
  return result;
}

export async function findBySubscriptionNo(subscriptionNo: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(eq(subscription.subscriptionNo, subscriptionNo));
  return result;
}

export async function findByProviderSubscriptionId(params: {
  provider: string;
  subscriptionId: string;
}) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.paymentProvider, params.provider),
        eq(subscription.subscriptionId, params.subscriptionId),
        isNull(subscription.deletedAt)
      )
    );
  return result;
}

export async function getCurrentSubscription(userId: string) {
  const [result] = await db()
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.userId, userId),
        isNull(subscription.deletedAt),
        inArray(subscription.status, [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING_CANCEL,
          SubscriptionStatus.TRIALING,
        ])
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1);
  return result;
}

export async function getSubscriptions(params: {
  userId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, status, page = 1, limit = 30 } = params;
  return db()
    .select()
    .from(subscription)
    .where(
      and(
        userId ? eq(subscription.userId, userId) : undefined,
        status ? eq(subscription.status, status) : undefined
      )
    )
    .orderBy(desc(subscription.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);
}
