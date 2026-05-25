import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

/**
 * Self-registration creates a brand-new society together with its first
 * SOCIETY_ADMIN user. Resident/guard/vendor accounts are provisioned later by
 * an admin (separate endpoint, not part of public signup).
 */
export const registerSchema = z.object({
  body: z.object({
    society: z.object({
      name: z.string().min(2).max(120),
      slug: z
        .string()
        .min(3)
        .max(40)
        .regex(/^[a-z0-9-]+$/, 'Slug may contain lowercase letters, numbers, and hyphens'),
      addressLine1: z.string().min(1),
      addressLine2: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().default('India'),
    }),
    admin: z.object({
      fullName: z.string().min(2).max(120),
      email: z.string().email().toLowerCase(),
      phone: z.string().min(7).max(20).optional(),
      password,
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    // Which society to authenticate against. Omit for platform SUPER_ADMIN.
    societySlug: z.string().min(3).max(40).optional(),
    email: z.string().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

/** Refresh uses the httpOnly cookie; body is optional fallback for mobile. */
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
