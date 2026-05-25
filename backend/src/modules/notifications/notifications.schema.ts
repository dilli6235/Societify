import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    unreadOnly: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const registerDeviceSchema = z.object({
  body: z.object({
    token: z.string().min(10).max(4096),
    platform: z.enum(['ios', 'android', 'web']),
  }),
});

export const deviceTokenSchema = z.object({
  body: z.object({ token: z.string().min(10).max(4096) }),
});
