import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi } from '../api/index.js';
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
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');

  // Real-time Medicine Alarm trigger loop
  useEffect(() => {
    if (session.role !== 'patient' || !data.dashboard?.logs) return;

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
    const timer = setInterval(checkDueAlarm, 15_000);
    return () => clearInterval(timer);
  }, [data.dashboard, session.role, alarmDose]);

  const handleAlarmConfirm = async (dose, status) => {
    try {
      await dosesApi.confirm(dose.id, status, 'alarm');
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      setAlarmDose(null);
      data.refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  const handleAlarmSnooze = (dose) => {
    setAlarmDose(null);
    notify(i18n.language === 'hi' ? 'अलार्म 5 मिनट के लिए स्नूज़ किया गया।' : 'Alarm snoozed for 5 minutes.');
    // Re-enable after 5 minutes
    setTimeout(() => {
      handledAlarmIdsRef.current.delete(dose.id);
    }, 5 * 60_000);
  };

  const triggerAlarmManually = (dose) => {
    setAlarmDose(dose);
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
  const dueReminder = data.notifications.find((item) => item.type === 'reminder' && !item.readAt);
  const Screen = SCREENS[tab] || SCREENS.contacts;

  // Find medication info for the alarming dose
  const alarmMedication = alarmDose
    ? data.dashboard?.medications?.find((m) => m.id === alarmDose.medicationId)
    : null;

  return <WorkspaceContext.Provider value={workspace}>
    <div className="shell">
      <Sidebar session={session} items={navItems} activeTab={tab} onSelect={setTab} unreadAlerts={unreadAlerts} onToggleLanguage={toggleLanguage} onLogout={onLogout} />
      <main className="content">
        <Topbar session={session} patients={data.patients} selectedPatient={data.dashboard?.patient} selectedPatientId={data.selectedPatientId} onSelectPatient={data.setSelectedPatientId} onToggleLanguage={toggleLanguage} onSos={() => setModal({ kind: 'sos' })} />
        {!data.dashboard
          ? <div className="loading"><div className="loading-mark"><CrossMedicalIcon size={24} /></div><p>{session.role === 'caregiver' ? t('noLinkedPatients') : t('loadingPlan')}</p>{session.role === 'caregiver' && <button className="primary" onClick={() => setModal({ kind: 'join' })}>{t('joinWithCode')}</button>}</div>
          : <>
            {dueReminder && <ReminderBanner notification={dueReminder} onDismissed={data.refresh} />}
            <Screen />
          </>}
      </main>

      {/* Real-time Medicine Alarm Overlay */}
      {alarmDose && (
        <MedicineAlarmModal
          dose={alarmDose}
          medication={alarmMedication}
          patientName={data.dashboard?.patient?.name}
          onConfirm={handleAlarmConfirm}
          onSnooze={handleAlarmSnooze}
          onClose={() => setAlarmDose(null)}
        />
      )}

      <ModalHost modal={modal} onClose={() => setModal(null)} />
      {toast && <div className="toast" role="status"><CheckIcon size={16} /><span>{toast}</span></div>}
      <nav className="mobile-nav" aria-label={t('mainNavigation')}><NavButtons items={navItems} activeTab={tab} onSelect={setTab} unreadAlerts={unreadAlerts} /></nav>
    </div>
  </WorkspaceContext.Provider>;
}
