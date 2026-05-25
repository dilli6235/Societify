import type { BookingStatus, Prisma, SystemRole } from '@prisma/client';
import type { TenantClient } from '@/core/tenant/tenantPrisma';
import { withSociety } from '@/core/tenant/rls';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '@/core/errors/AppError';
import { buildMeta, resolvePagination } from '@/utils/pagination';
import { enqueueNotification } from '@/jobs/notificationQueue';

interface Actor {
  userId: string;
  roles: SystemRole[];
}

function isManager(roles: SystemRole[]): boolean {
  return roles.some((r) => r === 'SOCIETY_ADMIN' || r === 'COMMITTEE_MEMBER' || r === 'FACILITY_ADMIN');
}

class AmenityService {
  // ── Amenities ───────────────────────────────────────────────────────────

  async list(db: TenantClient, params: { page?: number; pageSize?: number; activeOnly?: boolean }) {
    const page = resolvePagination(params);
    const where: Prisma.AmenityWhereInput = params.activeOnly ? { isActive: true } : {};
    const [items, total] = await Promise.all([
      db.amenity.findMany({ where, orderBy: { name: 'asc' }, skip: page.skip, take: page.take }),
      db.amenity.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  async getById(db: TenantClient, id: string) {
    const amenity = await db.amenity.findFirst({ where: { id } });
    if (!amenity) throw new NotFoundError('Amenity not found');
    return amenity;
  }

  async create(db: TenantClient, data: Prisma.AmenityCreateInput) {
    return db.amenity.create({ data });
  }

  async update(db: TenantClient, id: string, data: Prisma.AmenityUpdateInput) {
    await this.getById(db, id);
    return db.amenity.update({ where: { id }, data });
  }

  async remove(db: TenantClient, id: string) {
    await this.getById(db, id);
    await db.amenity.delete({ where: { id } });
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  async listBookings(db: TenantClient, actor: Actor, params: {
    page?: number; pageSize?: number; amenityId?: string; status?: BookingStatus; mine?: boolean; from?: Date; to?: Date;
  }) {
    const page = resolvePagination(params);
    const where: Prisma.AmenityBookingWhereInput = {
      ...(params.amenityId ? { amenityId: params.amenityId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.mine ? { bookedById: actor.userId } : {}),
      ...(params.from || params.to
        ? { startTime: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lte: params.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.amenityBooking.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: page.skip,
        take: page.take,
        include: {
          amenity: { select: { id: true, name: true } },
          bookedBy: { select: { id: true, fullName: true } },
        },
      }),
      db.amenityBooking.count({ where }),
    ]);
    return { items, meta: buildMeta(page, total) };
  }

  /**
   * Book a slot. The overlap check + insert run in ONE transaction so two
   * residents racing for the same slot can't both succeed (first commit wins;
   * the second sees the conflict).
   */
  async book(
    societyId: string,
    actor: Actor,
    input: { amenityId: string; startTime: Date; endTime: Date; notes?: string },
  ) {
    return withSociety(societyId, async (tx) => {
      const amenity = await tx.amenity.findFirst({
        where: { id: input.amenityId, societyId },
        select: { id: true, isActive: true, bookingFee: true },
      });
      if (!amenity) throw new BadRequestError('amenityId does not reference an amenity in this society');
      if (!amenity.isActive) throw new ConflictError('Amenity is not available for booking');

      const clash = await tx.amenityBooking.findFirst({
        where: {
          amenityId: input.amenityId,
          status: 'CONFIRMED',
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { id: true },
      });
      if (clash) throw new ConflictError('That time slot is already booked');

      const booking = await tx.amenityBooking.create({
        data: {
          societyId,
          amenityId: input.amenityId,
          bookedById: actor.userId,
          startTime: input.startTime,
          endTime: input.endTime,
          status: 'CONFIRMED',
          fee: amenity.bookingFee,
          notes: input.notes,
        },
        include: { amenity: { select: { id: true, name: true } } },
      });

      await enqueueNotification({
        societyId,
        event: 'AMENITY_BOOKING_CONFIRMED',
        recipientUserIds: [actor.userId],
        data: { amenityName: booking.amenity.name, startTime: input.startTime.toISOString() },
      });
      return booking;
    });
  }

  /** Cancel a booking — only the booker or a manager, and not once completed. */
  async cancel(db: TenantClient, actor: Actor, id: string) {
    const booking = await db.amenityBooking.findFirst({ where: { id } });
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.bookedById !== actor.userId && !isManager(actor.roles)) {
      throw new ForbiddenError('You can only cancel your own bookings');
    }
    if (booking.status === 'COMPLETED') throw new ConflictError('Completed bookings cannot be cancelled');
    if (booking.status === 'CANCELLED') return booking;

    return db.amenityBooking.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}

export const amenityService = new AmenityService();
