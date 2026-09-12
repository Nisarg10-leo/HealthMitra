import React from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi } from '../../api/index.js';
import { useSpokenText } from '../../hooks/useSpeech.js';
import { formatTime } from '../../utils/format.js';
import { ClockIcon } from '../ui/Icons.jsx';

export function ReminderBanner({ notification, onDismissed }) {
  const { t, i18n } = useTranslation();
  useSpokenText(notification.body, notification.id);

  const dismiss = async () => {
    await alertsApi.markNotificationRead(notification.id);
    onDismissed();
  };

  return (
    <aside className="reminder-banner" role="alert">
      <span className="reminder-icon" aria-hidden="true">
        <ClockIcon size={16} />
      </span>
      <div className="reminder-body">
        <strong>{notification.title}</strong>
        <p>{notification.body}</p>
      </div>
      <button type="button" onClick={dismiss} className="reminder-dismiss-btn">
        <span>{t('dismiss')}</span>
        <span className="reminder-time font-mono">
          · {formatTime(notification.createdAt, i18n.language)}
        </span>
      </button>
    </aside>
  );
}
