import { repository } from '../data/repository.js';
import { localDateKey, today } from '../lib/time.js';
import { accessFor } from './accessService.js';
import { ensureTodayLogs, logsForPatient } from './doseService.js';
import { dietaryForMedication, getSafetyAdvisory } from './safetyService.js';

const count = (logs, status) => logs.filter((log) => log.status === status).length;

export function currentStreak(logs) {
  const takenDates = [...new Set(logs.filter((log) => log.status === 'taken').map((log) => log.scheduledTime.slice(0, 10)))].sort().reverse();
  let streak = 0;
  while (streak < takenDates.length && takenDates[streak] === localDateKey(new Date(), -streak)) streak += 1;
  return streak;
}

// ── Smart Risk & Anomaly Assessment Engine ────────────────────────────────────

export function computeRiskAssessment(logs, streak) {
  // Past 7 days cutoff
  const sevenDaysAgo = localDateKey(new Date(), -7);
  const recentLogs = logs.filter((l) => l.scheduledTime.slice(0, 10) >= sevenDaysAgo);
  const totalRecent = recentLogs.length || 1;
  const takenCount = count(recentLogs, 'taken');
  const missedCount = count(recentLogs, 'missed');
  const skippedCount = count(recentLogs, 'skipped');
  const adherenceRate = Math.round((takenCount / totalRecent) * 100);

  // Calculate timing drift (latency between scheduled time and actual response)
  const respondedLogs = recentLogs.filter((l) => l.respondedAt && l.scheduledTime);
  let totalDelayMinutes = 0;
  let delayCount = 0;
  let delayedOver60mCount = 0;

  for (const log of respondedLogs) {
    const sched = new Date(log.scheduledTime).getTime();
    const resp = new Date(log.respondedAt).getTime();
    const diffMin = Math.max(0, Math.round((resp - sched) / 60_000));
    totalDelayMinutes += diffMin;
    delayCount += 1;
    if (diffMin > 60) delayedOver60mCount += 1;
  }

  const avgDelayMinutes = delayCount > 0 ? Math.round(totalDelayMinutes / delayCount) : 0;

  // Detect behavioral anomalies
  const anomalies = [];
  if (delayedOver60mCount >= 3) {
    anomalies.push({
      type: 'timing-drift',
      severity: 'moderate',
      title: 'Timing Drift Detected',
      description: `Doses were delayed by over 60 minutes on ${delayedOver60mCount} occasions recently.`
    });
  }

  if (missedCount >= 2) {
    anomalies.push({
      type: 'missed-cluster',
      severity: 'high',
      title: 'Repeated Missed Doses',
      description: `${missedCount} doses were missed in the last 7 days. Caregiver check-in recommended.`
    });
  }

  if (streak === 0 && count(recentLogs.filter((l) => l.scheduledTime.startsWith(today())), 'taken') === 0 && count(recentLogs.filter((l) => l.scheduledTime.startsWith(today())), 'missed') > 0) {
    anomalies.push({
      type: 'broken-streak',
      severity: 'low',
      title: 'Streak Interrupted',
      description: 'The medication streak was interrupted today.'
    });
  }

  // Dynamic Risk Level Calculation
  let level = 'low';
  let score = adherenceRate;
  if (adherenceRate < 60 || missedCount >= 3) {
    level = 'high';
  } else if (adherenceRate < 80 || delayedOver60mCount >= 3 || skippedCount >= 3) {
    level = 'moderate';
  }

  return {
    level, // 'low' | 'moderate' | 'high'
    adherenceRate,
    streak,
    avgDelayMinutes,
    timingConsistency: avgDelayMinutes <= 20 ? 'Excellent' : avgDelayMinutes <= 60 ? 'Acceptable' : 'Variable',
    anomalies
  };
}

// ── Inactivity Guardian ("Are You Okay?" check) ───────────────────────────────

export function computeInactivityCheck(dayLogs, now = Date.now()) {
  const overdueUnresponded = dayLogs.filter((log) => {
    if (log.status !== 'pending') return false;
    const schedTime = new Date(log.scheduledTime).getTime();
    return now - schedTime > 90 * 60_000; // 90 minutes overdue
  });

  const anyActionTakenToday = dayLogs.some((log) => log.status === 'taken' || log.status === 'skipped');

  return {
    needsReassurance: overdueUnresponded.length > 0 && !anyActionTakenToday,
    overdueCount: overdueUnresponded.length,
    oldestOverdueTime: overdueUnresponded[0]?.scheduledTime || null
  };
}

// ── Read Model Assembly ───────────────────────────────────────────────────────

export async function patientSummary(patientId, actor = null) {
  await ensureTodayLogs(patientId);
  const [patient, medications, logs, access] = await Promise.all([
    repository.users.findById(patientId),
    repository.medications.forPatient(patientId),
    logsForPatient(patientId),
    accessFor(actor, patientId)
  ]);

  const lang = patient?.preferredLanguage || 'en';
  const dayLogs = logs.filter((log) => log.scheduledTime.startsWith(today()));
  const taken = count(dayLogs, 'taken');
  const streak = currentStreak(logs);
  const riskAssessment = computeRiskAssessment(logs, streak);
  const inactivityCheck = computeInactivityCheck(dayLogs);

  // Attach dietary advice to medications for seamless client rendering
  const enrichedMedications = medications.map((med) => ({
    ...med,
    safety: dietaryForMedication(med.name, lang)
  }));

  // Fetch full safety advisory (interactions & polypharmacy)
  const safetyAdvisory = await getSafetyAdvisory(patientId, lang);

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
    streak,
    riskAssessment,
    inactivityCheck,
    safety: safetyAdvisory,
    logs,
    medications: enrichedMedications
  };
}
