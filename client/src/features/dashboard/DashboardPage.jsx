import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { Stat } from '../../components/ui/Stat.jsx';
import { formatTime, isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { AdherenceChart } from './AdherenceChart.jsx';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { dashboard, alerts, patients, selectedPatientId, selectPatient, openModal } = useWorkspace();
  const openAlerts = alerts.filter((alert) => alert.type !== 'info').length;
  return <>
    <SectionHeading className="dashboard-heading" kicker={t('caregiverView')} title={t('dashboard')} subtitle={t('dashboardSubtitle')} action={<button className="primary" onClick={() => openModal({ kind: 'medicine' })}>＋ {t('addMedicine')}</button>} />
    {patients.length > 1 && <section className="linked-patients">
      <div className="section-heading compact"><div><h3>{t('linkedPatients')}</h3><p>{t('selectPatient')}</p></div><button className="text-button" onClick={() => openModal({ kind: 'join' })}>{t('joinWithCode')}</button></div>
      <div className="patient-list">{patients.map((item) => <button key={item.patient.id} className={item.patient.id === selectedPatientId ? 'active' : ''} onClick={() => selectPatient(item.patient.id)}><span className="avatar">{item.patient.name[0]}</span><span><strong>{item.patient.name}</strong><small>{item.today.score}% {t('todayAdherence')}</small></span><b>›</b></button>)}</div>
    </section>}
    <div className="patient-banner">
      <div className="avatar">{dashboard.patient.name[0]}</div>
      <div><p>{t('yourLovedOne')}</p><h2>{dashboard.patient.name}</h2><span className={dashboard.today.missed ? 'warning' : 'good'}>● {dashboard.today.missed ? t('needsAttention') : t('doingWell')}</span></div>
      <div className="streak">🔥 <strong>{dashboard.streak}</strong><span>{t('dayStreak')}</span></div>
    </div>
    <div className="stats"><Stat label={t('todaysAdherence')} value={`${dashboard.today.score}%`} tone="blue" /><Stat label={t('dosesTaken')} value={`${dashboard.today.taken}/${dashboard.today.total}`} tone="green" /><Stat label={t('openAlerts')} value={openAlerts} tone="orange" /></div>
    <SectionHeading title={t('weeklyAdherence')} subtitle={t('weeklySubtitle')} action={<span className="streak-badge">🔥 {dashboard.streak} {t('dayStreak')}</span>} />
    <AdherenceChart logs={dashboard.logs} />
    <SectionHeading title={t('todaysSchedule')} subtitle={t('liveSchedule')} />
    <div className="compact-list">{dashboard.logs.filter((log) => isToday(log.scheduledTime)).map((log) => {
      const medication = dashboard.medications.find((item) => item.id === log.medicationId);
      return <div key={log.id}><span className={`dot ${log.status}`} /><strong>{medication?.name}</strong><small>{formatTime(log.scheduledTime, i18n.language)} · {t(log.status)}</small></div>;
    })}</div>
  </>;
}
