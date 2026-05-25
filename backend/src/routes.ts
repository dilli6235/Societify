import { Router } from 'express';
import { authRoutes } from '@/modules/auth/auth.routes';
import { userRoutes } from '@/modules/users/users.routes';
import { propertyRoutes } from '@/modules/properties/properties.routes';
import { billingRoutes } from '@/modules/billing/billing.routes';
import { gateRoutes } from '@/modules/gate/gate.routes';
import { amenityRoutes } from '@/modules/amenities/amenities.routes';
import { complaintRoutes } from '@/modules/complaints/complaints.routes';
import { noticeRoutes } from '@/modules/notices/notices.routes';
import { pollRoutes } from '@/modules/polls/polls.routes';
import { notificationRoutes } from '@/modules/notifications/notifications.routes';
import { platformRoutes } from '@/modules/platform/platform.routes';
import { vehicleRoutes } from '@/modules/vehicles/vehicles.routes';
import { staffRoutes } from '@/modules/staff/staff.routes';
import { documentRoutes } from '@/modules/documents/documents.routes';
import { sosRoutes } from '@/modules/sos/sos.routes';

/**
 * API router. New modules mount here, e.g.:
 *   router.use('/gate', gateRoutes);
 *   router.use('/billing', billingRoutes);
 */
export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/properties', propertyRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/gate', gateRoutes);
apiRouter.use('/amenities', amenityRoutes);
apiRouter.use('/complaints', complaintRoutes);
apiRouter.use('/notices', noticeRoutes);
apiRouter.use('/polls', pollRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/platform', platformRoutes);
apiRouter.use('/vehicles', vehicleRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/sos', sosRoutes);
