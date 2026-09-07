import crypto from 'node:crypto';
import { hashPassword } from '../lib/password.js';
import { isoAt, localDateKey, nowIso, today } from '../lib/time.js';

// In-memory tables that mirror server/sql/schema.sql one-to-one. Only
// repository.js is allowed to touch this object; services never import it.
const demoPassword = hashPassword('demo123');
const seededUser = (id, name, role, email, phone, preferredLanguage = 'en') => ({ id, name, role, email, phone, passwordHash: demoPassword, preferredLanguage });

export const tables = {
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

function seedHistory() {
  for (let day = 1; day <= 14; day += 1) {
    const date = localDateKey(new Date(), -day);
    tables.medications.forEach((medication) => medication.times.forEach((time) => {
      const missed = day === 4 && medication.id === 'med-1' && time === '20:00';
      const skipped = day === 8 && medication.id === 'med-2';
      const status = missed ? 'missed' : skipped ? 'skipped' : 'taken';
      tables.doseLogs.push({
        id: crypto.randomUUID(),
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
  tables.alerts.push({ id: 'alert-welcome', patientId: 'patient-1', type: 'info', message: 'Welcome back. Your medication plan is ready.', createdAt: nowIso(), readBy: [] });
}

seedHistory();
