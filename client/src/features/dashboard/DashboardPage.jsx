import React from 'react';
import { useTranslation } from 'react-i18next';
import { AdherenceHealthOrb } from '../../components/ui/AdherenceHealthOrb.jsx';
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

  const riskColor = risk.level === 'high' ? '#ffb4ab' : risk.level === 'moderate' ? '#f59e0b' : '#6ffbbe';
  const riskLabel = risk.level === 'high' ? t('riskHigh') : risk.level === 'moderate' ? t('riskModerate') : t('riskLow');

  const activePatient = dashboard?.patient || { name: 'Meera Shah' };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '80px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── 1. Vitalis Header & Active Patient Banner ── */}
      <section
        className="glass-matrix"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Avatar with Neon Gradient Ring */}
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '50%',
              padding: '2px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #8b5cf6 100%)',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#0a0e17',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe',
                fontWeight: '800',
                fontSize: '1.4rem'
              }}
            >
              {activePatient.name[0]}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#ffffff' }}>
                {activePatient.name}
              </h2>
              <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                <span
                  className="animate-ping"
                  style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6ffbbe', display: 'inline-block' }}
                />
                AI Telemetry Synchronized
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.82rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span>Age: <strong style={{ color: '#ffffff' }}>68</strong></span>
              <span>•</span>
              <span>Blood Group: <strong style={{ color: '#ffb4ab' }}>O+</strong></span>
              <span>•</span>
              <span>Hospital: <strong style={{ color: '#ffffff' }}>Lilavati, Mumbai</strong></span>
              <span>•</span>
              <span>Doctor: <strong style={{ color: '#00f2fe' }}>Dr. R. Nair</strong></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-cyber"
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <span>+</span>
            <span>{t('addMedicine')}</span>
          </button>

          <button
            type="button"
            className="btn-glass"
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
              className={`glass-matrix ${item.patient.id === selectedPatientId ? 'glass-matrix-active' : ''}`}
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: item.patient.id === selectedPatientId ? '1px solid #00f2fe' : undefined
              }}
            >
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#00f2fe',
                  color: '#090d16',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '0.85rem'
                }}
              >
                {item.patient.name[0]}
              </span>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ display: 'block', fontSize: '0.86rem', color: '#ffffff' }}>
                  {item.patient.name}
                </strong>
                <small style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  {item.today.score}% Adherence
                </small>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 2. Vitalis 4-Column Live Telemetry Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Metric 1: Overall Adherence Score */}
        <div className="glass-matrix glass-matrix-hover" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Adherence Index
            </span>
            <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              +4% vs Baseline
            </span>
          </div>
          <div style={{ margin: '10px 0 6px' }}>
            <strong style={{ fontSize: '2.4rem', fontWeight: '800', color: '#00f2fe', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {dashboard.today.score}%
            </strong>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${dashboard.today.score}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00f2fe, #10b981)',
                borderRadius: '999px',
                boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: '#849495', fontSize: '0.78rem' }}>
            Optimal adherence threshold maintained
          </small>
        </div>

        {/* Metric 2: Today's Doses Recorded */}
        <div className="glass-matrix glass-matrix-hover" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Today's Doses
            </span>
            <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              {dashboard.today.taken} of {dashboard.today.total} Completed
            </span>
          </div>
          <div style={{ margin: '10px 0 6px' }}>
            <strong style={{ fontSize: '2.4rem', fontWeight: '800', color: '#ffffff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {dashboard.today.taken}
              <span style={{ fontSize: '1.4rem', color: '#849495', fontWeight: '500' }}>/{dashboard.today.total}</span>
            </strong>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${dashboard.today.total > 0 ? (dashboard.today.taken / dashboard.today.total) * 100 : 0}%`,
                height: '100%',
                background: '#00f2fe',
                borderRadius: '999px',
                boxShadow: '0 0 10px rgba(0, 242, 254, 0.4)'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: '#849495', fontSize: '0.78rem' }}>
            {dashboard.today.missed ? `${dashboard.today.missed} dose needs family review` : 'All morning doses confirmed'}
          </small>
        </div>

        {/* Metric 3: Clinical Risk Telemetry */}
        <div className="glass-matrix glass-matrix-hover" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Clinical Risk Telemetry
            </span>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: riskColor,
                boxShadow: `0 0 8px ${riskColor}`
              }}
            />
          </div>
          <div style={{ margin: '10px 0 6px' }}>
            <strong style={{ fontSize: '2.1rem', fontWeight: '800', color: riskColor, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {riskLabel}
            </strong>
          </div>
          <div style={{ fontSize: '0.84rem', color: '#dfe2ef', marginTop: '4px' }}>
            Consistency: <strong style={{ color: '#00f2fe' }}>{risk.timingConsistency}</strong>
          </div>
          <small style={{ display: 'block', marginTop: '4px', color: '#849495', fontSize: '0.78rem' }}>
            Avg response delay: ~{risk.avgDelayMinutes} min
          </small>
        </div>

        {/* Metric 4: Adherence Streak */}
        <div className="glass-matrix glass-matrix-hover" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Routine Streak
            </span>
            <span className="chip-telemetry chip-violet" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              Goal on track
            </span>
          </div>
          <div style={{ margin: '10px 0 6px' }}>
            <strong style={{ fontSize: '2.4rem', fontWeight: '800', color: '#d0bcff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {dashboard.streak} Days
            </strong>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, dashboard.streak * 14)}%`,
                height: '100%',
                background: '#8b5cf6',
                borderRadius: '999px',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)'
              }}
            />
          </div>
          <small style={{ display: 'block', marginTop: '8px', color: '#849495', fontSize: '0.78rem' }}>
            Consistent timing reinforced daily
          </small>
        </div>
      </div>

      {/* ── 3. 3D Adherence Health Orb Centerpiece ── */}
      <AdherenceHealthOrb
        score={dashboard.today.score}
        streak={dashboard.streak}
        weeklyLogs={dashboard.logs}
      />

      {/* ── 4. Clinical Drug Interactions & Polypharmacy Matrix ── */}
      <section className="glass-matrix" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>
              Clinical Safety & Polypharmacy Matrix
            </h3>
            <small style={{ color: '#94a3b8' }}>Real-time cross-interaction analysis for multi-drug regimen</small>
          </div>
          <span className="chip-telemetry chip-mint" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
            ✓ Safety Verified
          </span>
        </div>

        {safety.interactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {safety.interactions.map((inter, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderLeft: '4px solid #ef4444',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  color: '#ffb4ab'
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
              color: '#6ffbbe',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>✓</span>
            <span>No high-risk drug-drug contraindications found in current prescriptions.</span>
          </div>
        )}
      </section>

      {/* ── 5. 7-Day Adherence Chart ── */}
      <section className="glass-matrix" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>
              Weekly Adherence Overview
            </h3>
            <small style={{ color: '#94a3b8' }}>Detailed breakdown of dose confirmations over the last 7 days</small>
          </div>
        </div>
        <AdherenceChart logs={dashboard.logs} />
      </section>

      {/* ── 6. Today's Live Medication Tracker ── */}
      <section className="glass-matrix" style={{ padding: '22px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>
              Today's Live Medication Schedule
            </h3>
            <small style={{ color: '#94a3b8' }}>Real-time telemetry and responses for today's routine</small>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  padding: '14px 18px',
                  background: 'rgba(10, 14, 23, 0.65)',
                  border: isTaken ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: medication?.color || '#00f2fe',
                      boxShadow: `0 0 8px ${medication?.color || '#00f2fe'}`
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.98rem', color: '#ffffff', display: 'block' }}>
                      {medication?.name}
                    </strong>
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {medication?.dosage}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      fontFamily: 'Inter, monospace',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      color: '#00f2fe',
                      background: 'rgba(0, 242, 254, 0.1)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 242, 254, 0.25)'
                    }}
                  >
                    {formatTime(log.scheduledTime, i18n.language)}
                  </span>

                  <span
                    className={`chip-telemetry ${isTaken ? 'chip-mint' : 'chip-violet'}`}
                    style={{ fontSize: '0.78rem', padding: '4px 12px' }}
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
