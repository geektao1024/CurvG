import { and, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  AlipayProvider,
  CreemProvider,
  PaymentManager,
  PayPalProvider,
  StripeProvider,
  WechatPayProvider,
} from '@/core/payment';
import {
  PaymentEventType,
  PaymentStatus,
  PaymentType,
  SubscriptionCycleType,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentOrder,
  type PaymentSession,
  type SubscriptionInfo,
} from '@/core/payment/types';
import {
  credit,
  order,
  paymentCheckoutLease,
  subscription,
} from '@/config/db/schema';
import {
  getPricingProduct,
  isPublicProProductId,
  PUBLIC_PRO_PRODUCT_IDS,
  resolveSubscriptionPricingProduct,
  type PricingProduct,
} from '@/config/pricing';
import { getAllConfigs, type ConfigMap } from '@/modules/config/service';
import { calculateCreditExpirationTime } from '@/modules/credits/service';
import {
  findByProviderSubscriptionId,
  findBySubscriptionNo,
  SubscriptionStatus,
  updateBySubscriptionNo,
} from '@/modules/subscriptions/service';
import { isProduction } from '@/lib/env';
import { getUuid, md5 } from '@/lib/hash';

// --- Order types ---

enum OrderStatus {
  PENDING = 'pending',
  CREATED = 'created',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export class PaymentCheckoutBusyError extends Error {
  readonly status = 409;

  constructor() {
    super('A checkout is already being created for this plan');
    this.name = 'PaymentCheckoutBusyError';
  }
}

const PAYMENT_CHECKOUT_LEASE_MS = 10 * 60_000;
// PayPal verification may perform a 30s OAuth request followed by a 30s
// signature-verification request. Keep the crash lease beyond both deadlines
// so an in-flight slot cannot be stolen before its request terminates.
const PAYPAL_WEBHOOK_VERIFICATION_LEASE_MS = 75_000;
const PAYPAL_WEBHOOK_VERIFICATION_SLOTS = 4;

export class PaymentWebhookVerificationBusyError extends Error {
  readonly status = 429;

  constructor() {
    super('Webhook verification capacity is busy');
    this.name = 'PaymentWebhookVerificationBusyError';
  }
}

async function acquirePaymentCheckoutLease(
  userId: string,
  leaseMs = PAYMENT_CHECKOUT_LEASE_MS
): Promise<string | null> {
  const token = getUuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + leaseMs);
  try {
    await db()
      .insert(paymentCheckoutLease)
      .values({ userId, leaseToken: token, expiresAt });
    return token;
  } catch (insertError) {
    const [existing] = await db()
      .select()
      .from(paymentCheckoutLease)
      .where(eq(paymentCheckoutLease.userId, userId))
      .limit(1);
    if (!existing) throw insertError;
    if (existing.expiresAt.getTime() > now.getTime()) return null;
    await db()
      .update(paymentCheckoutLease)
      .set({ leaseToken: token, expiresAt })
      .where(
        and(
          eq(paymentCheckoutLease.userId, userId),
          eq(paymentCheckoutLease.leaseToken, existing.leaseToken),
          lte(paymentCheckoutLease.expiresAt, now)
        )
      );
    const [claimed] = await db()
      .select({ leaseToken: paymentCheckoutLease.leaseToken })
      .from(paymentCheckoutLease)
      .where(
        and(
          eq(paymentCheckoutLease.userId, userId),
          eq(paymentCheckoutLease.leaseToken, token)
        )
      )
      .limit(1);
    return claimed ? token : null;
  }
}

async function releasePaymentCheckoutLease(userId: string, token: string) {
  await db()
    .delete(paymentCheckoutLease)
    .where(
      and(
        eq(paymentCheckoutLease.userId, userId),
        eq(paymentCheckoutLease.leaseToken, token)
      )
    );
}

async function acquirePayPalWebhookVerificationLease(): Promise<{
  key: string;
  token: string;
} | null> {
  for (let slot = 0; slot < PAYPAL_WEBHOOK_VERIFICATION_SLOTS; slot += 1) {
    const key = `webhook:paypal:verification:${slot}`;
    const token = await acquirePaymentCheckoutLease(
      key,
      PAYPAL_WEBHOOK_VERIFICATION_LEASE_MS
    );
    if (token) return { key, token };
  }
  return null;
}

// --- Payment Manager ---

let manager: PaymentManager | null = null;
let managerConfigHash = '';

const PAYMENT_MANAGER_CONFIG_KEYS = [
  'default_payment_provider',
  'app_url',
  'stripe_enabled',
  'stripe_secret_key',
  'stripe_api_key',
  'stripe_publishable_key',
  'stripe_signing_secret',
  'stripe_webhook_secret',
  'creem_enabled',
  'creem_api_key',
  'creem_signing_secret',
  'creem_environment',
  'paypal_enabled',
  'paypal_client_id',
  'paypal_client_secret',
  'paypal_webhook_id',
  'paypal_environment',
  'alipay_enabled',
  'alipay_app_id',
  'alipay_private_key',
  'alipay_public_key',
  'alipay_notify_url',
  'wechat_enabled',
  'wechat_app_id',
  'wechat_mch_id',
  'wechat_api_v3_key',
  'wechat_private_key',
  'wechat_serial_no',
  'wechat_notify_url',
  'wechat_platform_cert',
] as const;

function hasValues(configs: ConfigMap, keys: readonly string[]): boolean {
  return keys.every((key) => Boolean(configs[key]?.trim()));
}

