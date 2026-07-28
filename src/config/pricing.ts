/**
 * Authoritative pricing catalog.
 *
 * The checkout API uses this as the SOURCE OF TRUTH for price/credits/duration.
 * Any price, credits, or plan info sent by the client is IGNORED — only the
 * product_id is honored, and everything else is looked up here.
 *
 * To change pricing, edit this file and redeploy. Admin UI cannot alter prices.
 */

import { PaymentInterval, PaymentType } from '@/core/payment/types';

export type PricingPlanInfo = {
  name: string;
  interval: PaymentInterval;
  intervalCount: number;
};

export type PricingProduct = {
  productId: string;
  productName: string;
  planName: string;
  description: string;
  type: PaymentType;
  priceInCents: number;
  currency: string;
  credits: number;
  creditsValidDays?: number;
  plan?: PricingPlanInfo;
  tier: 'starter' | 'pro' | 'enterprise';
};

export const PUBLIC_PRO_PRODUCT_IDS = ['pro_monthly', 'pro_yearly'] as const;

export type PublicProProductId = (typeof PUBLIC_PRO_PRODUCT_IDS)[number];

export interface SubscriptionProductDescriptor {
  providerProductId?: string | null;
  amount?: number | null;
  currency?: string | null;
  interval?: PaymentInterval | null;
  intervalCount?: number | null;
  providerProductMapping?: Readonly<Record<string, string>> | null;
}

/**
 * Default demo catalog. Replace with your real products when launching.
 * Keys MUST match what the pricing UI sends as product_id.
 */
export const pricingCatalog: Record<string, PricingProduct> = {
  starter_monthly: {
    productId: 'starter_monthly',
    productName: 'Starter',
    planName: 'Starter',
    description: 'Starter Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 900,
    currency: 'usd',
    credits: 5000,
    tier: 'starter',
    plan: {
      name: 'Starter',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  pro_monthly: {
    productId: 'pro_monthly',
    productName: 'Pro',
    planName: 'Pro',
    description: 'Pro Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 2900,
    currency: 'usd',
    credits: 50000,
    tier: 'pro',
    plan: { name: 'Pro', interval: PaymentInterval.MONTH, intervalCount: 1 },
  },
  enterprise_monthly: {
    productId: 'enterprise_monthly',
    productName: 'Enterprise',
    planName: 'Enterprise',
    description: 'Enterprise Monthly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 9900,
    currency: 'usd',
    credits: 500000,
    tier: 'enterprise',
    plan: {
      name: 'Enterprise',
      interval: PaymentInterval.MONTH,
      intervalCount: 1,
    },
  },
  starter_yearly: {
    productId: 'starter_yearly',
    productName: 'Starter',
    planName: 'Starter',
    description: 'Starter Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 8600,
    currency: 'usd',
    credits: 60000,
    tier: 'starter',
    plan: { name: 'Starter', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  pro_yearly: {
    productId: 'pro_yearly',
    productName: 'Pro',
    planName: 'Pro',
    description: 'Pro Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 27800,
    currency: 'usd',
    credits: 600000,
    tier: 'pro',
    plan: { name: 'Pro', interval: PaymentInterval.YEAR, intervalCount: 1 },
  },
  enterprise_yearly: {
    productId: 'enterprise_yearly',
    productName: 'Enterprise',
    planName: 'Enterprise',
    description: 'Enterprise Yearly',
    type: PaymentType.SUBSCRIPTION,
    priceInCents: 95000,
    currency: 'usd',
    credits: 6000000,
    tier: 'enterprise',
    plan: {
      name: 'Enterprise',
      interval: PaymentInterval.YEAR,
      intervalCount: 1,
    },
  },
  starter_lifetime: {
    productId: 'starter_lifetime',
    productName: 'Starter',
    planName: 'Starter Lifetime',
    description: 'Starter Lifetime',
    type: PaymentType.ONE_TIME,
    priceInCents: 14900,
    currency: 'usd',
    credits: 100000,
    tier: 'starter',
  },
  pro_lifetime: {
    productId: 'pro_lifetime',
    productName: 'Pro',
    planName: 'Pro Lifetime',
    description: 'Pro Lifetime',
    type: PaymentType.ONE_TIME,
    priceInCents: 49900,
    currency: 'usd',
    credits: 1000000,
    tier: 'pro',
  },
  enterprise_lifetime: {
    productId: 'enterprise_lifetime',
    productName: 'Enterprise',
    planName: 'Enterprise Lifetime',
    description: 'Enterprise Lifetime',
    type: PaymentType.ONE_TIME,
    priceInCents: 199900,
    currency: 'usd',
    credits: 10000000,
    tier: 'enterprise',
  },
};

export function getPricingProduct(productId: string): PricingProduct | null {
  if (!productId) return null;
  return pricingCatalog[productId] ?? null;
}

export function listPricingProducts(): PricingProduct[] {
  return Object.values(pricingCatalog);
}

export function isPublicProProductId(
  productId: string
): productId is PublicProProductId {
  return (PUBLIC_PRO_PRODUCT_IDS as readonly string[]).includes(productId);
}

/**
 * Resolve a provider-signed subscription description to one internal product.
 * Ambiguous, incomplete, and unknown descriptions deliberately fail closed.
 */
export function resolveSubscriptionPricingProduct(
  descriptor: SubscriptionProductDescriptor
): PricingProduct | null {
  const subscriptionProducts = listPricingProducts().filter(
    (product) => product.type === PaymentType.SUBSCRIPTION && product.plan
  );

  if (descriptor.providerProductId && descriptor.providerProductMapping) {
    const mappedProducts = subscriptionProducts.filter(
      (product) =>
        descriptor.providerProductMapping?.[product.productId] ===
        descriptor.providerProductId
    );
    if (mappedProducts.length === 1) return mappedProducts[0];
    if (mappedProducts.length > 1) return null;
  }

  if (
    descriptor.amount === null ||
    descriptor.amount === undefined ||
    !Number.isInteger(descriptor.amount) ||
    descriptor.currency === null ||
    descriptor.currency === undefined ||
    !descriptor.currency.trim() ||
    descriptor.interval === null ||
    descriptor.interval === undefined
  ) {
    return null;
  }

  const intervalCount = descriptor.intervalCount ?? 1;
  if (!Number.isInteger(intervalCount) || intervalCount <= 0) return null;

  const currency = descriptor.currency.toLowerCase();
  const matches = subscriptionProducts.filter(
    (product) =>
      product.priceInCents === descriptor.amount &&
      product.currency.toLowerCase() === currency &&
      product.plan?.interval === descriptor.interval &&
      product.plan?.intervalCount === intervalCount
  );

  return matches.length === 1 ? matches[0] : null;
}

export function productIncludesProModels(productId: string | null | undefined) {
  if (!productId) return false;
  const product = getPricingProduct(productId);
  return product?.tier === 'pro' || product?.tier === 'enterprise';
}
