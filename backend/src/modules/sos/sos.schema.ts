import { z } from 'zod';

export const raiseSosSchema = z.object({
  body: z.object({
    type: z.enum(['MEDICAL', 'FIRE', 'SECURITY', 'OTHER']).default('OTHER'),
    message: z.string().max(500).optional(),
    location: z.string().max(160).optional(),
  }),
});

export const sosIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listSosSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']).optional(),
  }),
});
