import type { Request, Response } from 'express';
import { noticeService } from './notices.service';
import { ok } from '@/core/http/ApiResponse';

const MANAGER_ROLES = ['SOCIETY_ADMIN', 'COMMITTEE_MEMBER'];

class NoticeController {
  list = async (req: Request, res: Response): Promise<void> => {
    const actor = {
      userId: req.auth!.userId,
      isManager: req.auth!.roles.some((r) => MANAGER_ROLES.includes(r)),
    };
    const { items, meta } = await noticeService.list(req.tenant!.db, req.query as never, actor);
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

  markRead = async (req: Request, res: Response): Promise<void> => {
    await noticeService.markRead(req.tenant!.db, req.tenant!.societyId, req.params.id, req.auth!.userId);
    res.json(ok({ read: true }));
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    const actor = { userId: req.auth!.userId, isManager: req.auth!.roles.some((r) => MANAGER_ROLES.includes(r)) };
    res.json(ok(await noticeService.markAllRead(req.tenant!.db, req.tenant!.societyId, actor)));
  };

  readers = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await noticeService.readers(req.tenant!.db, req.params.id)));
  };
}

export const noticeController = new NoticeController();
