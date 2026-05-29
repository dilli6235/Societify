import type { Request, Response } from 'express';
import { dashboardService } from './dashboard.service';
import { ok } from '@/core/http/ApiResponse';

class DashboardController {
  summary = async (req: Request, res: Response): Promise<void> => {
    const data = await dashboardService.adminSummary(req.tenant!.db, req.tenant!.societyId);
    res.json(ok(data));
  };
}

export const dashboardController = new DashboardController();
