import type { Request, Response } from 'express';
import { blockService } from './blocks.service';
import { ok } from '@/core/http/ApiResponse';

class BlockController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await blockService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const block = await blockService.getById(req.tenant!.db, req.params.id);
    res.json(ok(block));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const block = await blockService.create(req.tenant!.db, req.tenant!.societyId, req.body);
    res.status(201).json(ok(block));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const block = await blockService.update(req.tenant!.db, req.params.id, req.body);
    res.json(ok(block));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await blockService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const blockController = new BlockController();
