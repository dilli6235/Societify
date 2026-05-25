import { z } from 'zod';

export const createBlockSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(60),
    totalFloors: z.coerce.number().int().min(0).max(300).optional(),
  }),
});

export const updateBlockSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().min(1).max(60).optional(),
    totalFloors: z.coerce.number().int().min(0).max(300).nullable().optional(),
  }),
});

export const blockIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listBlocksSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().trim().max(60).optional(),
  }),
});
