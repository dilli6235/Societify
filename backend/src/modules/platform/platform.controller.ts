import type { Request, Response } from 'express';
import { platformService } from './platform.service';
import { ok } from '@/core/http/ApiResponse';

class PlatformController {
  stats = async (_req: Request, res: Response): Promise<void> => {
    res.json(ok(await platformService.stats()));
  };

  listSocieties = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await platformService.listSocieties(req.query as never);
    res.json(ok(items, meta));
  };

  getSociety = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await platformService.getSociety(req.params.id)));
  };

  updateSociety = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await platformService.updateSociety(req.params.id, req.body)));
  };

  listPlans = async (_req: Request, res: Response): Promise<void> => {
    res.json(ok(await platformService.listPlans()));
  };

  createPlan = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await platformService.createPlan(req.body)));
  };

  updatePlan = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await platformService.updatePlan(req.params.id, req.body)));
  };

  deletePlan = async (req: Request, res: Response): Promise<void> => {
    await platformService.deletePlan(req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const platformController = new PlatformController();