function parseStoredJson(value: string | null | undefined): unknown {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * The single source of truth for payment-channel availability. A channel is
 * registered only when the admin explicitly enabled it and all credentials
 * required for checkout plus signed webhook processing are present.
 */
export function getConfiguredPaymentProviderNames(
  configs: ConfigMap
): string[] {
  const names: string[] = [];
  const stripeSecret =
    configs.stripe_secret_key?.trim() || configs.stripe_api_key?.trim();
  const stripeSigningSecret =
    configs.stripe_signing_secret?.trim() ||
    configs.stripe_webhook_secret?.trim();

  if (
    configs.stripe_enabled === 'true' &&
    stripeSecret &&
    stripeSigningSecret
  ) {
    names.push('stripe');
  }
  if (
    configs.creem_enabled === 'true' &&
    hasValues(configs, ['creem_api_key', 'creem_signing_secret'])
  ) {
    names.push('creem');
  }
  if (
    configs.paypal_enabled === 'true' &&
    hasValues(configs, [
      'paypal_client_id',
      'paypal_client_secret',
      'paypal_webhook_id',
    ])
  ) {
    names.push('paypal');
  }
  if (
    configs.alipay_enabled === 'true' &&
    hasValues(configs, [
      'alipay_app_id',
      'alipay_private_key',
      'alipay_public_key',
    ])
  ) {
    names.push('alipay');
  }
  if (
    configs.wechat_enabled === 'true' &&
    hasValues(configs, [
      'wechat_app_id',
      'wechat_mch_id',
      'wechat_api_v3_key',
      'wechat_private_key',
      'wechat_serial_no',
      'wechat_platform_cert',
    ])
  ) {
    names.push('wechat');
  }

  return names;
}

export function buildPaymentManager(configs: ConfigMap): PaymentManager {
  const paymentManager = new PaymentManager();
  const registered = new Set(getConfiguredPaymentProviderNames(configs));
  const c = (key: string) => configs[key] || '';
  const appUrl = c('app_url') || 'http://localhost:3000';
  const configuredDefault = c('default_payment_provider');
  const isDefault = (provider: string) => configuredDefault === provider;

  if (registered.has('stripe')) {
    paymentManager.addProvider(
      new StripeProvider({
        secretKey: c('stripe_secret_key') || c('stripe_api_key'),
        publishableKey: c('stripe_publishable_key'),
        signingSecret: c('stripe_signing_secret') || c('stripe_webhook_secret'),
        allowPromotionCodes: true,
        allowedPaymentMethods: ['card', 'wechat_pay', 'alipay'],
      }),
      isDefault('stripe')
    );
  }

  if (registered.has('creem')) {
    paymentManager.addProvider(
      new CreemProvider({
        apiKey: c('creem_api_key'),
        signingSecret: c('creem_signing_secret'),
        environment:
          c('creem_environment') === 'production' ? 'production' : 'sandbox',
      }),
      isDefault('creem')
    );
  }

  if (registered.has('paypal')) {
    paymentManager.addProvider(
      new PayPalProvider({
        clientId: c('paypal_client_id'),
        clientSecret: c('paypal_client_secret'),
        webhookId: c('paypal_webhook_id'),
        environment: ['live', 'production'].includes(c('paypal_environment'))
          ? 'production'
          : 'sandbox',
      }),
      isDefault('paypal')
    );
  }

  if (registered.has('alipay')) {
    paymentManager.addProvider(
      new AlipayProvider({
        appId: c('alipay_app_id'),
        privateKey: c('alipay_private_key'),
        alipayPublicKey: c('alipay_public_key'),
        notifyUrl:
          c('alipay_notify_url') || `${appUrl}/api/payment/notify/alipay`,
      }),
      isDefault('alipay')
    );
  }

  if (registered.has('wechat')) {
    paymentManager.addProvider(
      new WechatPayProvider({
        appId: c('wechat_app_id'),
        mchId: c('wechat_mch_id'),
        apiV3Key: c('wechat_api_v3_key'),
        privateKey: c('wechat_private_key'),
        serialNo: c('wechat_serial_no'),
        notifyUrl:
          c('wechat_notify_url') || `${appUrl}/api/payment/notify/wechat`,
        platformCert: c('wechat_platform_cert'),
      }),
      isDefault('wechat')
    );
  }

  return paymentManager;
}

function hasCompleteCreemProMapping(configs: ConfigMap): boolean {
  const mapping = parseProviderProductMapping(configs, 'creem');
  if (!mapping) return false;
  const mappedIds = PUBLIC_PRO_PRODUCT_IDS.map(
    (productId) => mapping[productId]?.trim() || ''
  );
  return (
    mappedIds.every(Boolean) && new Set(mappedIds).size === mappedIds.length
  );
}

export function getProCheckoutProviderNames(configs: ConfigMap): string[] {
  const registered = new Set(getConfiguredPaymentProviderNames(configs));
  return ['stripe', 'creem', 'paypal'].filter(
    (provider) =>
      registered.has(provider) &&
      (provider !== 'creem' || hasCompleteCreemProMapping(configs))
  );
}

async function getPaymentManager(): Promise<PaymentManager> {
  const configs = await getAllConfigs();

  // Rebuild manager if provider configs changed
  const hash = JSON.stringify(
    PAYMENT_MANAGER_CONFIG_KEYS.map((key) => configs[key] || '')
  );
  if (manager && hash === managerConfigHash) return manager;

  manager = buildPaymentManager(configs);
  managerConfigHash = hash;

  return manager;
}

export async function getPaymentProviderAvailability() {
  const configs = await getAllConfigs();
  const paymentManager = await getPaymentManager();
  const registeredProviders = paymentManager.getProviderNames();
  const providers = getProCheckoutProviderNames(configs).filter((provider) =>
    registeredProviders.includes(provider)
  );
  const configuredDefault = configs.default_payment_provider?.trim();
  return {
    providers,
    defaultProvider: configuredDefault
      ? providers.includes(configuredDefault)
        ? configuredDefault
        : null
      : (providers[0] ?? null),
  };
}

// --- Checkout ---

export async function createCheckout(params: {
  userId: string;
  userEmail?: string;
  paymentOrder: PaymentOrder;
  provider?: string;
  productName?: string;
  planName?: string;
  credits?: number;
  creditsValidDays?: number;
}): Promise<CheckoutSession> {
  const { userId, userEmail, paymentOrder, provider } = params;
  const pm = await getPaymentManager();
  // This value is exposed in provider return URLs. A timestamp plus six
  // Math.random characters is enumerable; use a full UUID token instead.
  const orderNo = `ORD_${getUuid().replaceAll('-', '')}`;
  const configs = await getAllConfigs();
  const appUrl = configs.app_url || 'http://localhost:3000';

  const internalProductId = paymentOrder.productId;
  if (!internalProductId) throw new Error('Product is not publicly sellable');
  const catalogProduct = internalProductId
    ? getPricingProduct(internalProductId)
    : null;
  if (!catalogProduct || !isPublicProProductId(catalogProduct.productId)) {
    throw new Error('Product is not publicly sellable');
  }

  // Resolve provider-specific product ID (e.g. Creem product_ids_mapping)
  const configuredProvider =
    provider || configs.default_payment_provider?.trim() || undefined;
  const resolvedProvider =
    configuredProvider || pm.getDefaultProvider()?.name || undefined;
  if (!resolvedProvider) throw new Error('No payment provider configured');
  if (
    catalogProduct.type === PaymentType.SUBSCRIPTION &&
    !['stripe', 'creem', 'paypal'].includes(resolvedProvider)
  ) {
    throw new Error(
      `Payment provider '${resolvedProvider}' does not support subscriptions`
    );
  }
  let resolvedProductId = internalProductId;
  if (resolvedProvider === 'creem') {
    const mapping = parseProviderProductMapping(configs, 'creem');
    const providerProductId = mapping?.[internalProductId]?.trim();
    const matchingProductIds = providerProductId
      ? Object.entries(mapping || {})
          .filter(([, mappedId]) => mappedId.trim() === providerProductId)
          .map(([productId]) => productId)
      : [];
    if (
      !providerProductId ||
      matchingProductIds.length !== 1 ||
      matchingProductIds[0] !== internalProductId
    ) {
      throw new Error(
        `Creem product mapping is missing or ambiguous for '${internalProductId}'`
      );
    }
    resolvedProductId = providerProductId;
  }

  const finalSuccessUrl =
    paymentOrder.successUrl || `${appUrl}/settings/billing?success=1`;
  const finalCancelUrl =
    paymentOrder.cancelUrl || `${appUrl}/settings/billing?canceled=1`;
  const callbackSuccessUrl = `${appUrl}/api/payment/callback?order_no=${orderNo}&redirect=${encodeURIComponent(finalSuccessUrl)}`;
  const callbackCancelUrl = `${appUrl}/api/payment/callback?order_no=${orderNo}&redirect=${encodeURIComponent(finalCancelUrl)}`;

  // Rebuild every billable field from the server catalog. Keeping this
  // invariant in the service prevents a future route/server function from
  // smuggling a different amount, credits grant, interval, or payment type.
  const canonicalAmount = resolveCanonicalPaymentAmount({
    configs,
    provider: resolvedProvider,
    catalogAmount: catalogProduct.priceInCents,
  });
  const canonicalPaymentOrder: PaymentOrder = {
    ...paymentOrder,
    type: catalogProduct.type,
    price: { amount: canonicalAmount, currency: catalogProduct.currency },
    description: catalogProduct.description,
    productId: resolvedProductId,
    plan: catalogProduct.plan
      ? {
          name: catalogProduct.plan.name,
          interval: catalogProduct.plan.interval,
          intervalCount: catalogProduct.plan.intervalCount,
        }
      : undefined,
  };

  const checkoutLeaseToken = await acquirePaymentCheckoutLease(userId);
  if (!checkoutLeaseToken) throw new PaymentCheckoutBusyError();
  try {
    const [activeCheckout] = await db()
      .select()
      .from(order)
      .where(
        and(
          eq(order.userId, userId),
          inArray(order.productId, [...PUBLIC_PRO_PRODUCT_IDS]),
          inArray(order.status, [OrderStatus.PENDING, OrderStatus.CREATED]),
          isNull(order.deletedAt)
        )
      )
      .orderBy(desc(order.createdAt))
      .limit(1);
    const checkoutAgeMs = activeCheckout
      ? Date.now() - activeCheckout.updatedAt.getTime()
      : Number.POSITIVE_INFINITY;
    let activeCheckoutClosed = false;
    if (activeCheckout?.status === OrderStatus.CREATED) {
      if (!activeCheckout.paymentSessionId || !activeCheckout.checkoutUrl) {
        throw new PaymentCheckoutBusyError();
      }
      try {
        const latest = await pm.getPaymentSession({
          sessionId: activeCheckout.paymentSessionId,
          provider: activeCheckout.paymentProvider,
        });
        if (!latest) throw new PaymentCheckoutBusyError();
        if (
          latest.paymentStatus === PaymentStatus.FAILED ||
          latest.paymentStatus === PaymentStatus.CANCELED
        ) {
          await handleCheckoutSuccess(latest, activeCheckout.paymentProvider);
          activeCheckoutClosed = true;
        } else if (latest.paymentStatus === PaymentStatus.SUCCESS) {
          await handleCheckoutSuccess(latest, activeCheckout.paymentProvider);
          throw new PaymentCheckoutBusyError();
        }
      } catch (error) {
        if (error instanceof PaymentCheckoutBusyError) throw error;
        // A provider status outage must not create a second chargeable session.
        throw new PaymentCheckoutBusyError();
      }
      if (!activeCheckoutClosed) {
        if (activeCheckout.productId !== catalogProduct.productId) {
          throw new PaymentCheckoutBusyError();
        }
        return {
          provider: activeCheckout.paymentProvider,
          checkoutParams: {},
          checkoutInfo: {
            sessionId: activeCheckout.paymentSessionId,
            checkoutUrl: activeCheckout.checkoutUrl,
          },
          checkoutResult: parseStoredJson(activeCheckout.checkoutResult),
          metadata: { orderNo: activeCheckout.orderNo },
        };
      }
    }
    if (
      activeCheckout?.status === OrderStatus.PENDING &&
      checkoutAgeMs <= 2 * 60_000
    ) {
      throw new PaymentCheckoutBusyError();
    }
    if (activeCheckout?.status === OrderStatus.PENDING) {
      await db()
        .update(order)
        .set({ status: OrderStatus.FAILED })
        .where(
          and(
            eq(order.id, activeCheckout.id),
            eq(order.status, OrderStatus.PENDING)
          )
        );
    }

    // Persist the internal order before the external call. A webhook can arrive
    // immediately after provider creation; metadata.orderNo can now always find
    // a row, and a local write failure cannot leave an untracked remote checkout.
    const orderId = getUuid();
    await db()
      .insert(order)
      .values({
        id: orderId,
        orderNo,
        userId,
        userEmail: userEmail || '',
        status: OrderStatus.PENDING,
        amount: catalogProduct.priceInCents,
        currency: catalogProduct.currency,
        productId: catalogProduct.productId,
        productName: catalogProduct.productName,
        planName: catalogProduct.planName,
        creditsAmount: catalogProduct.credits,
        creditsValidDays: catalogProduct.creditsValidDays ?? null,
        paymentType: catalogProduct.type,
        paymentProvider: resolvedProvider,
        checkoutInfo: '',
        description: catalogProduct.description,
      });

    let session: CheckoutSession;
    try {
      session = await pm.createPayment({
        order: {
          ...canonicalPaymentOrder,
          orderNo,
          requestId: orderNo,
          metadata: { ...canonicalPaymentOrder.metadata, orderNo },
          successUrl: callbackSuccessUrl,
          cancelUrl: callbackCancelUrl,
        },
        // Always pass the resolved name explicitly. A disabled or incomplete
        // configured default must fail closed instead of silently using another
        // registered channel.
        provider: resolvedProvider,
      });
    } catch (error) {
      await db()
        .update(order)
        .set({ status: OrderStatus.FAILED })
        .where(
          and(eq(order.id, orderId), eq(order.status, OrderStatus.PENDING))
        );
      throw error;
    }

    await db()
      .update(order)
      .set({
        paymentSessionId: session.checkoutInfo.sessionId,
        checkoutInfo: JSON.stringify(session.checkoutInfo),
        checkoutResult: JSON.stringify(session.checkoutResult),
        checkoutUrl: session.checkoutInfo.checkoutUrl,
      })
      .where(eq(order.id, orderId));
    await db()
      .update(order)
      .set({ status: OrderStatus.CREATED })
      .where(and(eq(order.id, orderId), eq(order.status, OrderStatus.PENDING)));

    return session;
  } finally {
    try {
      await releasePaymentCheckoutLease(userId, checkoutLeaseToken);
    } catch (error) {
      console.error('[payment-checkout] lease release failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// --- Payment callback (return_url) ---

export async function handlePaymentCallback(orderNo: string) {
  // Find the order
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(and(eq(order.orderNo, orderNo), isNull(order.deletedAt)))
    .limit(1);

  if (!existingOrder) return;
  if (existingOrder.status === OrderStatus.PAID) return;

  // Query the payment provider for latest status
  const pm = await getPaymentManager();
  const provider = pm.getProvider(existingOrder.paymentProvider);
  if (!provider) return;

  const session = await provider.getPaymentSession({
    sessionId: existingOrder.paymentSessionId || existingOrder.orderNo,
  });

  // Reuse the same atomic success handler as the webhook so that
  // subscriptions are created and credits granted on synchronous return too.
  // This is important in environments where webhooks aren't reachable (e.g. localhost).
  await handleCheckoutSuccess(session, existingOrder.paymentProvider);
}

// --- Webhook handling ---

const CHECKOUT_CLAIM_PREFIX = 'processing:';
const CHECKOUT_CLAIM_TTL_MS = 5 * 60 * 1000;

export function isCheckoutClaimStatus(status: string): boolean {
  return status.startsWith(CHECKOUT_CLAIM_PREFIX);
}

export function isStaleCheckoutClaim(
  status: string,
  updatedAt: Date,
  now = new Date()
): boolean {
  return (
    isCheckoutClaimStatus(status) &&
    now.getTime() - updatedAt.getTime() >= CHECKOUT_CLAIM_TTL_MS
  );
}

export function isStrictlyNewerSubscriptionPeriod(params: {
  currentPeriodEnd: Date | null;
  nextPeriodStart: Date;
  nextPeriodEnd: Date;
}): boolean {
  const start = params.nextPeriodStart.getTime();
  const end = params.nextPeriodEnd.getTime();
  const currentEnd = params.currentPeriodEnd?.getTime();

  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end &&
    (currentEnd === undefined ||
      (Number.isFinite(currentEnd) && end > currentEnd))
  );
}

export type SubscriptionWebhookDecision = 'apply' | 'ignore';

export function resolveCanonicalPaymentAmount(params: {
  configs: ConfigMap;
  provider: string;
  catalogAmount: number;
  production?: boolean;
}): number {
  const production = params.production ?? isProduction;
  if (production) return params.catalogAmount;
  const configuredTestAmount = Number.parseInt(
    params.configs[`${params.provider}_test_amount`] || '',
    10
  );
  return Number.isInteger(configuredTestAmount) && configuredTestAmount > 0
    ? configuredTestAmount
    : params.catalogAmount;
}

function dateMilliseconds(value: Date | null | undefined): number | null {
  if (!value) return null;
  const milliseconds = value.getTime();
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

/**
 * Decide whether a provider subscription event can change the local row.
 *
 * Providers may deliver events out of order. The subscription period is the
 * only monotonic version available across all supported providers, so old
 * periods must never overwrite a newer one. Updates for the same period are
 * replays; cancellation is the one exception because its first delivery is a
 * meaningful terminal transition for that period.
 */
export function decideSubscriptionWebhookPeriod(params: {
  event: 'update' | 'cancel' | 'payment_problem';
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  incomingPeriodStart: Date | null | undefined;
  incomingPeriodEnd: Date | null | undefined;
  currentStatus: string;
  incomingStatus?: string;
}): SubscriptionWebhookDecision {
  const incomingStart = dateMilliseconds(params.incomingPeriodStart);
  const incomingEnd = dateMilliseconds(params.incomingPeriodEnd);
  if (
    incomingStart === null ||
    incomingEnd === null ||
    incomingStart >= incomingEnd
  ) {
    return 'ignore';
  }

  const currentStart = dateMilliseconds(params.currentPeriodStart);
  const currentEnd = dateMilliseconds(params.currentPeriodEnd);
  if (currentEnd === null) return 'apply';
  if (incomingEnd < currentEnd) return 'ignore';
  if (incomingEnd > currentEnd) return 'apply';

  // Same end date. A different start is not a newer billing period and could
  // be a stale provider snapshot, so fail closed.
  if (currentStart !== null && incomingStart !== currentStart) return 'ignore';

  if (params.event === 'cancel') {
    return params.currentStatus === SubscriptionStatus.CANCELED
      ? 'ignore'
      : 'apply';
  }

  // An already-paused subscription needs no further failure/refund write.
  if (params.event === 'payment_problem') {
    return [
      SubscriptionStatus.PAUSED,
      SubscriptionStatus.CANCELED,
      SubscriptionStatus.EXPIRED,
    ].includes(params.currentStatus as SubscriptionStatus)
      ? 'ignore'
      : 'apply';
  }

  if (params.event === 'update') {
    if (
      !params.incomingStatus ||
      params.incomingStatus === params.currentStatus
    ) {
      return 'ignore';
    }
    const entitledStatuses = new Set<string>([
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PENDING_CANCEL,
    ]);
    // Without a provider-wide monotonic event version, a same-period replay
    // must never restore entitlement after a pause/cancel. Privilege-reducing
    // changes are safe to apply; restoration requires a newer billing period.
    if (
      !entitledStatuses.has(params.currentStatus) &&
      entitledStatuses.has(params.incomingStatus)
    ) {
      return 'ignore';
    }
    return 'apply';
  }

  return 'ignore';
}

export type PaymentSuccessAction = 'checkout' | 'renewal' | 'reject';

export function classifyPaymentSuccess(
  session: Pick<PaymentSession, 'paymentInfo' | 'subscriptionId'>
): PaymentSuccessAction {
  const cycleType = session.paymentInfo?.subscriptionCycleType;
  if (cycleType === SubscriptionCycleType.RENEWAL) return 'renewal';
  if (cycleType === SubscriptionCycleType.CREATE || !session.subscriptionId) {
    return 'checkout';
  }
  return 'reject';
}

function parseProviderProductMapping(
  configs: ConfigMap,
  provider: string
): Record<string, string> | null {
  const raw = configs[`${provider}_product_ids_mapping`];
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }

    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && Boolean(entry[1].trim())
    );
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}

function resolveSignedSubscriptionProduct(
  configs: ConfigMap,
  provider: string,
  info: SubscriptionInfo,
  existingSub?: Pick<
    typeof subscription.$inferSelect,
    'paymentProductId' | 'productId'
  >
): PricingProduct | null {
  const providerProductId = info.planId || info.productId;
  const providerProductMapping = {
    ...(parseProviderProductMapping(configs, provider) || {}),
  };
  if (
    providerProductId &&
    existingSub?.productId &&
    existingSub.paymentProductId === providerProductId
  ) {
    // This mapping was established by the original, server-created checkout.
    // It also covers immutable Stripe Price IDs used with an admin test amount.
    providerProductMapping[existingSub.productId] = providerProductId;
  }

  return resolveSubscriptionPricingProduct({
    // Stripe/PayPal plan IDs are the price-bearing SKU. Creem exposes its
    // configured product ID directly.
    providerProductId,
    amount: info.amount,
    currency: info.currency,
    interval: info.interval,
    intervalCount: info.intervalCount,
    providerProductMapping,
  });
}

function subscriptionPeriodCondition(
  existingSub: Pick<
    typeof subscription.$inferSelect,
    'currentPeriodStart' | 'currentPeriodEnd'
  >
) {
  const startCondition = existingSub.currentPeriodStart
    ? eq(subscription.currentPeriodStart, existingSub.currentPeriodStart)
    : isNull(subscription.currentPeriodStart);
  const endCondition = existingSub.currentPeriodEnd
    ? eq(subscription.currentPeriodEnd, existingSub.currentPeriodEnd)
    : isNull(subscription.currentPeriodEnd);
  return and(startCondition, endCondition);
}

/**
 * Conditional event write for webhook handlers. Do not trust affected-row
 * counts: the MySQL compatibility layer cannot always return them. A follow-up
 * read verifies the desired version instead.
 */
async function updateSubscriptionEventCas(params: {
  existingSub: typeof subscription.$inferSelect;
  nextStatus: string;
  nextPeriodStart: Date;
  nextPeriodEnd: Date;
  values: Record<string, unknown>;
}): Promise<boolean> {
  const { existingSub, nextStatus, nextPeriodStart, nextPeriodEnd, values } =
    params;
  await db()
    .update(subscription)
    .set({
      ...values,
      status: nextStatus,
      currentPeriodStart: nextPeriodStart,
      currentPeriodEnd: nextPeriodEnd,
    })
    .where(
      and(
        eq(subscription.subscriptionNo, existingSub.subscriptionNo),
        eq(subscription.status, existingSub.status),
        subscriptionPeriodCondition(existingSub),
        isNull(subscription.deletedAt)
      )
    );

  const [persisted] = await db()
    .select({
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, existingSub.subscriptionNo),
        isNull(subscription.deletedAt)
      )
    )
    .limit(1);

  return (
    persisted?.status === nextStatus &&
    persisted.currentPeriodStart?.getTime() === nextPeriodStart.getTime() &&
    persisted.currentPeriodEnd?.getTime() === nextPeriodEnd.getTime()
  );
}

async function updateSubscriptionValuesCas(params: {
  existingSub: typeof subscription.$inferSelect;
  values: Record<string, unknown>;
}): Promise<boolean> {
  const { existingSub, values } = params;
  await db()
    .update(subscription)
    .set(values)
    .where(
      and(
        eq(subscription.subscriptionNo, existingSub.subscriptionNo),
        eq(subscription.status, existingSub.status),
        subscriptionPeriodCondition(existingSub),
        isNull(subscription.deletedAt)
      )
    );
  const [persisted] = await db()
    .select({
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
    .from(subscription)
    .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo))
    .limit(1);
  return (
    !!persisted &&
    persisted.status === values.status &&
    persisted.currentPeriodStart?.getTime() ===
      existingSub.currentPeriodStart?.getTime() &&
    persisted.currentPeriodEnd?.getTime() ===
      existingSub.currentPeriodEnd?.getTime()
  );
}

function throwSubscriptionWebhookContention(
  provider: string,
  subscriptionId: string
): never {
  // The notify route returns HTTP 500 for this error, which asks Stripe,
  // Creem, and PayPal to retry instead of acknowledging a lost event.
  throw new Error(
    `Subscription webhook contention for '${provider}:${subscriptionId}'`
  );
}

async function claimCheckoutOrder(
  existingOrder: typeof order.$inferSelect,
  provider: string
): Promise<string | null> {
  const initialStatuses = [OrderStatus.CREATED, OrderStatus.PENDING];
  const staleClaim = isStaleCheckoutClaim(
    existingOrder.status,
    existingOrder.updatedAt
  );
  if (
    !initialStatuses.includes(existingOrder.status as OrderStatus) &&
    !staleClaim
  ) {
    return null;
  }

  const claimStatus = `${CHECKOUT_CLAIM_PREFIX}${getUuid()}`;
  const expectedStatus = staleClaim
    ? eq(order.status, existingOrder.status)
    : inArray(order.status, initialStatuses);

  await db()
    .update(order)
    .set({ status: claimStatus })
    .where(
      and(
        eq(order.id, existingOrder.id),
        eq(order.paymentProvider, provider),
        isNull(order.deletedAt),
        expectedStatus
      )
    );

  // Do not trust UPDATE return values: the MySQL compatibility layer cannot
  // report affected rows. Reading back our unique token works on every dialect.
  const [claimed] = await db()
    .select({ status: order.status })
    .from(order)
    .where(and(eq(order.id, existingOrder.id), eq(order.status, claimStatus)))
    .limit(1);

  return claimed ? claimStatus : null;
}

export async function handleWebhook(params: {
  req: Request;
  provider: string;
}): Promise<PaymentEvent> {
  const pm = await getPaymentManager();
  const paypalVerificationLease =
    params.provider === 'paypal'
      ? await acquirePayPalWebhookVerificationLease()
      : null;
  if (params.provider === 'paypal' && !paypalVerificationLease) {
    throw new PaymentWebhookVerificationBusyError();
  }

  let event: PaymentEvent;
  try {
    event = await pm.getPaymentEvent({
      req: params.req,
      provider: params.provider,
    });
  } finally {
    if (paypalVerificationLease) {
      try {
        await releasePaymentCheckoutLease(
          paypalVerificationLease.key,
          paypalVerificationLease.token
        );
      } catch (error) {
        // A failed release remains bounded by the short lease expiry.
        console.error('[paypal-webhook] verification lease release failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  const session = event.paymentSession;
  if (!session) return event;

  const eventType = event.eventType;

  // Route event to appropriate handler
  if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
    await handleCheckoutSuccess(session, params.provider);
  } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
    const action = classifyPaymentSuccess(session);
    if (action === 'renewal') {
      await handleSubscriptionRenewal(session, params.provider);
    } else if (action === 'checkout') {
      await handleCheckoutSuccess(session, params.provider);
    } else {
      throw new Error(
        `Unknown subscription payment cycle from '${params.provider}'`
      );
    }
  } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
    await handleSubscriptionUpdated(session, params.provider);
  } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
    await handleSubscriptionCanceled(session, params.provider);
  } else if (
    eventType === PaymentEventType.PAYMENT_FAILED ||
    eventType === PaymentEventType.PAYMENT_REFUNDED
  ) {
    // A failed initial checkout still needs its order marked failed. For a
    // renewal this is harmless: the original checkout order is already paid.
    if (eventType === PaymentEventType.PAYMENT_FAILED) {
      await handleCheckoutSuccess(session, params.provider);
      await handleSubscriptionPaymentProblem(session, params.provider);
    } else {
      await handleRefundedPayment(session, params.provider);
    }
  }

  return event;
}

async function findRefundedOrder(session: PaymentSession, provider: string) {
  const metadataOrderNo =
    session.metadata && typeof session.metadata.orderNo === 'string'
      ? session.metadata.orderNo
      : '';
  const transactionId = session.paymentInfo?.transactionId || '';
  const invoiceId = session.paymentInfo?.invoiceId || '';
  const lookups = [
    transactionId ? eq(order.transactionId, transactionId) : undefined,
    invoiceId ? eq(order.invoiceId, invoiceId) : undefined,
    metadataOrderNo ? eq(order.orderNo, metadataOrderNo) : undefined,
  ];

  // Renewal transaction/invoice identifiers are more specific than the
  // subscription's original checkout metadata. Query in priority order so a
  // renewal refund never revokes the initial period's grant by mistake.
  for (const lookup of lookups) {
    if (!lookup) continue;
    const [matched] = await db()
      .select()
      .from(order)
      .where(
        and(
          lookup,
          eq(order.paymentProvider, provider),
          isNull(order.deletedAt)
        )
      )
      .limit(1);
    if (matched) return matched;
  }
  return undefined;
}

export type RefundedOrderAction = 'tombstone' | 'revoke' | 'retry';

export function classifyRefundedOrderAction(
  status: string
): RefundedOrderAction {
  if (
    status === OrderStatus.PENDING ||
    status === OrderStatus.CREATED ||
    status === OrderStatus.FAILED
  ) {
    return 'tombstone';
  }
  if (status === OrderStatus.PAID || status === OrderStatus.REFUNDED) {
    return 'revoke';
  }
  // A processing:* claim may be inside the D1 resumable ledger sequence. Let
  // that delivery finish (or become stale), then have the provider retry the
  // refund against the resulting paid order instead of racing partial writes.
  return 'retry';
}

async function handleRefundedPayment(
  session: PaymentSession,
  provider: string
) {
  let refundedOrder = await findRefundedOrder(session, provider);
  if (!refundedOrder) {
    // A signed refund for an unrelated provider object is safe to acknowledge.
    // A refund linked to one of our subscriptions is an internal consistency
    // failure and must be retried instead of silently retaining benefits.
    const metadataOrderNo =
      session.metadata && typeof session.metadata.orderNo === 'string'
        ? session.metadata.orderNo
        : '';
    if (session.subscriptionId || metadataOrderNo) {
      throw new Error(`Refunded application order was not found`);
    }
    return;
  }

  let refundAction = classifyRefundedOrderAction(refundedOrder.status);
  if (refundAction === 'retry') {
    throw new Error('Refunded order is being processed');
  }

  if (refundAction === 'tombstone') {
    await db()
      .update(order)
      .set({
        status: OrderStatus.REFUNDED,
        paymentResult: JSON.stringify(session.paymentResult ?? null),
      })
      .where(
        and(
          eq(order.id, refundedOrder.id),
          eq(order.paymentProvider, provider),
          eq(order.status, refundedOrder.status),
          isNull(order.deletedAt)
        )
      );
    const [persisted] = await db()
      .select()
      .from(order)
      .where(eq(order.id, refundedOrder.id))
      .limit(1);
    if (!persisted) throw new Error('Refunded order disappeared');
    refundAction = classifyRefundedOrderAction(persisted.status);
    if (refundAction === 'retry' || refundAction === 'tombstone') {
      throw new Error('Refunded order status contention');
    }
    refundedOrder = persisted;
    // A later checkout success sees refunded and cannot claim the order. Keep
    // going through the idempotent cleanup in case a prior D1 attempt had
    // already written part of the ledger before the tombstone was observed.
  }

  if (refundedOrder.status === OrderStatus.PAID) {
    await db()
      .update(order)
      .set({
        status: OrderStatus.REFUNDED,
        paymentResult: JSON.stringify(session.paymentResult ?? null),
      })
      .where(
        and(
          eq(order.id, refundedOrder.id),
          eq(order.paymentProvider, provider),
          eq(order.status, OrderStatus.PAID),
          isNull(order.deletedAt)
        )
      );
    const [persisted] = await db()
      .select({ status: order.status })
      .from(order)
      .where(eq(order.id, refundedOrder.id))
      .limit(1);
    if (persisted?.status !== OrderStatus.REFUNDED) {
      throw new Error('Refunded order status contention');
    }
  }

  // Revoke only the unspent part of this exact order's grant. Already consumed
  // service cannot be undone, but no refunded balance remains spendable.
  await db()
    .update(credit)
    .set({
      remainingCredits: 0,
      status: 'deleted',
      deletedAt: new Date(),
      description: 'Revoked after payment refund',
    })
    .where(
      and(
        eq(credit.orderNo, refundedOrder.orderNo),
        eq(credit.userId, refundedOrder.userId),
        eq(credit.transactionType, 'grant'),
        eq(credit.status, 'active')
      )
    );

  if (refundedOrder.subscriptionId) {
    if (!session.subscriptionId || !session.subscriptionInfo) {
      throw new Error('Subscription refund has no verified billing period');
    }
    if (session.subscriptionId !== refundedOrder.subscriptionId) {
      throw new Error('Subscription refund does not match the local order');
    }
    await handleSubscriptionPaymentProblem(session, provider);
  }
}

// --- Checkout Success: update order + create subscription + grant credits ---

async function handleCheckoutSuccess(
  session: PaymentSession,
  provider: string
) {
  // Different providers expose the session identifier under different keys.
  // We try the common shapes; for Alipay the natural key is out_trade_no
  // (which equals our orderNo and the value we stored in paymentSessionId).
  const result = session.paymentResult || {};
  const sessionId: string =
    result.id ||
    result.object?.id ||
    result.out_trade_no ||
    result.outTradeNo ||
    '';
  const metadataOrderNo =
    session.metadata && typeof session.metadata.orderNo === 'string'
      ? session.metadata.orderNo
      : '';
  const providerSubscriptionId = session.subscriptionId || '';
  if (!sessionId && !metadataOrderNo && !providerSubscriptionId) return;

  const orderLookup = or(
    sessionId ? eq(order.paymentSessionId, sessionId) : undefined,
    providerSubscriptionId
      ? eq(order.paymentSessionId, providerSubscriptionId)
      : undefined,
    providerSubscriptionId
      ? eq(order.subscriptionId, providerSubscriptionId)
      : undefined,
    metadataOrderNo ? eq(order.orderNo, metadataOrderNo) : undefined
  );
  if (!orderLookup) return;

  // Find order by session ID
  const [existingOrder] = await db()
    .select()
    .from(order)
    .where(
      and(
        orderLookup,
        eq(order.paymentProvider, provider),
        isNull(order.deletedAt)
      )
    )
    .limit(1);

  if (!existingOrder) return;

  const paymentInfo = session.paymentInfo;
  const subscriptionInfo = session.subscriptionInfo;

  if (session.paymentStatus === PaymentStatus.PROCESSING) {
    // Some providers (currently Creem) confirm the paid checkout before the
    // recurring billing period exists. Store only the signed provider link;
    // subscription.paid will later activate access with a complete period and
    // stable transaction ID.
    if (!session.subscriptionId) return;
    await db()
      .update(order)
      .set({
        subscriptionId: session.subscriptionId,
        subscriptionResult: JSON.stringify(session.subscriptionResult ?? null),
      })
      .where(
        and(
          eq(order.id, existingOrder.id),
          eq(order.paymentProvider, provider),
          inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING]),
          or(
            isNull(order.subscriptionId),
            eq(order.subscriptionId, session.subscriptionId)
          )
        )
      );
    const [linked] = await db()
      .select({ subscriptionId: order.subscriptionId })
      .from(order)
      .where(eq(order.id, existingOrder.id))
      .limit(1);
    if (linked?.subscriptionId !== session.subscriptionId) {
      throw new Error('Checkout subscription link contention');
    }
    return;
  }

  if (session.paymentStatus === PaymentStatus.SUCCESS) {
    const expectsSubscription =
      existingOrder.paymentType === PaymentType.SUBSCRIPTION;
    if (expectsSubscription && (!subscriptionInfo || !session.subscriptionId)) {
      throw new Error(
        `Subscription payment '${existingOrder.orderNo}' has no subscription data`
      );
    }
    if (
      subscriptionInfo &&
      (!subscriptionInfo.currentPeriodStart ||
        !subscriptionInfo.currentPeriodEnd ||
        subscriptionInfo.currentPeriodStart >=
          subscriptionInfo.currentPeriodEnd)
    ) {
      throw new Error(
        `Subscription payment '${existingOrder.orderNo}' has an invalid period`
      );
    }

    const claimStatus = await claimCheckoutOrder(existingOrder, provider);
    if (!claimStatus) return;

    // Prepare order update
    const orderUpdate: Record<string, any> = {
      status: OrderStatus.PAID,
      paymentResult: JSON.stringify(session.paymentResult ?? null),
      paymentAmount: paymentInfo?.paymentAmount || null,
      paymentCurrency: paymentInfo?.paymentCurrency || null,
      paymentEmail: paymentInfo?.paymentEmail || null,
      paidAt: paymentInfo?.paidAt || new Date(),
      transactionId: paymentInfo?.transactionId || null,
      invoiceId: paymentInfo?.invoiceId || null,
      invoiceUrl: paymentInfo?.invoiceUrl || null,
      paymentUserName: paymentInfo?.paymentUserName || null,
      paymentUserId: paymentInfo?.paymentUserId || null,
      discountCode: paymentInfo?.discountCode || null,
      discountAmount: paymentInfo?.discountAmount || null,
    };

    const subNo = `SUB_${md5(`checkout:${existingOrder.orderNo}`)}`;
    const creditTransactionNo = `PAY_${md5(
      `checkout:${existingOrder.orderNo}`
    )}`;

    try {
      // Real transactions protect PostgreSQL/MySQL/SQLite. Deterministic unique
      // keys make the same sequence safely resumable on D1, whose wrapper does
      // not provide rollback semantics.
      await db().transaction(async (tx: any) => {
        if (subscriptionInfo && session.subscriptionId) {
          const [providerSubscription] = await tx
            .select({
              subscriptionNo: subscription.subscriptionNo,
              userId: subscription.userId,
            })
            .from(subscription)
            .where(
              and(
                eq(subscription.paymentProvider, provider),
                eq(subscription.subscriptionId, session.subscriptionId)
              )
            )
            .limit(1);
          if (
            providerSubscription &&
            (providerSubscription.subscriptionNo !== subNo ||
              providerSubscription.userId !== existingOrder.userId)
          ) {
            throw new Error('Provider subscription is already linked');
          }

          await tx
            .insert(subscription)
            .values({
              id: getUuid(),
              subscriptionNo: subNo,
              userId: existingOrder.userId,
              userEmail:
                existingOrder.userEmail || existingOrder.paymentEmail || '',
              status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
              paymentProvider: provider,
              subscriptionId: session.subscriptionId,
              subscriptionResult: JSON.stringify(
                session.subscriptionResult ?? null
              ),
              productId: existingOrder.productId,
              description:
                subscriptionInfo.description || 'Subscription Created',
              amount: subscriptionInfo.amount,
              currency: subscriptionInfo.currency,
              interval: subscriptionInfo.interval,
              intervalCount: subscriptionInfo.intervalCount,
              trialPeriodDays: subscriptionInfo.trialPeriodDays,
              currentPeriodStart: subscriptionInfo.currentPeriodStart,
              currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
              billingUrl: subscriptionInfo.billingUrl,
              planName: existingOrder.planName || existingOrder.productName,
              productName: existingOrder.productName,
              creditsAmount: existingOrder.creditsAmount,
              creditsValidDays: existingOrder.creditsValidDays,
              paymentProductId:
                subscriptionInfo.planId || subscriptionInfo.productId,
              paymentUserId: paymentInfo?.paymentUserId,
            })
            .onConflictDoUpdate({
              target: subscription.subscriptionNo,
              set: { subscriptionNo: subNo },
            });

          const [persistedSub] = await tx
            .select({
              userId: subscription.userId,
              paymentProvider: subscription.paymentProvider,
              subscriptionId: subscription.subscriptionId,
            })
            .from(subscription)
            .where(eq(subscription.subscriptionNo, subNo))
            .limit(1);
          if (
            !persistedSub ||
            persistedSub.userId !== existingOrder.userId ||
            persistedSub.paymentProvider !== provider ||
            persistedSub.subscriptionId !== session.subscriptionId
          ) {
            throw new Error('Subscription idempotency key collision');
          }

          orderUpdate.subscriptionNo = subNo;
          orderUpdate.subscriptionId = session.subscriptionId;
          orderUpdate.subscriptionResult = JSON.stringify(
            session.subscriptionResult ?? null
          );
        }

        if (existingOrder.creditsAmount && existingOrder.creditsAmount > 0) {
          const credits = existingOrder.creditsAmount;
          const expiresAt = calculateCreditExpirationTime({
            creditsValidDays: existingOrder.creditsValidDays || 0,
            currentPeriodEnd: subscriptionInfo?.currentPeriodEnd,
          });

          await tx
            .insert(credit)
            .values({
              id: getUuid(),
              userId: existingOrder.userId,
              userEmail: existingOrder.userEmail || '',
              orderNo: existingOrder.orderNo,
              subscriptionNo: orderUpdate.subscriptionNo || '',
              transactionNo: creditTransactionNo,
              transactionType: 'grant',
              transactionScene: expectsSubscription
                ? 'subscription'
                : 'payment',
              credits,
              remainingCredits: credits,
              description: 'Grant credit',
              expiresAt,
              status: 'active',
            })
            .onConflictDoUpdate({
              target: credit.transactionNo,
              set: { transactionNo: creditTransactionNo },
            });

          const [persistedCredit] = await tx
            .select({
              userId: credit.userId,
              orderNo: credit.orderNo,
              credits: credit.credits,
            })
            .from(credit)
            .where(eq(credit.transactionNo, creditTransactionNo))
            .limit(1);
          if (
            !persistedCredit ||
            persistedCredit.userId !== existingOrder.userId ||
            persistedCredit.orderNo !== existingOrder.orderNo ||
            persistedCredit.credits !== credits
          ) {
            throw new Error('Credit idempotency key collision');
          }
        }

        await tx
          .update(order)
          .set(orderUpdate)
          .where(
            and(
              eq(order.id, existingOrder.id),
              eq(order.status, claimStatus),
              eq(order.paymentProvider, provider)
            )
          );
      });

      const [completed] = await db()
        .select({ status: order.status })
        .from(order)
        .where(eq(order.id, existingOrder.id))
        .limit(1);
      if (completed?.status !== OrderStatus.PAID) {
        throw new Error('Checkout claim was not finalized');
      }
    } catch (error) {
      // Make an in-process failure immediately retryable. A hard crash is
      // recovered by the stale-claim lease above.
      await db()
        .update(order)
        .set({ status: OrderStatus.CREATED })
        .where(
          and(
            eq(order.id, existingOrder.id),
            eq(order.status, claimStatus),
            eq(order.paymentProvider, provider)
          )
        );
      throw error;
    }
  } else if (
    session.paymentStatus === PaymentStatus.FAILED ||
    session.paymentStatus === PaymentStatus.CANCELED
  ) {
    await db()
      .update(order)
      .set({
        status: OrderStatus.FAILED,
        paymentResult: JSON.stringify(session.paymentResult ?? null),
      })
      .where(
        and(
          eq(order.id, existingOrder.id),
          eq(order.paymentProvider, provider),
          inArray(order.status, [OrderStatus.CREATED, OrderStatus.PENDING])
        )
      );
  }
}

