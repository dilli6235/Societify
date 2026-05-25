import { z } from 'zod';

export const createPollSchema = z.object({
  body: z.object({
    question: z.string().min(3).max(300),
    description: z.string().max(2000).optional(),
    isMultiple: z.boolean().default(false),
    closesAt: z.coerce.date().nullable().optional(),
    options: z.array(z.string().min(1).max(200)).min(2, 'A poll needs at least two options').max(20),
  }),
});

export const pollIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const voteSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    optionIds: z.array(z.string().uuid()).min(1).max(20),
  }),
});

export const listPollsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    openOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});
