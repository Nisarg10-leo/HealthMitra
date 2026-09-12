import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, sosApi } from '../api/index.js';
import { MedicineAlarmModal } from '../components/ui/MedicineAlarmModal.jsx';
import { useSession } from '../hooks/useSession.js';
import { useSpeechInput } from '../hooks/useSpeech.js';
import { useToast } from '../hooks/useToast.js';
import { useWorkspaceData } from '../hooks/useWorkspaceData.js';
import { isToday } from '../utils/format.js';
import {
  CheckIcon,
  GlobeIcon,
  LogoutIcon,
  ShieldAlertIcon
} from '../components/ui/Icons.jsx';
import { ModalHost } from './ModalHost.jsx';
import { WorkspaceContext } from './WorkspaceContext.jsx';
import { SCREENS } from './screens.js';
import { HealthMitraOverview } from '../features/overview/HealthMitraOverview.jsx';

// Clean Human Care Workspace Shell matching human-care-design
export function Workspace({ onLogout }) {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const [tab, setTab] = useState('today');
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
    setTimeout(() => {
      handledAlarmIdsRef.current.delete(dose.id);
    }, 5 * 60_000);
  };

  const triggerAlarmManually = (dose) => {
    setAlarmDose(dose);
  };

  const handleSos = async () => {
    setModal({ kind: 'sos' });
    try {
      if (session?.id) {
        await sosApi.trigger(session.id, null);
      }
    } catch {
      // offline / demo fallback
    }
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

  const patientName = data.dashboard?.patient?.name || session?.name || 'Meera Shah';
  const initials = patientName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'MS';

  const alarmMedication = alarmDose
    ? data.dashboard?.medications?.find((m) => m.id === alarmDose.medicationId)
    : null;

  const Screen = SCREENS[tab] || SCREENS.today;

  return (
    <WorkspaceContext.Provider value={workspace}>
      <div className="hc-wrapper">
        {/* Sticky Top Header matching human-care-design exactly */}
        <header className="hc-header">
          <div className="hc-header-inner">
            <button
              type="button"
              onClick={() => setTab('today')}
              className="hc-brand"
              aria-label="HealthMitra overview"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <span className="hc-brand-badge">H</span>
              <span style={{ textAlign: 'left' }}>
                <span className="hc-brand-title">HealthMitra</span>
                <span className="hc-brand-subtitle">personal health companion</span>
              </span>
            </button>

            {/* Horizontal Nav Links */}
            <nav className="hc-nav" aria-label="Primary navigation">
              <button
                type="button"
                className={`hc-nav-btn ${tab === 'today' ? 'active' : ''}`}
                onClick={() => setTab('today')}
              >
                Overview
              </button>
              <button
                type="button"
                className={`hc-nav-btn ${tab === 'medications' ? 'active' : ''}`}
                onClick={() => setTab('medications')}
              >
                Medications
              </button>
              <button
                type="button"
                className={`hc-nav-btn ${tab === 'symptoms' ? 'active' : ''}`}
                onClick={() => setTab('symptoms')}
              >
                Symptoms
              </button>
              <button
                type="button"
                className={`hc-nav-btn ${tab === 'contacts' ? 'active' : ''}`}
                onClick={() => setTab('contacts')}
              >
                Caregivers
              </button>
              <button
                type="button"
                className={`hc-nav-btn ${tab === 'profile' ? 'active' : ''}`}
                onClick={() => setTab('profile')}
              >
                Profile
              </button>
            </nav>

            {/* Header Right Actions */}
            <div className="hc-header-right">
              {/* Language toggle */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="hc-btn-subtle"
                title={t('language')}
              >
                <GlobeIcon size={13} />
                <span>{i18n.language === 'en' ? 'हिन्दी' : 'English'}</span>
              </button>

              {/* Emergency SOS button */}
              <button
                type="button"
                onClick={handleSos}
                className="hc-sos-btn"
                aria-label="Emergency SOS"
              >
                <ShieldAlertIcon size={14} />
                <span>SOS</span>
              </button>

              {/* Date */}
              <span className="font-mono hc-date-pill">
                Sat, 12 Sep
              </span>

              {/* User Avatar */}
              <button
                type="button"
                onClick={() => setTab('profile')}
                className="hc-avatar"
                title={`Profile for ${patientName}`}
                aria-label={`Profile for ${patientName}`}
              >
                {initials}
              </button>

              {/* Sign out */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="hc-logout-btn"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogoutIcon size={15} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Screen Content */}
        {tab === 'today' ? (
          <HealthMitraOverview
            session={session}
            dashboard={data.dashboard}
            refresh={data.refresh}
            notify={notify}
            hideHeader={true}
            onSelectTab={setTab}
            onOpenModal={setModal}
            onLogout={onLogout}
          />
        ) : (
          <main className="hc-main enter-up">
            <Screen />
          </main>
        )}

        {/* Real-time Medicine Alarm Overlay */}
        {alarmDose && (
          <MedicineAlarmModal
            dose={alarmDose}
            medication={alarmMedication}
            patientName={patientName}
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
      </div>
    </WorkspaceContext.Provider>
  );
}
