/**
 * Provider-agnostic payment gateway contract. Adding Stripe later means
 * implementing this interface — the billing service never imports a provider
 * SDK directly.
 *
 * Amounts are handled in MAJOR currency units (e.g. rupees) at this boundary;
 * each provider converts to its own smallest-unit representation internally.
 */
export interface CreateOrderParams {
  amount: number;        // major units, e.g. 1500.00
  currency: string;      // ISO 4217, e.g. "INR"
  receipt: string;       // our Payment id, for cross-referencing
  notes?: Record<string, string>;
}

export interface GatewayOrder {
  orderId: string;       // provider order id (store on Payment.gatewayOrderId)
  amount: number;        // smallest unit, as returned by provider
  currency: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent {
  type: string;                 // normalized: "payment.captured" | "payment.failed" | ...
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;

  createOrder(params: CreateOrderParams): Promise<GatewayOrder>;

  /** Verify the client-side checkout callback signature (handshake). */
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;

  /** Verify + parse a server-to-server webhook. Throws if signature invalid. */
  parseWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent;
}
