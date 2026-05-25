import { z } from 'zod';

/**
 * A society can edit its OWN profile only. There is no create/delete here —
 * societies are provisioned at signup (auth.register) and removed by platform
 * SUPER_ADMIN tooling.
 */
export const updateSocietySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    registrationNumber: z.string().max(80).nullable().optional(),
    addressLine1: z.string().min(1).optional(),
    addressLine2: z.string().nullable().optional(),
    city: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    postalCode: z.string().min(1).optional(),
    timezone: z.string().min(1).optional(),
    currency: z.string().length(3).optional(),
    logoUrl: z.string().url().nullable().optional(),
  }),
});
