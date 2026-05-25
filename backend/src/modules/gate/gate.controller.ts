import type { Request, Response } from 'express';
import { gateService } from './gate.service';
import { ok } from '@/core/http/ApiResponse';

function actor(req: Request) {
  return { userId: req.auth!.userId, roles: req.auth!.roles };
}

class GateController {
  create = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.create(req.tenant!.db, req.tenant!.societyId, actor(req), req.body);
    res.status(201).json(ok(pass));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await gateService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.getById(req.tenant!.db, req.params.id);
    res.json(ok(pass));
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.approve(req.tenant!.db, actor(req), req.params.id);
    res.json(ok(pass));
  };

  deny = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.deny(req.tenant!.db, actor(req), req.params.id, req.body.reason);
    res.json(ok(pass));
  };

  verify = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.verify(req.tenant!.db, req.body);
    res.json(ok(pass));
  };

  checkIn = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.checkIn(req.tenant!.societyId, req.auth!.userId, req.params.id, req.body);
    res.json(ok(pass));
  };

  checkOut = async (req: Request, res: Response): Promise<void> => {
    const pass = await gateService.checkOut(req.tenant!.societyId, req.auth!.userId, req.params.id, req.body);
    res.json(ok(pass));
  };

  logs = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await gateService.listLogs(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };
}

export const gateController = new GateController();
