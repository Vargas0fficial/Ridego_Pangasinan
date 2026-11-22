import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Express 4 does not catch rejected promises, so every async handler goes through this. */
export const h =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    res.status(400).json({ error: issue ? issue.message : 'Invalid request' });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err && (err as { code?: number }).code === 11000) {
    res.status(409).json({ error: 'That phone number is already registered' });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};
