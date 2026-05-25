import type { GatePassStatus, GatePassType, Prisma, SystemRole } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { generateOpaqueToken, generateOtp } from '@/utils/otp';
import { enqueueNotification } from '@/jobs/notificationQueue';

interface Actor {
  userId: string;
  roles: SystemRole[];
}

interface CreateInput {
  type: GatePassType;
  visitorName: string;
  visitorPhone?: string;
  vehicleNumber?: string;
  purpose?: string;
  photoUrl?: string;
  unitId?: string;
  validFrom?: Date;
  validUntil?: Date;
  expectedCount: number;
}

const passInclude = {
  unit: { select: { id: true, unitNumber: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.GatePassInclude;

function isAdmin(roles: SystemRole[]): boolean {
  return roles.some((r) => r === 'SOCIETY_ADMIN' || r === 'COMMITTEE_MEMBER' || r === 'FACILITY_ADMIN');
}

class GateService {
  // ── Creation ────────────────────────────────────────────────────────────

  /**
   * Create a gate pass. Who creates it determines the initial status:
   *   - resident / admin  → APPROVED   (the resident is authorizing entry)
   *   - security guard     → PENDING_APPROVAL (a walk-in the resident must OK)
   * Every pass gets a unique QR token + numeric OTP for gate verification.
   */
  async create(db: TenantClient, societyId: string, actor: Actor, input: CreateInput) {
    const { unitId, status } = await this.resolveCreation(db, actor, input.unitId);

    const pass = await db.gatePass.create({
      data: {
        societyId,
        type: input.type,
        status,
        visitorName: input.visitorName,
        visitorPhone: input.visitorPhone,
        vehicleNumber: input.vehicleNumber,
        purpose: input.purpose,
        photoUrl: input.photoUrl,
        unitId,
        createdById: actor.userId,
        qrToken: generateOpaqueToken(24),
        otpCode: generateOtp(6),
        validFrom: input.validFrom ?? new Date(),
        validUntil: input.validUntil,
        expectedCount: input.expectedCount,
      },
      include: passInclude,
    });

    // Walk-in awaiting approval → ping the unit's residents to approve/deny.
    if (pass.status === 'PENDING_APPROVAL' && unitId) {
      const residents = await db.residency.findMany({
        where: { unitId, movedOutAt: null },
        select: { userId: true },
      });
      await enqueueNotification({
        societyId: pass.societyId,
        event: 'GATE_PASS_PENDING',
        recipientUserIds: residents.map((r) => r.userId),
        data: { visitorName: pass.visitorName, unitNumber: pass.unit?.unitNumber ?? '' },
      });
    }
    return pass;
  }

  private async resolveCreation(
    db: TenantClient,
    actor: Actor,
    unitId: string | undefined,
  ): Promise<{ unitId: string | null; status: GatePassStatus }> {
    if (isAdmin(actor.roles)) {
      if (unitId) await this.assertUnitExists(db, unitId);
      return { unitId: unitId ?? null, status: 'APPROVED' };
    }

    if (actor.roles.includes('RESIDENT')) {
      const resolved = unitId ?? (await this.inferResidentUnit(db, actor.userId));
      await this.assertResidentOfUnit(db, actor.userId, resolved);
      return { unitId: resolved, status: 'APPROVED' };
    }

    if (actor.roles.includes('SECURITY_GUARD')) {
      if (!unitId) throw new BadRequestError('unitId is required for a guard-created pass');
      await this.assertUnitExists(db, unitId);
      return { unitId, status: 'PENDING_APPROVAL' };
    }

    throw new ForbiddenError('Your role cannot create gate passes');
  }

  // ── Reads ─────────────────────────────────────────────────────────────

  async list(db: TenantClient, params: {
    page?: number; pageSize?: number; status?: GatePassStatus; type?: GatePassType; unitId?: string;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.GatePassWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.unitId ? { unitId: params.unitId } : {}),
    };
    const [items, total] = await Promise.all([
      db.gatePass.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page.skip,
        take: page.take,
        include: passInclude,
      }),
      db.gatePass.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const pass = await db.gatePass.findFirst({
      where: { id },
      include: { ...passInclude, checkInLogs: { orderBy: { timestamp: 'asc' } } },
    });
    if (!pass) throw new NotFoundError('Gate pass not found');
    return pass;
  }

  // ── Approval flow (resident of the unit, or admin) ──────────────────────

  async approve(db: TenantClient, actor: Actor, id: string) {
    const pass = await this.getById(db, id);
    await this.assertCanApprove(db, actor, pass.unitId);
    if (pass.status !== 'PENDING_APPROVAL') {
      throw new ConflictError(`Only pending passes can be approved (current: ${pass.status})`);
    }
    const approved = await db.gatePass.update({ where: { id }, data: { status: 'APPROVED' }, include: passInclude });

    await enqueueNotification({
      societyId: approved.societyId,
      event: 'GATE_PASS_APPROVED',
      recipientUserIds: [approved.createdById],
      data: { visitorName: approved.visitorName },
    });
    return approved;
  }

  async deny(db: TenantClient, actor: Actor, id: string, reason?: string) {
    const pass = await this.getById(db, id);
    await this.assertCanApprove(db, actor, pass.unitId);
    if (pass.status !== 'PENDING_APPROVAL') {
      throw new ConflictError(`Only pending passes can be denied (current: ${pass.status})`);
    }
    return db.gatePass.update({
      where: { id },
      data: { status: 'DENIED', purpose: reason ? `[DENIED] ${reason}` : pass.purpose },
      include: passInclude,
    });
  }

  // ── Gate verification + check-in/out (guard / admin) ────────────────────

  /** Look up a pass by QR token or OTP and confirm it is currently usable. */
  async verify(db: TenantClient, input: { qrToken?: string; otp?: string }) {
    const pass = await db.gatePass.findFirst({
      where: input.qrToken ? { qrToken: input.qrToken } : { otpCode: input.otp },
      include: passInclude,
    });
    if (!pass) throw new NotFoundError('No matching gate pass');

    // Lazy expiry.
    if (pass.validUntil && pass.validUntil < new Date() &&
        pass.status !== 'CHECKED_OUT' && pass.status !== 'DENIED') {
      await db.gatePass.update({ where: { id: pass.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestError('Gate pass has expired');
    }
    if (pass.status === 'PENDING_APPROVAL') throw new BadRequestError('Gate pass awaiting resident approval');
    if (pass.status === 'DENIED') throw new BadRequestError('Gate pass was denied');
    if (pass.status === 'EXPIRED') throw new BadRequestError('Gate pass has expired');
    if (pass.status === 'CHECKED_OUT') throw new BadRequestError('Gate pass already checked out');

    return pass; // APPROVED or CHECKED_IN
  }

  async checkIn(
    societyId: string,
    guardId: string,
    id: string,
    meta: { gateName?: string; notes?: string },
  ) {
    return withSociety(societyId, async (tx) => {
      const pass = await tx.gatePass.findFirst({ where: { id, societyId } });
      if (!pass) throw new NotFoundError('Gate pass not found');
      if (pass.status === 'CHECKED_IN') throw new ConflictError('Visitor already checked in');
      if (pass.status !== 'APPROVED') {
        throw new ConflictError(`Pass must be APPROVED to check in (current: ${pass.status})`);
      }

      await tx.checkInLog.create({
        data: {
          societyId,
          gatePassId: id,
          direction: 'IN',
          recordedById: guardId,
          gateName: meta.gateName,
          notes: meta.notes,
        },
      });
      return tx.gatePass.update({ where: { id }, data: { status: 'CHECKED_IN' } });
    });
  }

  async checkOut(
    societyId: string,
    guardId: string,
    id: string,
    meta: { gateName?: string; notes?: string },
  ) {
    return withSociety(societyId, async (tx) => {
      const pass = await tx.gatePass.findFirst({ where: { id, societyId } });
      if (!pass) throw new NotFoundError('Gate pass not found');
      if (pass.status !== 'CHECKED_IN') {
        throw new ConflictError(`Visitor is not checked in (current: ${pass.status})`);
      }

      await tx.checkInLog.create({
        data: {
          societyId,
          gatePassId: id,
          direction: 'OUT',
          recordedById: guardId,
          gateName: meta.gateName,
          notes: meta.notes,
        },
      });
      return tx.gatePass.update({ where: { id }, data: { status: 'CHECKED_OUT' } });
    });
  }

  async listLogs(db: TenantClient, params: {
    page?: number; pageSize?: number; gatePassId?: string; from?: Date; to?: Date;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.CheckInLogWhereInput = {
      ...(params.gatePassId ? { gatePassId: params.gatePassId } : {}),
      ...(params.from || params.to
        ? { timestamp: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.checkInLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: page.skip,
        take: page.take,
        include: { gatePass: { select: { id: true, visitorName: true, type: true, unitId: true } } },
      }),
      db.checkInLog.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  // ── internal helpers ────────────────────────────────────────────────────

  private async assertUnitExists(db: TenantClient, unitId: string): Promise<void> {
    const unit = await db.unit.findFirst({ where: { id: unitId }, select: { id: true } });
    if (!unit) throw new BadRequestError('unitId does not reference a unit in this society');
  }

  private async inferResidentUnit(db: TenantClient, userId: string): Promise<string> {
    const active = await db.residency.findMany({
      where: { userId, movedOutAt: null },
      select: { unitId: true },
    });
    if (active.length === 0) throw new BadRequestError('You have no active residency; specify unitId');
    if (active.length > 1) throw new BadRequestError('You reside in multiple units; specify unitId');
    return active[0].unitId;
  }

  private async assertResidentOfUnit(db: TenantClient, userId: string, unitId: string): Promise<void> {
    const residency = await db.residency.findFirst({
      where: { userId, unitId, movedOutAt: null },
      select: { id: true },
    });
    if (!residency) throw new ForbiddenError('You are not an active resident of this unit');
  }

  private async assertCanApprove(db: TenantClient, actor: Actor, unitId: string | null): Promise<void> {
    if (isAdmin(actor.roles)) return;
    if (!unitId) throw new ForbiddenError('Cannot approve a pass with no unit');
    await this.assertResidentOfUnit(db, actor.userId, unitId);
  }
}

export const gateService = new GateService();
