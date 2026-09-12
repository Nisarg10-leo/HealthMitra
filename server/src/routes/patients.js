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

// Caregivers linked to a patient
patientsRouter.get('/caregivers', asyncRoute(async (req, res) => {
  const patientId = req.actor.role === 'patient' ? req.actor.id : await resolvePatientId(req, req.actor);
  const links = await repository.links.forPatient(patientId);
  const caregivers = await Promise.all(
    links.map(async (link) => {
      const caregiver = await repository.users.findById(link.caregiverId);
      return {
        id: link.id,
        caregiverId: link.caregiverId,
        name: caregiver?.name || 'Caregiver',
        email: caregiver?.email || '',
        phone: caregiver?.phone || '',
        permissionLevel: link.permissionLevel,
        inviteCode: link.inviteCode,
        preferredLanguage: caregiver?.preferredLanguage || 'en'
      };
    })
  );
  res.json(caregivers);
}));

patientsRouter.get('/patients/:id/invite-code', asyncRoute(async (req, res) => {
  const patientId = resolveId(req.params.id);
  await assertCanView(req.actor, patientId);
  const links = await repository.links.forPatient(patientId);
  const existingCode = links.find((l) => l.inviteCode)?.inviteCode;
  const inviteCode = existingCode || `MITRA-${patientId.slice(0, 4).toUpperCase()}`;
  res.json({ inviteCode });
}));

// Everyday Checkup routes
patientsRouter.get('/patients/:id/checkups', asyncRoute(async (req, res) => {
  const patientId = resolveId(req.params.id);
  await assertCanView(req.actor, patientId);
  const checkups = await repository.checkups.forPatient(patientId);
  res.json(checkups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
}));

patientsRouter.post('/patients/:id/checkup', asyncRoute(async (req, res) => {
  const patientId = resolveId(req.params.id);
  await assertCanView(req.actor, patientId);
  const { mood, bloodPressure, bloodSugar, sleepQuality, painLevel, notes } = req.body || {};
  const patient = await repository.users.findById(patientId);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().split('T')[0];

  const checkup = await repository.checkups.insert({
    patientId,
    createdAt: now.toISOString(),
    date: dateStr,
    time: timeStr,
    mood: mood || 'good',
    bloodPressure: bloodPressure || '',
    bloodSugar: bloodSugar || '',
    sleepQuality: sleepQuality || 'good',
    painLevel: painLevel || 'none',
    notes: notes || ''
  });

  const vitalsText = [
    mood ? `Mood: ${mood.toUpperCase()}` : '',
    bloodPressure ? `BP: ${bloodPressure}` : '',
    bloodSugar ? `Sugar: ${bloodSugar} mg/dL` : ''
  ].filter(Boolean).join(', ');

  await raiseAlert(
    patientId,
    'info',
    `Everyday Checkup logged by ${patient?.name || 'Patient'} at ${timeStr}. ${vitalsText}${notes ? ` Notes: "${notes}"` : ''}`,
    { checkupId: checkup.id, mood, bloodPressure, bloodSugar },
    'caregivers'
  );

  res.status(201).json({ ok: true, checkup });
}));

patientsRouter.post('/patients/:id/request-checkup', asyncRoute(async (req, res) => {
  const patientId = resolveId(req.params.id);
  await assertCanView(req.actor, patientId);
  const caregiverName = req.actor.name || 'Caregiver';
  await raiseAlert(
    patientId,
    'reminder',
    `${caregiverName} sent a friendly Everyday Checkup ping. Please take a moment to record how you are feeling today.`,
    { requestedBy: req.actor.id },
    'all'
  );
  res.json({ ok: true, message: `Checkup ping sent to patient.` });
}));
