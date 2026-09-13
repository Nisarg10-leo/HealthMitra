import { useCallback, useEffect, useState } from 'react';
import { alertsApi, patientsApi } from '../api/index.js';

// Loads everything the workspace shell needs for the selected patient and
// exposes `refresh()` so any feature can ask for fresh data after a mutation.
export function useWorkspaceData(session, notify) {
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(session.role === 'patient' ? session.id : '');
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  // Periodic polling every 30s to keep schedule, alerts, and reminders in sync
  useEffect(() => {
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const availablePatients = await patientsApi.list();
        if (!active) return;
        setPatients(availablePatients);
        const patientId = session.role === 'patient' ? session.id : selectedPatientId || availablePatients[0]?.patient?.id;
        if (session.role === 'caregiver' && patientId && patientId !== selectedPatientId) setSelectedPatientId(patientId);
        if (!patientId) {
          setDashboard(null);
          setAlerts([]);
          return;
        }
        const [nextDashboard, nextAlerts, nextNotifications] = await Promise.all([patientsApi.dashboard(patientId), alertsApi.list(patientId), alertsApi.notifications()]);
        if (!active) return;

        // Auto-clean any notifications whose dose is already recorded (taken/skipped)
        if (nextDashboard?.logs && Array.isArray(nextNotifications)) {
          nextNotifications.forEach((n) => {
            if (n.type === 'reminder' && !n.readAt && n.doseLogId) {
              const log = nextDashboard.logs.find((l) => l.id === n.doseLogId);
              if (log && log.status !== 'pending') {
                alertsApi.markNotificationRead(n.id).catch(() => {});
                n.readAt = new Date().toISOString();
              }
            }
          });
        }

        setDashboard(nextDashboard);
        setAlerts(nextAlerts);
        setNotifications(nextNotifications);
      } catch (requestError) {
        if (active) notify(requestError.message);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey, selectedPatientId, session, notify]);

  return { patients, selectedPatientId, setSelectedPatientId, dashboard, alerts, notifications, refresh };
}
