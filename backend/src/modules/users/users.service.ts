import { Prisma, type ResidencyRole, type SystemRole, type UserStatus } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withBypass, withSociety } from '@/core/tenant/rls';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@/core/errors/AppError';
import { hashPassword } from '@/utils/password';
import { generateOpaqueToken, sha256 } from '@/utils/otp';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { emailProvider } from '@/integrations/notifications/email.provider';

type Tx = Prisma.TransactionClient;

const INVITE_TTL_MS = 7 * 86_400_000;

interface ResidencyAssignment {
  unitId: string;
  role: ResidencyRole;
  isPrimary: boolean;
}

interface InviteInput {
  email: string;
  fullName: string;
  phone?: string;
  roles: SystemRole[];
  residency?: ResidencyAssignment;
}

interface CreateInput extends Omit<InviteInput, never> {
  temporaryPassword: string;
}

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  status: true,
  emailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  roles: { select: { role: true } },
} satisfies Prisma.UserSelect;

function shapeUser<T extends { roles: { role: SystemRole }[] }>(u: T) {
  return { ...u, roles: u.roles.map((r) => r.role) };
}

class UserService {
  // ── Provisioning ────────────────────────────────────────────────────────

  /** Invite a user: PENDING account + roles + optional residency + token. */
  async invite(societyId: string, invitedById: string, input: InviteInput) {
    const placeholderHash = await hashPassword(generateOpaqueToken(32));
    const rawToken = generateOpaqueToken(32);

    const { user, societyName } = await withSociety(societyId, async (tx) => {
      const created = await tx.user.create({
        data: {
          societyId,
          email: input.email,
          fullName: input.fullName,
          phone: input.phone,
          passwordHash: placeholderHash,
          status: 'PENDING',
          emailVerified: false,
          roles: { create: input.roles.map((role) => ({ role })) },
        },
        select: userSelect,
      });

      if (input.residency) await this.attachResidency(tx, societyId, created.id, input.residency);

      await tx.userInvitation.create({
        data: {
          societyId,
          userId: created.id,
          email: input.email,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedById,
        },
      });

      const society = await tx.society.findUnique({ where: { id: societyId }, select: { name: true } });
      return { user: created, societyName: society?.name ?? 'your community' };
    });

    // Email the activation link to the invitee (after commit). A send failure
    // never fails the invite — the link is also returned for manual sharing.
    const acceptUrl = `${env.WEB_APP_URL}/accept-invite?token=${rawToken}`;
    const emailed = await this.sendInviteEmail(input.email, input.fullName, societyName, acceptUrl);

    return {
      user: shapeUser(user),
      inviteToken: rawToken,
      acceptUrl,
      emailed,
      expiresInMs: INVITE_TTL_MS,
    };
  }

  /** Create an already-active user with a temporary password (no email flow). */
  async createDirect(societyId: string, input: CreateInput) {
    const passwordHash = await hashPassword(input.temporaryPassword);

    const user = await withSociety(societyId, async (tx) => {
      const created = await tx.user.create({
        data: {
          societyId,
          email: input.email,
          fullName: input.fullName,
          phone: input.phone,
          passwordHash,
          status: 'ACTIVE',
          emailVerified: true,
          roles: { create: input.roles.map((role) => ({ role })) },
        },
        select: userSelect,
      });

      if (input.residency) await this.attachResidency(tx, societyId, created.id, input.residency);
      return created;
    });

    return shapeUser(user);
  }

  /** Generate a fresh invitation token for a still-PENDING user. */
  async resendInvite(societyId: string, invitedById: string, userId: string) {
    const rawToken = generateOpaqueToken(32);

    await withSociety(societyId, async (tx) => {
      const user = await tx.user.findFirst({ where: { id: userId, societyId }, select: { status: true } });
      if (!user) throw new NotFoundError('User not found');
      if (user.status !== 'PENDING') throw new ConflictError('User has already accepted their invite');

      const target = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
      await tx.userInvitation.create({
        data: {
          societyId,
          userId,
          email: target.email,
          tokenHash: sha256(rawToken),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedById,
        },
      });
    });

    return { inviteToken: rawToken, expiresInMs: INVITE_TTL_MS };
  }

  // ── Reads / management ──────────────────────────────────────────────────

