import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from './AppError';
import { logger } from '@/config/logger';
import { isProd } from '@/config/env';

/** 404 for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
};

/** Map Prisma's known errors onto clean HTTP responses. */
function mapPrismaError(err: Prisma.PrismaClientKnownRequestError): {
  status: number;
  code: string;
  message: string;
} {
  switch (err.code) {
    case 'P2002':
      return { status: 409, code: 'CONFLICT', message: 'A record with these values already exists' };
    case 'P2025':
      return { status: 404, code: 'NOT_FOUND', message: 'Record not found' };
    case 'P2003':
      return { status: 400, code: 'BAD_REQUEST', message: 'Related record constraint failed' };
    default:
      return { status: 400, code: 'DB_ERROR', message: 'Database request failed' };
  }
}

/** Central error middleware — the single place that shapes error responses. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (!err.isOperational) logger.error({ err }, 'Non-operational AppError');
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    logger.warn({ code: err.code, meta: err.meta }, 'Prisma known error');
    res.status(mapped.status).json({
      success: false,
      error: { code: mapped.code, message: mapped.message },
    });
    return;
  }

  // Unknown / unexpected — log full detail, leak nothing to the client.
  logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
    },
  });
};
