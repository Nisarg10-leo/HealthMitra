import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { addMedication, listMedications, removeMedication, updateMedication } from '../services/medicationService.js';

export const medicationsRouter = Router();

medicationsRouter.get('/medications', asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  res.json(await listMedications(patientId));
}));
medicationsRouter.post('/medications', asyncRoute(async (req, res) => res.status(201).json(await addMedication(req.actor, req.body))));
medicationsRouter.put('/medications/:id', asyncRoute(async (req, res) => res.json(await updateMedication(req.actor, req.params.id, req.body))));
medicationsRouter.delete('/medications/:id', asyncRoute(async (req, res) => {
  await removeMedication(req.actor, req.params.id);
  res.status(204).end();
}));