  async list(db: TenantClient, params: {
    page?: number; pageSize?: number; role?: SystemRole; status?: UserStatus; search?: string;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.UserWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.role ? { roles: { some: { role: params.role } } } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' } },
              { email: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: page.skip, take: page.take, select: userSelect }),
      db.user.count({ where }),
    ]);
    return { items: items.map(shapeUser), meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const user = await db.user.findFirst({
      where: { id },
      select: {
        ...userSelect,
        residencies: {
          where: { movedOutAt: null },
          select: { id: true, role: true, isPrimary: true, unit: { select: { id: true, unitNumber: true } } },
        },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return shapeUser(user);
  }

  async update(db: TenantClient, id: string, data: {
    fullName?: string; phone?: string | null; avatarUrl?: string | null; status?: 'ACTIVE' | 'DISABLED';
  }) {
    await this.assertExists(db, id);
    const user = await db.user.update({ where: { id }, data, select: userSelect });
    return shapeUser(user);
  }

  /** Replace the user's role set atomically. */
  async setRoles(societyId: string, id: string, roles: SystemRole[]) {
    const user = await withSociety(societyId, async (tx) => {
      const exists = await tx.user.findFirst({ where: { id, societyId }, select: { id: true } });
      if (!exists) throw new NotFoundError('User not found');

      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: roles.map((role) => ({ userId: id, role })) });

      return tx.user.findUniqueOrThrow({ where: { id }, select: userSelect });
    });
    return shapeUser(user);
  }

  // ── Public: accept an invitation ──────────────────────────────────────────

  /**
   * Invitee activates their account by setting a password. Public endpoint —
   * the token is the only credential, so we look it up by hash with bypass.
   */
  async acceptInvite(rawToken: string, password: string) {
    const tokenHash = sha256(rawToken);
    const passwordHash = await hashPassword(password);

    return withBypass(async (tx) => {
      const invitation = await tx.userInvitation.findUnique({
        where: { tokenHash },
        include: { user: { select: { id: true, status: true } }, society: { select: { slug: true } } },
      });

      if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired invitation');
      }

      await tx.user.update({
        where: { id: invitation.userId },
        data: { passwordHash, status: 'ACTIVE', emailVerified: true },
      });
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });

      return { email: invitation.email, societySlug: invitation.society.slug };
    });
  }

  // ── internal ──────────────────────────────────────────────────────────────

  /** Send the activation email. Returns whether it was dispatched. */
  private async sendInviteEmail(to: string, name: string, societyName: string, acceptUrl: string): Promise<boolean> {
    if (!emailProvider.enabled) return false;
    const title = `You're invited to ${societyName} on Societify`;
    const body =
      `Hi ${name},\n\nYou've been invited to join ${societyName} on Societify. ` +
      `Activate your account by setting a password here:\n${acceptUrl}\n\n` +
      `This link expires in 7 days.`;
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1f43f5">You're invited to ${societyName}</h2>
        <p>Hi ${name}, you've been invited to join <b>${societyName}</b> on Societify.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;background:#1f43f5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Activate your account</a></p>
        <p style="color:#64748b;font-size:13px">Or paste this link: <br>${acceptUrl}<br>This link expires in 7 days.</p>
      </div>`;
    try {
      await emailProvider.send({ to, title, body, html });
      return true;
    } catch (err) {
      logger.warn({ err, to }, 'Invite email failed to send');
      return false;
    }
  }

  private async assertExists(db: TenantClient, id: string): Promise<void> {
    const user = await db.user.findFirst({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundError('User not found');
  }

  private async attachResidency(tx: Tx, societyId: string, userId: string, r: ResidencyAssignment): Promise<void> {
    const unit = await tx.unit.findFirst({ where: { id: r.unitId, societyId }, select: { id: true } });
    if (!unit) throw new BadRequestError('residency.unitId does not reference a unit in this society');

    if (r.isPrimary) {
      await tx.residency.updateMany({
        where: { unitId: r.unitId, isPrimary: true, movedOutAt: null },
        data: { isPrimary: false },
      });
    }

    await tx.residency.create({
      data: { societyId, unitId: r.unitId, userId, role: r.role, isPrimary: r.isPrimary },
    });

    // Derive occupancy from the unit's active residencies.
    const active = await tx.residency.findMany({ where: { unitId: r.unitId, movedOutAt: null }, select: { role: true } });
    const status = active.some((a) => a.role === 'OWNER') ? 'OWNER_OCCUPIED' : 'RENTED';
    await tx.unit.update({ where: { id: r.unitId }, data: { occupancyStatus: status } });
  }
}

export const userService = new UserService();
