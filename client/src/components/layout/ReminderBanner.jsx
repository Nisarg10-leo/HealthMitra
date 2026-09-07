import React from 'react';
import { useTranslation } from 'react-i18next';
import { alertsApi } from '../../api/index.js';
import { useSpokenText } from '../../hooks/useSpeech.js';
import { formatTime } from '../../utils/format.js';

export function ReminderBanner({ notification, onDismissed }) {
  const { t, i18n } = useTranslation();
  useSpokenText(notification.body, notification.id);
  const dismiss = async () => { await alertsApi.markNotificationRead(notification.id); onDismissed(); };
  return <div className="reminder-banner">
    <span className="reminder-icon" aria-hidden="true">◷</span>
    <div><strong>{notification.title}</strong><p>{notification.body}</p></div>
    <button onClick={dismiss}>{t('dismiss')} · {formatTime(notification.createdAt, i18n.language)}</button>
  </div>;
}
