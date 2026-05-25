import type { Request, Response } from 'express';
import { sosService } from './sos.service';
import { ok } from '@/core/http/ApiResponse';

class SosController {
  raise = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await sosService.raise(req.tenant!.db, req.tenant!.societyId, req.auth!.userId, req.body)));
  };
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await sosService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };
  acknowledge = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await sosService.acknowledge(req.tenant!.db, req.params.id, req.auth!.userId)));
  };
  resolve = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await sosService.resolve(req.tenant!.db, req.params.id)));
  };
}

export const sosController = new SosController();
