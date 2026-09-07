import { repository } from '../data/repository.js';
import { badRequest } from '../lib/httpError.js';
import { assertCanEdit } from './accessService.js';

export const CONTACT_TYPES = ['doctors', 'chemists'];
const text = (value) => String(value || '').trim();

export const listContacts = (type, patientId) => repository.contacts.forPatient(type, patientId);

export async function addContact(actor, type, patientId, body = {}) {
  await assertCanEdit(actor, patientId, 'Only the patient or an edit-enabled caregiver can add contacts.');
  if (!text(body.name) || !text(body.phone)) throw badRequest('Name and phone are required.');
  const base = { patientId, name: text(body.name), phone: text(body.phone) };
  const details = type === 'doctors' ? { specialty: text(body.specialty), notes: text(body.notes) } : { address: text(body.address) };
  return repository.contacts.insert(type, { ...base, ...details });
}
