import { z } from 'zod';

const residencyRole = z.enum(['OWNER', 'TENANT', 'FAMILY_MEMBER']);

// Rental details (mainly for TENANT residencies).
const rental = {
  rentAmount: z.coerce.number().min(0).max(100_000_000).nullable().optional(),
  depositAmount: z.coerce.number().min(0).max(100_000_000).nullable().optional(),
  leaseStartDate: z.coerce.date().nullable().optional(),
  leaseEndDate: z.coerce.date().nullable().optional(),
};

/**
 * Assign an existing user to a unit. Creating the user account itself
 * (resident invitations) belongs to the users module — this only links a
 * known user to a unit with a role + tenure.
 */
export const createResidencySchema = z.object({
  body: z.object({
    unitId: z.string().uuid(),
    userId: z.string().uuid(),
    role: residencyRole,
    isPrimary: z.boolean().default(false),
    movedInAt: z.coerce.date().optional(),
    ...rental,
  }),
});

/** End a residency (move-out) or correct its details. */
export const updateResidencySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    role: residencyRole.optional(),
    isPrimary: z.boolean().optional(),
    movedInAt: z.coerce.date().optional(),
    movedOutAt: z.coerce.date().nullable().optional(),
    ...rental,
  }),
});

export const residencyIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listResidenciesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    unitId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    activeOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
  }),
});
