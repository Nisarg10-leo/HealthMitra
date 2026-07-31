import crypto from 'node:crypto';

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
export const REMINDER_WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES || 15);

const id = () => crypto.randomUUID();

export function localDateKey(value = new Date(), offsetDays = 0) {
  const date = new Date(value);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(date);
}

export const today = () => localDateKey();
export const isoAt = (time, date = today()) => `${date}T${time}:00`;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, digest] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(digest, 'hex'));
}

const demoPassword = hashPassword('demo123');
const seededUser = (idValue, name, role, email, phone, preferredLanguage = 'en') => ({
  id: idValue,
  name,
  role,
  email,
  phone,
  passwordHash: demoPassword,
  preferredLanguage
});

export const db = {
  users: [
    seededUser('patient-1', 'Meera Shah', 'patient', 'meera@demo.health', '+919810000001'),
    seededUser('caregiver-1', 'Arjun Shah', 'caregiver', 'arjun@demo.health', '+919810000002'),
    seededUser('caregiver-2', 'Kavya Shah', 'caregiver', 'kavya@demo.health', '+919810000003', 'hi')
  ],
  links: [
    { id: 'link-1', patientId: 'patient-1', caregiverId: 'caregiver-1', permissionLevel: 'edit', inviteCode: 'MITRA-4821' },
    { id: 'link-2', patientId: 'patient-1', caregiverId: 'caregiver-2', permissionLevel: 'view', inviteCode: 'MITRA-4821' }
  ],
  medications: [
    { id: 'med-1', patientId: 'patient-1', name: 'Metformin', dosage: '500 mg', frequencyPerDay: 2, times: ['08:00', '20:00'], startDate: today(), endDate: null, color: '#4f67d8' },
    { id: 'med-2', patientId: 'patient-1', name: 'Amlodipine', dosage: '5 mg', frequencyPerDay: 1, times: ['09:00'], startDate: today(), endDate: null, color: '#e77b47' },
    { id: 'med-3', patientId: 'patient-1', name: 'Vitamin D3', dosage: '1000 IU', frequencyPerDay: 1, times: ['13:00'], startDate: today(), endDate: null, color: '#2a9d8f' }
  ],
  doseLogs: [],
  sosEvents: [],
  alerts: [],
  notifications: [],
  doctors: [{ id: 'doc-1', patientId: 'patient-1', name: 'Dr. R. Nair', specialty: 'General Physician', phone: '+919812345678', notes: 'Clinic hours: 10 AM - 1 PM' }],
  chemists: [{ id: 'chem-1', patientId: 'patient-1', name: 'CarePlus Pharmacy', phone: '+919898765432', address: '14, Lake Road, Mumbai' }]
};

export function user(idValue) {
  return db.users.find((item) => item.id === idValue);
}

export function medications(patientId) {
  return db.medications.filter((item) => item.patientId === patientId);
}

export function patientForUser(currentUser) {
  if (!currentUser) return [];
  if (currentUser.role === 'patient') return [currentUser.id];
  return db.links.filter((link) => link.caregiverId === currentUser.id).map((link) => link.patientId);
}

export function accessFor(currentUser, patientId) {
  if (!currentUser || !patientId) return { allowed: false, canEdit: false, permissionLevel: null };
  if (currentUser.role === 'patient' && currentUser.id === patientId) {
    return { allowed: true, canEdit: true, permissionLevel: 'owner' };
  }
  const link = db.links.find((item) => item.patientId === patientId && item.caregiverId === currentUser.id);
  if (!link) return { allowed: false, canEdit: false, permissionLevel: null };
  return { allowed: true, canEdit: link.permissionLevel === 'edit', permissionLevel: link.permissionLevel };
}

export function canAccess(currentUser, patientId) {
  return accessFor(currentUser, patientId).allowed;
}

export function makeTodayLogs(patientId) {
  const date = today();
  medications(patientId).forEach((medication) => {
    const active = (!medication.startDate || medication.startDate <= date) && (!medication.endDate || medication.endDate >= date);
    if (!active) return;
    medication.times.forEach((time) => {
      const scheduledTime = isoAt(time, date);
      if (!db.doseLogs.some((log) => log.medicationId === medication.id && log.scheduledTime === scheduledTime)) {
        db.doseLogs.push({
          id: id(),
          medicationId: medication.id,
          scheduledTime,
          status: 'pending',
          respondedAt: null,
          responseMethod: null,
          reminderSentAt: null,
          missedAlertSentAt: null
        });
      }
    });
  });
  return db.doseLogs;
}

