import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { amenityController } from './amenities.controller';
import {
  createAmenitySchema,
  updateAmenitySchema,
  amenityIdSchema,
  listAmenitiesSchema,
  createBookingSchema,
  bookingIdSchema,
  listBookingsSchema,
} from './amenities.schema';

const router = Router();
router.use(authenticate, withTenant);

const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// ── Bookings (any authenticated resident) — declared before /:id routes. ──
router.get('/bookings', validate(listBookingsSchema), asyncHandler(amenityController.listBookings));
router.post('/bookings', validate(createBookingSchema), asyncHandler(amenityController.book));
router.post('/bookings/:id/cancel', validate(bookingIdSchema), asyncHandler(amenityController.cancelBooking));

// ── Amenities ─────────────────────────────────────────────────────────────
router.get('/', validate(listAmenitiesSchema), asyncHandler(amenityController.list));
router.get('/:id', validate(amenityIdSchema), asyncHandler(amenityController.getById));
router.post('/', canManage, validate(createAmenitySchema), asyncHandler(amenityController.create));
router.patch('/:id', canManage, validate(updateAmenitySchema), asyncHandler(amenityController.update));
router.delete('/:id', canManage, validate(amenityIdSchema), asyncHandler(amenityController.remove));

export const amenityRoutes = router;
