import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { login, publicUser, register, requestPasswordReset, verifyAndResetPassword } from '../services/authService.js';

export const authRouter = Router();

authRouter.post('/auth/register', asyncRoute(async (req, res) => res.status(201).json(await register(req.body || {}))));
authRouter.post('/auth/login', asyncRoute(async (req, res) => res.json(await login(req.body || {}))));
authRouter.post('/auth/forgot-password', asyncRoute(async (req, res) => res.json(await requestPasswordReset(req.body?.email))));
authRouter.post('/auth/reset-password', asyncRoute(async (req, res) => res.json(await verifyAndResetPassword(req.body || {}))));
authRouter.get('/me', requireUser, (req, res) => res.json({ user: publicUser(req.actor) }));

