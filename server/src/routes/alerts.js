import { Router } from 'express';
import { notFound } from '../lib/httpError.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { accessFor, patientIdsFor } from '../services/accessService.js';
import { listAlerts, listNotifications, markAlertRead, markNotificationRead } from '../services/notificationService.js';

export const alertsRouter = Router();

alertsRouter.get('/alerts', asyncRoute(async (req, res) => res.json(await listAlerts(await patientIdsFor(req.actor)))));
alertsRouter.post('/alerts/:id/read', asyncRoute(async (req, res) => {
  const item = await markAlertRead(req.params.id, req.actor.id);
  if (!item || !(await accessFor(req.actor, item.patientId)).allowed) throw notFound('Alert not found.');
  res.json(item);
}));
alertsRouter.get('/notifications', asyncRoute(async (req, res) => res.json(await listNotifications(req.actor.id))));
alertsRouter.post('/notifications/:id/read', asyncRoute(async (req, res) => {
  const item = await markNotificationRead(req.params.id, req.actor.id);
  if (!item) throw notFound('Notification not found.');
  res.json(item);
}));
