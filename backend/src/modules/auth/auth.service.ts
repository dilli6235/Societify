import { Prisma, type SystemRole } from '@prisma/client';
import { withBypass } from '@/core/tenant/rls';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '@/core/errors/AppError';
import { hashPassword, verifyPassword } from '@/utils/password';
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  parseDurationMs,
} from '@/utils/jwt';
import { env } from '@/config/env';
import type { LoginInput, RegisterInput } from './auth.schema';

type Tx = Prisma.TransactionClient;

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthResult {
  user: {
    id: string;
    fullName: string;
    email: string;
    societyId: string | null;
    roles: SystemRole[];
  };
  accessToken: string;
  refreshToken: string; // raw — set as httpOnly cookie by the controller
  refreshExpiresAt: Date;
}

const REFRESH_TTL_MS = parseDurationMs(env.JWT_REFRESH_TTL);

class AuthService {
  /**
   * Public signup: provision a new society and its first SOCIETY_ADMIN.
   * Runs with RLS bypass because we are bootstrapping a tenant that does not
   * yet exist — there is no prior tenant context to scope to.
   */
  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const email = input.admin.email.toLowerCase();

    return withBypass(async (tx) => {
      const slugTaken = await tx.society.findUnique({ where: { slug: input.society.slug } });
      if (slugTaken) throw new ConflictError('That society URL (slug) is already taken');

      const society = await tx.society.create({
        data: {
          name: input.society.name,
          slug: input.society.slug,
          addressLine1: input.society.addressLine1,
          addressLine2: input.society.addressLine2,
          city: input.society.city,
          state: input.society.state,
          postalCode: input.society.postalCode,
          country: input.society.country,
          subscriptionStatus: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
        },
      });

      const passwordHash = await hashPassword(input.admin.password);

      const user = await tx.user.create({
        data: {
          societyId: society.id,
          email,
          phone: input.admin.phone,
          fullName: input.admin.fullName,
          passwordHash,
          emailVerified: false,
          roles: { create: [{ role: 'SOCIETY_ADMIN' }] },
        },
        include: { roles: true },
      });

      const roles = user.roles.map((r) => r.role);
      return this.issueSession(tx, { id: user.id, societyId: society.id, fullName: user.fullName, email: user.email }, roles, meta);
    });
  }

  /**
   * Authenticate against a specific society (by slug) or, when no slug is
   * given, against the platform (SUPER_ADMIN with a null society).
   */
  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const email = input.email.toLowerCase();

    // `societies` and the cross-cutting lookups here run with bypass because
    // we are resolving identity *before* a trusted tenant scope exists. The
    // password check is the actual authentication gate.
    return withBypass(async (tx) => {
      let societyId: string | null = null;

      if (input.societySlug) {
        const society = await tx.society.findUnique({
          where: { slug: input.societySlug },
          select: { id: true },
        });
        if (!society) throw new UnauthorizedError('Invalid credentials');
        societyId = society.id;
      }

      const user = await tx.user.findFirst({
        where: { email, societyId },
        include: { roles: true },
      });

      // Constant-ish response: same error whether user missing or wrong pass.
      if (!user || user.status !== 'ACTIVE') throw new UnauthorizedError('Invalid credentials');

      const valid = await verifyPassword(user.passwordHash, input.password);
      if (!valid) throw new UnauthorizedError('Invalid credentials');

      const roles = user.roles.map((r) => r.role);

      // Platform login (no slug) must be an actual SUPER_ADMIN.
      if (!input.societySlug && !roles.includes('SUPER_ADMIN')) {
        throw new UnauthorizedError('Invalid credentials');
      }

      await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

      return this.issueSession(
        tx,
        { id: user.id, societyId: user.societyId, fullName: user.fullName, email: user.email },
        roles,
        meta,
      );
    });
  }

  /**
   * Rotate a refresh token: validate the presented opaque token, revoke it,
   * and issue a fresh pair. Reuse of an already-rotated token is rejected.
   */
  async refresh(rawToken: string, meta: RequestMeta): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedError('Missing refresh token');
    const tokenHash = hashRefreshToken(rawToken);

    return withBypass(async (tx) => {
      const existing = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: { include: { roles: true } } },
      });

      if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired session');
      }
      if (existing.user.status !== 'ACTIVE') throw new ForbiddenError('Account is not active');

      // Revoke the presented token (rotation).
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });

      const roles = existing.user.roles.map((r) => r.role);
      const result = await this.issueSession(
        tx,
        {
          id: existing.user.id,
          societyId: existing.user.societyId,
          fullName: existing.user.fullName,
          email: existing.user.email,
        },
        roles,
        meta,
      );

      // Link the chain for audit/anomaly detection.
      await tx.refreshToken.update({
        where: { id: existing.id },
        data: { replacedBy: hashRefreshToken(result.refreshToken) },
      });

      return result;
    });
  }

  /** Revoke a single refresh token (logout of one session). */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashRefreshToken(rawToken);
    await withBypass(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /** Current user profile + roles for the authenticated session. */
  async me(userId: string) {
    // Self-lookup by unique id; bypass RLS since super admins have no tenant
    // scope and the id alone uniquely (and safely) identifies the caller.
    const user = await withBypass((tx) =>
      tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        societyId: true,
        emailVerified: true,
        lastLoginAt: true,
        roles: { select: { role: true } },
        society: { select: { id: true, name: true, slug: true } },
      },
      }),
    );
    if (!user) throw new UnauthorizedError();
    return { ...user, roles: user.roles.map((r) => r.role) };
  }

  // ── internal ──────────────────────────────────────────────────────────

  private async issueSession(
    tx: Tx,
    user: { id: string; societyId: string | null; fullName: string; email: string },
    roles: SystemRole[],
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const accessToken = signAccessToken({ sub: user.id, societyId: user.societyId, roles });

    const { raw, hash } = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: refreshExpiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      user: { id: user.id, fullName: user.fullName, email: user.email, societyId: user.societyId, roles },
      accessToken,
      refreshToken: raw,
      refreshExpiresAt,
    };
  }
}

export const authService = new AuthService();