// --- Subscription Renewal ---

const RENEWAL_CLAIM_PREFIX = 'renewing:';
const RENEWAL_CLAIM_TTL_MS = 5 * 60 * 1000;

export function isRenewalClaimStatus(status: string): boolean {
  return status.startsWith(RENEWAL_CLAIM_PREFIX);
}

export function isStaleRenewalClaim(
  status: string,
  updatedAt: Date,
  now = new Date()
): boolean {
  return (
    isRenewalClaimStatus(status) &&
    now.getTime() - updatedAt.getTime() >= RENEWAL_CLAIM_TTL_MS
  );
}

async function claimSubscriptionRenewal(
  existingSub: typeof subscription.$inferSelect
): Promise<string | null> {
  const staleClaim = isStaleRenewalClaim(
    existingSub.status,
    existingSub.updatedAt
  );
  if (isRenewalClaimStatus(existingSub.status) && !staleClaim) return null;

  const claimStatus = `${RENEWAL_CLAIM_PREFIX}${getUuid()}`;
  const currentPeriodCondition = subscriptionPeriodCondition(existingSub);

  await db()
    .update(subscription)
    .set({ status: claimStatus })
    .where(
      and(
        eq(subscription.subscriptionNo, existingSub.subscriptionNo),
        eq(subscription.status, existingSub.status),
        currentPeriodCondition,
        isNull(subscription.deletedAt)
      )
    );

  const [claimed] = await db()
    .select({ status: subscription.status })
    .from(subscription)
    .where(
      and(
        eq(subscription.subscriptionNo, existingSub.subscriptionNo),
        eq(subscription.status, claimStatus),
        // Keep the period unchanged until all resumable child writes succeed.
        currentPeriodCondition
      )
    )
    .limit(1);

  return claimed ? claimStatus : null;
}

