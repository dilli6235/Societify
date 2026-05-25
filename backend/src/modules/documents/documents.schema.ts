import { z } from 'zod';

const visibility = z.enum(['ALL_RESIDENTS', 'COMMITTEE', 'ADMIN_ONLY']);

export const createDocumentSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(160),
    category: z.string().min(1).max(60),
    description: z.string().max(2000).optional(),
    fileUrl: z.string().url(),
    visibility: visibility.default('ALL_RESIDENTS'),
  }),
});

export const updateDocumentSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().min(1).max(160).optional(),
    category: z.string().min(1).max(60).optional(),
    description: z.string().max(2000).nullable().optional(),
    fileUrl: z.string().url().optional(),
    visibility: visibility.optional(),
  }),
});

export const documentIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listDocumentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    category: z.string().max(60).optional(),
  }),
});
