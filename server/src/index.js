import 'dotenv/config';
import crypto from 'node:crypto';
import cors from 'cors';
import express from 'express';
import cron from 'node-cron';
import {
  APP_TIMEZONE,
  REMINDER_WINDOW_MINUTES,
  accessFor,
  alert,
  canAccess,
  db,
  doseForUser,
  hashPassword,
  isoAt,
  localDateKey,
  makeTodayLogs,
  medications,
  patientForUser,
  patientSummary,
  pushNotification,
  today,
  user,
  verifyPassword
} from './store.js';

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);
const schedulerState = { lastTickAt: null, remindersSent: 0, missedDoses: 0 };

app.use(cors({ origin: allowedOrigins?.length ? allowedOrigins : true }));
app.use(express.json({ limit: '1mb' }));

const safeUser = (currentUser) => {
  if (!currentUser) return null;
  const { passwordHash, ...publicFields } = currentUser;
  return publicFields;
};

const currentUser = (req) => user(req.header('x-user-id'));
const requireUser = (req, res) => {
  const found = currentUser(req);
  if (!found) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return null;
  }
  return found;
};

const getPatientId = (req, actor) => req.query.patient_id || (actor.role === 'patient' ? actor.id : patientForUser(actor)[0]);
const validTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const normalizeTimes = (times) => [...new Set((Array.isArray(times) ? times : []).map((time) => String(time).trim()).filter(Boolean))].sort();
const contactType = (type) => type === 'doctors' || type === 'chemists';

app.get('/api/health', (_, res) => res.json({ ok: true, mode: 'prototype-memory-store', timezone: APP_TIMEZONE, scheduler: schedulerState }));

app.post('/api/auth/register', (req, res) => {
  const { name, email, phone = '', password, role, preferredLanguage = 'en' } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !normalizedEmail || !String(password || '') || !['patient', 'caregiver'].includes(role)) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (db.users.some((item) => item.email === normalizedEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const newUser = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone || '').trim(),
    passwordHash: hashPassword(String(password)),
    role,
    preferredLanguage: preferredLanguage === 'hi' ? 'hi' : 'en'
  };
  db.users.push(newUser);
  return res.status(201).json({ user: safeUser(newUser), token: newUser.id });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const found = db.users.find((item) => item.email === email);
  if (!found || !verifyPassword(password, found.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  return res.json({ user: safeUser(found), token: found.id });
});

app.get('/api/me', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  return res.json({ user: safeUser(actor) });
});

app.get('/api/patients', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  return res.json(patientForUser(actor).map((patientId) => patientSummary(patientId, actor)));
});

app.post('/api/patients/:id/link-caregiver', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  if (actor.role !== 'patient' || actor.id !== req.params.id) return res.status(403).json({ error: 'Only the patient can invite a caregiver.' });
  const caregiverEmail = String(req.body?.email || req.body?.caregiverEmail || '').trim().toLowerCase();
  const caregiver = db.users.find((item) => item.email === caregiverEmail && item.role === 'caregiver');
  if (!caregiver) return res.status(404).json({ error: 'No caregiver account was found with that email.' });
  const existing = db.links.find((item) => item.patientId === actor.id && item.caregiverId === caregiver.id);
  if (existing) return res.json({ ok: true, link: { ...existing, inviteCode: existing.inviteCode } });
  const link = {
    id: crypto.randomUUID(),
    patientId: actor.id,
    caregiverId: caregiver.id,
    permissionLevel: req.body?.permissionLevel === 'edit' ? 'edit' : 'view',
    inviteCode: `MITRA-${Math.floor(1000 + Math.random() * 9000)}`
  };
  db.links.push(link);
  return res.status(201).json({ ok: true, link });
});

app.post('/api/links/join', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  if (actor.role !== 'caregiver') return res.status(403).json({ error: 'Only caregiver accounts can join a patient link.' });
  const code = String(req.body?.code || '').trim().toUpperCase();
  const invite = db.links.find((item) => item.inviteCode === code);
  if (!invite) return res.status(400).json({ error: 'That invite code is not valid.' });
  if (!db.links.some((item) => item.patientId === invite.patientId && item.caregiverId === actor.id)) {
    db.links.push({ id: crypto.randomUUID(), patientId: invite.patientId, caregiverId: actor.id, permissionLevel: 'view', inviteCode: code });
  }
  return res.json({ ok: true });
});

app.get('/api/medications', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const patientId = getPatientId(req, actor);
  if (!patientId || !canAccess(actor, patientId)) return res.status(403).json({ error: 'You do not have access to this patient.' });
  return res.json(medications(patientId));
});

