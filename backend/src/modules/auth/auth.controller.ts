import type { CookieOptions, Request, Response } from 'express';
import { authService, type RequestMeta } from './auth.service';
import { ok } from '@/core/http/ApiResponse';
import { env, isProd } from '@/config/env';

function meta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'], ipAddress: req.ip };
}

function refreshCookieOptions(expires: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: `${env.API_PREFIX}/auth`, // cookie only sent to auth routes
    expires,
  };
}

function readRefreshToken(req: Request): string | undefined {
  return req.cookies?.[env.REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
}

/**
 * Web clients use the httpOnly refresh cookie. Native mobile clients can't read
 * cookies, so when they identify via `X-Client-Type: mobile` we also return the
 * raw refresh token in the JSON body for them to store securely on-device.
 */
function isMobile(req: Request): boolean {
  return req.headers['x-client-type'] === 'mobile';
}

function authBody(req: Request, result: { user: unknown; accessToken: string; refreshToken: string }) {
  return isMobile(req)
    ? { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken }
    : { user: result.user, accessToken: result.accessToken };
}

class AuthController {
  register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body, meta(req));
    res
      .cookie(env.REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt))
      .status(201)
      .json(ok(authBody(req, result)));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body, meta(req));
    res
      .cookie(env.REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt))
      .status(200)
      .json(ok(authBody(req, result)));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const raw = readRefreshToken(req);
    const result = await authService.refresh(raw ?? '', meta(req));
    res
      .cookie(env.REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt))
      .status(200)
      .json(ok(authBody(req, result)));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await authService.logout(readRefreshToken(req));
    res
      .clearCookie(env.REFRESH_COOKIE_NAME, { path: `${env.API_PREFIX}/auth` })
      .status(200)
      .json(ok({ loggedOut: true }));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const profile = await authService.me(req.auth!.userId);
    res.status(200).json(ok(profile));
  };
}

export const authController = new AuthController();
