import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: 'ValidationError',
      details: err.errors
    });
  }
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal Server Error'
  };
  if (process.env.NODE_ENV !== 'production') {
    (payload as any).stack = err.stack;
  }
  logger.error({ err, path: _req.path }, 'request_error');
  res.status(status).json(payload);
}
