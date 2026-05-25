import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { blockController } from './blocks.controller';
import { unitController } from './units.controller';
import { residencyController } from './residencies.controller';
import { societyController } from './society.controller';

import { createBlockSchema, updateBlockSchema, blockIdSchema, listBlocksSchema } from './blocks.schema';
import { createUnitSchema, updateUnitSchema, unitIdSchema, listUnitsSchema } from './units.schema';
import {
  createResidencySchema,
  updateResidencySchema,
  residencyIdSchema,
  listResidenciesSchema,
} from './residencies.schema';
import { updateSocietySchema } from './society.schema';

const router = Router();

// Every property route is authenticated and tenant-scoped.
router.use(authenticate, withTenant);

// Roles allowed to MUTATE property structure.
const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// ── Society profile ─────────────────────────────────────────────────────
router.get('/society', asyncHandler(societyController.getProfile));
router.patch(
  '/society',
  requireRole('SOCIETY_ADMIN'),
  validate(updateSocietySchema),
  asyncHandler(societyController.updateProfile),
);

// ── Blocks ──────────────────────────────────────────────────────────────
router.get('/blocks', validate(listBlocksSchema), asyncHandler(blockController.list));
router.get('/blocks/:id', validate(blockIdSchema), asyncHandler(blockController.getById));
router.post('/blocks', canManage, validate(createBlockSchema), asyncHandler(blockController.create));
router.patch('/blocks/:id', canManage, validate(updateBlockSchema), asyncHandler(blockController.update));
router.delete('/blocks/:id', canManage, validate(blockIdSchema), asyncHandler(blockController.remove));

// ── Units ───────────────────────────────────────────────────────────────
router.get('/units', validate(listUnitsSchema), asyncHandler(unitController.list));
router.get('/units/:id', validate(unitIdSchema), asyncHandler(unitController.getById));
router.post('/units', canManage, validate(createUnitSchema), asyncHandler(unitController.create));
router.patch('/units/:id', canManage, validate(updateUnitSchema), asyncHandler(unitController.update));
router.delete('/units/:id', canManage, validate(unitIdSchema), asyncHandler(unitController.remove));

// ── Residencies ─────────────────────────────────────────────────────────
router.get('/residencies', validate(listResidenciesSchema), asyncHandler(residencyController.list));
router.get('/residencies/:id', validate(residencyIdSchema), asyncHandler(residencyController.getById));
router.post('/residencies', canManage, validate(createResidencySchema), asyncHandler(residencyController.create));
router.patch('/residencies/:id', canManage, validate(updateResidencySchema), asyncHandler(residencyController.update));
router.post('/residencies/:id/end', canManage, validate(residencyIdSchema), asyncHandler(residencyController.end));
router.delete('/residencies/:id', canManage, validate(residencyIdSchema), asyncHandler(residencyController.remove));

export const propertyRoutes = router;
