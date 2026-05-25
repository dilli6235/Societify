import type { Request, Response } from 'express';
import { amenityService } from './amenities.service';
import { ok } from '@/core/http/ApiResponse';

function actor(req: Request) {
  return { userId: req.auth!.userId, roles: req.auth!.roles };
}

class AmenityController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await amenityService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await amenityService.getById(req.tenant!.db, req.params.id)));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await amenityService.create(req.tenant!.db, req.body)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await amenityService.update(req.tenant!.db, req.params.id, req.body)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await amenityService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };

  // ── Bookings ──
  listBookings = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await amenityService.listBookings(req.tenant!.db, actor(req), req.query as never);
    res.json(ok(items, meta));
  };

  book = async (req: Request, res: Response): Promise<void> => {
    const booking = await amenityService.book(req.tenant!.societyId, actor(req), req.body);
    res.status(201).json(ok(booking));
  };

  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await amenityService.cancel(req.tenant!.db, actor(req), req.params.id)));
  };
}

export const amenityController = new AmenityController();
