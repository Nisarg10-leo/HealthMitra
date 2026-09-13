import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, sosApi } from '../api/index.js';
import { NavButtons } from '../components/layout/NavButtons.jsx';
import { ReminderBanner } from '../components/layout/ReminderBanner.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { MedicineAlarmModal } from '../components/ui/MedicineAlarmModal.jsx';
import { useSession } from '../hooks/useSession.js';
import { useSpeechInput } from '../hooks/useSpeech.js';
import { useToast } from '../hooks/useToast.js';
import { useWorkspaceData } from '../hooks/useWorkspaceData.js';
import { isToday } from '../utils/format.js';
import { CheckIcon, CrossMedicalIcon } from '../components/ui/Icons.jsx';
import { ModalHost } from './ModalHost.jsx';
import { WorkspaceContext } from './WorkspaceContext.jsx';
import { defaultTabFor, navigationFor } from './navigation.js';
import { SCREENS } from './screens.js';

// The signed-in shell: navigation, top bar, data loading, active screen, and real-time medicine alarm.
export function Workspace({ onLogout }) {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const [tab, setTab] = useState(() => defaultTabFor(session.role));
  const [modal, setModal] = useState(null);
  const [alarmDose, setAlarmDose] = useState(null);
  const handledAlarmIdsRef = useRef(new Set());
  const { toast, notify } = useToast();
  const listen = useSpeechInput(notify);
  const data = useWorkspaceData(session, notify);

  const alarmMedication = alarmDose
    ? data.dashboard?.medications?.find((m) => m.id === alarmDose.medicationId)
    : null;

  // Real-time Medicine Alarm trigger loop for both Patient and Caregiver
  useEffect(() => {
    if (!data.dashboard?.logs) return;

    const checkDueAlarm = () => {
      const now = new Date();
      const dueDose = data.dashboard.logs.find((log) => {
        if (log.status !== 'pending' || !isToday(log.scheduledTime)) return false;
        if (handledAlarmIdsRef.current.has(log.id)) return false;
        const sched = new Date(log.scheduledTime);
        return now >= sched;
      });

      if (dueDose && !alarmDose) {
        handledAlarmIdsRef.current.add(dueDose.id);
        setAlarmDose(dueDose);
      }
    };

    checkDueAlarm();
    const timer = setInterval(checkDueAlarm, 5_000);
    return () => clearInterval(timer);
  }, [data.dashboard, alarmDose]);

  // Synchronized Alarm Dismissal: If alarm is currently ringing for a dose,
  // and that dose is marked taken/skipped in logs (e.g. by patient on their phone),
  // stop the alarm immediately across all connected caregiver and patient screens!
  useEffect(() => {
    if (!alarmDose || !data.dashboard?.logs) return;
    const currentLog = data.dashboard.logs.find((l) => l.id === alarmDose.id);
    if (currentLog && currentLog.status !== 'pending') {
      setAlarmDose(null);
      if (session.role === 'caregiver') {
        const pName = data.dashboard?.patient?.name || 'Patient';
        const medName = alarmMedication?.name || 'Medication';
        notify(
          i18n.language === 'hi'
            ? `${pName} जी ने ${medName} ले ली है। अलार्म बंद कर दिया गया।`
            : `${pName} has ${currentLog.status === 'taken' ? 'taken' : 'skipped'} ${medName}. Alarm stopped.`
        );
      }
    }
  }, [data.dashboard?.logs, alarmDose, session.role, alarmMedication, notify, i18n.language]);

  // Instant Cross-Tab Real-time Synchronized Alarm Stop
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('healthmitra_sync_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'DOSE_CONFIRMED') {
        if (alarmDose && (!event.data.doseId || alarmDose.id === event.data.doseId)) {
          setAlarmDose(null);
        }
        data.refresh();
      }
    };
    return () => channel.close();
  }, [alarmDose, data.refresh]);

  const handleAlarmConfirm = async (dose, status) => {
    // 1. Instantly unmount the modal so the alarm stops immediately
    setAlarmDose(null);

    // 2. Broadcast instant stop to all open tabs / caregiver windows
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('healthmitra_sync_channel');
        channel.postMessage({ type: 'DOSE_CONFIRMED', doseId: dose?.id, status });
        channel.close();
      } catch (e) {}
    }

    // 3. Handle test alarm demo click gracefully
    if (!dose?.id || dose.id === 'test-alarm-id') {
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      return;
    }

    // 4. Persist real scheduled dose confirmation
    try {
      await dosesApi.confirm(dose.id, status, 'alarm');
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      data.refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  const handleAlarmSnooze = (dose) => {
    setAlarmDose(null);
    notify(i18n.language === 'hi' ? 'अलार्म 5 मिनट के लिए स्नूज़ किया गया।' : 'Alarm snoozed for 5 minutes.');
    setTimeout(() => {
      handledAlarmIdsRef.current.delete(dose.id);
    }, 5 * 60_000);
  };

  const triggerAlarmManually = (dose) => {
    setAlarmDose(dose);
  };

  const handleSos = () => {
    setModal({ kind: 'sos' });
  };

  const workspace = useMemo(() => ({
    dashboard: data.dashboard,
    alerts: data.alerts,
    patients: data.patients,
    selectedPatientId: data.selectedPatientId,
    selectPatient: data.setSelectedPatientId,
    refresh: data.refresh,
    notify,
    listen,
    openModal: setModal,
    triggerAlarm: triggerAlarmManually,
    setTab
  }), [data.dashboard, data.alerts, data.patients, data.selectedPatientId, data.setSelectedPatientId, data.refresh, notify, listen, setTab]);

  const navItems = navigationFor(session.role, t);
  const unreadAlerts = data.alerts.filter((item) => !item.readBy?.includes(session.id)).length;
  const dueReminder = data.notifications.find((item) => {
    if (item.type !== 'reminder' || item.readAt) return false;
    if (item.doseLogId && data.dashboard?.logs) {
      const log = data.dashboard.logs.find((l) => l.id === item.doseLogId);
      if (log && log.status !== 'pending') return false;
    }
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    if (ageMs > 4 * 3600_000) return false;
    return true;
  });
  const Screen = SCREENS[tab] || SCREENS.today;

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="shell">
        <Sidebar
          session={session}
          items={navItems}
          activeTab={tab}
          onSelect={setTab}
          unreadAlerts={unreadAlerts}
          onLogout={onLogout}
        />
        <main className="content">
          <Topbar
            session={session}
            patients={data.patients}
            selectedPatient={data.dashboard?.patient}
            selectedPatientId={data.selectedPatientId}
            onSelectPatient={data.setSelectedPatientId}
            onSos={handleSos}
          />
          {!data.dashboard ? (
            <div className="loading">
              <div className="loading-mark"><CrossMedicalIcon size={24} /></div>
              <p>{session.role === 'caregiver' ? t('noLinkedPatients') : t('loadingPlan')}</p>
              {session.role === 'caregiver' && (
                <button className="primary" onClick={() => setModal({ kind: 'join' })}>
                  {t('joinWithCode')}
                </button>
              )}
            </div>
          ) : (
            <>
              {dueReminder && (
                <div className="workspace-reminder-container" style={{ marginBottom: '28px' }}>
                  <ReminderBanner notification={dueReminder} onDismissed={data.refresh} />
                </div>
              )}
              <Screen />
            </>
          )}
        </main>

        {/* Real-time Medicine Alarm Overlay */}
        {alarmDose && (
          <MedicineAlarmModal
            dose={alarmDose}
            medication={alarmMedication}
            patientName={data.dashboard?.patient?.name || session.name}
            isCaregiver={session.role === 'caregiver'}
            onConfirm={handleAlarmConfirm}
            onSnooze={handleAlarmSnooze}
            onClose={() => setAlarmDose(null)}
          />
        )}

        <ModalHost modal={modal} onClose={() => setModal(null)} />
        {toast && (
          <div className="toast" role="status">
            <CheckIcon size={16} />
            <span>{toast}</span>
          </div>
        )}
        <nav className="mobile-nav" aria-label={t('mainNavigation')}>
          <NavButtons items={navItems} activeTab={tab} onSelect={setTab} unreadAlerts={unreadAlerts} />
        </nav>
      </div>
    </WorkspaceContext.Provider>
  );
}
