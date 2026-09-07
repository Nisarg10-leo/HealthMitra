import { Router } from 'express';
import { repository } from '../data/repository.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { assertCanView, patientIdsFor, resolveId, resolvePatientId } from '../services/accessService.js';
import { patientSummary } from '../services/adherenceService.js';
import { inviteCaregiver, joinWithCode } from '../services/linkService.js';
import { raiseAlert } from '../services/notificationService.js';

export const patientsRouter = Router();

patientsRouter.get('/patients', asyncRoute(async (req, res) => {
  const ids = await patientIdsFor(req.actor);
  res.json(await Promise.all(ids.map((patientId) => patientSummary(patientId, req.actor))));
}));

patientsRouter.post('/patients/:id/link-caregiver', asyncRoute(async (req, res) => {
  const { created, link } = await inviteCaregiver(req.actor, req.params.id, req.body || {});
  res.status(created ? 201 : 200).json({ ok: true, link });
}));

patientsRouter.post('/links/join', asyncRoute(async (req, res) => res.json(await joinWithCode(req.actor, req.body?.code))));

patientsRouter.get('/dashboard', asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  res.json(await patientSummary(patientId, req.actor));
}));

// Inactivity Guardian: patient confirms they are active and safe
patientsRouter.post('/patients/:id/reassure', asyncRoute(async (req, res) => {
  const patientId = resolveId(req.params.id);
  await assertCanView(req.actor, patientId);
  const patient = await repository.users.findById(patientId);
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  await raiseAlert(patientId, 'reassurance', `${patient?.name || 'Patient'} confirmed they are active and safe at ${timeStr}.`, {}, 'caregivers');
  res.json({ ok: true, message: 'Reassurance sent to caregivers.' });
}));
