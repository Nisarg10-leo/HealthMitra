import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { getSafetyAdvisory } from '../services/safetyService.js';

export const safetyRouter = Router();

safetyRouter.get('/safety/advisory', asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  const language = req.query.language === 'hi' ? 'hi' : 'en';
  res.json(await getSafetyAdvisory(patientId, language));
}));
