import { z } from 'zod';

const lineItem = z.object({
  description: z.string().min(1).max(200),
  quantity: z.coerce.number().positive().max(100000).default(1),
  unitPrice: z.coerce.number().min(0).max(100_000_000),
});

export const createInvoiceSchema = z.object({
  body: z
    .object({
      unitId: z.string().uuid(),
      billingPeriodStart: z.coerce.date(),
      billingPeriodEnd: z.coerce.date(),
      dueDate: z.coerce.date(),
      lineItems: z.array(lineItem).min(1, 'At least one line item is required'),
      taxAmount: z.coerce.number().min(0).default(0),
      // Issue immediately, or keep as DRAFT for review.
      issueNow: z.boolean().default(false),
    })
    .refine((v) => v.billingPeriodEnd >= v.billingPeriodStart, {
      message: 'billingPeriodEnd must be on or after billingPeriodStart',
      path: ['billingPeriodEnd'],
    }),
});

export const invoiceIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listInvoicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    unitId: z.string().uuid().optional(),
    status: z
      .enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'])
      .optional(),
  }),
});
