import type { Request, Response } from 'express';
import { invoiceService } from './invoices.service';
import { ok } from '@/core/http/ApiResponse';

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
}

export const invoiceController = new InvoiceController();
