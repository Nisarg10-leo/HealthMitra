import { Router } from 'express';
import { notFound } from '../lib/httpError.js';
import { asyncRoute } from '../middleware/errorHandler.js';
import { accessFor, patientIdsFor, resolveId } from '../services/accessService.js';
import { listAlerts, listNotifications, markAlertRead, markNotificationRead } from '../services/notificationService.js';

export const alertsRouter = Router();

alertsRouter.get('/alerts', asyncRoute(async (req, res) => {
  const allowedPatientIds = await patientIdsFor(req.actor);
  if (req.query.patient_id) {
    const requested = resolveId(req.query.patient_id);
    if (allowedPatientIds.includes(requested) || allowedPatientIds.includes(req.query.patient_id)) {
      return res.json(await listAlerts([requested]));
    }
    return res.json([]);
  }
  return res.json(await listAlerts(allowedPatientIds));
}));
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
