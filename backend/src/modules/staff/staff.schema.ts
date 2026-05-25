import { z } from 'zod';

const staffRole = z.enum(['MAID', 'COOK', 'DRIVER', 'GARDENER', 'SECURITY', 'ELECTRICIAN', 'PLUMBER', 'OTHER']);

export const createStaffSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(120),
    phone: z.string().min(7).max(20).optional(),
    role: staffRole.default('OTHER'),
    photoUrl: z.string().url().optional(),
    idProofUrl: z.string().url().optional(),
  }),
});

export const updateStaffSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(7).max(20).nullable().optional(),
    role: staffRole.optional(),
    photoUrl: z.string().url().nullable().optional(),
    idProofUrl: z.string().url().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const staffIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listStaffSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    role: staffRole.optional(),
    search: z.string().trim().max(120).optional(),
  }),
});

/** Guard logs a staff member in/out at the gate (by their code or id). */
export const markAttendanceSchema = z.object({
  body: z
    .object({
      staffId: z.string().uuid().optional(),
      code: z.string().min(3).max(40).optional(),
      direction: z.enum(['IN', 'OUT']),
      gateName: z.string().max(60).optional(),
    })
    .refine((v) => Boolean(v.staffId || v.code), { message: 'Provide staffId or code', path: ['staffId'] }),
});

export const listAttendanceSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    staffId: z.string().uuid().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});
