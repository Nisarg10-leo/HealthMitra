import { HttpError } from '../lib/httpError.js';

// Every route can simply `throw` an HttpError; this is the single place that
// turns errors into the `{ error }` JSON shape the client expects.
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong on the server.' });
}

// Express 4 does not catch rejected promises from async handlers.
export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
