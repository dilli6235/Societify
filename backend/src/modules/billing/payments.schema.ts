import { z } from 'zod';

/** Admin records an offline payment (cash / cheque / bank transfer / UPI). */
export const recordManualSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid(),
    amount: z.coerce.number().positive().max(100_000_000),
    method: z.enum(['CASH', 'CHEQUE', 'BANK_TRANSFER', 'UPI']),
    reference: z.string().max(120).optional(), // cheque no. / UTR
    paidAt: z.coerce.date().optional(),
  }),
});

/** Resident starts an online payment; we create a gateway order. */
export const createOrderSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid(),
    // Defaults to the full outstanding balance if omitted.
    amount: z.coerce.number().positive().max(100_000_000).optional(),
  }),
});

/** Client checkout callback — verify the Razorpay handshake signature. */
export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  }),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    invoiceId: z.string().uuid().optional(),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']).optional(),
  }),
});
