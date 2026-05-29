import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { dashboardController } from './dashboard.controller';

const router = Router();
router.use(authenticate, withTenant);

// Society-wide KPIs / analytics — managers only.
router.get(
  '/summary',
  requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER'),
  asyncHandler(dashboardController.summary),
);

export const dashboardRoutes = router;
