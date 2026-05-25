import { z } from 'zod';

const unitType = z.enum(['APARTMENT', 'VILLA', 'SHOP', 'OFFICE', 'PARKING']);
const occupancy = z.enum(['OWNER_OCCUPIED', 'RENTED', 'VACANT']);

export const createUnitSchema = z.object({
  body: z.object({
    blockId: z.string().uuid(),
    unitNumber: z.string().min(1).max(30),
    floor: z.coerce.number().int().min(-10).max(300).optional(),
    type: unitType.default('APARTMENT'),
    carpetAreaSqft: z.coerce.number().positive().max(1_000_000).optional(),
    occupancyStatus: occupancy.default('VACANT'),
  }),
});

export const updateUnitSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    blockId: z.string().uuid().optional(),
    unitNumber: z.string().min(1).max(30).optional(),
    floor: z.coerce.number().int().min(-10).max(300).nullable().optional(),
    type: unitType.optional(),
    carpetAreaSqft: z.coerce.number().positive().max(1_000_000).nullable().optional(),
    occupancyStatus: occupancy.optional(),
  }),
});

export const unitIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

export const listUnitsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    blockId: z.string().uuid().optional(),
    occupancyStatus: occupancy.optional(),
    search: z.string().trim().max(30).optional(),
  }),
});
