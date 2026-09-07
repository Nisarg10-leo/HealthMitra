import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { listSosEvents, triggerSos, updateSosStatus } from '../services/sosService.js';

export const sosRouter = Router();

sosRouter.post('/sos', asyncRoute(async (req, res) => res.status(201).json(await triggerSos(req.actor, req.body || {}))));
sosRouter.get('/sos', asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  res.json(await listSosEvents(patientId));
}));
sosRouter.put('/sos/:id', asyncRoute(async (req, res) => res.json(await updateSosStatus(req.actor, req.params.id, req.body?.status))));
