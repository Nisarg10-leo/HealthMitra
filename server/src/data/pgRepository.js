import { config } from '../config.js';
import { query } from './db.js';

// ── helpers ────────────────────────────────────────────────────────────────────
// Postgres snake_case ↔ JS camelCase mapping.

const SNAKE_TO_CAMEL = {
  patient_id: 'patientId', caregiver_id: 'caregiverId', password_hash: 'passwordHash',
  preferred_language: 'preferredLanguage', created_at: 'createdAt', permission_level: 'permissionLevel',
  invite_code: 'inviteCode', frequency_per_day: 'frequencyPerDay', start_date: 'startDate',
  end_date: 'endDate', medication_id: 'medicationId', scheduled_time: 'scheduledTime',
  responded_at: 'respondedAt', response_method: 'responseMethod', reminder_sent_at: 'reminderSentAt',
  missed_alert_sent_at: 'missedAlertSentAt', triggered_at: 'triggeredAt', location_url: 'locationUrl',
  updated_at: 'updatedAt', read_by: 'readBy', dose_log_id: 'doseLogId', sos_id: 'sosId',
  user_id: 'userId', read_at: 'readAt', alert_id: 'alertId', symptom_tag: 'symptomTag',
  suggestion_text: 'suggestionText', disclaimer_text: 'disclaimerText'
};

const CAMEL_TO_SNAKE = Object.fromEntries(Object.entries(SNAKE_TO_CAMEL).map(([k, v]) => [v, k]));

// Map legacy in-memory prototype IDs to deterministic UUIDs so existing browser sessions still work.
const LEGACY_ID_MAP = {
  'patient-1': '00000000-0000-4000-a000-000000000001',
  'caregiver-1': '00000000-0000-4000-a000-000000000002',
  'caregiver-2': '00000000-0000-4000-a000-000000000003',
  'med-1': '00000000-0000-4000-c000-000000000001',
  'med-2': '00000000-0000-4000-c000-000000000002',
  'med-3': '00000000-0000-4000-c000-000000000003'
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resolveId = (id) => LEGACY_ID_MAP[id] || id;
const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(resolveId(val));
const cleanUuid = (val) => (isUuid(val) ? resolveId(val) : null);

function formatLocalIso(date, timeZone = config.timezone) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
}

function formatDateOnly(date) {
  if (!date) return null;
  if (typeof date === 'string') return date.slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return String(date);
}

function toCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = SNAKE_TO_CAMEL[k] || k;
    out[camelKey] = v;
  }

  // Normalize scheduledTime to local ISO string ("YYYY-MM-DDTHH:MM:SS")
  if (row.scheduled_time) {
    out.scheduledTime = formatLocalIso(row.scheduled_time);
  }

  // Normalize other timestamps to standard ISO strings
  ['created_at', 'triggered_at', 'read_at', 'responded_at', 'reminder_sent_at', 'missed_alert_sent_at', 'updated_at'].forEach((col) => {
    if (row[col] instanceof Date) {
      out[SNAKE_TO_CAMEL[col]] = row[col].toISOString();
    }
  });

  // Normalize dates to "YYYY-MM-DD"
  if (row.start_date) out.startDate = formatDateOnly(row.start_date);
  if (row.end_date) out.endDate = formatDateOnly(row.end_date);

  // Normalize TIME[] to ["HH:MM"]
  if (out.times && Array.isArray(out.times)) {
    out.times = out.times.map((t) => String(t).slice(0, 5));
  }

  // Normalize arrays and numbers
  if ('read_by' in row) out.readBy = Array.isArray(out.readBy) ? out.readBy : [];
  if (row.latitude != null) out.latitude = Number(row.latitude);
  if (row.longitude != null) out.longitude = Number(row.longitude);

  return out;
}

function rows(result) { return (result?.rows || []).map(toCamel); }
function one(result) { return toCamel(result?.rows?.[0]); }

function buildInsert(table, obj) {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  const cols = entries.map(([k]) => CAMEL_TO_SNAKE[k] || k);
  const vals = entries.map(([k, v]) => (['patientId', 'caregiverId', 'medicationId', 'userId', 'alertId', 'doseLogId', 'sosId'].includes(k) ? resolveId(v) : v));
  const placeholders = vals.map((_, i) => `$${i + 1}`);
  return { text: `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`, values: vals };
}

