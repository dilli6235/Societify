import { prisma } from '@/config/database';
import { withSociety } from '@/core/tenant/rls';
import { logger } from '@/config/logger';
import { invoiceService } from '@/modules/billing/invoices.service';
import type { InvoiceGenerationData } from '../queues';

/**
 * Generate this month's maintenance invoice for every occupied unit across all
 * active societies. Idempotent: skips a unit that already has an invoice for
 * the current billing period, so re-running (or a retry) never double-bills.
 */
export async function runInvoiceGeneration(
  data: InvoiceGenerationData,
): Promise<{ created: number; skipped: number }> {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
  const dueDate = new Date(periodEnd);
  dueDate.setUTCDate(dueDate.getUTCDate() + 10);

  const societies = await prisma.society.findMany({
    where: { subscriptionStatus: { in: ['TRIAL', 'ACTIVE'] } },
    select: { id: true },
  });

  let created = 0;
  let skipped = 0;

  for (const society of societies) {
    const units = await withSociety(society.id, (tx) =>
      tx.unit.findMany({ where: { occupancyStatus: { not: 'VACANT' } }, select: { id: true } }),
    );

    for (const unit of units) {
      const existing = await withSociety(society.id, (tx) =>
        tx.maintenanceInvoice.findFirst({
          where: { unitId: unit.id, billingPeriodStart: periodStart },
          select: { id: true },
        }),
      );
      if (existing) {
        skipped++;
        continue;
      }

      await invoiceService.create(society.id, {
        unitId: unit.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate,
        taxAmount: 0,
        issueNow: true,
        lineItems: [{ description: data.description, quantity: 1, unitPrice: data.amount }],
      });
      created++;
    }
  }

  logger.info({ created, skipped, societies: societies.length }, 'Invoice generation complete');
  return { created, skipped };
}
