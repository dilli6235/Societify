import { z } from 'zod';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM (24h)');

export const createAmenitySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(1000).optional(),
    capacity: z.coerce.number().int().positive().max(100000).optional(),
    bookingFee: z.coerce.number().min(0).max(10_000_000).default(0),
    openTime: hhmm.optional(),
    closeTime: hhmm.optional(),
    slotDurationMin: z.coerce.number().int().min(15).max(1440).default(60),
  }),
});

export const updateAmenitySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(1000).nullable().optional(),
    capacity: z.coerce.number().int().positive().max(100000).nullable().optional(),
    bookingFee: z.coerce.number().min(0).max(10_000_000).optional(),
    openTime: hhmm.nullable().optional(),
    closeTime: hhmm.nullable().optional(),
    slotDurationMin: z.coerce.number().int().min(15).max(1440).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const amenityIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listAmenitiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    activeOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});

// ── Bookings ────────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  body: z
    .object({
      amenityId: z.string().uuid(),
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
      notes: z.string().max(300).optional(),
    })
    .refine((v) => v.endTime > v.startTime, {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    })
    .refine((v) => v.startTime > new Date(Date.now() - 60_000), {
      message: 'Cannot book a slot in the past',
      path: ['startTime'],
    }),
});

export const bookingIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listBookingsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    amenityId: z.string().uuid().optional(),
    status: z.enum(['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    mine: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
