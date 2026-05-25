import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { complaintController } from './complaints.controller';
import {
  createComplaintSchema,
  complaintIdSchema,
  assignSchema,
  updateStatusSchema,
  addCommentSchema,
  listComplaintsSchema,
} from './complaints.schema';

const router = Router();
router.use(authenticate, withTenant);

const staff = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// Any authenticated user (resident) can raise + view their own; service scopes
// visibility and comment internals by role.
router.get('/', validate(listComplaintsSchema), asyncHandler(complaintController.list));
router.get('/:id', validate(complaintIdSchema), asyncHandler(complaintController.getById));
router.post('/', validate(createComplaintSchema), asyncHandler(complaintController.create));
router.post('/:id/comments', validate(addCommentSchema), asyncHandler(complaintController.addComment));

// Staff-only ticket operations.
router.patch('/:id/assign', staff, validate(assignSchema), asyncHandler(complaintController.assign));
router.patch('/:id/status', staff, validate(updateStatusSchema), asyncHandler(complaintController.updateStatus));

export const complaintRoutes = router;
