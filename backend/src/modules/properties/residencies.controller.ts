import type { Request, Response } from 'express';
import { residencyService } from './residencies.service';
import { ok } from '@/core/http/ApiResponse';

class ResidencyController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await residencyService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const residency = await residencyService.getById(req.tenant!.db, req.params.id);
    res.json(ok(residency));
  };

  mine = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await residencyService.listMine(req.tenant!.db, req.auth!.userId)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const residency = await residencyService.create(req.tenant!.db, req.tenant!.societyId, req.body);
    res.status(201).json(ok(residency));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const residency = await residencyService.update(req.tenant!.db, req.params.id, req.body);
    res.json(ok(residency));
  };

  end = async (req: Request, res: Response): Promise<void> => {
    const residency = await residencyService.endResidency(req.tenant!.db, req.params.id);
    res.json(ok(residency));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await residencyService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const residencyController = new ResidencyController();