export function doseForUser(doseId, currentUser) {
  const log = db.doseLogs.find((item) => item.id === doseId);
  if (!log) return { log: null, medication: null, access: { allowed: false, canEdit: false } };
  const medication = db.medications.find((item) => item.id === log.medicationId);
  const access = accessFor(currentUser, medication?.patientId);
  return { log, medication, access };
}

export function pushNotification(userId, patientId, type, title, body, extra = {}) {
  const notification = {
    id: id(),
    userId,
    patientId,
    type,
    title,
    body,
    channel: 'in-app (push adapter placeholder)',
    createdAt: new Date().toISOString(),
    readAt: null,
    ...extra
  };
  db.notifications.unshift(notification);
  console.log(`[notification:${type}] ${user(userId)?.name || userId}: ${title}`);
  return notification;
}

export function alert(patientId, type, message, extra = {}, audience = 'caregivers') {
  const item = {
    id: id(),
    patientId,
    type,
    message,
    createdAt: new Date().toISOString(),
    readBy: [],
    ...extra
  };
  db.alerts.unshift(item);
  const recipients = audience === 'all'
    ? [patientId, ...db.links.filter((link) => link.patientId === patientId).map((link) => link.caregiverId)]
    : db.links.filter((link) => link.patientId === patientId).map((link) => link.caregiverId);
  const uniqueRecipients = [...new Set(recipients)];
  uniqueRecipients.forEach((recipientId) => pushNotification(recipientId, patientId, type, type === 'sos' ? 'Emergency SOS' : 'HealthMitra update', message, { alertId: item.id }));
  return item;
}

export function patientSummary(patientId, currentUser = null) {
  makeTodayLogs(patientId);
  const patient = user(patientId);
  const meds = medications(patientId);
  const medicationIds = new Set(meds.map((medication) => medication.id));
  const logs = db.doseLogs
    .filter((log) => medicationIds.has(log.medicationId))
    .sort((a, b) => b.scheduledTime.localeCompare(a.scheduledTime));
  const dayLogs = logs.filter((log) => log.scheduledTime.startsWith(today()));
  const taken = dayLogs.filter((log) => log.status === 'taken').length;
  const score = dayLogs.length ? Math.round((taken / dayLogs.length) * 100) : 0;
  const recentDates = [...new Set(logs.filter((log) => log.status === 'taken').map((log) => log.scheduledTime.slice(0, 10)))].sort().reverse();
  let streak = 0;
  for (let index = 0; index < recentDates.length; index += 1) {
    if (recentDates[index] === localDateKey(new Date(), -index)) streak += 1;
    else break;
  }
  const access = accessFor(currentUser, patientId);
  return {
    patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone, preferredLanguage: patient.preferredLanguage } : null,
    permissions: { canEdit: access.canEdit, permissionLevel: access.permissionLevel },
    today: {
      total: dayLogs.length,
      taken,
      pending: dayLogs.filter((log) => log.status === 'pending').length,
      missed: dayLogs.filter((log) => log.status === 'missed').length,
      skipped: dayLogs.filter((log) => log.status === 'skipped').length,
      score
    },
    streak,
    logs,
    medications: meds
  };
}

function seedHistory() {
  for (let day = 1; day <= 14; day += 1) {
    const date = localDateKey(new Date(), -day);
    db.medications.forEach((medication) => medication.times.forEach((time) => {
      const missed = day === 4 && medication.id === 'med-1' && time === '20:00';
      const skipped = day === 8 && medication.id === 'med-2';
      const status = missed ? 'missed' : skipped ? 'skipped' : 'taken';
      db.doseLogs.push({
        id: id(),
        medicationId: medication.id,
        scheduledTime: isoAt(time, date),
        status,
        respondedAt: status === 'missed' ? null : isoAt(time, date),
        responseMethod: status === 'missed' ? null : 'tap',
        reminderSentAt: isoAt(time, date),
        missedAlertSentAt: missed ? isoAt(time, date) : null
      });
    }));
  }
  db.alerts.push({
    id: 'alert-welcome',
    patientId: 'patient-1',
    type: 'info',
    message: 'Welcome back. Your medication plan is ready.',
    createdAt: new Date().toISOString(),
    readBy: []
  });
}

seedHistory();
