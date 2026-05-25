import { z } from 'zod';

const priority = z.enum(['INFO', 'IMPORTANT', 'EMERGENCY']);

export const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(160),
    body: z.string().min(1).max(10000),
    priority: priority.default('INFO'),
    attachments: z.array(z.string().url()).max(10).default([]),
    publishedAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    isPinned: z.boolean().default(false),
  }),
});

export const updateNoticeSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(3).max(160).optional(),
    body: z.string().min(1).max(10000).optional(),
    priority: priority.optional(),
    attachments: z.array(z.string().url()).max(10).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    isPinned: z.boolean().optional(),
  }),
});

export const noticeIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listNoticesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    priority: priority.optional(),
    // Hide expired + future-dated notices (the resident feed view).
    activeOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});
