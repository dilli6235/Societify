import type { Request, Response } from 'express';
import { complaintService } from './complaints.service';
import { ok } from '@/core/http/ApiResponse';

function actor(req: Request) {
  return { userId: req.auth!.userId, roles: req.auth!.roles };
}

class ComplaintController {
  create = async (req: Request, res: Response): Promise<void> => {
    const complaint = await complaintService.create(req.tenant!.societyId, req.auth!.userId, req.body);
    res.status(201).json(ok(complaint));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await complaintService.list(req.tenant!.db, actor(req), req.query as never);
    res.json(ok(items, meta));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await complaintService.getById(req.tenant!.db, actor(req), req.params.id)));
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await complaintService.assign(req.tenant!.db, req.params.id, req.body.assigneeId)));
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const complaint = await complaintService.updateStatus(
      req.tenant!.societyId,
      req.auth!.userId,
      req.params.id,
      req.body.status,
      req.body.comment,
    );
    res.json(ok(complaint));
  };

  addComment = async (req: Request, res: Response): Promise<void> => {
    const comment = await complaintService.addComment(
      req.tenant!.db,
      actor(req),
      req.params.id,
      req.body.body,
      req.body.isInternal,
    );
    res.status(201).json(ok(comment));
  };
}

export const complaintController = new ComplaintController();
