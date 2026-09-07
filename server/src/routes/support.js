import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { CONTACT_TYPES, addContact, listContacts } from '../services/contactService.js';
import { symptomGuidance } from '../services/symptomService.js';
import { detectIntent } from '../services/voiceIntentService.js';

export const supportRouter = Router();

supportRouter.get('/symptom-suggestions', (req, res) => res.json(symptomGuidance({ symptom: req.query.symptom, language: req.query.language, severe: req.query.severe === 'true' })));
supportRouter.post('/voice/intent', (req, res) => res.json(detectIntent(req.body?.transcript)));

for (const type of CONTACT_TYPES) {
  supportRouter.get(`/${type}`, requireUser, asyncRoute(async (req, res) => {
    const patientId = await resolvePatientId(req, req.actor);
    await assertCanView(req.actor, patientId);
    res.json(await listContacts(type, patientId));
  }));
  supportRouter.post(`/${type}`, requireUser, asyncRoute(async (req, res) => {
    const patientId = await resolvePatientId(req, req.actor);
    res.status(201).json(await addContact(req.actor, type, patientId, req.body));
  }));
}
