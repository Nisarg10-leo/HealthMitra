import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavButtons } from '../components/layout/NavButtons.jsx';
import { ReminderBanner } from '../components/layout/ReminderBanner.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { useSession } from '../hooks/useSession.js';
import { useSpeechInput } from '../hooks/useSpeech.js';
import { useToast } from '../hooks/useToast.js';
import { useWorkspaceData } from '../hooks/useWorkspaceData.js';
import { ModalHost } from './ModalHost.jsx';
import { WorkspaceContext } from './WorkspaceContext.jsx';
import { defaultTabFor, navigationFor } from './navigation.js';
import { SCREENS } from './screens.js';

// The signed-in shell: navigation, top bar, data loading, and the active screen.
export function Workspace({ onLogout }) {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const [tab, setTab] = useState(() => defaultTabFor(session.role));
  const [modal, setModal] = useState(null);
  const { toast, notify } = useToast();
  const listen = useSpeechInput(notify);
  const data = useWorkspaceData(session, notify);
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en');

  const workspace = useMemo(() => ({
    dashboard: data.dashboard,
    alerts: data.alerts,
    patients: data.patients,
    selectedPatientId: data.selectedPatientId,
    selectPatient: data.setSelectedPatientId,
    refresh: data.refresh,
    notify,
    listen,
    openModal: setModal
  }), [data.dashboard, data.alerts, data.patients, data.selectedPatientId, data.setSelectedPatientId, data.refresh, notify, listen]);

  const navItems = navigationFor(session.role, t);
  const unreadAlerts = data.alerts.filter((item) => !item.readBy?.includes(session.id)).length;
  const dueReminder = data.notifications.find((item) => item.type === 'reminder' && !item.readAt);
  const Screen = SCREENS[tab] || SCREENS.contacts;

  return <WorkspaceContext.Provider value={workspace}>
    <div className="shell">
      <Sidebar session={session} items={navItems} activeTab={tab} onSelect={setTab} unreadAlerts={unreadAlerts} onToggleLanguage={toggleLanguage} onLogout={onLogout} />
      <main className="content">
        <Topbar session={session} patients={data.patients} selectedPatient={data.dashboard?.patient} selectedPatientId={data.selectedPatientId} onSelectPatient={data.setSelectedPatientId} onToggleLanguage={toggleLanguage} onSos={() => setModal({ kind: 'sos' })} />
        {!data.dashboard
          ? <div className="loading"><div className="loading-mark">✚</div><p>{session.role === 'caregiver' ? t('noLinkedPatients') : t('loadingPlan')}</p>{session.role === 'caregiver' && <button className="primary" onClick={() => setModal({ kind: 'join' })}>{t('joinWithCode')}</button>}</div>
          : <>
            {dueReminder && <ReminderBanner notification={dueReminder} onDismissed={data.refresh} />}
            <Screen />
          </>}
      </main>
      <ModalHost modal={modal} onClose={() => setModal(null)} />
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <nav className="mobile-nav" aria-label={t('mainNavigation')}><NavButtons items={navItems} activeTab={tab} onSelect={setTab} unreadAlerts={unreadAlerts} /></nav>
    </div>
  </WorkspaceContext.Provider>;
}
