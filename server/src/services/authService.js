import { repository } from '../data/repository.js';
import { badRequest, conflict, unauthorized } from '../lib/httpError.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...publicFields } = user;
  return publicFields;
}

export function validatePasswordStrength(password) {
  const str = String(password || '');
  if (str.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(str)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(str)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(str)) return 'Password must include at least one number.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(str)) return 'Password must include at least one special character.';
  return null;
}

export async function register({ name, email, phone = '', password, role, preferredLanguage = 'en' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !normalizedEmail || !String(password || '') || !['patient', 'caregiver'].includes(role)) {
    throw badRequest('Name, email, password, and role are required.');
  }
  const passwordError = validatePasswordStrength(password);
  if (passwordError) throw badRequest(passwordError);
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
