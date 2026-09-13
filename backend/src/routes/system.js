import { Router } from 'express';
import { config } from '../config.js';
import { requireUser } from '../middleware/requireUser.js';
import { schedulerState } from '../scheduler/reminderScheduler.js';

export const systemRouter = Router();

systemRouter.get('/health', (_req, res) => res.json({ ok: true, mode: config.storeMode, timezone: config.timezone, scheduler: schedulerState }));
systemRouter.get('/scheduler/status', requireUser, (_req, res) => res.json({ ...schedulerState, reminderWindowMinutes: config.reminderWindowMinutes, timezone: config.timezone }));
