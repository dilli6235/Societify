import { Router } from 'express';
import { authController } from './auth.controller';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema';
import { validate } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { authRateLimiter } from '@/middleware/rateLimit.middleware';
import { asyncHandler } from '@/core/http/asyncHandler';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authRateLimiter, validate(refreshSchema), asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));

export const authRoutes = router;
