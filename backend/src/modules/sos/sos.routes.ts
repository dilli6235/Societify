import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { sosController } from './sos.controller';
import { raiseSosSchema, sosIdSchema, listSosSchema } from './sos.schema';

const router = Router();
router.use(authenticate, withTenant);
const responders = requireRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// Any authenticated resident can raise + see alerts.
router.post('/', validate(raiseSosSchema), asyncHandler(sosController.raise));
router.get('/', validate(listSosSchema), asyncHandler(sosController.list));
// Responders acknowledge / resolve.
router.post('/:id/acknowledge', responders, validate(sosIdSchema), asyncHandler(sosController.acknowledge));
router.post('/:id/resolve', responders, validate(sosIdSchema), asyncHandler(sosController.resolve));

export const sosRoutes = router;