app.post('/api/medications', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const { patientId, name, dosage, startDate, endDate = null, color = '#4f67d8' } = req.body || {};
  const times = normalizeTimes(req.body?.times);
  const access = accessFor(actor, patientId);
  if (!access.allowed || !access.canEdit) return res.status(403).json({ error: 'Only the patient or an edit-enabled caregiver can change the schedule.' });
  if (!String(name || '').trim() || !String(dosage || '').trim() || !times.length || times.some((time) => !validTime(time))) {
    return res.status(400).json({ error: 'Add a name, dosage, and one or more valid times such as 08:00.' });
  }
  if (startDate && endDate && startDate > endDate) return res.status(400).json({ error: 'End date must be on or after the start date.' });
  const medication = {
    id: crypto.randomUUID(),
    patientId,
    name: String(name).trim(),
    dosage: String(dosage).trim(),
    frequencyPerDay: times.length,
    times,
    startDate: startDate || today(),
    endDate: endDate || null,
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#4f67d8'
  };
  db.medications.push(medication);
  makeTodayLogs(patientId);
  return res.status(201).json(medication);
});

app.put('/api/medications/:id', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const medication = db.medications.find((item) => item.id === req.params.id);
  if (!medication) return res.status(404).json({ error: 'Medication not found.' });
  const access = accessFor(actor, medication.patientId);
  if (!access.allowed || !access.canEdit) return res.status(403).json({ error: 'You do not have permission to edit this schedule.' });
  const times = req.body?.times === undefined ? medication.times : normalizeTimes(req.body.times);
  if (!times.length || times.some((time) => !validTime(time))) return res.status(400).json({ error: 'Add at least one valid time such as 08:00.' });
  const nextStartDate = req.body?.startDate ?? medication.startDate;
  const nextEndDate = req.body?.endDate ?? medication.endDate;
  if (nextStartDate && nextEndDate && nextStartDate > nextEndDate) return res.status(400).json({ error: 'End date must be on or after the start date.' });
  Object.assign(medication, {
    name: req.body?.name === undefined ? medication.name : String(req.body.name).trim(),
    dosage: req.body?.dosage === undefined ? medication.dosage : String(req.body.dosage).trim(),
    times,
    frequencyPerDay: times.length,
    startDate: nextStartDate,
    endDate: nextEndDate,
    color: req.body?.color && /^#[0-9a-f]{6}$/i.test(req.body.color) ? req.body.color : medication.color
  });
  makeTodayLogs(medication.patientId);
  return res.json(medication);
});

app.delete('/api/medications/:id', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const index = db.medications.findIndex((item) => item.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Medication not found.' });
  const medication = db.medications[index];
  const access = accessFor(actor, medication.patientId);
  if (!access.allowed || !access.canEdit) return res.status(403).json({ error: 'You do not have permission to remove this medication.' });
  db.medications.splice(index, 1);
  return res.status(204).end();
});

app.get('/api/dose-logs', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const patientId = getPatientId(req, actor);
  if (!patientId || !canAccess(actor, patientId)) return res.status(403).json({ error: 'You do not have access to this patient.' });
  makeTodayLogs(patientId);
  const range = Number(req.query.range || 30);
  const cutoff = Date.now() - Math.max(1, Math.min(range, 90)) * 86400000;
  const medicationIds = new Set(medications(patientId).map((item) => item.id));
  return res.json(db.doseLogs.filter((log) => medicationIds.has(log.medicationId) && new Date(log.scheduledTime).getTime() >= cutoff).sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime)));
});

app.post('/api/dose-logs/:id/confirm', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const { log, medication, access } = doseForUser(req.params.id, actor);
  if (!log || !medication) return res.status(404).json({ error: 'Dose log not found.' });
  if (!access.allowed || (actor.role !== 'patient' && !access.canEdit)) return res.status(403).json({ error: 'You cannot confirm this dose.' });
  if (!['taken', 'skipped'].includes(req.body?.status)) return res.status(400).json({ error: 'Choose taken or skipped.' });
  if (log.status !== 'pending') return res.status(409).json({ error: `This dose is already ${log.status}.` });
  log.status = req.body.status;
  log.respondedAt = new Date().toISOString();
  log.responseMethod = req.body?.method === 'voice' ? 'voice' : 'tap';
  return res.json(log);
});

app.get('/api/dashboard', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const patientId = getPatientId(req, actor);
  if (!patientId || !canAccess(actor, patientId)) return res.status(403).json({ error: 'You do not have access to this patient.' });
  return res.json(patientSummary(patientId, actor));
});

