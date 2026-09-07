import { repository } from '../data/repository.js';
import { badRequest, notFound } from '../lib/httpError.js';
import { isValidClockTime, today } from '../lib/time.js';
import { assertCanEdit } from './accessService.js';
import { ensureTodayLogs } from './doseService.js';

const DEFAULT_COLOR = '#4f67d8';
const normalizeTimes = (times) => [...new Set((Array.isArray(times) ? times : []).map((time) => String(time).trim()).filter(Boolean))].sort();
const validColor = (color, fallback) => (/^#[0-9a-f]{6}$/i.test(color || '') ? color : fallback);

function validateSchedule(times, startDate, endDate) {
  if (!times.length || times.some((time) => !isValidClockTime(time))) throw badRequest('Add at least one valid time such as 08:00.');
  if (startDate && endDate && startDate > endDate) throw badRequest('End date must be on or after the start date.');
}

export const listMedications = (patientId) => repository.medications.forPatient(patientId);

export async function addMedication(actor, body) {
  const patientId = body?.patientId || (actor.role === 'patient' ? actor.id : null);
  const { name, dosage, startDate, endDate = null, color } = body || {};
  const times = normalizeTimes(body?.times);
  await assertCanEdit(actor, patientId, 'Only the patient or an edit-enabled caregiver can change the schedule.');
  if (!String(name || '').trim() || !String(dosage || '').trim() || !times.length || times.some((time) => !isValidClockTime(time))) {
    throw badRequest('Add a name, dosage, and one or more valid times such as 08:00.');
  }
  validateSchedule(times, startDate, endDate);
  const medication = await repository.medications.insert({
    patientId,
    name: String(name).trim(),
    dosage: String(dosage).trim(),
    frequencyPerDay: times.length,
    times,
    startDate: startDate || today(),
    endDate: endDate || null,
    color: validColor(color, DEFAULT_COLOR)
  });
  await ensureTodayLogs(patientId);
  return medication;
}

export async function updateMedication(actor, id, body = {}) {
  const medication = await repository.medications.findById(id);
  if (!medication) throw notFound('Medication not found.');
  await assertCanEdit(actor, medication.patientId, 'You do not have permission to edit this schedule.');
  const times = body.times === undefined ? medication.times : normalizeTimes(body.times);
  const startDate = body.startDate ?? medication.startDate;
  const endDate = body.endDate ?? medication.endDate;
  validateSchedule(times, startDate, endDate);
  const updated = await repository.medications.update(id, {
    name: body.name === undefined ? medication.name : String(body.name).trim(),
    dosage: body.dosage === undefined ? medication.dosage : String(body.dosage).trim(),
    times,
    frequencyPerDay: times.length,
    startDate,
    endDate,
    color: validColor(body.color, medication.color)
  });
  await ensureTodayLogs(medication.patientId);
  return updated;
}

export async function removeMedication(actor, id) {
  const medication = await repository.medications.findById(id);
  if (!medication) throw notFound('Medication not found.');
  await assertCanEdit(actor, medication.patientId, 'You do not have permission to remove this medication.');
  await repository.medications.remove(id);
}
