import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

import { gateController } from './gate.controller';
import {
  createPassSchema,
  verifyPassSchema,
  passIdSchema,
  checkEventSchema,
  denyPassSchema,
  listPassesSchema,
  listLogsSchema,
} from './gate.schema';

const router = Router();

router.use(authenticate, withTenant);

// Roles that operate the gate (verify + check-in/out + logs).
const gateOps = requireRole('SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');
// Roles that may raise a pass (residents, guards for walk-ins, admins).
const canCreate = requireRole('RESIDENT', 'SECURITY_GUARD', 'SOCIETY_ADMIN', 'COMMITTEE_MEMBER', 'FACILITY_ADMIN');

// ── Passes ────────────────────────────────────────────────────────────────
router.get('/passes', validate(listPassesSchema), asyncHandler(gateController.list));
router.get('/passes/:id', validate(passIdSchema), asyncHandler(gateController.getById));
router.post('/passes', canCreate, validate(createPassSchema), asyncHandler(gateController.create));

// Approval flow — service further checks the actor is a resident of the unit.
router.post('/passes/:id/approve', validate(passIdSchema), asyncHandler(gateController.approve));
router.post('/passes/:id/deny', validate(denyPassSchema), asyncHandler(gateController.deny));

// ── Gate desk (guards) ──────────────────────────────────────────────────
router.post('/verify', gateOps, validate(verifyPassSchema), asyncHandler(gateController.verify));
router.post('/passes/:id/check-in', gateOps, validate(checkEventSchema), asyncHandler(gateController.checkIn));
router.post('/passes/:id/check-out', gateOps, validate(checkEventSchema), asyncHandler(gateController.checkOut));

// ── Audit log ─────────────────────────────────────────────────────────────
router.get('/logs', gateOps, validate(listLogsSchema), asyncHandler(gateController.logs));

export const gateRoutes = router;