app.get('/api/alerts', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const patientIds = new Set(patientForUser(actor));
  return res.json(db.alerts.filter((item) => patientIds.has(item.patientId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

app.post('/api/alerts/:id/read', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const item = db.alerts.find((alertItem) => alertItem.id === req.params.id);
  if (!item || !canAccess(actor, item.patientId)) return res.status(404).json({ error: 'Alert not found.' });
  if (!item.readBy.includes(actor.id)) item.readBy.push(actor.id);
  return res.json(item);
});

app.get('/api/notifications', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  return res.json(db.notifications.filter((item) => item.userId === actor.id).slice(0, 30));
});

app.post('/api/notifications/:id/read', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const item = db.notifications.find((notification) => notification.id === req.params.id && notification.userId === actor.id);
  if (!item) return res.status(404).json({ error: 'Notification not found.' });
  item.readAt = new Date().toISOString();
  return res.json(item);
});

app.post('/api/sos', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const { patientId, latitude, longitude } = req.body || {};
  if (actor.role !== 'patient' || actor.id !== patientId) return res.status(403).json({ error: 'Only the patient can trigger an SOS.' });
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const event = {
    id: crypto.randomUUID(),
    patientId,
    triggeredAt: new Date().toISOString(),
    latitude: hasCoordinates ? Number(latitude) : null,
    longitude: hasCoordinates ? Number(longitude) : null,
    locationUrl: hasCoordinates ? `https://maps.google.com/?q=${Number(latitude)},${Number(longitude)}` : null,
    status: 'active'
  };
  db.sosEvents.unshift(event);
  const patient = user(patientId);
  const locationMessage = hasCoordinates ? ` Location: ${event.locationUrl}` : ' Location was unavailable.';
  alert(patientId, 'sos', `${patient.name} triggered an SOS at ${new Date().toLocaleTimeString()}.${locationMessage}`, { sosId: event.id, locationUrl: event.locationUrl }, 'all');
  return res.status(201).json(event);
});

app.get('/api/sos', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const patientId = getPatientId(req, actor);
  if (!patientId || !canAccess(actor, patientId)) return res.status(403).json({ error: 'You do not have access to this patient.' });
  return res.json(db.sosEvents.filter((item) => item.patientId === patientId));
});

app.put('/api/sos/:id', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  const event = db.sosEvents.find((item) => item.id === req.params.id);
  if (!event || !canAccess(actor, event.patientId)) return res.status(404).json({ error: 'SOS event not found.' });
  if (!['active', 'acknowledged', 'resolved'].includes(req.body?.status)) return res.status(400).json({ error: 'Invalid SOS status.' });
  event.status = req.body.status;
  event.updatedAt = new Date().toISOString();
  return res.json(event);
});

const symptomSuggestions = {
  headache: {
    en: 'Rest in a quiet room, drink water, and consider an OTC pain reliever only as directed on its label.',
    hi: 'शांत कमरे में आराम करें, पानी पिएँ और OTC दर्द की दवा केवल लेबल के निर्देश के अनुसार लें।'
  },
  'mild fever': {
    en: 'Rest, drink fluids, and consider paracetamol only as directed on its label.',
    hi: 'आराम करें, तरल पदार्थ लें और पैरासिटामोल केवल लेबल के निर्देश के अनुसार लें।'
  },
  'common cold': {
    en: 'Rest, drink warm fluids, and ask a pharmacist before using OTC cold medicine.',
    hi: 'आराम करें, गुनगुने तरल पदार्थ लें और OTC सर्दी की दवा से पहले फार्मासिस्ट से पूछें।'
  },
  'mild body ache': {
    en: 'Rest, try gentle movement, and use an OTC pain reliever only as directed on its label.',
    hi: 'आराम करें, हल्की गतिविधि करें और OTC दर्द की दवा केवल लेबल के निर्देश के अनुसार लें।'
  },
  'mild cough': {
    en: 'Warm fluids or honey (for adults) may soothe a mild cough.',
    hi: 'गुनगुने तरल पदार्थ या शहद (वयस्कों के लिए) हल्की खाँसी में राहत दे सकते हैं।'
  }
};
const symptomDisclaimer = {
  en: 'This is not medical advice. Consult a doctor if symptoms persist or worsen.',
  hi: 'यह चिकित्सा सलाह नहीं है। लक्षण बने रहें या बढ़ें तो डॉक्टर से सलाह लें।'
};

