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

  const risk = dashboard.riskAssessment || { level: 'low', adherenceRate: 100, avgDelayMinutes: 0, timingConsistency: 'Excellent', anomalies: [] };
  const safety = dashboard.safety || { interactions: [], polypharmacyWarning: { flag: false } };

  const riskColor = risk.level === 'high' ? '#e63946' : risk.level === 'moderate' ? '#f59e0b' : '#10b981';
  const riskLabel = risk.level === 'high' ? t('riskHigh') : risk.level === 'moderate' ? t('riskModerate') : t('riskLow');

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

    {/* ── Smart Clinical Risk & Behavioral Anomaly Assessment ── */}
    <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', margin: '20px 0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05em', color: '#1e293b' }}>{t('riskAssessment')}</h3>
          <small style={{ color: '#64748b' }}>{t('timingConsistency')}: <strong>{risk.timingConsistency}</strong> · {t('avgLatency')}: <strong>~{risk.avgDelayMinutes} min</strong></small>
        </div>
        <span style={{ background: riskColor, color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.82em', letterSpacing: '0.5px' }}>
          {riskLabel}
        </span>
      </div>

      {risk.anomalies.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          <strong style={{ fontSize: '0.85em', color: '#475569' }}>{t('detectedAnomalies')}:</strong>
          {risk.anomalies.map((anom, idx) => (
            <div key={idx} style={{ background: anom.severity === 'high' ? '#fef2f2' : '#fffbeb', borderLeft: `4px solid ${anom.severity === 'high' ? '#ef4444' : '#f59e0b'}`, padding: '8px 12px', borderRadius: '4px', fontSize: '0.88em', color: '#334155' }}>
              <strong>{anom.title}: </strong>{anom.description}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: '#10b981', fontSize: '0.88em', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
          <span>✓</span> <span>{t('noAnomalies')}</span>
        </div>
      )}

      {/* Safety & Drug-Drug Interactions notice */}
      {safety.interactions.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
          <strong style={{ fontSize: '0.85em', color: '#dc2626' }}>⚠️ {t('drugInteractions')} ({safety.interactions.length}):</strong>
          {safety.interactions.map((inter, idx) => (
            <div key={idx} style={{ fontSize: '0.85em', color: '#b91c1c', marginTop: '4px' }}>
              • <strong>{inter.title}:</strong> {inter.message}
            </div>
          ))}
        </div>
      )}
      {safety.polypharmacyWarning?.flag && (
        <div style={{ marginTop: '8px', fontSize: '0.82em', color: '#d97706', background: '#fffbeb', padding: '6px 10px', borderRadius: '4px' }}>
          ℹ️ <strong>{t('polypharmacyAlert')}:</strong> {safety.polypharmacyWarning.message}
        </div>
      )}
    </section>

    <SectionHeading title={t('weeklyAdherence')} subtitle={t('weeklySubtitle')} action={<span className="streak-badge">🔥 {dashboard.streak} {t('dayStreak')}</span>} />
    <AdherenceChart logs={dashboard.logs} />
    <SectionHeading title={t('todaysSchedule')} subtitle={t('liveSchedule')} />
    <div className="compact-list">{dashboard.logs.filter((log) => isToday(log.scheduledTime)).map((log) => {
      const medication = dashboard.medications.find((item) => item.id === log.medicationId);
      return <div key={log.id}><span className={`dot ${log.status}`} /><strong>{medication?.name}</strong><small>{formatTime(log.scheduledTime, i18n.language)} · {t(log.status)}</small></div>;
    })}</div>
  </>;
}
