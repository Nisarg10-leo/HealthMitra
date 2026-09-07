import { repository } from '../data/repository.js';
import { localDateKey, today } from '../lib/time.js';
import { accessFor } from './accessService.js';
import { ensureTodayLogs, logsForPatient } from './doseService.js';

const count = (logs, status) => logs.filter((log) => log.status === status).length;

export function currentStreak(logs) {
  const takenDates = [...new Set(logs.filter((log) => log.status === 'taken').map((log) => log.scheduledTime.slice(0, 10)))].sort().reverse();
  let streak = 0;
  while (streak < takenDates.length && takenDates[streak] === localDateKey(new Date(), -streak)) streak += 1;
  return streak;
}

// The read model behind both the patient "Today" screen and the caregiver dashboard.
export async function patientSummary(patientId, actor = null) {
  await ensureTodayLogs(patientId);
  const [patient, medications, logs, access] = await Promise.all([
    repository.users.findById(patientId),
    repository.medications.forPatient(patientId),
    logsForPatient(patientId),
    accessFor(actor, patientId)
  ]);
  const dayLogs = logs.filter((log) => log.scheduledTime.startsWith(today()));
  const taken = count(dayLogs, 'taken');
  return {
    patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone, preferredLanguage: patient.preferredLanguage } : null,
    permissions: { canEdit: access.canEdit, permissionLevel: access.permissionLevel },
    today: {
      total: dayLogs.length,
      taken,
      pending: count(dayLogs, 'pending'),
      missed: count(dayLogs, 'missed'),
      skipped: count(dayLogs, 'skipped'),
      score: dayLogs.length ? Math.round((taken / dayLogs.length) * 100) : 0
    },
    streak: currentStreak(logs),
    logs,
    medications
  };
}
