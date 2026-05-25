import type { Request, Response } from 'express';
import { userService } from './users.service';
import { ok } from '@/core/http/ApiResponse';

class UserController {
  invite = async (req: Request, res: Response): Promise<void> => {
    const result = await userService.invite(req.tenant!.societyId, req.auth!.userId, req.body);
    res.status(201).json(ok(result));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.createDirect(req.tenant!.societyId, req.body);
    res.status(201).json(ok(user));
  };

  resendInvite = async (req: Request, res: Response): Promise<void> => {
    const result = await userService.resendInvite(req.tenant!.societyId, req.auth!.userId, req.params.id);
    res.json(ok(result));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await userService.list(req.tenant!.db, req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.getById(req.tenant!.db, req.params.id);
    res.json(ok(user));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.update(req.tenant!.db, req.params.id, req.body);
    res.json(ok(user));
  };

  setRoles = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.setRoles(req.tenant!.societyId, req.params.id, req.body.roles);
    res.json(ok(user));
  };

  // Public — no auth, no tenant.
  acceptInvite = async (req: Request, res: Response): Promise<void> => {
    const result = await userService.acceptInvite(req.body.token, req.body.password);
    res.json(ok(result));
  };
}

export const userController = new UserController();
