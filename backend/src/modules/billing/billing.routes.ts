import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { invoiceController } from './invoices.controller';
import { paymentController } from './payments.controller';
import { expenseController } from './expenses.controller';

import { createInvoiceSchema, invoiceIdSchema, listInvoicesSchema } from './invoices.schema';
import {
  recordManualSchema,
  createOrderSchema,
  verifyPaymentSchema,
  listPaymentsSchema,
} from './payments.schema';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdSchema,
  listExpensesSchema,
} from './expenses.schema';

const router = Router();

// ── Public: gateway webhook (NO auth, NO tenant) — must be before auth. ──
router.post('/payments/webhook', asyncHandler(paymentController.webhook));

// Everything below requires an authenticated, tenant-scoped session.
router.use(authenticate, withTenant);

// Finance management is restricted to admins + committee (treasurer).
const canManageFinance = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');

// ── Invoices ────────────────────────────────────────────────────────────
router.get('/invoices', canManageFinance, validate(listInvoicesSchema), asyncHandler(invoiceController.list));
router.get('/invoices/:id', canManageFinance, validate(invoiceIdSchema), asyncHandler(invoiceController.getById));
router.post('/invoices', canManageFinance, validate(createInvoiceSchema), asyncHandler(invoiceController.create));
router.post('/invoices/:id/issue', canManageFinance, validate(invoiceIdSchema), asyncHandler(invoiceController.issue));
router.post('/invoices/:id/cancel', canManageFinance, validate(invoiceIdSchema), asyncHandler(invoiceController.cancel));

// ── Payments ──────────────────────────────────────────────────────────────
router.get('/payments', canManageFinance, validate(listPaymentsSchema), asyncHandler(paymentController.list));
router.post('/payments/manual', canManageFinance, validate(recordManualSchema), asyncHandler(paymentController.recordManual));
// Resident self-service: any authenticated tenant user may pay.
router.post('/payments/order', validate(createOrderSchema), asyncHandler(paymentController.createOrder));
router.post('/payments/verify', validate(verifyPaymentSchema), asyncHandler(paymentController.verify));

// ── Expenses ──────────────────────────────────────────────────────────────
router.get('/expenses', canManageFinance, validate(listExpensesSchema), asyncHandler(expenseController.list));
router.get('/expenses/summary', canManageFinance, validate(listExpensesSchema), asyncHandler(expenseController.summary));
router.get('/expenses/:id', canManageFinance, validate(expenseIdSchema), asyncHandler(expenseController.getById));
router.post('/expenses', canManageFinance, validate(createExpenseSchema), asyncHandler(expenseController.create));
router.patch('/expenses/:id', canManageFinance, validate(updateExpenseSchema), asyncHandler(expenseController.update));
router.delete('/expenses/:id', canManageFinance, validate(expenseIdSchema), asyncHandler(expenseController.remove));

export const billingRoutes = router;
