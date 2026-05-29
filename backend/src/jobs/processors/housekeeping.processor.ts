import { withBypass } from '@/core/tenant/rls';
import { logger } from '@/config/logger';
import { enqueueNotification } from '@/jobs/notificationQueue';

/**
 * Mark issued/partially-paid invoices whose due date has passed as OVERDUE, and
 * send each affected unit's primary resident a one-time "payment overdue"
 * reminder. Only newly-overdue invoices are selected (status flips to OVERDUE),
 * so residents aren't re-pinged on later runs.
 */
export async function runOverdueSweep(): Promise<{ updated: number }> {
  const now = new Date();

  const due = await withBypass((tx) =>
    tx.maintenanceInvoice.findMany({
      where: { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, dueDate: { lt: now } },
      select: { id: true, societyId: true, unitId: true, invoiceNumber: true, dueDate: true, totalAmount: true, amountPaid: true },
    }),
  );

  if (due.length === 0) {
    logger.info({ updated: 0 }, 'Overdue sweep complete');
    return { updated: 0 };
  }

  await withBypass((tx) =>
    tx.maintenanceInvoice.updateMany({ where: { id: { in: due.map((d) => d.id) } }, data: { status: 'OVERDUE' } }),
  );

  // Notify each unit's primary resident of their now-overdue dues.
  for (const inv of due) {
    const primary = await withBypass((tx) =>
      tx.residency.findFirst({ where: { unitId: inv.unitId, isPrimary: true, movedOutAt: null }, select: { userId: true } }),
    );
    if (!primary) continue;
    await enqueueNotification({
      societyId: inv.societyId,
      event: 'DUE_REMINDER',
      recipientUserIds: [primary.userId],
      data: {
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.totalAmount) - Number(inv.amountPaid),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
      },
    });
  }

  logger.info({ updated: due.length }, 'Overdue sweep complete (residents notified)');
  return { updated: due.length };
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
