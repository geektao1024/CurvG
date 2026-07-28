import { timingSafeEqual } from 'crypto';

import {
  CheckoutSession,
  PaymentBilling,
  PaymentConfigs,
  PaymentCustomField,
  PaymentEvent,
  PaymentEventType,
  PaymentInterval,
  PaymentOrder,
  PaymentProvider,
  PaymentSession,
  PaymentStatus,
  SubscriptionCycleType,
  SubscriptionInfo,
  SubscriptionStatus,
} from './types';

const PAYMENT_REQUEST_TIMEOUT_MS = 30_000;
const CREEM_INITIAL_PERIOD_TOLERANCE_MS = 5 * 60_000;

/**
 * Creem payment provider configs
 * @docs https://docs.creem.io/
 */
export interface CreemConfigs extends PaymentConfigs {
  apiKey: string;
  signingSecret?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Creem payment provider implementation
 * @website https://creem.io/
 */
export class CreemProvider implements PaymentProvider {
  readonly name = 'creem';
  configs: CreemConfigs;

  private baseUrl: string;

  constructor(configs: CreemConfigs) {
    this.configs = configs;
    this.baseUrl =
      configs.environment === 'production'
        ? 'https://api.creem.io'
        : 'https://test-api.creem.io';
  }

  // create payment
  async createPayment({
    order,
  }: {
    order: PaymentOrder;
  }): Promise<CheckoutSession> {
    try {
      if (!order.productId) {
        throw new Error('productId is required');
      }

      // build payment payload
      const payload: any = {
        product_id: order.productId,
        request_id: order.requestId || undefined,
        units: 1,
        discount_code: order.discount
          ? {
              code: order.discount.code,
            }
          : undefined,
        customer: order.customer
          ? {
              id: order.customer.id,
              email: order.customer.email,
            }
          : undefined,
        custom_fields: order.customFields
          ? order.customFields.map((customField: PaymentCustomField) => ({
              type: customField.type,
              key: customField.name,
              label: customField.label,
              optional: !customField.isRequired as boolean,
              text: customField.metadata,
            }))
          : undefined,
        success_url: order.successUrl,
        metadata: order.metadata,
      };

      const result = await this.makeRequest('/v1/checkouts', 'POST', payload);

      // create payment failed
      if (result.error) {
        throw new Error(result.error.message || 'create payment failed');
      }

      // create payment success
      return {
        provider: this.name,
        checkoutParams: payload,
        checkoutInfo: {
          sessionId: result.id,
          checkoutUrl: result.checkout_url,
        },
        checkoutResult: result,
        metadata: order.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // get payment by session id
  // @docs https://docs.creem.io/api-reference/endpoint/get-checkout
  async getPaymentSession({
    sessionId,
  }: {
    sessionId: string;
  }): Promise<PaymentSession> {
    try {
      // retrieve payment
      const session = await this.makeRequest(
        `/v1/checkouts?checkout_id=${sessionId}`,
        'GET'
      );

      if (!session.id || !session.order) {
        throw new Error(session.error || 'get payment failed');
      }

      return await this.buildPaymentSessionFromCheckoutSession(session);
    } catch (error) {
      throw error;
    }
  }

  async getPaymentEvent({ req }: { req: Request }): Promise<PaymentEvent> {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('creem-signature') as string;

      if (!rawBody || !signature) {
        throw new Error('Invalid webhook request');
      }

      if (!this.configs.signingSecret) {
        throw new Error('Signing Secret not configured');
      }

      const computedSignature = await this.generateSignature(
        rawBody,
        this.configs.signingSecret
      );

      let sigOk = false;
      try {
        const expected = Buffer.from(computedSignature, 'hex');
        const provided = Buffer.from(signature, 'hex');
        sigOk =
          expected.length === provided.length &&
          timingSafeEqual(expected, provided);
      } catch {
        sigOk = false;
      }
      if (!sigOk) {
        throw new Error('Invalid webhook signature');
      }

      // parse the webhook payload
      const event = JSON.parse(rawBody);

      if (!event || !event.eventType) {
        throw new Error('Invalid webhook payload');
      }

      let paymentSession: PaymentSession | undefined = undefined;

      let eventType = mapCreemWebhookEventType(event.eventType);

      if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromCheckoutSession(
          event.object as any
        );
      } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
        paymentSession = await this.buildPaymentSessionFromPaidSubscription(
          event.object as any
        );
      } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
        const statusByEvent: Record<string, string> = {
          'subscription.active': 'active',
          'subscription.trialing': 'trialing',
          'subscription.paused': 'paused',
          'subscription.scheduled_cancel': 'scheduled_cancel',
          'subscription.past_due': 'past_due',
          'subscription.expired': 'expired',
        };
        paymentSession = await this.buildPaymentSessionFromSubscription(
          statusByEvent[event.eventType]
            ? {
                ...(event.object as any),
                status: statusByEvent[event.eventType],
              }
            : (event.object as any)
        );
        if (
          event.eventType === 'subscription.active' &&
          (!paymentSession.subscriptionInfo ||
            !Number.isFinite(
              paymentSession.subscriptionInfo.currentPeriodStart.getTime()
            ) ||
            !Number.isFinite(
              paymentSession.subscriptionInfo.currentPeriodEnd.getTime()
            ) ||
            paymentSession.subscriptionInfo.currentPeriodStart >=
              paymentSession.subscriptionInfo.currentPeriodEnd)
        ) {
          // Creem documents subscription.active as synchronization-only and
          // its sample omits the period. subscription.paid is authoritative for
          // activation, so acknowledge this incomplete event without retrying.
          eventType = PaymentEventType.IGNORED;
          paymentSession = undefined;
        }
      } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
        paymentSession = await this.buildPaymentSessionFromSubscription(
          event.object as any
        );
      } else if (eventType === PaymentEventType.PAYMENT_REFUNDED) {
        paymentSession = await this.buildPaymentSessionFromRefund(
          event.object as any
        );
        // Creem emits refund.created for partial refunds too. Only a completed
        // full refund revokes the order's remaining grant and subscription
        // entitlement; partial/pending refunds are acknowledged without acting.
        if (!paymentSession) eventType = PaymentEventType.IGNORED;
      }

