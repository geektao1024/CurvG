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

const ANIMATION_PRO_SUBSCRIPTION_PRODUCT_IDS = listPricingProducts()
  .filter(
    (product) =>
      product.type === PaymentType.SUBSCRIPTION &&
      productIncludesProModels(product.productId)
  )
  .map((product) => product.productId);

const ANIMATION_PRO_SUBSCRIPTION_STATUSES = [
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
  const proSubscriptionProducts = new Set<string>(
    ANIMATION_PRO_SUBSCRIPTION_PRODUCT_IDS
  );
  const proSubscriptionStatuses = new Set<string>(
    ANIMATION_PRO_SUBSCRIPTION_STATUSES
  );

  const hasValidSubscription = params.subscriptions.some((candidate) => {
    if (
      candidate.deletedAt ||
      !candidate.productId ||
      !proSubscriptionProducts.has(candidate.productId) ||
      !proSubscriptionStatuses.has(candidate.status)
    ) {
      return false;
    }

    const periodStart = candidate.currentPeriodStart?.getTime();
    const periodEnd = candidate.currentPeriodEnd?.getTime();
    if (
      periodStart === undefined ||
      periodEnd === undefined ||
      !Number.isFinite(periodStart) ||
      !Number.isFinite(periodEnd)
    ) {
      return false;
    }

    const canceledEnd = candidate.canceledEndAt?.getTime();
    const effectiveEnd =
      canceledEnd !== undefined && Number.isFinite(canceledEnd)
        ? Math.min(periodEnd, canceledEnd)
        : periodEnd;

    return periodStart <= now && now < effectiveEnd;
  });

  return hasValidSubscription ? 'pro' : 'free';
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
          ...ANIMATION_PRO_SUBSCRIPTION_PRODUCT_IDS,
        ]),
        inArray(subscription.status, [...ANIMATION_PRO_SUBSCRIPTION_STATUSES])
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
