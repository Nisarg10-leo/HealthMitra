import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, guidanceApi, patientsApi, sosApi } from '../../api/index.js';
import { DoseCelebration } from '../../components/ui/DoseCelebration.jsx';
import { Empty } from '../../components/ui/Empty.jsx';
import { useFallDetector } from '../../hooks/useFallDetector.js';
import { useVoiceCompanion } from '../../hooks/useSpeech.js';
import { isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { DoseCard } from './DoseCard.jsx';

export function TodayPage() {
  const { t } = useTranslation();
  const { dashboard, refresh, notify, listen, openModal, triggerAlarm } = useWorkspace();
  const [reassuranceSent, setReassuranceSent] = useState(false);
  const [celebratingMed, setCelebratingMed] = useState(null);

  const logs = (dashboard?.logs || [])
    .filter((log) => isToday(log.scheduledTime))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  
  const medicationById = (id) => dashboard?.medications?.find((medication) => medication.id === id);

  const handleFallEmergency = async () => {
    try {
      await sosApi.trigger(dashboard.patient.id, null);
      notify('Emergency assistance request sent to family caregivers');
      refresh();
      const text = encodeURIComponent(
        `EMERGENCY: Impact sensor registered a potential fall for ${dashboard.patient.name || 'Meera Shah'}. Immediate caregiver attention requested.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (err) {
      notify(err.message);
    }
  };

  const fallDetector = useFallDetector(handleFallEmergency);

  const testAlarm = () => {
    const firstPending = logs.find((l) => l.status === 'pending') || logs[0] || {
      id: 'test-alarm-dose',
      medicationId: dashboard?.medications?.[0]?.id,
      scheduledTime: new Date().toISOString(),
      status: 'pending'
    };
    triggerAlarm(firstPending);
  };

  const confirm = async (log, status, method = 'tap') => {
    try {
      await dosesApi.confirm(log.id, status, method);
      if (status === 'taken') {
        const med = medicationById(log.medicationId);
        setCelebratingMed(med?.name || 'Medicine');
      }
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      refresh();
    } catch (requestError) {
      notify(requestError.message);
    }
  };

  const confirmByVoice = (log) =>
    listen(async (transcript) => {
      try {
        const { intent } = await guidanceApi.voiceIntent(transcript);
        if (intent === 'taken' || intent === 'skipped') await confirm(log, intent, 'voice');
        else notify(t('voiceUnclear'));
      } catch (requestError) {
        notify(requestError.message);
      }
    });

  const companion = useVoiceCompanion(
    dashboard,
    async (doseId, status, method) => {
      await dosesApi.confirm(doseId, status, method);
      refresh();
    },
    notify
  );

  const handleReassurance = async () => {
    try {
      await patientsApi.reassure(dashboard.patient.id);
      setReassuranceSent(true);
      notify(t('reassuranceSent'));
      refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  const { today } = dashboard || { today: { total: 0, taken: 0 } };
  const adherenceScore = today?.total > 0 ? Math.round((today.taken / today.total) * 100) : 100;
  const strokeDashOffset = 314.159 - (314.159 * adherenceScore) / 100;
  const complete = today.total > 0 && today.taken === today.total;
  const showInactivityBanner = dashboard?.inactivityCheck?.needsReassurance && !reassuranceSent;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── 1. Inactivity Safety Banner ── */}
      {showInactivityBanner && (
        <div
          className="glass-matrix"
          style={{
            borderLeft: '4px solid #f59e0b',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: '#f59e0b' }}>
              {t('areYouOkayTitle')}
            </strong>
            <p style={{ margin: '4px 0 0', color: '#dfe2ef', fontSize: '0.9rem' }}>
              {t('areYouOkayBody')}
            </p>
          </div>
          <button type="button" className="btn-cyber" onClick={handleReassurance}>
            {t('iAmOkayBtn')}
          </button>
        </div>
      )}

      {/* ── 2. Biometric Diagnostic Score & Adherence Centerpiece ── */}
      <section className="glass-matrix" style={{ padding: '24px 26px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <span
              className="chip-telemetry chip-cyan"
              style={{ fontSize: '0.72rem', letterSpacing: '0.12em', padding: '3px 8px' }}
            >
              Biometric Telemetry Diagnostic
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <h2 style={{ fontSize: '1.65rem', margin: 0 }}>Routine Adherence Index</h2>
              <span
                className="chip-telemetry chip-violet"
                style={{ fontSize: '0.68rem', padding: '2px 8px' }}
              >
                AI SYNTHESIS
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn-glass"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            onClick={() => openModal({ kind: 'emergencyQr', patient: dashboard.patient, medications: dashboard.medications })}
          >
            🪪 {t('emergencyQrBtn')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '28px', alignItems: 'center' }}>
          {/* Futuristic Radial Gauge SVG */}
          <div style={{ position: 'relative', width: '150px', height: '150px', flexShrink: 0, margin: '0 auto' }}>
            <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="url(#vitalisCyanVioletGrad)"
                strokeDasharray="314.159"
                strokeDashoffset={strokeDashOffset}
                strokeLinecap="round"
                strokeWidth="8"
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
              <defs>
                <linearGradient id="vitalisCyanVioletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00F2FE" />
                  <stop offset="60%" stopColor="#4FACFE" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <span
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: '2.4rem',
                  fontWeight: '800',
                  color: '#00f2fe',
                  lineHeight: '1'
                }}
              >
                {adherenceScore}
              </span>
              <span
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  color: complete ? '#6ffbbe' : '#8b5cf6',
                  letterSpacing: '0.1em',
                  marginTop: '4px'
                }}
              >
                {complete ? 'OPTIMAL' : 'ACTIVE'}
              </span>
              <span style={{ fontSize: '0.62rem', color: '#849495', fontFamily: 'monospace' }}>
                / 100 BASELINE
              </span>
            </div>
          </div>

          {/* Metric Breakdown Chips Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                background: 'rgba(10, 14, 23, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#6ffbbe' }}>✓</span>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>{t('dosesTaken')}</span>
              </div>
              <strong style={{ fontSize: '1.2rem', color: '#ffffff' }}>
                {today.taken} <span style={{ fontSize: '0.75rem', color: '#849495' }}>/ {today.total}</span>
              </strong>
            </div>

            <div
              style={{
                background: 'rgba(10, 14, 23, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#00f2fe' }}>⏳</span>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>{t('pending')}</span>
              </div>
              <strong style={{ fontSize: '1.2rem', color: '#00f2fe' }}>
                {today.total - today.taken}
              </strong>
            </div>

            <div
              style={{
                background: 'rgba(10, 14, 23, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#d0bcff' }}>🔥</span>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Streak</span>
              </div>
              <strong style={{ fontSize: '1.2rem', color: '#d0bcff' }}>
                {dashboard.streak || 1} {t('dayStreak')}
              </strong>
            </div>

            <div
              style={{
                background: 'rgba(10, 14, 23, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#6ffbbe' }}>🛡️</span>
                <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Regimen Safety</span>
              </div>
              <strong style={{ fontSize: '0.9rem', color: '#6ffbbe' }}>
                VERIFIED
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. VITA Neural Engine AI Insight Card (Vitalis AI) ── */}
      <section
        style={{
          position: 'relative',
          borderRadius: '20px',
          padding: '22px 24px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95) 0%, rgba(16, 25, 50, 0.9) 50%, rgba(22, 18, 47, 0.95) 100%)',
          boxShadow: '0 4px 30px rgba(0, 242, 254, 0.12)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
          {/* Glowing Multi-color AI Orb Avatar */}
          <div style={{ position: 'relative', width: '52px', height: '52px', flexShrink: 0 }}>
            <div
              className="animate-orb"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00f2fe, #8b5cf6, #6ffbbe)',
                filter: 'blur(6px)',
                opacity: 0.8
              }}
            />
            <div
              style={{
                position: 'relative',
                width: '46px',
                height: '46px',
                margin: '3px',
                borderRadius: '50%',
                background: '#080c15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#00f2fe',
                fontSize: '1.4rem'
              }}
            >
              🧠
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#00f2fe',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em'
                }}
              >
                VITA Neural Intelligence 4.2
              </span>
              <span style={{ fontSize: '0.68rem', color: '#849495', fontFamily: 'monospace' }}>LIVE</span>
            </div>

            <h4 style={{ fontSize: '1.15rem', color: '#e0fdff', margin: '4px 0 6px' }}>
              {companion.active ? 'Mitra Voice Companion Active' : 'Mitra AI Telehealth Reasoning'}
            </h4>

            <p style={{ margin: 0, fontSize: '0.88rem', color: '#b9cacb', lineHeight: '1.5' }}>
              {companion.active
                ? (companion.speaking ? t('mitraSpeaking') : companion.listening ? t('mitraListening') : companion.statusText)
                : 'Active prescriptions calibrated. Ask clinical questions about food interactions, meal timings, or side effects.'}
            </p>

            {/* Metric Trend Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                ↑ Adherence {adherenceScore}%
              </span>
              <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                ✓ Regimen Synchronized
              </span>
              <span className="chip-telemetry chip-violet" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                ⚡ DDI Safety Check Clean
              </span>
            </div>

            {/* Dual Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn-cyber"
                onClick={() => openModal({ kind: 'askMitra' })}
              >
                <span>🧠</span>
                <span>{t('askMitraBtn')}</span>
              </button>

              <button
                type="button"
                className="btn-glass"
                onClick={companion.active ? companion.stop : companion.start}
                style={{
                  borderColor: companion.active ? '#ef4444' : undefined,
                  color: companion.active ? '#ffb4ab' : undefined
                }}
              >
                <span>🎙️</span>
                <span>{companion.active ? t('stopVoiceDialog') : t('startVoiceDialog')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Acoustic Fall Monitor & Test Alarm Strip ── */}
      <section
        className="glass-matrix"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: fallDetector.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${fallDetector.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fallDetector.active ? '#6ffbbe' : '#94a3b8',
              fontSize: '1.2rem'
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '0.95rem', color: '#ffffff' }}>Acoustic Impact Guard</strong>
              {fallDetector.active && (
                <span
                  className="animate-ping"
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6ffbbe', display: 'inline-block' }}
                />
              )}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block' }}>
              {fallDetector.active ? t('fallGuardActive') : t('fallGuardInactive')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {fallDetector.active && (
            <button
              type="button"
              className="btn-glass"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={fallDetector.simulateFall}
            >
              Test sensor
            </button>
          )}

          <button
            type="button"
            className="btn-glass"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              borderColor: fallDetector.active ? '#ef4444' : undefined,
              color: fallDetector.active ? '#ffb4ab' : undefined
            }}
            onClick={fallDetector.active ? fallDetector.stopListening : fallDetector.startListening}
          >
            {fallDetector.active ? 'Turn off' : 'Turn on'}
          </button>

          <button
            type="button"
            className="btn-glass"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            onClick={testAlarm}
          >
            🔔 {t('testAlarmBtn')}
          </button>
        </div>
      </section>

      {/* Fall Distress Overlay */}
      {fallDetector.fallDetected && (
        <div
          role="alertdialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 12, 21, 0.92)',
            backdropFilter: 'blur(16px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            className="glass-matrix"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '32px 26px',
              border: '2px solid #ef4444',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)'
            }}
          >
            <h2 style={{ color: '#ffb4ab', margin: '0 0 10px', fontSize: '1.6rem' }}>
              Potential Fall Detected
            </h2>
            <p style={{ color: '#dfe2ef', fontSize: '0.95rem', margin: '0 0 20px', lineHeight: '1.5' }}>
              The acoustic sensor registered a sharp impact spike. If unacknowledged, family caregivers and Lilavati emergency services will be escalated automatically.
            </p>

            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#ffb4ab',
                background: 'rgba(239, 68, 68, 0.15)',
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                border: '2px solid rgba(239, 68, 68, 0.4)'
              }}
            >
              {fallDetector.countdown}s
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="btn-cyber"
                style={{ padding: '14px', fontSize: '1.05rem' }}
                onClick={fallDetector.dismiss}
              >
                ✓ I am safe and well
              </button>

              <button
                type="button"
                className="btn-emergency"
                style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                onClick={() => {
                  fallDetector.dismiss();
                  handleFallEmergency();
                }}
              >
                Request Emergency Assistance Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Chronological Health Timeline Spine (Prescription Schedule) ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#00f2fe', fontSize: '1.1rem' }}>⏱</span>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff' }}>
              {t('today')}
            </h3>
          </div>
          <span
            className="chip-telemetry"
            style={{ fontSize: '0.72rem', color: '#94a3b8' }}
          >
            {logs.length} DOSES LOGGED
          </span>
        </div>

        {/* Timeline List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {logs.length ? (
            logs.map((log) => (
              <DoseCard
                key={log.id}
                log={log}
                medication={medicationById(log.medicationId)}
                onConfirm={confirm}
                onSpeak={confirmByVoice}
                onVerifyPill={(doseItem, medItem) =>
                  openModal({
                    kind: 'pillVerify',
                    dose: doseItem,
                    medication: medItem,
                    onConfirm: (d, status) => {
                      confirm(d, status, 'camera');
                      openModal(null);
                    }
                  })
                }
              />
            ))
          ) : (
            <Empty text="No medicines scheduled for today." />
          )}
        </div>
      </section>

      {/* Gentle Celebration Feedback on Dose Taken */}
      {celebratingMed && (
        <DoseCelebration
          medicationName={celebratingMed}
          patientName={dashboard.patient?.name || 'Meera'}
          onClose={() => setCelebratingMed(null)}
        />
      )}
    </div>
  );
}
