import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { confirmDose, listDoseLogs } from '../services/doseService.js';

export const doseLogsRouter = Router();

doseLogsRouter.get('/dose-logs', asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  res.json(await listDoseLogs(patientId, req.query.range));
}));
doseLogsRouter.post('/dose-logs/:id/confirm', asyncRoute(async (req, res) => res.json(await confirmDose(req.actor, req.params.id, req.body || {}))));