export async function handleSubscriptionRenewal(
  session: PaymentSession,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;

  const subscriptionInfo = session.subscriptionInfo;
  if (
    !subscriptionInfo.currentPeriodStart ||
    !subscriptionInfo.currentPeriodEnd
  )
    return;

  if (session.paymentStatus !== PaymentStatus.SUCCESS) return;
  const paymentInfo = session.paymentInfo;
  const renewalEventId =
    paymentInfo?.transactionId || paymentInfo?.invoiceId || '';
  if (!renewalEventId) {
    throw new Error(`Renewal from '${provider}' has no stable transaction ID`);
  }

  const renewalKey = `${provider}:${session.subscriptionId}:${renewalEventId}`;
  const renewalOrderNo = `REN_${md5(renewalKey)}`;
  const creditTransactionNo = `RCR_${md5(renewalKey)}`;
  const [existingRenewalOrder] = await db()
    .select({
      orderNo: order.orderNo,
    })
    .from(order)
    .where(
      and(
        eq(order.orderNo, renewalOrderNo),
        eq(order.paymentProvider, provider)
      )
    )
    .limit(1);

  const isNewPeriod = isStrictlyNewerSubscriptionPeriod({
    currentPeriodEnd: existingSub.currentPeriodEnd,
    nextPeriodStart: subscriptionInfo.currentPeriodStart,
    nextPeriodEnd: subscriptionInfo.currentPeriodEnd,
  });
  const currentEndMs = existingSub.currentPeriodEnd?.getTime();
  const nextEndMs = subscriptionInfo.currentPeriodEnd.getTime();
  if (
    Number.isFinite(currentEndMs) &&
    Number.isFinite(nextEndMs) &&
    currentEndMs! >= nextEndMs
  ) {
    return;
  }
  // A completed event may be replayed after the subscription row has already
  // advanced. A partially completed D1 claim, however, still has the old
  // period and must be resumed using the same deterministic order key.
  if (!isNewPeriod && !existingRenewalOrder) return;

  const configs = await getAllConfigs();
  const product = resolveSignedSubscriptionProduct(
    configs,
    provider,
    subscriptionInfo,
    existingSub
  );
  if (!product) {
    await updateBySubscriptionNo(existingSub.subscriptionNo, {
      productId: null,
      paymentProductId:
        subscriptionInfo.planId || subscriptionInfo.productId || null,
      status: SubscriptionStatus.PAUSED,
      amount: subscriptionInfo.amount,
      currency: subscriptionInfo.currency,
      interval: subscriptionInfo.interval,
      intervalCount: subscriptionInfo.intervalCount,
    });
    throw new Error(`Unknown subscription product from '${provider}'`);
  }

  const claimStatus = await claimSubscriptionRenewal(existingSub);
  if (!claimStatus) {
    const latestSub = await findByProviderSubscriptionId({
      provider,
      subscriptionId: session.subscriptionId,
    });
    if (
      latestSub &&
      !isRenewalClaimStatus(latestSub.status) &&
      latestSub.currentPeriodEnd &&
      latestSub.currentPeriodEnd.getTime() >= nextEndMs
    ) {
      // Another delivery finalized this same (or a newer) renewal.
      return;
    }
    throwSubscriptionWebhookContention(provider, session.subscriptionId);
  }

  try {
    await db().transaction(async (tx: any) => {
      await tx
        .insert(order)
        .values({
          id: getUuid(),
          orderNo: renewalOrderNo,
          userId: existingSub.userId,
          userEmail: existingSub.userEmail || '',
          status: OrderStatus.PAID,
          amount: product.priceInCents,
          currency: product.currency,
          productId: product.productId,
          paymentType: PaymentType.RENEW,
          paymentInterval: product.plan?.interval || '',
          paymentProvider: provider,
          checkoutInfo: '',
          description: 'Subscription Renewal',
          productName: product.productName,
          planName: product.planName,
          creditsAmount: product.credits,
          creditsValidDays: product.creditsValidDays,
          paymentProductId:
            subscriptionInfo.planId || subscriptionInfo.productId || '',
          paymentResult: JSON.stringify(session.paymentResult ?? null),
          paymentAmount: paymentInfo?.paymentAmount,
          paymentCurrency: paymentInfo?.paymentCurrency,
          paymentEmail: paymentInfo?.paymentEmail,
          paidAt: paymentInfo?.paidAt || new Date(),
          invoiceId: paymentInfo?.invoiceId,
          invoiceUrl: paymentInfo?.invoiceUrl,
          subscriptionNo: existingSub.subscriptionNo,
          subscriptionId: session.subscriptionId,
          transactionId: paymentInfo?.transactionId,
          paymentUserName: paymentInfo?.paymentUserName,
          paymentUserId: paymentInfo?.paymentUserId,
        })
        .onConflictDoUpdate({
          target: order.orderNo,
          set: { orderNo: renewalOrderNo },
        });

      const [persistedOrder] = await tx
        .select({
          userId: order.userId,
          paymentProvider: order.paymentProvider,
          subscriptionNo: order.subscriptionNo,
        })
        .from(order)
        .where(eq(order.orderNo, renewalOrderNo))
        .limit(1);
      if (
        !persistedOrder ||
        persistedOrder.userId !== existingSub.userId ||
        persistedOrder.paymentProvider !== provider ||
        persistedOrder.subscriptionNo !== existingSub.subscriptionNo
      ) {
        throw new Error('Renewal idempotency key collision');
      }

      if (product.credits > 0) {
        const expiresAt = calculateCreditExpirationTime({
          creditsValidDays: product.creditsValidDays || 0,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        });

        await tx
          .insert(credit)
          .values({
            id: getUuid(),
            userId: existingSub.userId,
            userEmail: existingSub.userEmail || '',
            orderNo: renewalOrderNo,
            subscriptionNo: existingSub.subscriptionNo,
            transactionNo: creditTransactionNo,
            transactionType: 'grant',
            transactionScene: 'renewal',
            credits: product.credits,
            remainingCredits: product.credits,
            description: 'Grant credit',
            expiresAt,
            status: 'active',
          })
          .onConflictDoUpdate({
            target: credit.transactionNo,
            set: { transactionNo: creditTransactionNo },
          });

        const [persistedCredit] = await tx
          .select({
            userId: credit.userId,
            orderNo: credit.orderNo,
            credits: credit.credits,
          })
          .from(credit)
          .where(eq(credit.transactionNo, creditTransactionNo))
          .limit(1);
        if (
          !persistedCredit ||
          persistedCredit.userId !== existingSub.userId ||
          persistedCredit.orderNo !== renewalOrderNo ||
          persistedCredit.credits !== product.credits
        ) {
          throw new Error('Renewal credit idempotency key collision');
        }
      }

      await tx
        .update(subscription)
        .set({
          status: subscriptionInfo.status || SubscriptionStatus.ACTIVE,
          subscriptionResult: JSON.stringify(
            session.subscriptionResult ?? null
          ),
          productId: product.productId,
          paymentProductId:
            subscriptionInfo.planId || subscriptionInfo.productId || null,
          productName: product.productName,
          planName: product.planName,
          amount: product.priceInCents,
          currency: product.currency,
          interval: product.plan?.interval,
          intervalCount: product.plan?.intervalCount,
          creditsAmount: product.credits,
          creditsValidDays: product.creditsValidDays,
          currentPeriodStart: subscriptionInfo.currentPeriodStart,
          currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        })
        .where(
          and(
            eq(subscription.subscriptionNo, existingSub.subscriptionNo),
            eq(subscription.status, claimStatus),
            subscriptionPeriodCondition(existingSub)
          )
        );
    });

    const [completed] = await db()
      .select({
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })
      .from(subscription)
      .where(eq(subscription.subscriptionNo, existingSub.subscriptionNo))
      .limit(1);
    if (
      !completed ||
      isRenewalClaimStatus(completed.status) ||
      completed.currentPeriodEnd?.getTime() !==
        subscriptionInfo.currentPeriodEnd.getTime()
    ) {
      throw new Error('Renewal claim was not finalized');
    }
  } catch (error) {
    await db()
      .update(subscription)
      .set({
        status: existingSub.status,
      })
      .where(
        and(
          eq(subscription.subscriptionNo, existingSub.subscriptionNo),
          eq(subscription.status, claimStatus),
          subscriptionPeriodCondition(existingSub)
        )
      );
    throw error;
  }
}

