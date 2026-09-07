import { repository } from '../data/repository.js';
import { badRequest, conflict, unauthorized } from '../lib/httpError.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...publicFields } = user;
  return publicFields;
}

export async function register({ name, email, phone = '', password, role, preferredLanguage = 'en' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !normalizedEmail || !String(password || '') || !['patient', 'caregiver'].includes(role)) {
    throw badRequest('Name, email, password, and role are required.');
  }
  if (String(password).length < 6) throw badRequest('Password must be at least 6 characters.');
  if (await repository.users.findByEmail(normalizedEmail)) throw conflict('An account with this email already exists.');
  const user = await repository.users.insert({
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone || '').trim(),
    passwordHash: hashPassword(String(password)),
    role,
    preferredLanguage: preferredLanguage === 'hi' ? 'hi' : 'en'
  });
  return { user: publicUser(user), token: user.id };
}

export async function login({ email, password }) {
  const found = await repository.users.findByEmail(String(email || '').trim().toLowerCase());
  if (!found || !verifyPassword(String(password || ''), found.passwordHash)) throw unauthorized('Incorrect email or password.');
  return { user: publicUser(found), token: found.id };
}
