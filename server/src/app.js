import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.allowedOrigins.length ? config.allowedOrigins : true }));
  app.use(express.json({ limit: '1mb' }));

  // Public: health, sign-in, and stateless helpers (symptom lookup, voice intent).
  app.use('/api', systemRouter, authRouter, supportRouter);
  // Protected: everything that reads or changes patient data.
  app.use('/api', requireUser, patientsRouter, medicationsRouter, doseLogsRouter, alertsRouter, sosRouter, safetyRouter);

  // Serve production client build if present
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use(errorHandler);
  return app;
}
