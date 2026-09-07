import cron from 'node-cron';
import { config } from '../config.js';
import { repository } from '../data/repository.js';
import { isoAt, nowIso, today } from '../lib/time.js';
import { ensureTodayLogs, logsForPatient } from '../services/doseService.js';
import { pushNotification, raiseAlert } from '../services/notificationService.js';

export const schedulerState = { lastTickAt: null, remindersSent: 0, missedDoses: 0 };

// Runs once a minute. Pure orchestration: it decides *when* something is due
// and delegates *what happens* to the dose and notification services.
export async function schedulerTick(now = Date.now()) {
  schedulerState.lastTickAt = nowIso();
  for (const patient of await repository.users.listPatients()) {
    await ensureTodayLogs(patient.id);
    const medications = new Map((await repository.medications.forPatient(patient.id)).map((item) => [item.id, item]));
    const todayLogs = (await logsForPatient(patient.id)).filter((log) => log.scheduledTime.startsWith(today()));
    for (const log of todayLogs) {
      if (log.status !== 'pending') continue;
      const medication = medications.get(log.medicationId);
      const scheduledAt = new Date(log.scheduledTime).getTime();
      if (!log.reminderSentAt && now >= scheduledAt) {
        await repository.doseLogs.update(log.id, { reminderSentAt: nowIso() });
        await pushNotification(patient.id, patient.id, 'reminder', `Time for ${medication.name}`, `${medication.dosage} is scheduled now. Tap Taken or say “yes, I took it”.`, { doseLogId: log.id });
        schedulerState.remindersSent += 1;
      }
      if (now - scheduledAt > config.reminderWindowMinutes * 60_000) {
        await repository.doseLogs.update(log.id, { status: 'missed', missedAlertSentAt: nowIso() });
        const clockTime = medication.times.find((time) => isoAt(time) === log.scheduledTime) || 'today';
        await raiseAlert(patient.id, 'missed-dose', `${patient.name} missed ${medication.name} (${medication.dosage}) scheduled for ${clockTime}.`, { doseLogId: log.id });
        schedulerState.missedDoses += 1;
      }
    }
  }
}

export function startScheduler() {
  cron.schedule('* * * * *', () => schedulerTick().catch((error) => console.error('[scheduler]', error)), { timezone: config.timezone });
  return schedulerTick();
}
