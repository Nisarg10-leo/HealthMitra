import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi, sosApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { useSession } from '../../hooks/useSession.js';
import { formatDateTime } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

const alertIcon = { sos: '⚠', 'missed-dose': '!' };
const alertTitle = (type, t) => (type === 'sos' ? t('emergencySos') : type === 'missed-dose' ? t('missedDoseTitle') : t('healthMitra'));

export function AlertsPage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const { dashboard, alerts, refresh, notify } = useWorkspace();
  const [sosEvents, setSosEvents] = useState([]);
  const patientId = dashboard.patient.id;

  useEffect(() => { sosApi.list(patientId).then(setSosEvents).catch((error) => notify(error.message)); }, [patientId, notify]);

  const markRead = async (id) => { try { await alertsApi.markRead(id); refresh(); } catch (error) { notify(error.message); } };
  const updateSos = async (event, status) => {
    try {
      await sosApi.updateStatus(event.id, status);
      notify(t('sosUpdated'));
      setSosEvents((current) => current.map((item) => (item.id === event.id ? { ...item, status } : item)));
      refresh();
    } catch (error) { notify(error.message); }
  };

  return <>
    <SectionHeading kicker={t('caregiverView')} title={t('careUpdates')} subtitle={t('alertsSubtitle')} />
    <div className="alerts">
      {alerts.map((item) => <article className={item.type} key={item.id}>
        <span aria-hidden="true">{alertIcon[item.type] || '✓'}</span>
        <div><h3>{alertTitle(item.type, t)}</h3><p>{item.message}</p><small>{formatDateTime(item.createdAt, i18n.language)}</small></div>
        {!item.readBy?.includes(session.id) && <button onClick={() => markRead(item.id)}>{t('markRead')}</button>}
      </article>)}
      {!alerts.length && <Empty text={t('noAlerts')} />}
    </div>
    <SectionHeading title={t('sosHistory')} subtitle={t('sosHistorySubtitle')} />
    <div className="sos-history">
      {sosEvents.map((event) => <article key={event.id}>
        <div className="sos-history-icon">⚠</div>
        <div><strong>{t('emergencySos')}</strong><p>{formatDateTime(event.triggeredAt, i18n.language)}{event.locationUrl ? ` · ${t('locationShared')}` : ` · ${t('locationUnavailable')}`}</p>{event.locationUrl && <a href={event.locationUrl} target="_blank" rel="noreferrer">{t('openMap')}</a>}</div>
        <div className="sos-status">
          <span className={`status ${event.status}`}>{t(event.status)}</span>
          {event.status === 'active' && <div><button onClick={() => updateSos(event, 'acknowledged')}>{t('acknowledge')}</button><button onClick={() => updateSos(event, 'resolved')}>{t('resolve')}</button></div>}
          {event.status === 'acknowledged' && <button onClick={() => updateSos(event, 'resolved')}>{t('resolve')}</button>}
        </div>
      </article>)}
      {!sosEvents.length && <Empty text={t('noSos')} />}
    </div>
  </>;
}
