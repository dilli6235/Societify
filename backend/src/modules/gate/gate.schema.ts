import { z } from 'zod';

const passType = z.enum(['VISITOR', 'DELIVERY', 'CAB', 'DAILY_HELP', 'VENDOR', 'GUEST']);

export const createPassSchema = z.object({
  body: z.object({
    type: passType,
    visitorName: z.string().min(1).max(120),
    visitorPhone: z.string().min(7).max(20).optional(),
    vehicleNumber: z.string().max(20).optional(),
    purpose: z.string().max(200).optional(),
    photoUrl: z.string().url().optional(),
    // The unit being visited. Required for guard-created walk-ins; for a
    // resident it defaults to / must match their own unit.
    unitId: z.string().uuid().optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    expectedCount: z.coerce.number().int().min(1).max(50).default(1),
  }),
});

/** Guard looks up a pass at the gate by its QR token or OTP. */
export const verifyPassSchema = z.object({
  body: z
    .object({
      qrToken: z.string().min(1).optional(),
      otp: z.string().min(4).max(8).optional(),
    })
    .refine((v) => Boolean(v.qrToken || v.otp), {
      message: 'Provide either qrToken or otp',
      path: ['qrToken'],
    }),
});

export const passIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const checkEventSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    gateName: z.string().max(60).optional(),
    notes: z.string().max(300).optional(),
  }),
});

export const denyPassSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ reason: z.string().max(300).optional() }),
});

export const listPassesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    status: z
      .enum(['PENDING_APPROVAL', 'APPROVED', 'DENIED', 'EXPIRED', 'CHECKED_IN', 'CHECKED_OUT'])
      .optional(),
    type: passType.optional(),
    unitId: z.string().uuid().optional(),
  }),
});

export const listLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    gatePassId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
