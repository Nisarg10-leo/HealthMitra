import { repository } from '../data/repository.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/httpError.js';
import { isoAt, nowIso, today } from '../lib/time.js';
import { accessFor } from './accessService.js';

const isActiveOn = (medication, date) => (!medication.startDate || medication.startDate <= date) && (!medication.endDate || medication.endDate >= date);

// Idempotent: creates the pending dose records for today that do not exist yet.
// Called by the scheduler and after any schedule change, so reminders work even
// when the patient's browser is closed.
export async function ensureTodayLogs(patientId) {
  const date = today();
  const medications = await repository.medications.forPatient(patientId);
  for (const medication of medications.filter((item) => isActiveOn(item, date))) {
    for (const time of medication.times) {
      const scheduledTime = isoAt(time, date);
      if (!(await repository.doseLogs.exists(medication.id, scheduledTime))) {
        await repository.doseLogs.insert({ medicationId: medication.id, scheduledTime, status: 'pending', respondedAt: null, responseMethod: null, reminderSentAt: null, missedAlertSentAt: null });
      }
    }
  }
}

export async function logsForPatient(patientId) {
  const medicationIds = new Set((await repository.medications.forPatient(patientId)).map((item) => item.id));
  const logs = await repository.doseLogs.forMedications(medicationIds);
  return logs.sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));
}

export async function listDoseLogs(patientId, rangeDays = 30) {
  await ensureTodayLogs(patientId);
  const cutoff = Date.now() - Math.max(1, Math.min(Number(rangeDays) || 30, 90)) * 86400000;
  return (await logsForPatient(patientId)).filter((log) => new Date(log.scheduledTime).getTime() >= cutoff);
}

export async function confirmDose(actor, doseId, { status, method }) {
  const log = await repository.doseLogs.findById(doseId);
  const medication = log ? await repository.medications.findById(log.medicationId) : null;
  if (!log || !medication) throw notFound('Dose log not found.');
  const access = await accessFor(actor, medication.patientId);
  if (!access.allowed || (actor.role !== 'patient' && !access.canEdit)) throw forbidden('You cannot confirm this dose.');
  if (!['taken', 'skipped'].includes(status)) throw badRequest('Choose taken or skipped.');
  if (log.status !== 'pending') throw conflict(`This dose is already ${log.status}.`);
  return repository.doseLogs.update(log.id, { status, respondedAt: nowIso(), responseMethod: method === 'voice' ? 'voice' : 'tap' });
}
