import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { platformController } from './platform.controller';
import {
  listSocietiesSchema,
  societyIdSchema,
  updateSocietySchema,
  createPlanSchema,
  updatePlanSchema,
  planIdSchema,
} from './platform.schema';

const router = Router();

// Platform routes are SUPER_ADMIN only and NOT tenant-scoped (no withTenant).
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.get('/stats', asyncHandler(platformController.stats));

router.get('/societies', validate(listSocietiesSchema), asyncHandler(platformController.listSocieties));
router.get('/societies/:id', validate(societyIdSchema), asyncHandler(platformController.getSociety));
router.patch('/societies/:id', validate(updateSocietySchema), asyncHandler(platformController.updateSociety));

router.get('/plans', asyncHandler(platformController.listPlans));
router.post('/plans', validate(createPlanSchema), asyncHandler(platformController.createPlan));
router.patch('/plans/:id', validate(updatePlanSchema), asyncHandler(platformController.updatePlan));
router.delete('/plans/:id', validate(planIdSchema), asyncHandler(platformController.deletePlan));

export const platformRoutes = router;
