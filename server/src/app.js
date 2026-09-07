import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireUser } from './middleware/requireUser.js';
import { alertsRouter } from './routes/alerts.js';
import { authRouter } from './routes/auth.js';
import { doseLogsRouter } from './routes/doseLogs.js';
import { medicationsRouter } from './routes/medications.js';
import { patientsRouter } from './routes/patients.js';
import { safetyRouter } from './routes/safety.js';
import { sosRouter } from './routes/sos.js';
import { supportRouter } from './routes/support.js';
import { systemRouter } from './routes/system.js';

// Assembles the HTTP layer. Nothing here knows about business rules or storage.
export function createApp() {
  const app = express();
  app.use(cors({ origin: config.allowedOrigins.length ? config.allowedOrigins : true }));
  app.use(express.json({ limit: '1mb' }));

  // Public: health, sign-in, and stateless helpers (symptom lookup, voice intent).
  app.use('/api', systemRouter, authRouter, supportRouter);
  // Protected: everything that reads or changes patient data.
  app.use('/api', requireUser, patientsRouter, medicationsRouter, doseLogsRouter, alertsRouter, sosRouter, safetyRouter);

  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use(errorHandler);
  return app;
}
