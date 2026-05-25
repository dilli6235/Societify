import { z } from 'zod';

/** Platform (SUPER_ADMIN) operations — cross-tenant, not society-scoped. */

export const listSocietiesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(120).optional(),
    status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']).optional(),
  }),
});

export const societyIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const updateSocietySchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    subscriptionStatus: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED']).optional(),
    planId: z.string().uuid().nullable().optional(),
  }),
});

export const createPlanSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(60),
    priceMonthly: z.coerce.number().min(0),
    maxUnits: z.coerce.number().int().positive(),
    features: z.record(z.string(), z.unknown()).default({}),
    isActive: z.boolean().default(true),
  }),
});

export const updatePlanSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(60).optional(),
    priceMonthly: z.coerce.number().min(0).optional(),
    maxUnits: z.coerce.number().int().positive().optional(),
    features: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const planIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
