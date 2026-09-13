import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi, dosesApi } from '../../api/index.js';
import { useSpokenText } from '../../hooks/useSpeech.js';
import { formatTime } from '../../utils/format.js';
import { CheckIcon, ClockIcon, CrossIcon } from '../ui/Icons.jsx';

export function ReminderBanner({ notification, onDismissed }) {
  const { t, i18n } = useTranslation();
  const [acting, setActing] = useState(false);
  useSpokenText(notification.body, notification.id);

  const handleTake = async () => {
    setActing(true);
    try {
      if (notification.doseLogId) {
        await dosesApi.confirm(notification.doseLogId, 'taken', 'manual');
      }
      await alertsApi.markNotificationRead(notification.id);
      if (onDismissed) onDismissed();
    } catch (err) {
      console.error(err);
      await alertsApi.markNotificationRead(notification.id);
      if (onDismissed) onDismissed();
    } finally {
      setActing(false);
    }
  };

  const handleSkip = async () => {
    setActing(true);
    try {
      if (notification.doseLogId) {
        await dosesApi.confirm(notification.doseLogId, 'skipped', 'manual');
      }
      await alertsApi.markNotificationRead(notification.id);
      if (onDismissed) onDismissed();
    } catch (err) {
      console.error(err);
      await alertsApi.markNotificationRead(notification.id);
      if (onDismissed) onDismissed();
    } finally {
      setActing(false);
    }
  };

  const dismiss = async () => {
    setActing(true);
    try {
      await alertsApi.markNotificationRead(notification.id);
      if (onDismissed) onDismissed();
    } finally {
      setActing(false);
    }
  };

  return (
    <aside className="reminder-banner-card reminder-banner hm-card" role="alert">
      <div className="reminder-banner-left">
        <div className="reminder-icon-badge" aria-hidden="true">
          <ClockIcon size={20} />
        </div>
        <div className="reminder-content-stack">
          <div className="reminder-header-row">
            <span className="reminder-badge-chip font-mono">
              {i18n.language === 'hi' ? 'दवा समय' : 'SCHEDULED DOSE'}
            </span>
            <span className="reminder-time-text font-mono">
              {formatTime(notification.createdAt, i18n.language)}
            </span>
          </div>
          <strong className="reminder-title font-display">{notification.title}</strong>
          <p className="reminder-body-text">{notification.body}</p>
        </div>
      </div>

      <div className="reminder-actions-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {notification.doseLogId && (
          <button
            type="button"
            onClick={handleTake}
            disabled={acting}
            className="btn-cyber btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <CheckIcon size={13} />
            <span>{i18n.language === 'hi' ? 'दवा ली' : 'Mark Taken'}</span>
          </button>
        )}

        {notification.doseLogId && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={acting}
            className="btn-glass btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <span>{i18n.language === 'hi' ? 'छोड़ी' : 'Skip'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={dismiss}
          disabled={acting}
          className="reminder-dismiss-btn font-mono"
          title="Dismiss this reminder"
        >
          <CrossIcon size={12} />
          <span>{t('dismiss') || 'Dismiss'}</span>
        </button>
      </div>
    </aside>
  );
}
