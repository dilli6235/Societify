import type { Request, Response } from 'express';
import { expenseService } from './expenses.service';
import { invoiceService } from './invoices.service';
import { buildVoucherPdf } from './pdf.service';
import { ok } from '@/core/http/ApiResponse';

class ExpenseController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await expenseService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  summary = async (req: Request, res: Response): Promise<void> => {
    const { from, to } = req.query as { from?: Date; to?: Date };
    const data = await expenseService.summary(req.tenant!.db, from, to);
    res.json(ok(data));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const expense = await expenseService.getById(req.tenant!.db, req.params.id);
    res.json(ok(expense));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const expense = await expenseService.create(req.tenant!.db, req.tenant!.societyId, req.auth!.userId, req.body);
    res.status(201).json(ok(expense));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const expense = await expenseService.update(req.tenant!.db, req.params.id, req.body);
    res.json(ok(expense));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await expenseService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };

  /** Expense payment-voucher PDF (managers only — gated at the route). */
  voucherPdf = async (req: Request, res: Response): Promise<void> => {
    const db = req.tenant!.db;
    const e = await expenseService.getById(db, req.params.id);
    const society = await invoiceService.societyIdentity(db, req.tenant!.societyId);

    const pdf = await buildVoucherPdf(society, {
      voucherNumber: `VCH-${e.id.slice(0, 8).toUpperCase()}`,
      category: e.category.replace(/_/g, ' '),
      payee: e.vendorName,
      date: e.expenseDate.toISOString().slice(0, 10),
      title: e.title,
      amount: Number(e.amount),
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${`VCH-${e.id.slice(0, 8).toUpperCase()}`}.pdf"`);
    res.send(pdf);
  };
}

export const expenseController = new ExpenseController();
