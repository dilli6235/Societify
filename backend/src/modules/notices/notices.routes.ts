import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { noticeController } from './notices.controller';
import {
  createNoticeSchema,
  updateNoticeSchema,
  noticeIdSchema,
  listNoticesSchema,
} from './notices.schema';

const router = Router();
router.use(authenticate, withTenant);

const canPost = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');

router.get('/', validate(listNoticesSchema), asyncHandler(noticeController.list));
router.get('/:id', validate(noticeIdSchema), asyncHandler(noticeController.getById));
router.post('/', canPost, validate(createNoticeSchema), asyncHandler(noticeController.create));
router.patch('/:id', canPost, validate(updateNoticeSchema), asyncHandler(noticeController.update));
router.delete('/:id', canPost, validate(noticeIdSchema), asyncHandler(noticeController.remove));

export const noticeRoutes = router;