// --- Subscription Updated ---

async function handleSubscriptionUpdated(
  session: PaymentSession,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;
  if (isRenewalClaimStatus(existingSub.status)) {
    throw new Error('Subscription renewal is being processed');
  }

  const info = session.subscriptionInfo;
  const hasValidPeriod =
    Boolean(info.currentPeriodStart) &&
    Boolean(info.currentPeriodEnd) &&
    info.currentPeriodStart < info.currentPeriodEnd;
  if (!hasValidPeriod && info.status === SubscriptionStatus.EXPIRED) {
    // Creem's documented subscription.expired example has an equal start/end
    // timestamp. A signed terminal event may expire only a period that has
    // actually ended; it must never overwrite a newer, still-current renewal.
    if (!existingSub.currentPeriodEnd) {
      throw new Error(`Invalid subscription period from '${provider}'`);
    }
    if (existingSub.currentPeriodEnd.getTime() > Date.now()) return;
    const expired = await updateSubscriptionValuesCas({
      existingSub,
      values: {
        status: SubscriptionStatus.EXPIRED,
        subscriptionResult: JSON.stringify(session.subscriptionResult ?? null),
      },
    });
    if (!expired) {
      throwSubscriptionWebhookContention(provider, session.subscriptionId);
    }
    return;
  }
  if (!hasValidPeriod) {
    throw new Error(`Invalid subscription period from '${provider}'`);
  }
  if (
    !info.currentPeriodStart ||
    !info.currentPeriodEnd ||
    info.currentPeriodStart >= info.currentPeriodEnd
  ) {
    throw new Error(`Invalid subscription period from '${provider}'`);
  }
  if (
    decideSubscriptionWebhookPeriod({
      event: 'update',
      currentPeriodStart: existingSub.currentPeriodStart,
      currentPeriodEnd: existingSub.currentPeriodEnd,
      incomingPeriodStart: info.currentPeriodStart,
      incomingPeriodEnd: info.currentPeriodEnd,
      currentStatus: existingSub.status,
      incomingStatus: info.status || SubscriptionStatus.PAUSED,
    }) === 'ignore'
  ) {
    return;
  }

  const configs = await getAllConfigs();
  const product = resolveSignedSubscriptionProduct(
    configs,
    provider,
    info,
    existingSub
  );
  const paymentProductId = info.planId || info.productId || null;
  if (!product) {
    const paused = await updateSubscriptionEventCas({
      existingSub,
      nextStatus: SubscriptionStatus.PAUSED,
      nextPeriodStart: info.currentPeriodStart,
      nextPeriodEnd: info.currentPeriodEnd,
      values: {
        productId: null,
        paymentProductId,
        amount: info.amount,
        currency: info.currency,
        interval: info.interval,
        intervalCount: info.intervalCount,
      },
    });
    if (!paused) {
      throwSubscriptionWebhookContention(provider, session.subscriptionId);
    }
    throw new Error(`Unknown subscription product from '${provider}'`);
  }

  const updated = await updateSubscriptionEventCas({
    existingSub,
    nextStatus: info.status || SubscriptionStatus.PAUSED,
    nextPeriodStart: info.currentPeriodStart,
    nextPeriodEnd: info.currentPeriodEnd,
    values: {
      subscriptionResult: JSON.stringify(session.subscriptionResult ?? null),
      productId: product.productId,
      paymentProductId,
      productName: product.productName,
      planName: product.planName,
      amount: product.priceInCents,
      currency: product.currency,
      interval: product.plan?.interval,
      intervalCount: product.plan?.intervalCount,
      creditsAmount: product.credits,
      creditsValidDays: product.creditsValidDays,
      canceledAt: info.canceledAt || null,
      canceledEndAt: info.canceledEndAt || null,
      canceledReason: info.canceledReason || '',
      canceledReasonType: info.canceledReasonType || '',
    },
  });
  if (!updated) {
    throwSubscriptionWebhookContention(provider, session.subscriptionId);
  }
}

