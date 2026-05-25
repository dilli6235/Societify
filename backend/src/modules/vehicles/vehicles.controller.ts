import type { Request, Response } from 'express';
import { vehicleService } from './vehicles.service';
import { ok } from '@/core/http/ApiResponse';

class VehicleController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await vehicleService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };
  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await vehicleService.getById(req.tenant!.db, req.params.id)));
  };
  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await vehicleService.create(req.tenant!.db, req.tenant!.societyId, req.body)));
  };
  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await vehicleService.update(req.tenant!.db, req.params.id, req.body)));
  };
  remove = async (req: Request, res: Response): Promise<void> => {
    await vehicleService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const vehicleController = new VehicleController();
