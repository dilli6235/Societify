import { Prisma, type PaymentMethod } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withBypass, withSociety } from '@/core/tenant/rls';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '@/core/errors/AppError';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { getPaymentProvider } from '@/integrations/payments';

type Tx = Prisma.TransactionClient;

interface ListParams {
  page?: number;
  pageSize?: number;
  invoiceId?: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

class PaymentService {
  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where: Prisma.PaymentWhereInput = {
      ...(params.invoiceId ? { invoiceId: params.invoiceId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await Promise.all([
      db.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
      }),
      db.payment.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  /** Record an offline payment and apply it to the invoice atomically. */
  async recordManual(
    societyId: string,
    input: { invoiceId: string; amount: number; method: PaymentMethod; reference?: string; paidAt?: Date },
  ) {
    return withSociety(societyId, async (tx) => {
      const invoice = await this.loadPayableInvoice(tx, societyId, input.invoiceId);
      this.assertNotOverpaying(invoice, input.amount);

      const payment = await tx.payment.create({
        data: {
          societyId,
          invoiceId: input.invoiceId,
          amount: input.amount,
          method: input.method,
          status: 'SUCCESS',
          gatewayProvider: 'manual',
          gatewayPaymentId: input.reference ? `manual:${input.reference}` : undefined,
          paidAt: input.paidAt ?? new Date(),
        },
      });

      await this.applyToInvoice(tx, invoice, input.amount);
      return payment;
    });
  }

  /**
   * Create a gateway order for an online payment. Flow:
   *   1. validate the invoice is payable + compute amount
   *   2. create a PENDING Payment (its id is the gateway "receipt")
   *   3. ask the gateway for an order id
   *   4. store the order id on the Payment
   * Returns what the client SDK needs to open checkout.
   */
  async createOnlineOrder(db: TenantClient, societyId: string, input: { invoiceId: string; amount?: number }) {
    const provider = getPaymentProvider();

    const invoice = await db.maintenanceInvoice.findFirst({
      where: { id: input.invoiceId },
      include: { society: { select: { currency: true } } },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      throw new ConflictError(`Invoice is ${invoice.status}; nothing to pay`);
    }

    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    const amount = input.amount ?? outstanding;
    if (amount <= 0) throw new BadRequestError('Nothing outstanding on this invoice');
    if (amount > outstanding + 0.001) throw new BadRequestError('Amount exceeds outstanding balance');

    const payment = await db.payment.create({
      data: {
        societyId,
        invoiceId: invoice.id,
        amount,
        method: 'RAZORPAY',
        status: 'PENDING',
        gatewayProvider: provider.name,
      },
    });

    const order = await provider.createOrder({
      amount,
      currency: invoice.society.currency,
      receipt: payment.id,
      notes: { invoiceId: invoice.id, societyId },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { gatewayOrderId: order.orderId },
    });

    return {
      paymentId: payment.id,
      provider: provider.name,
      order,
      keyId: env.RAZORPAY_KEY_ID ?? null, // public key for the client SDK
    };
  }

  /**
   * Verify the client checkout callback and capture the payment. Idempotent —
   * the webhook may already have settled it.
   */
  async verifyAndCapture(
    societyId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    const provider = getPaymentProvider();
    const valid = provider.verifyPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });
    if (!valid) throw new BadRequestError('Payment signature verification failed');

    return withSociety(societyId, async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { gatewayOrderId: input.razorpayOrderId, societyId },
      });
      if (!payment) throw new NotFoundError('Payment not found');
      if (payment.status === 'SUCCESS') return payment; // already settled

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId: input.razorpayPaymentId,
          gatewaySignature: input.razorpaySignature,
          paidAt: new Date(),
        },
      });

      if (payment.invoiceId) {
        const invoice = await this.loadPayableInvoice(tx, societyId, payment.invoiceId);
        await this.applyToInvoice(tx, invoice, Number(payment.amount));
      }
      return updated;
    });
  }

  /**
   * Server-to-server webhook — the authoritative reconciliation path. Runs
   * unauthenticated (gateway-originated); we locate the Payment by its gateway
   * ids and settle it under the owning society's context. Fully idempotent.
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    const provider = getPaymentProvider();
    const event = provider.parseWebhook(rawBody, signature);

    // Find the payment across tenants by gateway ids (bypass — no session yet).
    const payment = await withBypass((tx) =>
      tx.payment.findFirst({
        where: {
          OR: [
            event.gatewayPaymentId ? { gatewayPaymentId: event.gatewayPaymentId } : undefined,
            event.gatewayOrderId ? { gatewayOrderId: event.gatewayOrderId } : undefined,
          ].filter(Boolean) as Prisma.PaymentWhereInput[],
        },
      }),
    );

    if (!payment) {
      logger.warn({ event: event.type }, 'Webhook for unknown payment — ignored');
      return;
    }

    if (event.type === 'payment.captured') {
      if (payment.status === 'SUCCESS') return; // idempotent
      await withSociety(payment.societyId, async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'SUCCESS',
            gatewayPaymentId: event.gatewayPaymentId ?? payment.gatewayPaymentId,
            paidAt: new Date(),
          },
        });
        if (payment.invoiceId) {
          const invoice = await this.loadPayableInvoice(tx, payment.societyId, payment.invoiceId);
          await this.applyToInvoice(tx, invoice, Number(payment.amount));
        }
      });
    } else if (event.type === 'payment.failed') {
      await withSociety(payment.societyId, (tx) =>
        tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED', failureReason: 'Gateway reported failure' },
        }),
      );
    }
  }

  // ── internal ──────────────────────────────────────────────────────────

  private async loadPayableInvoice(tx: Tx, societyId: string, invoiceId: string) {
    const invoice = await tx.maintenanceInvoice.findFirst({
      where: { id: invoiceId, societyId },
      select: { id: true, totalAmount: true, amountPaid: true, status: true },
    });
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'CANCELLED') throw new ConflictError('Invoice is cancelled');
    return invoice;
  }

  private assertNotOverpaying(
    invoice: { totalAmount: Prisma.Decimal; amountPaid: Prisma.Decimal },
    amount: number,
  ): void {
    const outstanding = Number(invoice.totalAmount) - Number(invoice.amountPaid);
    if (amount > outstanding + 0.001) {
      throw new BadRequestError('Amount exceeds outstanding balance');
    }
  }

  /** Increment amountPaid and recompute the invoice status. */
  private async applyToInvoice(
    tx: Tx,
    invoice: { id: string; totalAmount: Prisma.Decimal; amountPaid: Prisma.Decimal },
    amount: number,
  ): Promise<void> {
    const newPaid = Number(invoice.amountPaid) + amount;
    const total = Number(invoice.totalAmount);
    const status = newPaid + 0.001 >= total ? 'PAID' : 'PARTIALLY_PAID';

    await tx.maintenanceInvoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newPaid, status },
    });
  }
}

export const paymentService = new PaymentService();