// --- Subscription Canceled ---

async function handleSubscriptionCanceled(
  session: PaymentSession,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;
  if (isRenewalClaimStatus(existingSub.status)) {
    throw new Error('Subscription renewal is being processed');
  }

  const info = session.subscriptionInfo;
  if (
    decideSubscriptionWebhookPeriod({
      event: 'cancel',
      currentPeriodStart: existingSub.currentPeriodStart,
      currentPeriodEnd: existingSub.currentPeriodEnd,
      incomingPeriodStart: info.currentPeriodStart,
      incomingPeriodEnd: info.currentPeriodEnd,
      currentStatus: existingSub.status,
    }) === 'ignore'
  ) {
    return;
  }

  const canceled = await updateSubscriptionEventCas({
    existingSub,
    nextStatus: SubscriptionStatus.CANCELED,
    nextPeriodStart: info.currentPeriodStart,
    nextPeriodEnd: info.currentPeriodEnd,
    values: {
      subscriptionResult: JSON.stringify(session.subscriptionResult ?? null),
      canceledAt: info.canceledAt || new Date(),
      canceledEndAt: info.canceledEndAt || info.currentPeriodEnd,
      canceledReason: info.canceledReason || '',
      canceledReasonType: info.canceledReasonType || '',
    },
  });
  if (!canceled) {
    throwSubscriptionWebhookContention(provider, session.subscriptionId);
  }
}

