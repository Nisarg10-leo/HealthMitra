import { repository } from '../data/repository.js';
import { nowIso } from '../lib/time.js';
import { channels } from '../notifications/channels.js';

export async function pushNotification(userId, patientId, type, title, body, extra = {}) {
  const notification = await repository.notifications.insert({
    userId,
    patientId,
    type,
    title,
    body,
    channel: channels[0].name,
    createdAt: nowIso(),
    readAt: null,
    ...extra
  });
  const recipient = await repository.users.findById(userId);
  channels.forEach((channel) => channel.deliver(notification, recipient));
  return notification;
}

// An alert is a patient-scoped event that fans out to caregivers (and optionally
// the patient) as individual notifications.
export async function raiseAlert(patientId, type, message, extra = {}, audience = 'caregivers') {
  const item = await repository.alerts.insert({ patientId, type, message, createdAt: nowIso(), readBy: [], ...extra });
  const caregiverIds = (await repository.links.forPatient(patientId)).map((link) => link.caregiverId);
  const recipients = [...new Set(audience === 'all' ? [patientId, ...caregiverIds] : caregiverIds)];
  const title = type === 'sos' ? 'Emergency SOS' : 'HealthMitra update';
  await Promise.all(recipients.map((recipientId) => pushNotification(recipientId, patientId, type, title, message, { alertId: item.id })));
  return item;
}

export const listNotifications = async (userId) => (await repository.notifications.forUser(userId)).slice(0, 30);

export async function markNotificationRead(id, userId) {
  const item = await repository.notifications.findForUser(id, userId);
  if (!item) return null;
  return repository.notifications.update(id, { readAt: nowIso() });
}

export async function listAlerts(patientIds) {
  const items = await repository.alerts.forPatients(new Set(patientIds));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markAlertRead(id, actorId) {
  const item = await repository.alerts.findById(id);
  if (!item) return null;
  if (!item.readBy.includes(actorId)) {
    return repository.alerts.update(id, { readBy: [...item.readBy, actorId] });
  }
  return item;
}
