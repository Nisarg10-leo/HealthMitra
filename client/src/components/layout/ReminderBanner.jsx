import React from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi } from '../../api/index.js';
import { useSpokenText } from '../../hooks/useSpeech.js';
import { formatTime } from '../../utils/format.js';
import { CheckIcon, ClockIcon } from '../ui/Icons.jsx';

export function ReminderBanner({ notification, onDismissed }) {
  const { t, i18n } = useTranslation();
  useSpokenText(notification.body, notification.id);

  const dismiss = async () => {
    await alertsApi.markNotificationRead(notification.id);
    onDismissed();
  };

  return (
    <aside className="reminder-banner-card" role="alert">
      <div className="reminder-banner-left">
        <div className="reminder-icon-badge" aria-hidden="true">
          <ClockIcon size={18} />
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
          <strong className="reminder-title font-sans">{notification.title}</strong>
          <p className="reminder-body-text">{notification.body}</p>
        </div>
      </div>

      <div className="reminder-actions-row">
        <button
          type="button"
          onClick={dismiss}
          className="reminder-dismiss-btn font-mono"
          title="Dismiss this reminder"
        >
          <CheckIcon size={13} />
          <span>{t('dismiss') || 'Dismiss'}</span>
        </button>
      </div>
    </aside>
  );
}
