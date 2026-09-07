import { repository } from '../data/repository.js';
import { forbidden } from '../lib/httpError.js';

const NO_ACCESS = { allowed: false, canEdit: false, permissionLevel: null };

// Single source of truth for "who may see or change this patient's data".
export async function accessFor(actor, patientId) {
  if (!actor || !patientId) return NO_ACCESS;
  if (actor.role === 'patient' && actor.id === patientId) return { allowed: true, canEdit: true, permissionLevel: 'owner' };
  const link = await repository.links.find(patientId, actor.id);
  if (!link) return NO_ACCESS;
  return { allowed: true, canEdit: link.permissionLevel === 'edit', permissionLevel: link.permissionLevel };
}

export async function patientIdsFor(actor) {
  if (!actor) return [];
  if (actor.role === 'patient') return [actor.id];
  return (await repository.links.forCaregiver(actor.id)).map((link) => link.patientId);
}

// Resolves which patient a request is about: explicit query param, the patient
// themself, or the caregiver's first linked patient.
export async function resolvePatientId(req, actor) {
  return req.query.patient_id || req.body?.patientId || (actor.role === 'patient' ? actor.id : (await patientIdsFor(actor))[0]);
}

export async function assertCanView(actor, patientId, message = 'You do not have access to this patient.') {
  const access = await accessFor(actor, patientId);
  if (!patientId || !access.allowed) throw forbidden(message);
  return access;
}

export async function assertCanEdit(actor, patientId, message = 'Only the patient or an edit-enabled caregiver can change this.') {
  const access = await accessFor(actor, patientId);
  if (!access.allowed || !access.canEdit) throw forbidden(message);
  return access;
}
