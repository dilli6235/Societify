import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { pollController } from './polls.controller';
import { createPollSchema, pollIdSchema, voteSchema, listPollsSchema } from './polls.schema';

const router = Router();
router.use(authenticate, withTenant);

const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');

router.get('/', validate(listPollsSchema), asyncHandler(pollController.list));
router.get('/:id', validate(pollIdSchema), asyncHandler(pollController.getById));
router.post('/:id/vote', validate(voteSchema), asyncHandler(pollController.vote));

router.post('/', canManage, validate(createPollSchema), asyncHandler(pollController.create));
router.post('/:id/close', canManage, validate(pollIdSchema), asyncHandler(pollController.close));

export const pollRoutes = router;
