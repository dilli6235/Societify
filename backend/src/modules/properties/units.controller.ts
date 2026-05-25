import type { Request, Response } from 'express';
import { unitService } from './units.service';
import { ok } from '@/core/http/ApiResponse';

class UnitController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await unitService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const unit = await unitService.getById(req.tenant!.db, req.params.id);
    res.json(ok(unit));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const unit = await unitService.create(req.tenant!.db, req.tenant!.societyId, req.body);
    res.status(201).json(ok(unit));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const unit = await unitService.update(req.tenant!.db, req.params.id, req.body);
    res.json(ok(unit));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await unitService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const unitController = new UnitController();
