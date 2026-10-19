import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Error on ${req.method} ${req.url}]:`, err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Request payload validation failed.',
      issues: err.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.',
  });
}