app.get('/api/symptom-suggestions', (req, res) => {
  const key = String(req.query.symptom || '').trim().toLowerCase();
  const language = req.query.language === 'hi' ? 'hi' : 'en';
  const severe = req.query.severe === 'true';
  const suggestion = symptomSuggestions[key]?.[language];
  return res.json({
    symptom: key,
    safe: Boolean(suggestion) && !severe,
    suggestion: suggestion && !severe ? suggestion : language === 'hi' ? 'कृपया डॉक्टर से सलाह लें।' : 'For severe or unlisted symptoms, please consult a doctor.',
    disclaimer: symptomDisclaimer[language]
  });
});

app.post('/api/voice/intent', (req, res) => {
  const transcript = String(req.body?.transcript || '').trim();
  const text = transcript.toLowerCase();
  let intent = 'unknown';
  if (/\b(yes|taken|took|done|हाँ|हां|ले ली|ली)\b/.test(text)) intent = 'taken';
  else if (/\b(no|skip|skipped|not yet|नहीं|छोड़|छोड़)\b/.test(text)) intent = 'skipped';
  else if (/\b(sos|help|मदद|बचाओ)\b/.test(text)) intent = 'sos';
  return res.json({ transcript, intent, provider: process.env.GROQ_API_KEY ? 'groq-whisper-ready' : 'browser-speech-fallback' });
});

for (const type of ['doctors', 'chemists']) {
  app.get(`/api/${type}`, (req, res) => {
    const actor = requireUser(req, res);
    if (!actor) return;
    const patientId = getPatientId(req, actor);
    if (!patientId || !canAccess(actor, patientId)) return res.status(403).json({ error: 'You do not have access to this patient.' });
    return res.json(db[type].filter((item) => item.patientId === patientId));
  });
  app.post(`/api/${type}`, (req, res) => {
    const actor = requireUser(req, res);
    if (!actor) return;
    const patientId = req.body?.patientId || (actor.role === 'patient' ? actor.id : patientForUser(actor)[0]);
    const access = accessFor(actor, patientId);
    if (!access.allowed || !access.canEdit) return res.status(403).json({ error: 'Only the patient or an edit-enabled caregiver can add contacts.' });
    if (!String(req.body?.name || '').trim() || !String(req.body?.phone || '').trim()) return res.status(400).json({ error: 'Name and phone are required.' });
    const item = type === 'doctors'
      ? { id: crypto.randomUUID(), patientId, name: String(req.body.name).trim(), specialty: String(req.body.specialty || '').trim(), phone: String(req.body.phone).trim(), notes: String(req.body.notes || '').trim() }
      : { id: crypto.randomUUID(), patientId, name: String(req.body.name).trim(), phone: String(req.body.phone).trim(), address: String(req.body.address || '').trim() };
    db[type].push(item);
    return res.status(201).json(item);
  });
}

function schedulerTick() {
  schedulerState.lastTickAt = new Date().toISOString();
  const now = Date.now();
  db.users.filter((item) => item.role === 'patient').forEach((patient) => {
    makeTodayLogs(patient.id);
    const patientMedications = new Map(medications(patient.id).map((item) => [item.id, item]));
    db.doseLogs.filter((log) => patientMedications.has(log.medicationId) && log.scheduledTime.startsWith(today())).forEach((log) => {
      const scheduledAt = new Date(log.scheduledTime).getTime();
      const medication = patientMedications.get(log.medicationId);
      if (log.status === 'pending' && !log.reminderSentAt && now >= scheduledAt) {
        log.reminderSentAt = new Date().toISOString();
        pushNotification(patient.id, patient.id, 'reminder', `Time for ${medication.name}`, `${medication.dosage} is scheduled now. Tap Taken or say “yes, I took it”.`, { doseLogId: log.id });
        schedulerState.remindersSent += 1;
      }
      if (log.status === 'pending' && now - scheduledAt > REMINDER_WINDOW_MINUTES * 60_000) {
        log.status = 'missed';
        log.missedAlertSentAt = new Date().toISOString();
        alert(patient.id, 'missed-dose', `${patient.name} missed ${medication.name} (${medication.dosage}) scheduled for ${medication.times.find((time) => isoAt(time) === log.scheduledTime) || 'today'}.`, { doseLogId: log.id });
        schedulerState.missedDoses += 1;
      }
    });
  });
}

app.get('/api/scheduler/status', (req, res) => {
  const actor = requireUser(req, res);
  if (!actor) return;
  return res.json({ ...schedulerState, reminderWindowMinutes: REMINDER_WINDOW_MINUTES, timezone: APP_TIMEZONE });
});

cron.schedule('* * * * *', schedulerTick, { timezone: APP_TIMEZONE });
schedulerTick();

app.listen(port, () => console.log(`HealthMitra API listening on http://localhost:${port} (${APP_TIMEZONE})`));
