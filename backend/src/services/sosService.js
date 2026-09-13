import { repository } from '../data/repository.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';
import { nowIso } from '../lib/time.js';
import { accessFor } from './accessService.js';
import { raiseAlert } from './notificationService.js';

const SOS_STATUSES = ['active', 'acknowledged', 'resolved'];

export async function triggerSos(actor, { patientId, latitude, longitude }) {
  if (actor.role !== 'patient' || actor.id !== patientId) throw forbidden('Only the patient can trigger an SOS.');
  const hasCoordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  const event = await repository.sosEvents.insert({
    patientId,
    triggeredAt: nowIso(),
    latitude: hasCoordinates ? Number(latitude) : null,
    longitude: hasCoordinates ? Number(longitude) : null,
    locationUrl: hasCoordinates ? `https://maps.google.com/?q=${Number(latitude)},${Number(longitude)}` : null,
    status: 'active'
  });
  const locationMessage = hasCoordinates ? ` Location: ${event.locationUrl}` : ' Location was unavailable.';
  await raiseAlert(patientId, 'sos', `${actor.name} triggered an SOS at ${new Date().toLocaleTimeString()}.${locationMessage}`, { sosId: event.id, locationUrl: event.locationUrl }, 'all');
  return event;
}

export const listSosEvents = (patientId) => repository.sosEvents.forPatient(patientId);

export async function updateSosStatus(actor, id, status) {
  const event = await repository.sosEvents.findById(id);
  if (!event || !(await accessFor(actor, event.patientId)).allowed) throw notFound('SOS event not found.');
  if (!SOS_STATUSES.includes(status)) throw badRequest('Invalid SOS status.');
  return repository.sosEvents.update(id, { status, updatedAt: nowIso() });
}
