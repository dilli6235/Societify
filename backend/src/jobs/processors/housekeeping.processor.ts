import { withBypass } from '@/core/tenant/rls';
import { logger } from '@/config/logger';

/**
 * Mark issued/partially-paid invoices whose due date has passed as OVERDUE.
 * Platform-wide → runs with RLS bypass across all tenants in one statement.
 */
export async function runOverdueSweep(): Promise<{ updated: number }> {
  const now = new Date();
  const result = await withBypass((tx) =>
    tx.maintenanceInvoice.updateMany({
      where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: now } },
      data: { status: 'OVERDUE' },
    }),
  );
  logger.info({ updated: result.count }, 'Overdue sweep complete');
  return { updated: result.count };
}

/**
 * Expire gate passes that are still pending/approved but past their validity
 * window. Keeps the gate desk from honoring stale passes.
 */
export async function runGatePassExpiry(): Promise<{ updated: number }> {
  const now = new Date();
  const result = await withBypass((tx) =>
    tx.gatePass.updateMany({
      where: { status: { in: ['PENDING_APPROVAL', 'APPROVED'] }, validUntil: { not: null, lt: now } },
      data: { status: 'EXPIRED' },
    }),
  );
  logger.info({ updated: result.count }, 'Gate-pass expiry sweep complete');
  return { updated: result.count };
}
