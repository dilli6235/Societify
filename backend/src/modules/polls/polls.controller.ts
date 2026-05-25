import type { Request, Response } from 'express';
import { pollService } from './polls.service';
import { ok } from '@/core/http/ApiResponse';

class PollController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await pollService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await pollService.getById(req.tenant!.db, req.auth!.userId, req.params.id)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const poll = await pollService.create(req.tenant!.societyId, req.auth!.userId, req.body);
    res.status(201).json(ok(poll));
  };

  vote = async (req: Request, res: Response): Promise<void> => {
    const result = await pollService.vote(
      req.tenant!.societyId,
      req.auth!.userId,
      req.params.id,
      req.body.optionIds,
    );
    res.status(201).json(ok(result));
  };

  close = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await pollService.close(req.tenant!.db, req.params.id)));
  };
}

export const pollController = new PollController();
