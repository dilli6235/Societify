import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { vehicleController } from './vehicles.controller';
import { createVehicleSchema, updateVehicleSchema, vehicleIdSchema, listVehiclesSchema } from './vehicles.schema';

const router = Router();
router.use(authenticate, withTenant);
const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN', 'SECURITY_GUARD');

router.get('/', validate(listVehiclesSchema), asyncHandler(vehicleController.list));
router.get('/:id', validate(vehicleIdSchema), asyncHandler(vehicleController.getById));
router.post('/', canManage, validate(createVehicleSchema), asyncHandler(vehicleController.create));
router.patch('/:id', canManage, validate(updateVehicleSchema), asyncHandler(vehicleController.update));
router.delete('/:id', canManage, validate(vehicleIdSchema), asyncHandler(vehicleController.remove));

export const vehicleRoutes = router;
