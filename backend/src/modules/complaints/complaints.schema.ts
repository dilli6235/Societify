import { z } from 'zod';

const priority = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const status = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']);

export const createComplaintSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(160),
    description: z.string().min(1).max(5000),
    category: z.string().min(1).max(60),
    priority: priority.default('MEDIUM'),
    attachments: z.array(z.string().url()).max(10).default([]),
  }),
});

export const complaintIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const assignSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ assigneeId: z.string().uuid().nullable() }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED']),
    comment: z.string().max(2000).optional(),
  }),
});

export const addCommentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    body: z.string().min(1).max(2000),
    isInternal: z.boolean().default(false),
  }),
});

export const listComplaintsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    status: status.optional(),
    priority: priority.optional(),
    category: z.string().max(60).optional(),
    assignedToId: z.string().uuid().optional(),
    mine: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});
