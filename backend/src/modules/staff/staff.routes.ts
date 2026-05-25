import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { staffController } from './staff.controller';
import {
  createStaffSchema,
  updateStaffSchema,
  staffIdSchema,
  listStaffSchema,
  markAttendanceSchema,
  listAttendanceSchema,
} from './staff.schema';

const router = Router();
router.use(authenticate, withTenant);
const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
const gateOps = requireRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// Attendance (guards) — declared before /:id.
router.get('/attendance', gateOps, validate(listAttendanceSchema), asyncHandler(staffController.listAttendance));
router.post('/attendance', gateOps, validate(markAttendanceSchema), asyncHandler(staffController.markAttendance));

router.get('/', validate(listStaffSchema), asyncHandler(staffController.list));
router.get('/:id', validate(staffIdSchema), asyncHandler(staffController.getById));
router.post('/', canManage, validate(createStaffSchema), asyncHandler(staffController.create));
router.patch('/:id', canManage, validate(updateStaffSchema), asyncHandler(staffController.update));
router.delete('/:id', canManage, validate(staffIdSchema), asyncHandler(staffController.remove));

export const staffRoutes = router;
