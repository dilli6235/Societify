import type { Request, Response } from 'express';
import { noticeService } from './notices.service';
import { ok } from '@/core/http/ApiResponse';

class NoticeController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await noticeService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await noticeService.getById(req.tenant!.db, req.params.id)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await noticeService.create(req.tenant!.db, req.tenant!.societyId, req.auth!.userId, req.body)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await noticeService.update(req.tenant!.db, req.params.id, req.body)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await noticeService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const noticeController = new NoticeController();
