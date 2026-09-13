import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkupApi, dosesApi } from '../../api/index.js';
import { formatTime, isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  ActivityIcon,
  AlertCircleIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon
} from '../../components/ui/Icons.jsx';
import { AdherenceChart } from './AdherenceChart.jsx';

const MOOD_MAP = {
  great: { label: 'Feeling Great', labelHi: 'बहुत अच्छा', color: 'var(--mint-bright)' },
  good: { label: 'Good & Active', labelHi: 'अच्छा और सक्रिय', color: 'var(--cyan)' },
  okay: { label: 'Just Okay', labelHi: 'ठीक-ठाक', color: 'var(--amber)' },
  unwell: { label: 'Feeling Unwell', labelHi: 'अस्वस्थ', color: 'var(--coral)' }
};

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { dashboard, alerts, patients, selectedPatientId, selectPatient, openModal, notify, refresh, setTab } = useWorkspace();
  const [checkups, setCheckups] = useState([]);
  const [pinging, setPinging] = useState(false);

  const openAlerts = alerts?.filter((alert) => alert.type !== 'info').length || 0;

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

  const activePatient = dashboard?.patient || patients?.find((p) => p.patient?.id === selectedPatientId)?.patient || {
    id: selectedPatientId || '',
    name: 'Patient',
    age: null,
    bloodGroup: null,
    gender: null,
    conditions: []
  };

  const patientId = activePatient?.id || dashboard?.patient?.id || selectedPatientId;

  useEffect(() => {
    if (!patientId) return;
    checkupApi.list(patientId).then(setCheckups).catch(() => setCheckups([]));
  }, [patientId]);

  const handlePingCheckup = async () => {
    if (!patientId) return;
    setPinging(true);
    try {
      await checkupApi.request(patientId);
      notify(i18n.language === 'hi' ? 'दैनिक चेकअप पिंग भेजा गया' : 'Everyday Checkup reminder sent to patient');
      if (refresh) refresh();
      checkupApi.list(patientId).then(setCheckups).catch(() => {});
    } catch (err) {
      notify(err.message);
    } finally {
      setPinging(false);
    }
  };

  const todayCheckup = checkups?.find((c) => isToday(c.createdAt)) || checkups?.[0];
  const todayLogs = (dashboard?.logs || [])
    .filter((log) => isToday(log.scheduledTime))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const hasLinkedPatient = Boolean(dashboard?.patient?.id || patients?.length > 0);

  return (
    <div className="page-shell-container">
      {!hasLinkedPatient && (
        <section className="hm-card" style={{ padding: '20px 24px', marginBottom: '20px', border: '1.5px dashed var(--leaf)', background: 'var(--cream)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="chip-telemetry chip-mint font-mono">
                <ShieldIcon size={12} />
                <span>Family Caregiver Hub</span>
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', margin: '2px 0 4px', color: 'var(--ink)' }}>
              No Patient Connected Yet
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Connect to your parent or family member using their 6-character code to begin live routine tracking and everyday checkups.
            </p>
          </div>
          <button
            type="button"
            className="btn-cyber"
            onClick={() => setTab && setTab('patient')}
            style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          >
            Connect Patient Now →
          </button>
        </section>
      )}

      {/* ── 1. Active Patient Clinical Header ── */}
      <section className="dashboard-patient-header">
        <div className="patient-header-left">
          <div className="patient-header-avatar font-mono" aria-hidden="true">
            {activePatient.name?.[0]?.toUpperCase() || 'P'}
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
              {activePatient.age ? (
                <>
                  <span>Age: <strong className="color-white font-mono">{activePatient.age} yrs</strong></span>
                  <span className="tag-dot">•</span>
                </>
              ) : null}
              {activePatient.bloodGroup ? (
                <>
                  <span>Blood: <strong className="color-cyan font-mono">{activePatient.bloodGroup}</strong></span>
                  <span className="tag-dot">•</span>
                </>
              ) : null}
              {activePatient.gender ? (
                <>
                  <span>Gender: <strong className="color-white">{activePatient.gender}</strong></span>
                  <span className="tag-dot">•</span>
                </>
              ) : null}
              {activePatient.conditions?.length ? (
                <>
                  <span>Conditions: <strong className="color-cyan">{activePatient.conditions.slice(0, 2).join(', ')}</strong></span>
                  <span className="tag-dot">•</span>
                </>
              ) : null}
              {activePatient.emergencyContactName ? (
                <>
                  <span>Emergency: <strong className="color-white">{activePatient.emergencyContactName}</strong></span>
                  <span className="tag-dot">•</span>
                </>
              ) : null}
              <span>Prescriptions: <strong className="color-mint font-mono">{dashboard?.medications?.length || 0} active</strong></span>
            </div>
          </div>
        </div>

        <div className="patient-header-actions">
          <button
            type="button"
            className="btn-glass"
            onClick={handlePingCheckup}
            disabled={pinging}
            title="Ping patient for everyday wellness checkup"
          >
            <BellIcon size={14} />
            <span>{pinging ? 'Pinging...' : 'Ping Checkup'}</span>
          </button>

          <button
            type="button"
            className="btn-glass"
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <PlusIcon size={14} />
            <span>{t('addMedicine')}</span>
          </button>

          <button
            type="button"
            className="btn-cyber"
            onClick={() => openModal({ kind: 'askMitra' })}
          >
            <SparklesIcon size={14} />
            <span>Ask Clinical AI</span>
          </button>
        </div>
      </section>

      {/* Multi-patient Selector Bar if > 1 patient */}
      {patients.length > 1 && (
        <div className="patient-selector-scroll">
          {patients.map((item) => {
            const p = item.patient || {};
            const isSelected = p.id === selectedPatientId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPatient(p.id)}
                className={`patient-tab-btn ${isSelected ? 'patient-tab-active' : ''}`}
              >
                <span className="patient-tab-avatar font-mono">
                  {p.name?.[0]?.toUpperCase() || 'P'}
                </span>
                <div className="patient-tab-info">
                  <strong className="patient-tab-name">
                    {p.name || 'Patient'}
                  </strong>
                  <span className="patient-tab-adherence font-mono">
                    {item.today?.score != null ? `${item.today.score}% Adherence` : (item.permissionLevel === 'edit' ? 'Can Edit' : 'View Access')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── 2. Everyday Checkup Live Card ── */}
      <section className="compliance-highlight-card" style={{ marginTop: '0', marginBottom: '24px' }}>
        <div className="compliance-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="chip-telemetry chip-mint font-mono">
                <HeartIcon size={12} />
                <span>Everyday Checkup Status</span>
              </span>
              {todayCheckup && (
                <span className="chip-telemetry chip-cyan font-mono" style={{ fontSize: '0.72rem' }}>
                  Recorded at {todayCheckup.time || formatTime(todayCheckup.createdAt, i18n.language)}
                </span>
              )}
            </div>
            <h3 className="compliance-headline" style={{ margin: '2px 0 0' }}>
              {activePatient.name}'s Daily Well-Being
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {todayCheckup
                ? 'Latest self-reported wellness vitals from patient.'
                : 'No checkup logged for today yet. You can send a friendly reminder ping.'}
            </p>
          </div>

          <button
            type="button"
            className="btn-glass btn-sm"
            onClick={handlePingCheckup}
            disabled={pinging}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <BellIcon size={13} />
            <span>{pinging ? 'Sending Ping...' : 'Send Checkup Ping'}</span>
          </button>
        </div>

        {todayCheckup ? (
          <div className="compliance-stats-row" style={{ marginTop: '16px' }}>
            <div className="compliance-stat-cell">
              <span className="compliance-stat-label">Mood Status</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: MOOD_MAP[todayCheckup.mood]?.color || 'var(--mint-bright)',
                    boxShadow: `0 0 8px ${MOOD_MAP[todayCheckup.mood]?.color || 'var(--mint-bright)'}`
                  }}
                />
                <strong className="compliance-stat-num" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                  {MOOD_MAP[todayCheckup.mood]?.label || 'Good & Active'}
                </strong>
              </div>
              <span className="compliance-stat-sub">Self-reported mood</span>
            </div>

            <div className="compliance-stat-cell">
              <span className="compliance-stat-label">Blood Pressure</span>
              <strong className="compliance-stat-num font-mono color-cyan">
                {todayCheckup.bloodPressure ? `${todayCheckup.bloodPressure} mmHg` : 'Not recorded'}
              </strong>
              <span className="compliance-stat-sub">Resting baseline</span>
            </div>

            <div className="compliance-stat-cell">
              <span className="compliance-stat-label">Blood Sugar</span>
              <strong className="compliance-stat-num font-mono color-mint">
                {todayCheckup.bloodSugar ? `${todayCheckup.bloodSugar} mg/dL` : 'Not recorded'}
              </strong>
              <span className="compliance-stat-sub">Fasting / Post-meal</span>
            </div>

            <div className="compliance-stat-cell">
              <span className="compliance-stat-label">Sleep Quality</span>
              <strong className="compliance-stat-num font-mono color-white" style={{ textTransform: 'capitalize' }}>
                {todayCheckup.sleepQuality || 'Normal'}
              </strong>
              <span className="compliance-stat-sub">Rest score</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--paper)', borderRadius: '12px', border: '1px dashed var(--border-subtle)', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HeartIcon size={18} style={{ color: 'var(--amber)' }} />
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {activePatient.name} hasn't logged today's checkup yet. Send a friendly nudge to keep tabs on vitals.
              </span>
            </div>
            <button
              type="button"
              className="btn-cyber btn-sm"
              onClick={handlePingCheckup}
              disabled={pinging}
            >
              <SparklesIcon size={12} />
              <span>{pinging ? 'Sending...' : 'Nudge Checkup Now'}</span>
            </button>
          </div>
        )}

        {todayCheckup?.notes && (
          <p style={{ margin: '14px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
            Patient Note: "{todayCheckup.notes}"
          </p>
        )}
      </section>

      {/* ── 3. 4-Column Metric Overview ── */}
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
          {todayLogs.length > 0 ? (
            todayLogs.map((log) => {
              const medication = dashboard?.medications?.find((item) => item.id === log.medicationId);
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
                        {medication?.name || 'Medication'}
                      </strong>
                      <span className="live-med-dosage">
                        {medication?.dosage || ''}
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

                    {!isTaken && (
                      <button
                        type="button"
                        className="btn-glass btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={async () => {
                          try {
                            await dosesApi.confirm(log.id, 'taken', 'caregiver');
                            notify(`Marked ${medication?.name || 'dose'} as taken for ${activePatient.name}`);
                            if (typeof BroadcastChannel !== 'undefined') {
                              try {
                                const channel = new BroadcastChannel('healthmitra_sync_channel');
                                channel.postMessage({ type: 'DOSE_CONFIRMED', doseId: log.id, status: 'taken' });
                                channel.close();
                              } catch (e) {}
                            }
                            refresh();
                          } catch (err) {
                            notify(err.message);
                          }
                        }}
                      >
                        <CheckIcon size={12} />
                        <span>Mark Taken</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <CheckIcon size={20} style={{ color: 'var(--mint-bright)', margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                No scheduled medication doses for today. Routine schedule is up to date.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
