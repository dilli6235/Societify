import { z } from 'zod';

const category = z.enum([
  'HOUSEKEEPING',
  'SECURITY',
  'MAINTENANCE',
  'UTILITIES',
  'REPAIRS',
  'SALARIES',
  'EVENTS',
  'OTHER',
]);

export const createExpenseSchema = z.object({
  body: z.object({
    category,
    title: z.string().min(1).max(160),
    description: z.string().max(2000).optional(),
    amount: z.coerce.number().positive().max(100_000_000),
    vendorName: z.string().max(160).optional(),
    expenseDate: z.coerce.date(),
    receiptUrl: z.string().url().optional(),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    category: category.optional(),
    title: z.string().min(1).max(160).optional(),
    description: z.string().max(2000).nullable().optional(),
    amount: z.coerce.number().positive().max(100_000_000).optional(),
    vendorName: z.string().max(160).nullable().optional(),
    expenseDate: z.coerce.date().optional(),
    receiptUrl: z.string().url().nullable().optional(),
  }),
});

export const expenseIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listExpensesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    category: category.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
