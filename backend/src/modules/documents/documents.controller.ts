import type { Request, Response } from 'express';
import { documentService } from './documents.service';
import { ok } from '@/core/http/ApiResponse';

function actor(req: Request) {
  return { userId: req.auth!.userId, roles: req.auth!.roles };
}

class DocumentController {
  list = async (req: Request, res: Response): Promise<void> => {
    const { items, meta } = await documentService.list(req.tenant!.db, actor(req), req.query as never);
    res.json(ok(items, meta));
  };
  getById = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await documentService.getById(req.tenant!.db, actor(req), req.params.id)));
  };
  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(ok(await documentService.create(req.tenant!.db, req.tenant!.societyId, req.auth!.userId, req.body)));
  };
  update = async (req: Request, res: Response): Promise<void> => {
    res.json(ok(await documentService.update(req.tenant!.db, req.params.id, req.body)));
  };
  remove = async (req: Request, res: Response): Promise<void> => {
    await documentService.remove(req.tenant!.db, req.params.id);
    res.json(ok({ deleted: true }));
  };
}

export const documentController = new DocumentController();
