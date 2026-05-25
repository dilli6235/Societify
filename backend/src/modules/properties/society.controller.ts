import type { Request, Response } from 'express';
import { societyService } from './society.service';
import { ok } from '@/core/http/ApiResponse';

class SocietyController {
  getProfile = async (req: Request, res: Response): Promise<void> => {
    const society = await societyService.getProfile(req.tenant!.db, req.tenant!.societyId);
    res.json(ok(society));
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const society = await societyService.updateProfile(
      req.tenant!.db,
      req.tenant!.societyId,
      req.body,
    );
    res.json(ok(society));
  };
}

export const societyController = new SocietyController();
