import type { Request, Response } from 'express';
import { staffService } from './staff.service';
import { ok } from '@/core/http/ApiResponse';

class StaffController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await staffService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };
  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await staffService.getById(req.tenant!.db, req.params.id)));
  };
  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await staffService.create(req.tenant!.db, req.tenant!.societyId, req.body)));
  };
  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await staffService.update(req.tenant!.db, req.params.id, req.body)));
  };
  remove = async (req: Request, res: Response): Promise<void> => {
    await staffService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
  markAttendance = async (req: Request, res: Response): Promise<void> => {
    const log = await staffService.markAttendance(req.tenant!.db, req.tenant!.societyId, req.auth!.userId, req.body);
    res.status(201).json(ok(log));
  };
  listAttendance = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await staffService.listAttendance(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };
}

export const staffController = new StaffController();
