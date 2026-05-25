import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { withTenant } from '@/middleware/tenant.middleware';
import { requireRole } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';
import { documentController } from './documents.controller';
import { createDocumentSchema, updateDocumentSchema, documentIdSchema, listDocumentsSchema } from './documents.schema';

const router = Router();
router.use(authenticate, withTenant);
const canManage = requireRole('SOCIETY_ADMIN', 'COMMITTEE_MEMBER');

router.get('/', validate(listDocumentsSchema), asyncHandler(documentController.list));
router.get('/:id', validate(documentIdSchema), asyncHandler(documentController.getById));
router.post('/', canManage, validate(createDocumentSchema), asyncHandler(documentController.create));
router.patch('/:id', canManage, validate(updateDocumentSchema), asyncHandler(documentController.update));
router.delete('/:id', canManage, validate(documentIdSchema), asyncHandler(documentController.remove));

export const documentRoutes = router;