function buildUpdate(table, id, changes) {
  const cleanId = cleanUuid(id);
  const entries = Object.entries(changes).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return { text: `SELECT * FROM ${table} WHERE id = $1`, values: [cleanId] };
  }
  const sets = entries.map(([k], i) => `${CAMEL_TO_SNAKE[k] || k} = $${i + 1}`);
  const vals = entries.map(([k, v]) => (['patientId', 'caregiverId', 'medicationId', 'userId', 'alertId', 'doseLogId', 'sosId'].includes(k) ? resolveId(v) : v));
  vals.push(cleanId);
  return { text: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`, values: vals };
}

// ── repository ─────────────────────────────────────────────────────────────────

export const pgRepository = {
  users: {
    findById: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query('SELECT * FROM users WHERE id = $1', [uid]));
    },
    findByEmail: async (email) => one(await query('SELECT * FROM users WHERE email = $1', [email])),
    listPatients: async () => rows(await query("SELECT * FROM users WHERE role = 'patient'")),
    insert: async (item) => one(await query(...Object.values(buildInsert('users', item))))
  },

  links: {
    forCaregiver: async (caregiverId) => {
      const uid = cleanUuid(caregiverId);
      if (!uid) return [];
      return rows(await query('SELECT * FROM patient_caregiver_links WHERE caregiver_id = $1', [uid]));
    },
    forPatient: async (patientId) => {
      const uid = cleanUuid(patientId);
      if (!uid) return [];
      return rows(await query('SELECT * FROM patient_caregiver_links WHERE patient_id = $1', [uid]));
    },
    find: async (patientId, caregiverId) => {
      const pId = cleanUuid(patientId);
      const cId = cleanUuid(caregiverId);
      if (!pId || !cId) return null;
      return one(await query('SELECT * FROM patient_caregiver_links WHERE patient_id = $1 AND caregiver_id = $2', [pId, cId]));
    },
    findByInviteCode: async (code) => one(await query('SELECT * FROM patient_caregiver_links WHERE invite_code = $1', [code])),
    insert: async (item) => one(await query(...Object.values(buildInsert('patient_caregiver_links', item))))
  },

  medications: {
    findById: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query('SELECT * FROM medications WHERE id = $1', [uid]));
    },
    forPatient: async (patientId) => {
      const uid = cleanUuid(patientId);
      if (!uid) return [];
      return rows(await query('SELECT * FROM medications WHERE patient_id = $1', [uid]));
    },
    insert: async (item) => one(await query(...Object.values(buildInsert('medications', item)))),
    update: async (id, changes) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query(...Object.values(buildUpdate('medications', uid, changes))));
    },
    remove: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return false;
      const r = await query('DELETE FROM medications WHERE id = $1', [uid]);
      return r.rowCount > 0;
    }
  },

  doseLogs: {
    findById: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query('SELECT * FROM dose_logs WHERE id = $1', [uid]));
    },
    forMedications: async (medicationIds) => {
      const ids = [...medicationIds].map(cleanUuid).filter(Boolean);
      if (ids.length === 0) return [];
      return rows(await query('SELECT * FROM dose_logs WHERE medication_id = ANY($1::uuid[])', [ids]));
    },
    exists: async (medicationId, scheduledTime) => {
      const uid = cleanUuid(medicationId);
      if (!uid) return false;
      const r = await query('SELECT 1 FROM dose_logs WHERE medication_id = $1 AND scheduled_time = $2::timestamptz LIMIT 1', [uid, scheduledTime]);
      return r.rowCount > 0;
    },
    insert: async (item) => one(await query(...Object.values(buildInsert('dose_logs', item)))),
    update: async (id, changes) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query(...Object.values(buildUpdate('dose_logs', uid, changes))));
    }
  },

  alerts: {
    findById: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query('SELECT * FROM alerts WHERE id = $1', [uid]));
    },
    forPatients: async (patientIds) => {
      const ids = [...patientIds].map(cleanUuid).filter(Boolean);
      if (ids.length === 0) return [];
      return rows(await query('SELECT * FROM alerts WHERE patient_id = ANY($1::uuid[]) ORDER BY created_at DESC', [ids]));
    },
    insert: async (item) => one(await query(...Object.values(buildInsert('alerts', item)))),
    update: async (id, changes) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query(...Object.values(buildUpdate('alerts', uid, changes))));
    }
  },

  notifications: {
    forUser: async (userId) => {
      const uid = cleanUuid(userId);
      if (!uid) return [];
      return rows(await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [uid]));
    },
    findForUser: async (id, userId) => {
      const nId = cleanUuid(id);
      const uId = cleanUuid(userId);
      if (!nId || !uId) return null;
      return one(await query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [nId, uId]));
    },
    insert: async (item) => one(await query(...Object.values(buildInsert('notifications', item)))),
    update: async (id, changes) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query(...Object.values(buildUpdate('notifications', uid, changes))));
    }
  },

  sosEvents: {
    findById: async (id) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query('SELECT * FROM sos_events WHERE id = $1', [uid]));
    },
    forPatient: async (patientId) => {
      const uid = cleanUuid(patientId);
      if (!uid) return [];
      return rows(await query('SELECT * FROM sos_events WHERE patient_id = $1 ORDER BY triggered_at DESC', [uid]));
    },
    insert: async (item) => one(await query(...Object.values(buildInsert('sos_events', item)))),
    update: async (id, changes) => {
      const uid = cleanUuid(id);
      if (!uid) return null;
      return one(await query(...Object.values(buildUpdate('sos_events', uid, changes))));
    }
  },

  contacts: {
    forPatient: async (type, patientId) => {
      const uid = cleanUuid(patientId);
      if (!uid) return [];
      const table = type === 'doctors' ? 'doctors' : 'chemists';
      return rows(await query(`SELECT * FROM ${table} WHERE patient_id = $1`, [uid]));
    },
    insert: async (type, item) => {
      const table = type === 'doctors' ? 'doctors' : 'chemists';
      return one(await query(...Object.values(buildInsert(table, item))));
    }
  }
};
