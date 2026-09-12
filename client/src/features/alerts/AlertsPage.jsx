import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi, sosApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
import { useSession } from '../../hooks/useSession.js';
import { formatDateTime } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  WhatsAppIcon
} from '../../components/ui/Icons.jsx';

const alertTitle = (type, t) =>
  type === 'sos' ? t('emergencySos') : type === 'missed-dose' ? t('missedDoseTitle') : t('healthMitra');

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
      `HealthMitra Caregiver Alert\nPatient: ${dashboard.patient.name || 'Meera Shah'}\nEvent: ${type.toUpperCase()}\nDetails: ${message}\nTime: ${new Date().toLocaleTimeString()}`
    );
    return `https://wa.me/?text=${text}`;
  };

  const getWhatsAppSosUrl = (event) => {
    const text = encodeURIComponent(
      `CRITICAL EMERGENCY SOS: ${dashboard.patient.name || 'Meera Shah'} triggered an SOS!\nStatus: ${event.status.toUpperCase()}\nTime: ${formatDateTime(event.triggeredAt, i18n.language)}${event.locationUrl ? `\nMap: ${event.locationUrl}` : ''}`
    );
    return `https://wa.me/?text=${text}`;
  };

  const hasCritical = sosEvents.some((e) => e.status === 'active');

  return (
    <div className="page-shell-container max-w-prose">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <span className="chip-telemetry chip-cyan">
            {t('caregiverView')}
          </span>
          <h1 className="page-intro-title">
            {t('careUpdates')}
          </h1>
          <p className="page-intro-desc">
            {t('alertsSubtitle')}
          </p>
        </div>

        <span
          className={`chip-telemetry ${
            hasCritical ? 'chip-error' : alerts.length > 0 ? 'chip-cyan' : 'chip-mint'
          }`}
        >
          {alerts.length} Active System Notifications
        </span>
      </section>

      {/* ── Alerts Feed ── */}
      <section className="alerts-feed-section">
        <h3 className="section-subtitle">
          Active Telemetry Feeds
        </h3>

        <div className="alerts-feed-stack">
          {alerts.map((item) => {
            const isSos = item.type === 'sos';
            return (
              <article
                key={item.id}
                className={`alert-feed-item ${isSos ? 'alert-item-sos' : 'alert-item-standard'}`}
              >
                <div className="alert-item-left">
                  <div className={`alert-type-icon ${isSos ? 'icon-coral' : 'icon-cyan'}`}>
                    {isSos ? <AlertTriangleIcon size={18} /> : <AlertCircleIcon size={18} />}
                  </div>

                  <div className="alert-item-content">
                    <div className="alert-meta-top">
                      <strong className="alert-title">
                        {alertTitle(item.type, t)}
                      </strong>
                      <span className="chip-telemetry chip-neutral font-mono">
                        {item.type}
                      </span>
                    </div>
                    <p className="alert-body">
                      {item.body}
                    </p>
                    <span className="alert-timestamp font-mono">
                      {formatDateTime(item.createdAt, i18n.language)}
                    </span>
                  </div>
                </div>

                <div className="alert-item-actions">
                  <a
                    href={getWhatsAppAlertUrl(item.type, item.body)}
                    target="_blank"
                    rel="noreferrer"
                    className="whatsapp-btn"
                    title="Escalate via WhatsApp"
                  >
                    <WhatsAppIcon size={14} />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    className="btn-glass btn-sm"
                    onClick={() => markRead(item.id)}
                  >
                    <CheckIcon size={13} />
                    <span>{t('markRead')}</span>
                  </button>
                </div>
              </article>
            );
          })}

          {!alerts.length && (
            <div className="empty-alerts-box">
              <CheckIcon size={24} />
              <p>{t('noAlerts')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── SOS Emergency Resolution History ── */}
      <section className="sos-history-section">
        <div className="sos-history-header">
          <div>
            <h3 className="section-subtitle">
              {t('sosHistory')}
            </h3>
            <p className="section-subtext">
              {t('sosHistorySubtitle')}
            </p>
          </div>
          {hasCritical && (
            <span className="chip-telemetry chip-error">
              CRITICAL UNRESOLVED
            </span>
          )}
        </div>

        <div className="sos-history-stack">
          {sosEvents.map((event) => {
            const isResolved = event.status === 'resolved';
            const isActive = event.status === 'active';

            return (
              <article
                key={event.id}
                className={`sos-event-item ${isActive ? 'sos-active-item' : ''}`}
              >
                <div className="sos-event-info">
                  <div className="sos-event-title-row">
                    <strong className="sos-event-name">
                      {t('emergencySos')}
                    </strong>
                    <span
                      className={`chip-telemetry ${
                        isActive ? 'chip-error' : isResolved ? 'chip-mint' : 'chip-cyan'
                      }`}
                    >
                      {event.status.toUpperCase()}
                    </span>
                  </div>

                  <span className="sos-event-time font-mono">
                    {formatDateTime(event.triggeredAt, i18n.language)}
                  </span>
                </div>

                <div className="sos-event-actions">
                  {event.locationUrl && (
                    <a
                      href={event.locationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-glass btn-sm"
                    >
                      <ExternalLinkIcon size={13} />
                      <span>{t('openMap')}</span>
                    </a>
                  )}

                  <a
                    href={getWhatsAppSosUrl(event)}
                    target="_blank"
                    rel="noreferrer"
                    className="whatsapp-btn"
                  >
                    <WhatsAppIcon size={14} />
                    <span>WhatsApp</span>
                  </a>

                  {event.status === 'active' && (
                    <button
                      type="button"
                      className="btn-glass btn-sm"
                      onClick={() => updateSos(event, 'acknowledged')}
                    >
                      {t('acknowledge')}
                    </button>
                  )}

                  {event.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-cyber btn-sm"
                      onClick={() => updateSos(event, 'resolved')}
                    >
                      <CheckIcon size={13} />
                      <span>{t('resolve')}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}

          {!sosEvents.length && (
            <p className="contacts-empty-hint">
              {t('noSos')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
