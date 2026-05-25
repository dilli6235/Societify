import type { Request, Response } from 'express';
import { expenseService } from './expenses.service';
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
}

export const expenseController = new ExpenseController();