      if (eventType !== PaymentEventType.IGNORED && !paymentSession) {
        throw new Error('Invalid webhook event');
      }

      return {
        eventType: eventType,
        eventResult: event,
        paymentSession: paymentSession,
      };
    } catch (error) {
      throw error;
    }
  }

  async getPaymentBilling({
    customerId,
    returnUrl,
  }: {
    customerId: string;
    returnUrl?: string;
  }): Promise<PaymentBilling> {
    try {
      const billing = await this.makeRequest('/v1/customers/billing', 'POST', {
        customer_id: customerId,
      });

      if (!billing.customer_portal_link) {
        throw new Error('get billing url failed');
      }

      return {
        billingUrl: billing.customer_portal_link,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelSubscription({
    subscriptionId,
  }: {
    subscriptionId: string;
  }): Promise<PaymentSession> {
    try {
      const result = await this.makeRequest(
        `/v1/subscriptions/${subscriptionId}/cancel`,
        'POST'
      );

      if (!result.canceled_at) {
        throw new Error('cancel subscription failed');
      }

      return await this.buildPaymentSessionFromSubscription(result);
    } catch (error) {
      throw error;
    }
  }

  private async generateSignature(
    payload: string,
    secret: string
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const messageData = encoder.encode(payload);

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, messageData);

      const signatureArray = new Uint8Array(signature);
      return Array.from(signatureArray)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error: any) {
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  private async makeRequest(endpoint: string, method: string, data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'x-api-key': this.configs.apiKey,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(PAYMENT_REQUEST_TIMEOUT_MS),
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(
        `request creem api failed with status: ${response.status}`
      );
    }

    return await response.json();
  }

  private mapCreemStatus(session: any): PaymentStatus {
    const status = session.status;
    const order = session.order || session.last_transaction;
    const orderStatus = order?.status;

    if (orderStatus === 'paid') {
      return PaymentStatus.SUCCESS;
    } else {
      // todo: handle other status
      throw new Error(`Unknown Creem session status: ${status}`);
    }
  }

  // build payment session from checkout session
  private async buildPaymentSessionFromCheckoutSession(
    session: any
  ): Promise<PaymentSession> {
    let subscription: any | undefined = undefined;
    let billingUrl = '';

    if (session.subscription) {
      subscription = session.subscription;
    }

    const order = session.order;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(session),
      paymentInfo: {
        transactionId: order?.transaction || order?.id,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: session.customer?.email,
        paymentUserName: session.customer?.name,
        paymentUserId: session.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
      },
      paymentResult: session,
      metadata: session.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionResult = subscription;
      const periodStart = new Date(subscription.current_period_start_date);
      const periodEnd = new Date(subscription.current_period_end_date);
      if (
        Number.isFinite(periodStart.getTime()) &&
        Number.isFinite(periodEnd.getTime()) &&
        periodStart < periodEnd
      ) {
        result.subscriptionInfo = await this.buildSubscriptionInfo(
          subscription,
          session.product
        );
      } else {
        // Creem's documented checkout.completed subscription deliberately has
        // no billing period and must not activate recurring access. Persist the
        // provider subscription link and wait for subscription.paid, which has
        // a stable transaction ID and complete signed period.
        result.paymentStatus = PaymentStatus.PROCESSING;
      }
    }

    return result;
  }

  // build payment session from subscription session
  private async buildPaymentSessionFromPaidSubscription(
    subscription: any
  ): Promise<PaymentSession> {
    const product = subscription?.product;
    const transactionId = subscription?.last_transaction_id;
    if (
      !subscription?.id ||
      !product ||
      typeof transactionId !== 'string' ||
      !transactionId
    ) {
      throw new Error('Invalid Creem subscription.paid payload');
    }

    const createdAt = new Date(subscription.created_at);
    const currentPeriodStart = new Date(subscription.current_period_start_date);
    if (
      !Number.isFinite(createdAt.getTime()) ||
      !Number.isFinite(currentPeriodStart.getTime())
    ) {
      throw new Error('Invalid Creem subscription.paid dates');
    }
    const cycleType =
      Math.abs(currentPeriodStart.getTime() - createdAt.getTime()) <=
      CREEM_INITIAL_PERIOD_TOLERANCE_MS
        ? SubscriptionCycleType.CREATE
        : SubscriptionCycleType.RENEWAL;
    const amount = Number(product.price);
    const currency = String(product.currency || '');
    if (!Number.isFinite(amount) || amount <= 0 || !currency) {
      throw new Error('Invalid Creem subscription.paid amount');
    }

    return {
      provider: this.name,
      paymentStatus: PaymentStatus.SUCCESS,
      paymentInfo: {
        description: product.description,
        amount,
        currency,
        transactionId,
        paymentAmount: amount,
        paymentCurrency: currency,
        paymentEmail: subscription.customer?.email,
        paymentUserName: subscription.customer?.name,
        paymentUserId: subscription.customer?.id,
        paidAt: subscription.last_transaction_date
          ? new Date(subscription.last_transaction_date)
          : undefined,
        subscriptionCycleType: cycleType,
      },
      paymentResult: subscription,
      metadata: subscription.metadata,
      subscriptionId: subscription.id,
      subscriptionInfo: await this.buildSubscriptionInfo(subscription, product),
      subscriptionResult: subscription,
    };
  }

  // Kept for checkout lookup responses that include an invoice/order object.
  private async buildPaymentSessionFromInvoice(
    invoice: any
  ): Promise<PaymentSession> {
    const order = invoice.order || invoice.last_transaction;

    const subscription = invoice.subscription || invoice;

    const subscriptionCreatedAt = new Date(subscription.created_at);
    const currentPeriodStartAt = new Date(
      subscription.current_period_start_date
    );
    const timeDiff =
      currentPeriodStartAt.getTime() - subscriptionCreatedAt.getTime();

    const cycleType =
      Math.abs(timeDiff) <= CREEM_INITIAL_PERIOD_TOLERANCE_MS
        ? SubscriptionCycleType.CREATE
        : SubscriptionCycleType.RENEWAL;

    const result: PaymentSession = {
      provider: this.name,
      paymentStatus: this.mapCreemStatus(invoice),
      paymentInfo: {
        description: order?.description,
        amount: order?.amount || 0,
        currency: order?.currency || '',
        transactionId: order?.transaction || order?.id,
        discountCode: '',
        discountAmount: order?.discount_amount || 0,
        discountCurrency: order?.currency || '',
        paymentAmount: order?.amount_paid || 0,
        paymentCurrency: order?.currency || '',
        paymentEmail: invoice.customer?.email,
        paymentUserName: invoice.customer?.name,
        paymentUserId: invoice.customer?.id,
        paidAt: order?.created_at ? new Date(order.created_at) : undefined,
        invoiceId: '', // todo: invoice id
        invoiceUrl: '',
        subscriptionCycleType: cycleType,
      },
      paymentResult: invoice,
      metadata: invoice.metadata,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  // build payment session from subscription
  private async buildPaymentSessionFromSubscription(
    subscription: any
  ): Promise<PaymentSession> {
    const result: PaymentSession = {
      provider: this.name,
    };

    if (subscription) {
      result.subscriptionId = subscription.id;
      result.subscriptionInfo = await this.buildSubscriptionInfo(
        subscription,
        subscription.product
      );
      result.subscriptionResult = subscription;
    }

    return result;
  }

  /** Build a session only for a completed, cumulative full refund. */
  private async buildPaymentSessionFromRefund(
    refund: any
  ): Promise<PaymentSession | undefined> {
    if (!refund || refund.status !== 'succeeded') return undefined;

    const transaction = refund.transaction;
    if (!transaction || typeof transaction.id !== 'string') {
      throw new Error('Invalid Creem refund transaction');
    }

    const paidAmount = Number(
      transaction.amount_paid ?? transaction.amount ?? 0
    );
    const cumulativeRefundedAmount = Number(
      transaction.refunded_amount ?? refund.refund_amount ?? 0
    );
    if (
      !Number.isFinite(paidAmount) ||
      !Number.isFinite(cumulativeRefundedAmount) ||
      paidAmount <= 0 ||
      cumulativeRefundedAmount <= 0
    ) {
      throw new Error('Invalid Creem refund amount');
    }
    if (cumulativeRefundedAmount < paidAmount) return undefined;

    const subscription = refund.subscription;
    const transactionSubscriptionId =
      typeof transaction.subscription === 'string'
        ? transaction.subscription
        : transaction.subscription?.id;
    const subscriptionId =
      typeof subscription === 'string'
        ? subscription
        : subscription?.id || transactionSubscriptionId;
    const checkoutMetadata =
      refund.checkout?.metadata &&
      typeof refund.checkout.metadata === 'object' &&
      !Array.isArray(refund.checkout.metadata)
        ? refund.checkout.metadata
        : {};
    const subscriptionMetadata =
      subscription?.metadata &&
      typeof subscription.metadata === 'object' &&
      !Array.isArray(subscription.metadata)
        ? subscription.metadata
        : {};
    const requestId =
      typeof refund.checkout?.request_id === 'string'
        ? refund.checkout.request_id
        : '';
    const metadata = {
      ...subscriptionMetadata,
      ...checkoutMetadata,
      ...(requestId && !checkoutMetadata.orderNo ? { orderNo: requestId } : {}),
    };

    let subscriptionInfo: SubscriptionInfo | undefined;
    if (subscriptionId) {
      const currentPeriodStart = new Date(
        transaction.period_start ?? subscription?.current_period_start_date
      );
      const currentPeriodEnd = new Date(
        transaction.period_end ?? subscription?.current_period_end_date
      );
      if (
        !Number.isFinite(currentPeriodStart.getTime()) ||
        !Number.isFinite(currentPeriodEnd.getTime()) ||
        currentPeriodStart >= currentPeriodEnd
      ) {
        throw new Error('Invalid Creem refund billing period');
      }
      const productId =
        typeof subscription?.product === 'string'
          ? subscription.product
          : subscription?.product?.id;
      subscriptionInfo = {
        subscriptionId,
        productId,
        currentPeriodStart,
        currentPeriodEnd,
        status: SubscriptionStatus.PAUSED,
        metadata,
      };
    }

    const paymentCurrency = String(
      refund.refund_currency || transaction.currency || ''
    );
    const refundAmount = Number(
      refund.refund_amount ?? cumulativeRefundedAmount
    );
    return {
      provider: this.name,
      paymentInfo: {
        transactionId: transaction.id,
        amount: paidAmount,
        currency: String(transaction.currency || paymentCurrency),
        paymentAmount: Number.isFinite(refundAmount)
          ? refundAmount
          : cumulativeRefundedAmount,
        paymentCurrency,
        paidAt: transaction.created_at
          ? new Date(transaction.created_at)
          : undefined,
      },
      paymentResult: refund,
      metadata,
      subscriptionId,
      subscriptionInfo,
      subscriptionResult: subscription,
    };
  }

  // build subscription info from subscription
  private async buildSubscriptionInfo(
    subscription: any,
    product?: any
  ): Promise<SubscriptionInfo> {
    product = product || subscription?.product;
    const { interval, count: intervalCount } = this.mapCreemInterval(product);

    const subscriptionInfo: SubscriptionInfo = {
      subscriptionId: subscription.id,
      productId: product?.id,
      planId: '',
      description: product?.description,
      amount: product?.price,
      currency: product?.currency,
      currentPeriodStart: new Date(subscription.current_period_start_date),
      currentPeriodEnd: new Date(subscription.current_period_end_date),
      interval: interval,
      intervalCount: intervalCount,
      metadata: subscription.metadata,
    };

    if (subscription.status === 'active') {
      if (subscription.cancel_at) {
        subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
        // cancel apply at
        subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
      } else {
        subscriptionInfo.status = SubscriptionStatus.ACTIVE;
      }
    } else if (subscription.status === 'canceled') {
      // subscription canceled
      subscriptionInfo.status = SubscriptionStatus.CANCELED;
      subscriptionInfo.canceledAt = new Date(subscription.canceled_at);
    } else if (subscription.status === 'trialing') {
      subscriptionInfo.status = SubscriptionStatus.TRIALING;
    } else if (
      subscription.status === 'paused' ||
      subscription.status === 'past_due'
    ) {
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    } else if (subscription.status === 'scheduled_cancel') {
      subscriptionInfo.status = SubscriptionStatus.PENDING_CANCEL;
      subscriptionInfo.canceledEndAt = subscriptionInfo.currentPeriodEnd;
    } else if (subscription.status === 'expired') {
      subscriptionInfo.status = SubscriptionStatus.EXPIRED;
    } else {
      // Provider status additions must never preserve Pro by accident.
      subscriptionInfo.status = SubscriptionStatus.PAUSED;
    }

    return subscriptionInfo;
  }

  private mapCreemInterval(product: any): {
    interval: PaymentInterval;
    count: number;
  } {
    if (!product || !product.billing_period) {
      throw new Error('Invalid product');
    }

    switch (product.billing_period) {
      case 'every-month':
        return {
          interval: PaymentInterval.MONTH,
          count: 1,
        };
      case 'every-three-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 3,
        };
      case 'every-six-months':
        return {
          interval: PaymentInterval.MONTH,
          count: 6,
        };
      case 'every-year':
        return {
          interval: PaymentInterval.YEAR,
          count: 1,
        };
      case 'once':
        return {
          interval: PaymentInterval.ONE_TIME,
          count: 1,
        };
      default:
        throw new Error(
          `Unknown Creem product billing period: ${product.billing_period}`
        );
    }
  }
}

/**
 * Create Creem provider with configs
 */
export function createCreemProvider(configs: CreemConfigs): CreemProvider {
  return new CreemProvider(configs);
}

/** Maps verified Creem events. Non-business events are accepted as ignored. */
export function mapCreemWebhookEventType(eventType: string): PaymentEventType {
  switch (eventType) {
    case 'checkout.completed':
      return PaymentEventType.CHECKOUT_SUCCESS;
    case 'subscription.paid':
      return PaymentEventType.PAYMENT_SUCCESS;
    case 'subscription.update':
    case 'subscription.paused':
    case 'subscription.active':
    case 'subscription.trialing':
    case 'subscription.scheduled_cancel':
    case 'subscription.past_due':
    case 'subscription.expired':
      return PaymentEventType.SUBSCRIBE_UPDATED;
    case 'subscription.canceled':
      return PaymentEventType.SUBSCRIBE_CANCELED;
    case 'refund.created':
      return PaymentEventType.PAYMENT_REFUNDED;
    default:
      return PaymentEventType.IGNORED;
  }
}
