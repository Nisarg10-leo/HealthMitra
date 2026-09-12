import express, { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { assertCanView, resolvePatientId } from '../services/accessService.js';
import { CONTACT_TYPES, addContact, listContacts } from '../services/contactService.js';
import { askMitra } from '../services/groqService.js';
import { symptomGuidance } from '../services/symptomService.js';
import { detectIntent } from '../services/voiceIntentService.js';
import { scanPrescriptionImage } from '../services/visionService.js';

export const supportRouter = Router();

supportRouter.get('/symptom-suggestions', (req, res) => res.json(symptomGuidance({ symptom: req.query.symptom, language: req.query.language, severe: req.query.severe === 'true' })));
supportRouter.post('/voice/intent', (req, res) => res.json(detectIntent(req.body?.transcript)));

supportRouter.post('/support/ask-mitra', requireUser, asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  const result = await askMitra({
    question: req.body?.question || '',
    patientId,
    language: req.body?.language || 'en'
  });
  res.json(result);
}));

supportRouter.post('/support/scan-prescription', requireUser, express.json({ limit: '10mb' }), asyncRoute(async (req, res) => {
  const patientId = await resolvePatientId(req, req.actor);
  await assertCanView(req.actor, patientId);
  
  if (!req.body?.image && !req.body?.text) {
    return res.status(400).json({ error: 'Image or text is required' });
  }

  const result = await scanPrescriptionImage(req.body?.image, req.body?.text);
  res.json(result);
}));

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
