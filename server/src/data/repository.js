import crypto from 'node:crypto';
import { tables } from './memoryStore.js';

// Repository = the only data-access abstraction the services know about.
// Every method is async even though the memory store is synchronous, so a
// PostgreSQL implementation with the same method names can replace this file
// without touching a single service or route.
const byId = (table) => (id) => Promise.resolve(tables[table].find((item) => item.id === id) || null);
const where = (table) => (predicate) => Promise.resolve(tables[table].filter(predicate));
const insert = (table, { atFront = false } = {}) => (item) => {
  const record = { id: crypto.randomUUID(), ...item };
  if (atFront) tables[table].unshift(record);
  else tables[table].push(record);
  return Promise.resolve(record);
};
const update = (table) => async (id, changes) => {
  const record = tables[table].find((item) => item.id === id);
  if (record) Object.assign(record, changes);
  return record || null;
};
const remove = (table) => async (id) => {
  const index = tables[table].findIndex((item) => item.id === id);
  if (index >= 0) tables[table].splice(index, 1);
  return index >= 0;
};

export const repository = {
  users: {
    findById: byId('users'),
    findByEmail: (email) => Promise.resolve(tables.users.find((item) => item.email === email) || null),
    listPatients: () => where('users')((item) => item.role === 'patient'),
    insert: insert('users')
  },
  links: {
    forCaregiver: (caregiverId) => where('links')((link) => link.caregiverId === caregiverId),
    forPatient: (patientId) => where('links')((link) => link.patientId === patientId),
    find: (patientId, caregiverId) => Promise.resolve(tables.links.find((link) => link.patientId === patientId && link.caregiverId === caregiverId) || null),
    findByInviteCode: (code) => Promise.resolve(tables.links.find((link) => link.inviteCode === code) || null),
    insert: insert('links')
  },
  medications: {
    findById: byId('medications'),
    forPatient: (patientId) => where('medications')((item) => item.patientId === patientId),
    insert: insert('medications'),
    update: update('medications'),
    remove: remove('medications')
  },
  doseLogs: {
    findById: byId('doseLogs'),
    forMedications: (medicationIds) => where('doseLogs')((log) => medicationIds.has(log.medicationId)),
    exists: (medicationId, scheduledTime) => Promise.resolve(tables.doseLogs.some((log) => log.medicationId === medicationId && log.scheduledTime === scheduledTime)),
    insert: insert('doseLogs'),
    update: update('doseLogs')
  },
  alerts: {
    findById: byId('alerts'),
    forPatients: (patientIds) => where('alerts')((item) => patientIds.has(item.patientId)),
    insert: insert('alerts', { atFront: true })
  },
  notifications: {
    forUser: (userId) => where('notifications')((item) => item.userId === userId),
    findForUser: (id, userId) => Promise.resolve(tables.notifications.find((item) => item.id === id && item.userId === userId) || null),
    insert: insert('notifications', { atFront: true })
  },
  sosEvents: {
    findById: byId('sosEvents'),
    forPatient: (patientId) => where('sosEvents')((item) => item.patientId === patientId),
    insert: insert('sosEvents', { atFront: true }),
    update: update('sosEvents')
  },
  contacts: {
    forPatient: (type, patientId) => where(type)((item) => item.patientId === patientId),
    insert: (type, item) => insert(type)(item)
  }
};
