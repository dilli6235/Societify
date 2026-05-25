import type { Request, Response } from 'express';
import { notificationService } from './notifications.service';
import { ok } from '@/core/http/ApiResponse';

class NotificationController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await notificationService.list(req.tenant!.db, req.auth!.userId, req.query as never);
    res.json(ok(items, meta));
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await notificationService.markRead(req.tenant!.db, req.auth!.userId, req.params.id)));
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await notificationService.markAllRead(req.tenant!.db, req.auth!.userId)));
  };

  registerDevice = async (req: Request, res: Response): Promise<void> => {
    const device = await notificationService.registerDevice(
      req.tenant!.db,
      req.tenant!.societyId,
      req.auth!.userId,
      req.body.token,
      req.body.platform,
    );
    res.status(201).json(ok(device));
  };

  removeDevice = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await notificationService.removeDevice(req.tenant!.db, req.auth!.userId, req.body.token)));
  };
}

export const notificationController = new NotificationController();