// A payment failure/refund must never leave a previously entitled
// subscription active. We require a valid provider period, then perform the
// same period-and-status CAS as other subscription webhook handlers. Events
// without a period are deliberately ignored: pausing an arbitrary current
// subscription based on an unverifiable, old invoice is worse than awaiting
// the provider's subscription update/cancel event.
async function handleSubscriptionPaymentProblem(
  session: PaymentSession,
  provider: string
) {
  if (!session.subscriptionId || !session.subscriptionInfo) return;

  const existingSub = await findByProviderSubscriptionId({
    provider,
    subscriptionId: session.subscriptionId,
  });
  if (!existingSub) return;
  if (isRenewalClaimStatus(existingSub.status)) {
    throw new Error('Subscription renewal is being processed');
  }

  const info = session.subscriptionInfo;
  if (
    decideSubscriptionWebhookPeriod({
      event: 'payment_problem',
      currentPeriodStart: existingSub.currentPeriodStart,
      currentPeriodEnd: existingSub.currentPeriodEnd,
      incomingPeriodStart: info.currentPeriodStart,
      incomingPeriodEnd: info.currentPeriodEnd,
      currentStatus: existingSub.status,
    }) === 'ignore'
  ) {
    return;
  }

  const paused = await updateSubscriptionEventCas({
    existingSub,
    nextStatus: SubscriptionStatus.PAUSED,
    nextPeriodStart: info.currentPeriodStart,
    nextPeriodEnd: info.currentPeriodEnd,
    values: {
      subscriptionResult: JSON.stringify(session.subscriptionResult ?? null),
      canceledReason: 'Payment failed or refunded',
      canceledReasonType: 'payment_problem',
    },
  });
  if (!paused) {
    throwSubscriptionWebhookContention(provider, session.subscriptionId);
  }
}

