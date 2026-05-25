import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject, type ZodTypeAny } from 'zod';
import { BadRequestError } from '@/core/errors/AppError';

/**
 * Validate (and coerce) request `body`, `query`, and `params` against a Zod
 * schema shaped as `z.object({ body?, query?, params? })`. The PARSED values
 * overwrite the originals, so handlers receive clean, typed, coerced data.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const shape = schema.shape as { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };
    try {
      if (shape.body) req.body = shape.body.parse(req.body);
      if (shape.query) req.query = shape.query.parse(req.query) as typeof req.query;
      if (shape.params) req.params = shape.params.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new BadRequestError('Validation failed', err.flatten());
      }
      throw err;
    }
  };
}
