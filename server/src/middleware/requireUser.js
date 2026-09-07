import { repository } from '../data/repository.js';
import { unauthorized } from '../lib/httpError.js';

// Prototype session: the client sends its user id in `x-user-id`. Swapping to
// JWT/session cookies only changes this file; routes keep reading `req.actor`.
export async function requireUser(req, _res, next) {
  try {
    const userId = req.header('x-user-id');
    if (!userId) return next(unauthorized());
    const actor = await repository.users.findById(userId);
    if (!actor) return next(unauthorized());
    req.actor = actor;
    return next();
  } catch (error) {
    return next(unauthorized());
  }
}