// --- Cancel subscription (user-initiated) ---

export async function cancelUserSubscription(params: {
  userId: string;
  subscriptionNo: string;
}) {
  const { userId, subscriptionNo } = params;

  const sub = await findBySubscriptionNo(subscriptionNo);
  if (!sub) throw new Error('Subscription not found');
  if (sub.userId !== userId) throw new Error('Forbidden');

  if (
    sub.status === SubscriptionStatus.CANCELED ||
    sub.status === SubscriptionStatus.EXPIRED
  ) {
    return sub;
  }
  if (isRenewalClaimStatus(sub.status)) {
    throw new Error('Subscription renewal is being processed');
  }

  const pm = await getPaymentManager();
  const provider = pm.getProvider(sub.paymentProvider);
  if (!provider || !provider.cancelSubscription) {
    throw new Error('Cancellation not supported for this provider');
  }

  const session = await provider.cancelSubscription({
    subscriptionId: sub.subscriptionId,
  });

  const info = session.subscriptionInfo;
  const values = {
    status: info?.status || SubscriptionStatus.CANCELED,
    canceledAt: info?.canceledAt || new Date(),
    canceledEndAt: info?.canceledEndAt || null,
    canceledReason: info?.canceledReason || 'Canceled by user',
    canceledReasonType: info?.canceledReasonType || 'user_request',
  };
  const applied = await updateSubscriptionValuesCas({
    existingSub: sub,
    values,
  });
  if (!applied) {
    throw new Error('Subscription changed while cancellation was processing');
  }
  return findBySubscriptionNo(subscriptionNo);
}

// --- Query helpers ---

export async function getUserOrders(userId: string) {
  return db()
    .select()
    .from(order)
    .where(and(eq(order.userId, userId), isNull(order.deletedAt)))
    .orderBy(desc(order.createdAt));
}
