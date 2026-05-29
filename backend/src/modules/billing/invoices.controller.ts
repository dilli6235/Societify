import type { Request, Response } from 'express';
import { invoiceService } from './invoices.service';
import { buildBillPdf, buildReceiptPdf } from './pdf.service';
import { ok } from '@/core/http/ApiResponse';
import { BadRequestError } from '@/core/errors/AppError';

const MANAGER_ROLES = ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN'];
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

class InvoiceController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await invoiceService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoiceService.getById(req.tenant!.db, req.params.id);
    res.json(ok(invoice));
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await invoiceService.listMine(req.tenant!.db, req.auth!.userId)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoiceService.create(req.tenant!.societyId, req.body);
    res.status(201).json(ok(invoice));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await invoiceService.update(req.tenant!.societyId, req.params.id, req.body)));
  };

  issue = async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoiceService.issue(req.tenant!.db, req.params.id);
    res.json(ok(invoice));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoiceService.cancel(req.tenant!.db, req.params.id);
    res.json(ok(invoice));
  };

  /** Bulk-generate this month's maintenance invoices for every occupied unit. */
  generate = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await invoiceService.generateForCurrentMonth(req.tenant!.societyId)));
  };

  /** Notify every unit with an unpaid invoice. */
  remind = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await invoiceService.remindUnpaid(req.tenant!.societyId)));
  };

  /** Maintenance bill PDF. Managers — or the unit's own resident — may download. */
  billPdf = async (req: Request, res: Response): Promise<void> => {
    const db = req.tenant!.db;
    const auth = req.auth!;
    const inv = await invoiceService.getForPdf(db, req.params.id);
    if (!auth.roles.some((r) => MANAGER_ROLES.includes(r))) {
      await invoiceService.assertOwnInvoice(db, auth.userId, inv.unitId);
    }
    const society = await invoiceService.societyIdentity(db, req.tenant!.societyId);

    const pdf = await buildBillPdf(society, {
      invoiceNumber: inv.invoiceNumber,
      unitNumber: inv.unit?.unitNumber ?? '—',
      residentName: inv.unit?.residencies?.[0]?.user?.fullName ?? null,
      billingPeriod: `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`,
      dueDate: fmtDate(inv.dueDate),
      status: inv.status,
      lineItems: inv.lineItems.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        amount: Number(li.amount),
      })),
      taxAmount: Number(inv.taxAmount),
      lateFee: Number(inv.lateFee),
      totalAmount: Number(inv.totalAmount),
      amountPaid: Number(inv.amountPaid),
    });
    this.sendPdf(res, `${inv.invoiceNumber}-bill.pdf`, pdf);
  };

  /** Payment receipt PDF (uses the most recent successful payment). */
  receiptPdf = async (req: Request, res: Response): Promise<void> => {
    const db = req.tenant!.db;
    const auth = req.auth!;
    const inv = await invoiceService.getForPdf(db, req.params.id);
    if (!auth.roles.some((r) => MANAGER_ROLES.includes(r))) {
      await invoiceService.assertOwnInvoice(db, auth.userId, inv.unitId);
    }
    const payment = inv.payments[0];
    if (!payment) throw new BadRequestError('No payment recorded for this invoice yet');
    const society = await invoiceService.societyIdentity(db, req.tenant!.societyId);

    const pdf = await buildReceiptPdf(society, {
      invoiceNumber: inv.invoiceNumber,
      unitNumber: inv.unit?.unitNumber ?? '—',
      receivedFrom: inv.unit?.residencies?.[0]?.user?.fullName ?? null,
      billingPeriod: `${fmtDate(inv.billingPeriodStart)} – ${fmtDate(inv.billingPeriodEnd)}`,
      paidOn: payment.paidAt ? fmtDate(payment.paidAt) : '—',
      method: payment.method,
      reference: payment.gatewayPaymentId?.replace(/^manual:/, '') ?? null,
      amount: Number(payment.amount),
    });
    this.sendPdf(res, `${inv.invoiceNumber}-receipt.pdf`, pdf);
  };

  private sendPdf(res: Response, filename: string, pdf: Buffer): void {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  }
}

export const invoiceController = new InvoiceController();
