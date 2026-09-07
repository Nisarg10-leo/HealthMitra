import { repository } from '../data/repository.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';

export async function inviteCaregiver(actor, patientId, { email, caregiverEmail, permissionLevel }) {
  if (actor.role !== 'patient' || actor.id !== patientId) throw forbidden('Only the patient can invite a caregiver.');
  const normalizedEmail = String(email || caregiverEmail || '').trim().toLowerCase();
  const caregiver = await repository.users.findByEmail(normalizedEmail);
  if (!caregiver || caregiver.role !== 'caregiver') throw notFound('No caregiver account was found with that email.');
  const existing = await repository.links.find(actor.id, caregiver.id);
  if (existing) return { created: false, link: existing };
  const link = await repository.links.insert({
    patientId: actor.id,
    caregiverId: caregiver.id,
    permissionLevel: permissionLevel === 'edit' ? 'edit' : 'view',
    inviteCode: `MITRA-${Math.floor(1000 + Math.random() * 9000)}`
  });
  return { created: true, link };
}

export async function joinWithCode(actor, rawCode) {
  if (actor.role !== 'caregiver') throw forbidden('Only caregiver accounts can join a patient link.');
  const code = String(rawCode || '').trim().toUpperCase();
  const invite = await repository.links.findByInviteCode(code);
  if (!invite) throw badRequest('That invite code is not valid.');
  if (!(await repository.links.find(invite.patientId, actor.id))) {
    await repository.links.insert({ patientId: invite.patientId, caregiverId: actor.id, permissionLevel: 'view', inviteCode: code });
  }
  return { ok: true };
}
