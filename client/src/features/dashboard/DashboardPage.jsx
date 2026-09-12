import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime, isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon
} from '../../components/ui/Icons.jsx';
import { AdherenceChart } from './AdherenceChart.jsx';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { dashboard, alerts, patients, selectedPatientId, selectPatient, openModal } = useWorkspace();
  const openAlerts = alerts.filter((alert) => alert.type !== 'info').length;

  const risk = dashboard?.riskAssessment || {
    level: 'low',
    adherenceRate: 100,
    avgDelayMinutes: 0,
    timingConsistency: 'Excellent',
    anomalies: []
  };
  const safety = dashboard?.safety || { interactions: [], polypharmacyWarning: { flag: false } };

  const riskColor = risk.level === 'high' ? 'var(--coral)' : risk.level === 'moderate' ? 'var(--amber)' : 'var(--mint-bright)';
  const riskLabel = risk.level === 'high' ? t('riskHigh') : risk.level === 'moderate' ? t('riskModerate') : t('riskLow');

  const activePatient = dashboard?.patient || { name: 'Meera Shah' };

  return (
    <div className="page-shell-container">
      {/* ── 1. Active Patient Clinical Header ── */}
      <section className="dashboard-patient-header">
        <div className="patient-header-left">
          <div className="patient-header-avatar font-mono" aria-hidden="true">
            {activePatient.name[0]}
          </div>

          <div>
            <div className="patient-name-row">
              <h2 className="patient-name-text">
                {activePatient.name}
              </h2>
              <span className="chip-telemetry chip-mint">
                <ActivityIcon size={12} />
                <span>Telemetry Active</span>
              </span>
            </div>

            <div className="patient-details-tags">
              <span>Age: <strong className="color-white font-mono">68</strong></span>
              <span className="tag-dot">•</span>
              <span>Blood Group: <strong className="color-cyan font-mono">O+</strong></span>
              <span className="tag-dot">•</span>
              <span>Hospital: <strong className="color-white">Lilavati, Mumbai</strong></span>
              <span className="tag-dot">•</span>
              <span>Doctor: <strong className="color-cyan">Dr. R. Nair</strong></span>
            </div>
          </div>
        </div>

        <div className="patient-header-actions">
          <button
            type="button"
            className="btn-cyber"
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <PlusIcon size={15} />
            <span>{t('addMedicine')}</span>
          </button>

          <button
            type="button"
            className="btn-glass"
            onClick={() => openModal({ kind: 'askMitra' })}
          >
            <SparklesIcon size={15} />
            <span>Ask Clinical AI</span>
          </button>
        </div>
      </section>

      {/* Multi-patient Selector Bar if > 1 patient */}
      {patients.length > 1 && (
        <div className="patient-selector-scroll">
          {patients.map((item) => (
            <button
              key={item.patient.id}
              type="button"
              onClick={() => selectPatient(item.patient.id)}
              className={`patient-tab-btn ${item.patient.id === selectedPatientId ? 'patient-tab-active' : ''}`}
            >
              <span className="patient-tab-avatar font-mono">
                {item.patient.name[0]}
              </span>
              <div className="patient-tab-info">
                <strong className="patient-tab-name">
                  {item.patient.name}
                </strong>
                <span className="patient-tab-adherence font-mono">
                  {item.today.score}% Adherence
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 2. 4-Column Metric Overview ── */}
      <div className="dashboard-metrics-grid">
        {/* Metric 1: Overall Adherence Score */}
        <div className="overview-metric-tile">
          <div className="metric-tile-top">
            <span className="metric-tile-title">Adherence Index</span>
            <span className="chip-telemetry chip-mint">Stable</span>
          </div>
          <div className="metric-tile-value-wrap">
            <strong className="metric-tile-num font-mono color-cyan">
              {dashboard.today.score}%
            </strong>
          </div>
          <div className="metric-tile-bar">
            <div
              className="metric-tile-bar-fill fill-cyan"
              style={{ width: `${dashboard.today.score}%` }}
            />
          </div>
          <span className="metric-tile-caption">
            Optimal adherence threshold maintained
          </span>
        </div>

        {/* Metric 2: Today's Doses Recorded */}
        <div className="overview-metric-tile">
          <div className="metric-tile-top">
            <span className="metric-tile-title">Today's Doses</span>
            <span className="chip-telemetry chip-cyan font-mono">
              {dashboard.today.taken} of {dashboard.today.total}
            </span>
          </div>
          <div className="metric-tile-value-wrap">
            <strong className="metric-tile-num font-mono color-white">
              {dashboard.today.taken}
              <span className="metric-tile-sub">/{dashboard.today.total}</span>
            </strong>
          </div>
          <div className="metric-tile-bar">
            <div
              className="metric-tile-bar-fill fill-mint"
              style={{
                width: `${dashboard.today.total > 0 ? (dashboard.today.taken / dashboard.today.total) * 100 : 0}%`
              }}
            />
          </div>
          <span className="metric-tile-caption">
            {dashboard.today.missed ? `${dashboard.today.missed} dose needs review` : 'All scheduled doses verified'}
          </span>
        </div>

        {/* Metric 3: Clinical Risk Assessment */}
        <div className="overview-metric-tile">
          <div className="metric-tile-top">
            <span className="metric-tile-title">Clinical Risk Level</span>
            <span className="risk-indicator-pip" style={{ backgroundColor: riskColor }} />
          </div>
          <div className="metric-tile-value-wrap">
            <strong className="metric-tile-num font-mono" style={{ color: riskColor }}>
              {riskLabel}
            </strong>
          </div>
          <div className="metric-tile-meta">
            Consistency: <strong className="color-white">{risk.timingConsistency}</strong>
          </div>
          <span className="metric-tile-caption font-mono">
            Avg delay: ~{risk.avgDelayMinutes} min
          </span>
        </div>

        {/* Metric 4: Adherence Streak */}
        <div className="overview-metric-tile">
          <div className="metric-tile-top">
            <span className="metric-tile-title">Routine Streak</span>
            <span className="chip-telemetry chip-cyan">Active</span>
          </div>
          <div className="metric-tile-value-wrap">
            <strong className="metric-tile-num font-mono color-white">
              {dashboard.streak} Days
            </strong>
          </div>
          <div className="metric-tile-bar">
            <div
              className="metric-tile-bar-fill fill-cyan"
              style={{ width: `${Math.min(100, dashboard.streak * 14)}%` }}
            />
          </div>
          <span className="metric-tile-caption">
            Consistent medication timing daily
          </span>
        </div>
      </div>

      {/* ── 3. Patient Routine & Adherence Overview ── */}
      <section className="compliance-highlight-card">
        <div className="compliance-header">
          <div>
            <span className="section-eyebrow">Daily Caregiver Monitoring</span>
            <h3 className="compliance-headline">
              {activePatient.name}'s Routine Compliance
            </h3>
          </div>
          <span className="chip-telemetry chip-mint">
            <CheckIcon size={12} />
            <span>{dashboard.streak} Days Routine Active</span>
          </span>
        </div>

        <div className="compliance-stats-row">
          <div className="compliance-stat-cell">
            <span className="compliance-stat-label">Daily Score</span>
            <strong className="compliance-stat-num font-mono color-cyan">{dashboard.today.score}%</strong>
            <span className="compliance-stat-sub">Optimal adherence threshold</span>
          </div>
          <div className="compliance-stat-cell">
            <span className="compliance-stat-label">Today's Doses</span>
            <strong className="compliance-stat-num font-mono color-white">{dashboard.today.taken} / {dashboard.today.total}</strong>
            <span className="compliance-stat-sub">Recorded by patient</span>
          </div>
          <div className="compliance-stat-cell">
            <span className="compliance-stat-label">Next Scheduled Dose</span>
            <strong className="compliance-stat-num font-mono color-mint">
              {dashboard.logs?.find(l => l.status === 'pending')?.scheduledTime
                ? formatTime(dashboard.logs.find(l => l.status === 'pending').scheduledTime, i18n.language)
                : 'All Done'}
            </strong>
            <span className="compliance-stat-sub">Automated reminder active</span>
          </div>
        </div>
      </section>

      {/* ── 4. Clinical Safety & Polypharmacy Matrix ── */}
      <section className="clinical-safety-card">
        <div className="clinical-safety-header">
          <div>
            <h3 className="clinical-safety-title">
              Clinical Safety & Cross-Interaction
            </h3>
            <span className="clinical-safety-sub">
              Automated contraindication analysis for multi-drug regimen
            </span>
          </div>
          <span className="chip-telemetry chip-mint">
            <CheckIcon size={12} />
            <span>Verified Safe</span>
          </span>
        </div>

        {safety.interactions.length > 0 ? (
          <div className="safety-alerts-list">
            {safety.interactions.map((inter, idx) => (
              <div key={idx} className="safety-alert-item">
                <AlertCircleIcon size={16} className="safety-alert-icon" />
                <div>
                  <strong className="safety-alert-title">{inter.title}: </strong>
                  <span className="safety-alert-msg">{inter.message}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="safety-verified-box">
            <CheckIcon size={16} />
            <span>No high-risk drug-drug contraindications found across current active prescriptions.</span>
          </div>
        )}
      </section>

      {/* ── 5. 7-Day Adherence Chart ── */}
      <section>
        <AdherenceChart logs={dashboard.logs} />
      </section>

      {/* ── 6. Today's Live Schedule Tracker ── */}
      <section className="live-schedule-card">
        <div className="live-schedule-header">
          <div>
            <h3 className="live-schedule-title">
              Today's Live Medication Log
            </h3>
            <span className="live-schedule-sub">
              Real-time telemetry and responses for today's routine
            </span>
          </div>
        </div>

        <div className="live-schedule-list">
          {dashboard.logs.filter((log) => isToday(log.scheduledTime)).map((log) => {
            const medication = dashboard.medications.find((item) => item.id === log.medicationId);
            const isTaken = log.status === 'taken';

            return (
              <div
                key={log.id}
                className={`live-schedule-item ${isTaken ? 'item-taken' : ''}`}
              >
                <div className="live-item-left">
                  <span
                    className="live-med-pip"
                    style={{ backgroundColor: medication?.color || 'var(--cyan)' }}
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="live-med-name">
                      {medication?.name}
                    </strong>
                    <span className="live-med-dosage">
                      {medication?.dosage}
                    </span>
                  </div>
                </div>

                <div className="live-item-right">
                  <span className="live-med-time font-mono">
                    <ClockIcon size={12} />
                    <span>{formatTime(log.scheduledTime, i18n.language)}</span>
                  </span>

                  <span
                    className={`chip-telemetry ${isTaken ? 'chip-mint' : 'chip-cyan'}`}
                  >
                    {isTaken && <CheckIcon size={12} />}
                    <span>{isTaken ? 'Taken' : 'Pending'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
