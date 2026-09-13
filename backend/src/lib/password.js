import crypto from 'node:crypto';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  try {
    const [salt, digest] = stored.split(':');
    if (!salt || !digest) return false;
    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    const actualBuf = Buffer.from(actual, 'hex');
    const digestBuf = Buffer.from(digest, 'hex');
    if (actualBuf.length !== digestBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, digestBuf);
  } catch {
    return false;
  }
}
