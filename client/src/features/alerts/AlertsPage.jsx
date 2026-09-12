import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi, sosApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
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

  useEffect(() => {
    sosApi.list(patientId).then(setSosEvents).catch((error) => notify(error.message));
  }, [patientId, notify]);

  const markRead = async (id) => {
    try {
      await alertsApi.markRead(id);
      refresh();
    } catch (error) {
      notify(error.message);
    }
  };

  const updateSos = async (event, status) => {
    try {
      await sosApi.updateStatus(event.id, status);
      notify(t('sosUpdated'));
      setSosEvents((current) => current.map((item) => (item.id === event.id ? { ...item, status } : item)));
      refresh();
    } catch (error) {
      notify(error.message);
    }
  };

  const getWhatsAppAlertUrl = (type, message) => {
    const text = encodeURIComponent(
      `🚨 HealthMitra Caregiver Alert\nPatient: ${dashboard.patient.name || 'Meera Shah'}\nEvent: ${type.toUpperCase()}\nDetails: ${message}\nTime: ${new Date().toLocaleTimeString()}`
    );
    return `https://wa.me/?text=${text}`;
  };

  const getWhatsAppSosUrl = (event) => {
    const text = encodeURIComponent(
      `🚨 CRITICAL EMERGENCY SOS: ${dashboard.patient.name || 'Meera Shah'} triggered an SOS!\nStatus: ${event.status.toUpperCase()}\nTime: ${formatDateTime(event.triggeredAt, i18n.language)}${event.locationUrl ? `\nMap: ${event.locationUrl}` : ''}`
    );
    return `https://wa.me/?text=${text}`;
  };

  const hasCritical = sosEvents.some((e) => e.status === 'active');

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Page Header ── */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', marginBottom: '6px' }}>
            {t('caregiverView')}
          </span>
          <h1 style={{ fontSize: '1.75rem', margin: '4px 0 2px', color: '#ffffff', fontWeight: '700' }}>
            {t('careUpdates')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {t('alertsSubtitle')}
          </p>
        </div>

        <span className={`chip-telemetry ${hasCritical ? 'chip-error' : alerts.length > 0 ? 'chip-cyan' : 'chip-mint'}`}>
          {alerts.length} Active System Notifications
        </span>
      </section>

      {/* ── Alerts Feed ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: '4px 0 2px', fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
          Active Telemetry Feeds
        </h3>

        {alerts.map((item) => (
          <article
            key={item.id}
            className="hm-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              borderLeft: item.type === 'sos' ? '4px solid var(--coral)' : '4px solid var(--cyan)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: item.type === 'sos' ? 'var(--coral-subtle)' : 'var(--cyan-subtle)',
                  color: item.type === 'sos' ? 'var(--coral)' : 'var(--cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: '700',
                  flexShrink: 0
                }}
              >
                {alertIcon[item.type] || '✓'}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: '#ffffff', fontWeight: '600' }}>
                  {alertTitle(item.type, t)}
                </h4>
                <p style={{ margin: '0 0 6px', color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {item.message}
                </p>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }} className="font-mono">
                  {formatDateTime(item.createdAt, i18n.language)}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                href={getWhatsAppAlertUrl(item.type, item.message)}
                target="_blank"
                rel="noreferrer"
              >
                📲 {t('whatsappEscalate')}
              </a>
              {!item.readBy?.includes(session.id) && (
                <button
                  type="button"
                  className="btn-glass"
                  style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                  onClick={() => markRead(item.id)}
                >
                  {t('markRead')}
                </button>
              )}
            </div>
          </article>
        ))}

        {!alerts.length && <Empty text={t('noAlerts')} />}
      </section>

      {/* ── SOS Emergency Telemetry Logs ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        <h3 style={{ margin: '4px 0 2px', fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
          {t('sosHistory')}
        </h3>

        {sosEvents.map((event) => (
          <article
            key={event.id}
            className="hm-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              borderLeft: event.status === 'active' ? '4px solid var(--coral)' : '4px solid var(--emerald)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: event.status === 'active' ? 'var(--coral-subtle)' : 'var(--emerald-subtle)',
                  color: event.status === 'active' ? 'var(--coral)' : 'var(--emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: '700',
                  flexShrink: 0
                }}
              >
                ⚠
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '0.96rem', color: '#ffffff' }}>
                  {t('emergencySos')}
                </strong>
                <p style={{ margin: '2px 0 4px', color: 'var(--text-secondary)', fontSize: '0.84rem' }} className="font-mono">
                  {formatDateTime(event.triggeredAt, i18n.language)}
                  {event.locationUrl ? ` : ${t('locationShared')}` : ` : ${t('locationUnavailable')}`}
                </p>
                {event.locationUrl && (
                  <a
                    href={event.locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--cyan)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: '600' }}
                  >
                    📍 {t('openMap')}
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`chip-telemetry ${event.status === 'active' ? 'chip-error' : 'chip-mint'}`}>
                {t(event.status)}
              </span>

              <a
                style={{
                  background: '#25D366',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                href={getWhatsAppSosUrl(event)}
                target="_blank"
                rel="noreferrer"
              >
                📲 {t('whatsappEscalate')}
              </a>

              {event.status === 'active' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-glass"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={() => updateSos(event, 'acknowledged')}
                  >
                    {t('acknowledge')}
                  </button>
                  <button
                    type="button"
                    className="btn-cyber"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={() => updateSos(event, 'resolved')}
                  >
                    {t('resolve')}
                  </button>
                </div>
              )}
              {event.status === 'acknowledged' && (
                <button
                  type="button"
                  className="btn-cyber"
                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  onClick={() => updateSos(event, 'resolved')}
                >
                  {t('resolve')}
                </button>
              )}
            </div>
          </article>
        ))}

        {!sosEvents.length && <Empty text={t('noSos')} />}
      </section>
    </div>
  );
}
