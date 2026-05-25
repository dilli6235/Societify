import { z } from 'zod';

const vehicleType = z.enum(['CAR', 'BIKE', 'SCOOTER', 'BICYCLE', 'OTHER']);

export const createVehicleSchema = z.object({
  body: z.object({
    unitId: z.string().uuid(),
    type: vehicleType.default('CAR'),
    registrationNumber: z.string().min(1).max(20),
    make: z.string().max(40).optional(),
    model: z.string().max(40).optional(),
    color: z.string().max(30).optional(),
    parkingSlot: z.string().max(20).optional(),
    ownerName: z.string().max(120).optional(),
  }),
});

export const updateVehicleSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    type: vehicleType.optional(),
    registrationNumber: z.string().min(1).max(20).optional(),
    make: z.string().max(40).nullable().optional(),
    model: z.string().max(40).nullable().optional(),
    color: z.string().max(30).nullable().optional(),
    parkingSlot: z.string().max(20).nullable().optional(),
    ownerName: z.string().max(120).nullable().optional(),
  }),
});

export const vehicleIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });

export const listVehiclesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    unitId: z.string().uuid().optional(),
    type: vehicleType.optional(),
    search: z.string().trim().max(20).optional(),
  }),
});
