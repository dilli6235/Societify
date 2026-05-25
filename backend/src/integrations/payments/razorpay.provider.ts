import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError, BadRequestError } from '@/core/errors/AppError';
import type {
  CreateOrderParams,
  GatewayOrder,
  PaymentProvider,
  VerifyPaymentParams,
  WebhookEvent,
} from './types';

const RAZORPAY_API = 'https://api.razorpay.com/v1';

/** Constant-time string compare to avoid signature timing leaks. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';
  readonly enabled = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

  async createOrder(params: CreateOrderParams): Promise<GatewayOrder> {
    if (!this.enabled) {
      throw new AppError(503, 'PAYMENTS_DISABLED', 'Online payments are not configured');
    }

    const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
    const res = await fetch(`${RAZORPAY_API}/orders`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // rupees → paise
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      logger.error({ status: res.status, detail }, 'Razorpay order creation failed');
      throw new AppError(502, 'GATEWAY_ERROR', 'Failed to create payment order');
    }

    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: order.id, amount: order.amount, currency: order.currency };
  }

  /**
   * Checkout handshake: Razorpay signs `${order_id}|${payment_id}` with the
   * key secret. We recompute and compare in constant time.
   */
  verifyPaymentSignature({ orderId, paymentId, signature }: VerifyPaymentParams): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false;
    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return safeEqual(expected, signature);
  }

  /**
   * Webhook: the entire raw body is HMAC-signed with the webhook secret and
   * sent in `X-Razorpay-Signature`. We MUST verify against the raw bytes
   * (not the re-serialized JSON) — hence the captured rawBody.
   */
  parseWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
      throw new AppError(503, 'PAYMENTS_DISABLED', 'Webhook secret not configured');
    }
    if (!signatureHeader) throw new BadRequestError('Missing webhook signature');

    const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    if (!safeEqual(expected, signatureHeader)) {
      throw new BadRequestError('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
    };
    const entity = event.payload?.payment?.entity;

    return {
      type: event.event, // e.g. "payment.captured", "payment.failed"
      gatewayPaymentId: entity?.id,
      gatewayOrderId: entity?.order_id,
      raw: event,
    };
  }
}

export const razorpayProvider = new RazorpayProvider();
