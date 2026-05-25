import type { InvoiceStatus, Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import { BadRequestError, ConflictError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { enqueueNotification } from '@/jobs/notificationQueue';

interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInput {
  unitId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  lineItems: LineItemInput[];
  taxAmount: number;
  issueNow: boolean;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  unitId?: string;
  status?: InvoiceStatus;
}

const invoiceInclude = {
  lineItems: true,
  unit: { select: { id: true, unitNumber: true } },
  payments: { select: { id: true, amount: true, status: true, method: true, paidAt: true } },
} satisfies Prisma.MaintenanceInvoiceInclude;

class InvoiceService {
  async list(db: TenantClient, params: ListParams) {
    const page = resolvePagination(params);
    const where: Prisma.MaintenanceInvoiceWhereInput = {
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      db.maintenanceInvoice.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { unit: { select: { id: true, unitNumber: true } } },
      }),
      db.maintenanceInvoice.count({ where }),
    ]);

    return { items, meta: buildMeta(page, total) };
  }

  /** Invoices for the calling resident's own unit(s) — their dues. */
  async listMine(db: TenantClient, userId: string) {
    const residencies = await db.residency.findMany({
      where: { userId, movedOutAt: null },
      select: { unitId: true },
    });
    const unitIds = residencies.map((r) => r.unitId);
    if (unitIds.length === 0) return [];
    return db.maintenanceInvoice.findMany({
      where: { unitId: { in: unitIds }, status: { not: 'DRAFT' } },
      orderBy: { issueDate: 'desc' },
      include: { unit: { select: { id: true, unitNumber: true } } },
    });
  }

  async getById(db: TenantClient, id: string) {
    const invoice = await db.maintenanceInvoice.findFirst({ where: { id }, include: invoiceInclude });
    if (!invoice) throw new NotFoundError('Invoice not found');
    return invoice;
  }

  /**
   * Create an invoice with its line items, atomically:
   *   - increment the society's invoice counter (concurrency-safe numbering)
   *   - validate the unit belongs to this society
   *   - persist invoice + line items
   * All in one transaction with the RLS tenant context set.
   */
  async create(societyId: string, input: CreateInput) {
    const invoice = await this.runCreate(societyId, input);
    if (invoice.status === 'ISSUED') await this.notifyIssued(societyId, invoice);
    return invoice;
  }

  private async runCreate(societyId: string, input: CreateInput) {
    return withSociety(societyId, async (tx) => {
      const unit = await tx.unit.findFirst({
        where: { id: input.unitId, societyId },
        select: { id: true },
      });
      if (!unit) throw new BadRequestError('unitId does not reference a unit in this society');

      const subtotal = input.lineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitPrice,
        0,
      );
      const totalAmount = subtotal + input.taxAmount;

      const { invoiceSeq } = await tx.society.update({
        where: { id: societyId },
        data: { invoiceSeq: { increment: 1 } },
        select: { invoiceSeq: true },
      });
      const invoiceNumber = `INV-${String(invoiceSeq).padStart(6, '0')}`;

      return tx.maintenanceInvoice.create({
        data: {
          societyId,
          unitId: input.unitId,
          invoiceNumber,
          status: input.issueNow ? 'ISSUED' : 'DRAFT',
          billingPeriodStart: input.billingPeriodStart,
          billingPeriodEnd: input.billingPeriodEnd,
          issueDate: new Date(),
          dueDate: input.dueDate,
          subtotal,
          taxAmount: input.taxAmount,
          totalAmount,
          amountPaid: 0,
          lineItems: {
            create: input.lineItems.map((li) => ({
              societyId,
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              amount: li.quantity * li.unitPrice,
            })),
          },
        },
        include: invoiceInclude,
      });
    });
  }

  /** DRAFT → ISSUED (makes it payable + visible to the resident). */
  async issue(db: TenantClient, id: string) {
    const invoice = await this.getById(db, id);
    if (invoice.status !== 'DRAFT') {
      throw new ConflictError(`Only DRAFT invoices can be issued (current: ${invoice.status})`);
    }
    const issued = await db.maintenanceInvoice.update({
      where: { id },
      data: { status: 'ISSUED', issueDate: new Date() },
      include: invoiceInclude,
    });
    await this.notifyIssued(issued.societyId, issued);
    return issued;
  }

  /** Notify the unit's primary resident that an invoice was issued. */
  private async notifyIssued(
    societyId: string,
    invoice: { unitId: string; invoiceNumber: string; totalAmount: Prisma.Decimal; dueDate: Date },
  ): Promise<void> {
    const primary = await withSociety(societyId, (tx) =>
      tx.residency.findFirst({
        where: { unitId: invoice.unitId, isPrimary: true, movedOutAt: null },
        select: { userId: true },
      }),
    );
    if (!primary) return;
    await enqueueNotification({
      societyId,
      event: 'INVOICE_ISSUED',
      recipientUserIds: [primary.userId],
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.totalAmount),
        dueDate: invoice.dueDate.toISOString().slice(0, 10),
      },
    });
  }

  /** Cancel an invoice that has not been (partially) paid. */
  async cancel(db: TenantClient, id: string) {
    const invoice = await this.getById(db, id);
    if (invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
      throw new ConflictError('Cannot cancel an invoice that has payments against it');
    }
    return db.maintenanceInvoice.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: invoiceInclude,
    });
  }
}

export const invoiceService = new InvoiceService();
