import type { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Wrap an async route handler so rejected promises are forwarded to Express's
 * error middleware instead of crashing the process / hanging the request.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
