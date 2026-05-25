import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { notificationController } from './notifications.controller';
import {
  listNotificationsSchema,
  notificationIdSchema,
  registerDeviceSchema,
  deviceTokenSchema,
} from './notifications.schema';

const router = Router();
router.use(authenticate, withTenant);

// All routes are inherently self-scoped (the calling user's own data).
router.get('/', validate(listNotificationsSchema), asyncHandler(notificationController.list));
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.post('/:id/read', validate(notificationIdSchema), asyncHandler(notificationController.markRead));

// Device tokens for push.
router.post('/devices', validate(registerDeviceSchema), asyncHandler(notificationController.registerDevice));
router.delete('/devices', validate(deviceTokenSchema), asyncHandler(notificationController.removeDevice));

export const notificationRoutes = router;
