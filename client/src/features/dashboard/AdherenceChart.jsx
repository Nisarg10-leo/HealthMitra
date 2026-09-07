import React from 'react';
import { useTranslation } from 'react-i18next';
import { dateKey, formatWeekday } from '../../utils/format.js';

export const weeklyAdherence = (logs, days = 7) => Array.from({ length: days }, (_, index) => dateKey(Date.now() - (days - 1 - index) * 86400000)).map((day) => {
  const dayLogs = logs.filter((log) => log.scheduledTime.startsWith(day));
  return { day, score: dayLogs.length ? Math.round(100 * dayLogs.filter((log) => log.status === 'taken').length / dayLogs.length) : 0 };
});

export function AdherenceChart({ logs }) {
  const { t, i18n } = useTranslation();
  return <div className="chart" aria-label={t('weeklyAdherence')}>
    {weeklyAdherence(logs).map(({ day, score }) => <div key={day}><span>{score}%</span><i style={{ height: `${Math.max(score, 6)}%` }} /><small>{formatWeekday(`${day}T12:00:00`, i18n.language)}</small></div>)}
  </div>;
}
