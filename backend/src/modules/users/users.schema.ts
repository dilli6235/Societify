import { z } from 'zod';

/**
 * Roles an admin is allowed to assign within their society. SUPER_ADMIN is
 * deliberately excluded — it is a platform role, never grantable by a tenant.
 */
const assignableRole = z.enum([
  'SOCIETY_ADMIN',
  'COMMITTEE_MEMBER',
  'RESIDENT',
  'SECURITY_GUARD',
  'FACILITY_ADMIN',
  'VENDOR',
]);

const residencyRole = z.enum(['OWNER', 'TENANT', 'FAMILY_MEMBER']);

// Optionally attach the new user to a unit in the same request.
const residencyAssignment = z.object({
  unitId: z.string().uuid(),
  role: residencyRole,
  isPrimary: z.boolean().default(false),
});

/** Invite a user: creates a PENDING account + an invitation token. */
export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    fullName: z.string().min(2).max(120),
    phone: z.string().min(7).max(20).optional(),
    roles: z.array(assignableRole).min(1),
    residency: residencyAssignment.optional(),
  }),
});

/** Directly create an ACTIVE user with a temporary password (no email flow). */
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase(),
    fullName: z.string().min(2).max(120),
    phone: z.string().min(7).max(20).optional(),
    temporaryPassword: z.string().min(8).max(128),
    roles: z.array(assignableRole).min(1),
    residency: residencyAssignment.optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    fullName: z.string().min(2).max(120).optional(),
    phone: z.string().min(7).max(20).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    status: z.enum(['ACTIVE', 'DISABLED']).optional(),
  }),
});

/** Replace the full set of roles for a user. */
export const setRolesSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ roles: z.array(assignableRole).min(1) }),
});

export const userIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    role: assignableRole.optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'DISABLED']).optional(),
    search: z.string().trim().max(120).optional(),
  }),
});

/** Public: invitee sets their password to activate the account. */
export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8).max(128),
  }),
});
