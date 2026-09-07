import React from 'react';
import { useTranslation } from 'react-i18next';
import { Empty } from '../../components/ui/Empty.jsx';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { dashboard } = useWorkspace();
  const logs = dashboard.logs.slice(0, 30);
  return <>
    <SectionHeading kicker={t('caregiverView')} title={t('medicationHistory')} subtitle={t('historySubtitle', { name: dashboard.patient.name })} action={<span className="streak-badge">🔥 {dashboard.streak} {t('dayStreak')}</span>} />
    <div className="history-list">{logs.map((log) => {
      const medication = dashboard.medications.find((item) => item.id === log.medicationId);
      return <div key={log.id}><div className={`history-icon ${log.status}`}>{log.status === 'taken' ? '✓' : '!'}</div><div><strong>{medication?.name} <small>{medication?.dosage}</small></strong><p>{formatDate(log.scheduledTime, i18n.language)} · {formatTime(log.scheduledTime, i18n.language)}{log.responseMethod ? ` · ${log.responseMethod}` : ''}</p></div><span className={`status ${log.status}`}>{t(log.status)}</span></div>;
    })}</div>
    {!logs.length && <Empty text={t('noHistory')} />}
  </>;
}
