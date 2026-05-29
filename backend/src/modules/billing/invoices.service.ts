import type { InvoiceStatus, Prisma } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/core/errors/AppError';
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
  lateFee?: number;
  issueNow: boolean;
}

interface ListParams {
  page?: number;
  pageSize?: number;
  unitId?: string;
  status?: InvoiceStatus;
}

// Include the unit's primary resident's contact details so the UI can show
// who the invoice is for (name / phone / email).
const unitWithResident = {
  select: {
    id: true,
    unitNumber: true,
    residencies: {
      where: { isPrimary: true, movedOutAt: null },
      take: 1,
      select: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    },
  },
} as const;

const invoiceInclude = {
  lineItems: true,
  unit: unitWithResident,
  payments: { select: { id: true, amount: true, status: true, method: true, paidAt: true, gatewayProvider: true } },
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
        include: { unit: unitWithResident },
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
      const lateFee = input.lateFee ?? 0;
      const totalAmount = subtotal + input.taxAmount + lateFee;

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
          lateFee,
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

  /**
   * Edit an invoice's due date, tax, or line items. Recomputes subtotal and
   * total. PAID and CANCELLED invoices can't be edited.
   */
  async update(
    societyId: string,
    id: string,
    input: { dueDate?: Date; taxAmount?: number; lateFee?: number; lineItems?: LineItemInput[] },
  ) {
    return withSociety(societyId, async (tx) => {
      const inv = await tx.maintenanceInvoice.findFirst({ where: { id, societyId } });
      if (!inv) throw new NotFoundError('Invoice not found');
      if (inv.status === 'PAID' || inv.status === 'CANCELLED') {
        throw new ConflictError(`Cannot edit a ${inv.status} invoice`);
      }

      let subtotal = Number(inv.subtotal);
      if (input.lineItems) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
        subtotal = input.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
        await tx.invoiceLineItem.createMany({
          data: input.lineItems.map((li) => ({
            societyId,
            invoiceId: id,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            amount: li.quantity * li.unitPrice,
          })),
        });
      }
      const taxAmount = input.taxAmount ?? Number(inv.taxAmount);
      const lateFee = input.lateFee ?? Number(inv.lateFee);
      const totalAmount = subtotal + taxAmount + lateFee;

      // If lowering the total now means the invoice is fully covered, flip to PAID.
      const status = Number(inv.amountPaid) + 0.001 >= totalAmount ? 'PAID' : inv.status;

      return tx.maintenanceInvoice.update({
        where: { id },
        data: {
          dueDate: input.dueDate ?? undefined,
          taxAmount,
          lateFee,
          subtotal,
          totalAmount,
          status,
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

  /**
   * Generate the current month's maintenance invoice for every occupied unit,
   * using the society's billing config (fixed amount or rate × carpet area).
   * Idempotent: a unit already invoiced for this period is skipped, so the
   * button is safe to press twice.
   */
  async generateForCurrentMonth(societyId: string) {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const society = await withSociety(societyId, (tx) =>
      tx.society.findUnique({
        where: { id: societyId },
        select: {
          maintenanceMethod: true,
          maintenanceFixedAmount: true,
          maintenanceRatePerSqft: true,
          dueDay: true,
        },
      }),
    );
    if (!society) throw new NotFoundError('Society not found');

    const dueDay = Math.min(Math.max(society.dueDay ?? 10, 1), 28);
    const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), dueDay, 23, 59, 59));

    const units = await withSociety(societyId, (tx) =>
      tx.unit.findMany({
        where: { occupancyStatus: { not: 'VACANT' } },
        select: { id: true, carpetAreaSqft: true },
      }),
    );

    let created = 0;
    let skipped = 0;
    for (const unit of units) {
      const existing = await withSociety(societyId, (tx) =>
        tx.maintenanceInvoice.findFirst({
          where: { unitId: unit.id, billingPeriodStart: periodStart },
          select: { id: true },
        }),
      );
      if (existing) {
        skipped++;
        continue;
      }

      const amount =
        society.maintenanceMethod === 'PER_SQFT'
          ? Math.round(Number(society.maintenanceRatePerSqft ?? 0) * Number(unit.carpetAreaSqft ?? 0))
          : Number(society.maintenanceFixedAmount ?? 0);
      if (amount <= 0) {
        skipped++;
        continue;
      }

      await this.create(societyId, {
        unitId: unit.id,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        dueDate,
        taxAmount: 0,
        issueNow: true,
        lineItems: [{ description: 'Monthly maintenance', quantity: 1, unitPrice: amount }],
      });
      created++;
    }

    return { created, skipped };
  }

  /** Send a reminder notification to the primary resident of each unpaid unit. */
  async remindUnpaid(societyId: string) {
    const unpaid = await withSociety(societyId, (tx) =>
      tx.maintenanceInvoice.findMany({
        where: { status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] } },
        select: { invoiceNumber: true, totalAmount: true, amountPaid: true, dueDate: true, unitId: true },
      }),
    );

    let reminded = 0;
    for (const inv of unpaid) {
      const primary = await withSociety(societyId, (tx) =>
        tx.residency.findFirst({
          where: { unitId: inv.unitId, isPrimary: true, movedOutAt: null },
          select: { userId: true },
        }),
      );
      if (!primary) continue;
      await enqueueNotification({
        societyId,
        event: 'INVOICE_ISSUED',
        recipientUserIds: [primary.userId],
        data: {
          invoiceNumber: inv.invoiceNumber,
          amount: Number(inv.totalAmount) - Number(inv.amountPaid),
          dueDate: inv.dueDate.toISOString().slice(0, 10),
        },
      });
      reminded++;
    }

    return { reminded };
  }

  /** Society identity fields used to brand generated PDFs. */
  async societyIdentity(db: TenantClient, societyId: string) {
    const s = await db.society.findUnique({
      where: { id: societyId },
      select: {
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        gstin: true,
      },
    });
    if (!s) throw new NotFoundError('Society not found');
    return s;
  }

  /** Full invoice (line items, unit + primary resident, successful payments) for a document. */
  async getForPdf(db: TenantClient, id: string) {
    const inv = await db.maintenanceInvoice.findFirst({
      where: { id },
      include: {
        lineItems: true,
        unit: {
          select: {
            unitNumber: true,
            residencies: {
              where: { isPrimary: true, movedOutAt: null },
              take: 1,
              select: { user: { select: { fullName: true } } },
            },
          },
        },
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { paidAt: 'desc' },
          select: { amount: true, method: true, paidAt: true, gatewayPaymentId: true },
        },
      },
    });
    if (!inv) throw new NotFoundError('Invoice not found');
    return inv;
  }

  /** Guard: a non-manager may only access documents for a unit they reside in. */
  async assertOwnInvoice(db: TenantClient, userId: string, unitId: string): Promise<void> {
    const r = await db.residency.findFirst({ where: { userId, unitId, movedOutAt: null }, select: { id: true } });
    if (!r) throw new ForbiddenError('You can only access documents for your own unit');
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
