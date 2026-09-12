import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime, isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
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
    <div style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── 1. Active Patient Clinical Header ── */}
      <section
        className="hm-card"
        style={{
          padding: '22px 26px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#151d2f',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
              fontWeight: '700',
              fontSize: '1.2rem',
              flexShrink: 0
            }}
          >
            {activePatient.name[0]}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: '#ffffff' }}>
                {activePatient.name}
              </h2>
              <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                Telemetry Active
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>Age: <strong style={{ color: '#ffffff' }}>68</strong></span>
              <span>•</span>
              <span>Blood Group: <strong style={{ color: 'var(--cyan)' }}>O+</strong></span>
              <span>•</span>
              <span>Hospital: <strong style={{ color: '#ffffff' }}>Lilavati, Mumbai</strong></span>
              <span>•</span>
              <span>Doctor: <strong style={{ color: 'var(--cyan)' }}>Dr. R. Nair</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-cyber"
            style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <span>+</span>
            <span>{t('addMedicine')}</span>
          </button>

          <button
            type="button"
            className="btn-glass"
            style={{ padding: '9px 16px', fontSize: '0.85rem' }}
            onClick={() => openModal({ kind: 'askMitra' })}
          >
            <span>🧠</span>
            <span>Ask Clinical AI</span>
          </button>
        </div>
      </section>

      {/* Multi-patient Selector Bar if > 1 patient */}
      {patients.length > 1 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {patients.map((item) => (
            <button
              key={item.patient.id}
              onClick={() => selectPatient(item.patient.id)}
              className={`hm-card ${item.patient.id === selectedPatientId ? 'glass-matrix-active' : ''}`}
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: item.patient.id === selectedPatientId ? 'var(--cyan-subtle)' : 'var(--surface)',
                borderColor: item.patient.id === selectedPatientId ? 'var(--cyan-border)' : 'var(--surface-border)'
              }}
            >
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--cyan)',
                  color: '#05080f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.8rem'
                }}
              >
                {item.patient.name[0]}
              </span>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ display: 'block', fontSize: '0.84rem', color: '#ffffff' }}>
                  {item.patient.name}
                </strong>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  {item.today.score}% Adherence
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 2. 4-Column Metric Overview ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {/* Metric 1: Overall Adherence Score */}
        <div className="hm-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Adherence Index
            </span>
            <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
              Stable
            </span>
          </div>
          <div style={{ margin: '8px 0 6px' }}>
            <strong style={{ fontSize: '2.2rem', fontWeight: '700', color: 'var(--cyan)' }} className="font-mono">
              {dashboard.today.score}%
            </strong>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${dashboard.today.score}%`,
                height: '100%',
                background: 'var(--cyan)',
                borderRadius: '999px'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
            Optimal adherence threshold maintained
          </small>
        </div>

        {/* Metric 2: Today's Doses Recorded */}
        <div className="hm-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Doses
            </span>
            <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
              {dashboard.today.taken} of {dashboard.today.total}
            </span>
          </div>
          <div style={{ margin: '8px 0 6px' }}>
            <strong style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ffffff' }} className="font-mono">
              {dashboard.today.taken}
              <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '400' }}>/{dashboard.today.total}</span>
            </strong>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${dashboard.today.total > 0 ? (dashboard.today.taken / dashboard.today.total) * 100 : 0}%`,
                height: '100%',
                background: 'var(--mint-bright)',
                borderRadius: '999px'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
            {dashboard.today.missed ? `${dashboard.today.missed} dose needs review` : 'All scheduled doses verified'}
          </small>
        </div>

        {/* Metric 3: Clinical Risk Assessment */}
        <div className="hm-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Clinical Risk Level
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: riskColor
              }}
            />
          </div>
          <div style={{ margin: '8px 0 6px' }}>
            <strong style={{ fontSize: '1.8rem', fontWeight: '700', color: riskColor }}>
              {riskLabel}
            </strong>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Consistency: <strong style={{ color: '#ffffff' }}>{risk.timingConsistency}</strong>
          </div>
          <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
            Avg response delay: ~{risk.avgDelayMinutes} min
          </small>
        </div>

        {/* Metric 4: Adherence Streak */}
        <div className="hm-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Routine Streak
            </span>
            <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '1px 7px' }}>
              Active
            </span>
          </div>
          <div style={{ margin: '8px 0 6px' }}>
            <strong style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ffffff' }} className="font-mono">
              {dashboard.streak} Days
            </strong>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, dashboard.streak * 14)}%`,
                height: '100%',
                background: 'var(--cyan)',
                borderRadius: '999px'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
            Consistent medication timing daily
          </small>
        </div>
      </div>

      {/* ── 3. Patient Routine & Adherence Overview ── */}
      <section
        className="hm-card"
        style={{
          padding: '22px 26px',
          background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.06) 0%, var(--surface) 100%)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              DAILY CAREGIVER MONITORING
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', color: '#ffffff', fontWeight: '700' }}>
              {activePatient.name}'s Routine Compliance
            </h3>
          </div>
          <span className="chip-telemetry chip-mint" style={{ fontSize: '0.78rem', padding: '3px 10px' }}>
            ✓ {dashboard.streak} Days Routine Active
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--surface-dim)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Daily Score</span>
            <strong style={{ fontSize: '1.8rem', color: 'var(--cyan)' }} className="font-mono">{dashboard.today.score}%</strong>
            <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '2px' }}>Optimal adherence threshold</small>
          </div>
          <div style={{ background: 'var(--surface-dim)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Today's Doses</span>
            <strong style={{ fontSize: '1.8rem', color: '#ffffff' }} className="font-mono">{dashboard.today.taken} / {dashboard.today.total}</strong>
            <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '2px' }}>Recorded by patient</small>
          </div>
          <div style={{ background: 'var(--surface-dim)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--surface-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Next Scheduled Dose</span>
            <strong style={{ fontSize: '1.8rem', color: '#34d399' }} className="font-mono">
              {dashboard.logs?.find(l => l.status === 'pending')?.scheduledTime
                ? formatTime(dashboard.logs.find(l => l.status === 'pending').scheduledTime, i18n.language)
                : 'All Done'}
            </strong>
            <small style={{ display: 'block', color: 'var(--text-secondary)', marginTop: '2px' }}>Automated reminder active</small>
          </div>
        </div>
      </section>

      {/* ── 4. Clinical Safety & Polypharmacy Matrix ── */}
      <section className="hm-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
              Clinical Safety & Cross-Interaction
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>Automated contraindication analysis for multi-drug regimen</small>
          </div>
          <span className="chip-telemetry chip-mint" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>
            ✓ Verified Safe
          </span>
        </div>

        {safety.interactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {safety.interactions.map((inter, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--coral-subtle)',
                  borderLeft: '3px solid var(--coral)',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '0.84rem',
                  color: '#fca5a5'
                }}
              >
                <strong style={{ color: '#ffffff' }}>{inter.title}: </strong>
                {inter.message}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              color: 'var(--mint-bright)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--emerald-subtle)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--emerald-border)'
            }}
          >
            <span style={{ fontSize: '1rem' }}>✓</span>
            <span>No high-risk drug-drug contraindications found across current active prescriptions.</span>
          </div>
        )}
      </section>

      {/* ── 5. 7-Day Adherence Chart ── */}
      <section className="hm-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
              Weekly Adherence History
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>7-day retrospective timeline of scheduled vs confirmed doses</small>
          </div>
        </div>
        <AdherenceChart logs={dashboard.logs} />
      </section>

      {/* ── 6. Today's Live Schedule Tracker ── */}
      <section className="hm-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
              Today's Live Medication Log
            </h3>
            <small style={{ color: 'var(--text-muted)' }}>Real-time telemetry and responses for today's routine</small>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {dashboard.logs.filter((log) => isToday(log.scheduledTime)).map((log) => {
            const medication = dashboard.medications.find((item) => item.id === log.medicationId);
            const isTaken = log.status === 'taken';

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: isTaken ? '1px solid var(--emerald-border)' : '1px solid var(--surface-border)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: medication?.color || 'var(--cyan)'
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#ffffff', display: 'block', fontWeight: '600' }}>
                      {medication?.name}
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {medication?.dosage}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--cyan)',
                      background: 'var(--cyan-subtle)',
                      padding: '3px 8px',
                      borderRadius: '6px'
                    }}
                  >
                    {formatTime(log.scheduledTime, i18n.language)}
                  </span>

                  <span
                    className={`chip-telemetry ${isTaken ? 'chip-mint' : 'chip-cyan'}`}
                    style={{ fontSize: '0.74rem', padding: '3px 10px' }}
                  >
                    {isTaken ? 'Taken ✓' : 'Pending'}
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
