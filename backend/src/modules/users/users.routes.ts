import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { authRateLimiter } from '@/middleware/rateLimit.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { userController } from './users.controller';
import {
  inviteUserSchema,
  createUserSchema,
  updateUserSchema,
  setRolesSchema,
  userIdSchema,
  listUsersSchema,
  acceptInviteSchema,
} from './users.schema';

const router = Router();

// ── Public: accept an invitation (no auth, no tenant) — before auth guard. ──
router.post('/accept-invite', authRateLimiter, validate(acceptInviteSchema), asyncHandler(userController.acceptInvite));

// Everything below requires an authenticated session.
router.use(authenticate, withTenant);

// User administration is restricted to society admins.
const canAdminister = requireRole('SOCIETY_ADMIN');

router.get('/', canAdminister, validate(listUsersSchema), asyncHandler(userController.list));
router.get('/:id', canAdminister, validate(userIdSchema), asyncHandler(userController.getById));
router.post('/invite', canAdminister, validate(inviteUserSchema), asyncHandler(userController.invite));
router.post('/', canAdminister, validate(createUserSchema), asyncHandler(userController.create));
router.post('/:id/resend-invite', canAdminister, validate(userIdSchema), asyncHandler(userController.resendInvite));
router.patch('/:id', canAdminister, validate(updateUserSchema), asyncHandler(userController.update));
router.put('/:id/roles', canAdminister, validate(setRolesSchema), asyncHandler(userController.setRoles));

export const userRoutes = router;
