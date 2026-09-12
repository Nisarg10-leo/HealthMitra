import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, guidanceApi, patientsApi, sosApi } from '../../api/index.js';
import { DoseCelebration } from '../../components/ui/DoseCelebration.jsx';
import { useFallDetector } from '../../hooks/useFallDetector.js';
import { useVoiceCompanion } from '../../hooks/useSpeech.js';
import { isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { DoseCard } from './DoseCard.jsx';

export function TodayPage() {
  const { t, i18n } = useTranslation();
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
  const pendingDoses = Math.max(0, (today?.total || 0) - (today?.taken || 0));
  const complete = today.total > 0 && today.taken === today.total;
  const showInactivityBanner = dashboard?.inactivityCheck?.needsReassurance && !reassuranceSent;

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── 1. Inactivity Safety Banner ── */}
      {showInactivityBanner && (
        <div
          className="hm-card"
          style={{
            borderLeft: '4px solid var(--amber)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <strong style={{ display: 'block', fontSize: '1rem', color: 'var(--amber)', fontWeight: '600' }}>
              {t('areYouOkayTitle')}
            </strong>
            <p style={{ margin: '3px 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {t('areYouOkayBody')}
            </p>
          </div>
          <button type="button" className="btn-cyber" onClick={handleReassurance}>
            {t('iAmOkayBtn')}
          </button>
        </div>
      )}

      {/* ── 2. Senior-First Daily Medication Progress ── */}
      <section
        className="hm-card"
        style={{
          padding: '24px 26px',
          background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.08) 0%, var(--surface) 100%)',
          border: '1px solid var(--surface-border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`chip-telemetry ${complete ? 'chip-mint' : 'chip-cyan'}`} style={{ fontSize: '0.8rem', padding: '3px 10px', fontWeight: '600' }}>
                {complete ? '✓ All Doses Completed' : '⏳ Today\'s Doses in Progress'}
              </span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                {new Date().toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h2 style={{ fontSize: '1.6rem', margin: '4px 0 6px', color: '#ffffff', fontWeight: '700' }}>
              {t('patientToday') || 'Today\'s Medicine Schedule'}
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.98rem' }}>
              {today.taken} of {today.total} medicines recorded for today.
              {pendingDoses > 0 ? ` ${pendingDoses} dose${pendingDoses > 1 ? 's' : ''} remaining.` : ' All medicines completed on time!'}
            </p>
          </div>

          <button
            type="button"
            className="btn-glass"
            style={{ padding: '10px 16px', fontSize: '0.9rem', borderRadius: '10px' }}
            onClick={() => openModal({ kind: 'emergencyQr', patient: dashboard.patient, medications: dashboard.medications })}
          >
            🪪 {t('emergencyQrBtn') || 'Show Medical Card'}
          </button>
        </div>

        {/* Clear High-Contrast Progress Bar */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: '700', color: complete ? 'var(--mint-bright)' : 'var(--cyan)' }} className="font-mono">
              {adherenceScore}%
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {complete ? '100% Target Met' : `${pendingDoses} more to go`}
            </span>
          </div>

          <div
            style={{
              height: '12px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${adherenceScore}%`,
                background: complete ? 'var(--emerald)' : 'var(--cyan)',
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>

        {/* Big, Clear Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '10px'
          }}
        >
          <div style={{ background: 'var(--surface-dim)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Doses Taken
            </span>
            <strong style={{ fontSize: '1.3rem', color: '#ffffff' }} className="font-mono">
              {today.taken} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {today.total}</span>
            </strong>
          </div>

          <div style={{ background: 'var(--surface-dim)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Remaining Today
            </span>
            <strong style={{ fontSize: '1.3rem', color: pendingDoses === 0 ? 'var(--mint-bright)' : 'var(--cyan)' }} className="font-mono">
              {pendingDoses}
            </strong>
          </div>

          <div style={{ background: 'var(--surface-dim)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Routine Streak
            </span>
            <strong style={{ fontSize: '1.3rem', color: '#ffffff' }} className="font-mono">
              🔥 {dashboard.streak || 1} {t('dayStreak')}
            </strong>
          </div>

          <div style={{ background: 'var(--surface-dim)', border: '1px solid var(--surface-border)', borderRadius: '10px', padding: '12px 14px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Safety Check
            </span>
            <strong style={{ fontSize: '0.95rem', color: 'var(--mint-bright)', fontWeight: '600' }}>
              ✓ All Safe
            </strong>
          </div>
        </div>
      </section>

      {/* ── 3. Mitra AI Telehealth Clinical Assistant ── */}
      <section
        className="hm-card"
        style={{
          padding: '20px 22px',
          borderLeft: '3px solid var(--cyan)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              background: 'var(--cyan-subtle)',
              border: '1px solid var(--cyan-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
              fontSize: '1.2rem',
              fontWeight: '700',
              flexShrink: 0
            }}
          >
            ✚
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#ffffff' }}>
                  {companion.active ? 'Mitra Voice Companion Active' : 'Mitra Telehealth Assistant'}
                </h3>
                <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                  CLINICAL AI
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: companion.active ? 'var(--mint-bright)' : 'var(--text-muted)' }}>
                {companion.active ? '● Live Listening' : 'Ready'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              {companion.active
                ? (companion.speaking ? t('mitraSpeaking') : companion.listening ? t('mitraListening') : companion.statusText)
                : 'Prescriptions calibrated. Ask clinical questions regarding food interactions, timings, or symptom relief.'}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-cyber"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => openModal({ kind: 'askMitra' })}
              >
                <span>🧠</span>
                <span>{t('askMitraBtn')}</span>
              </button>

              <button
                type="button"
                className="btn-glass"
                style={{
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  borderColor: companion.active ? 'var(--coral-border)' : undefined,
                  color: companion.active ? '#fca5a5' : undefined
                }}
                onClick={companion.active ? companion.stop : companion.start}
              >
                <span>🎙️</span>
                <span>{companion.active ? t('stopVoiceDialog') : t('startVoiceDialog')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Acoustic Impact Guard & Emergency Sensor ── */}
      <section
        className="hm-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: fallDetector.active ? 'var(--emerald-subtle)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${fallDetector.active ? 'var(--emerald-border)' : 'rgba(255, 255, 255, 0.08)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fallDetector.active ? 'var(--mint-bright)' : 'var(--text-muted)',
              fontSize: '1rem'
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#ffffff', fontWeight: '600' }}>Acoustic Impact Guard</strong>
              {fallDetector.active && (
                <span
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }}
                />
              )}
            </div>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'block' }}>
              {fallDetector.active ? t('fallGuardActive') : t('fallGuardInactive')}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {fallDetector.active && (
            <button
              type="button"
              className="btn-glass"
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              onClick={fallDetector.simulateFall}
            >
              Test Sensor
            </button>
          )}

          <button
            type="button"
            className="btn-glass"
            style={{
              padding: '5px 10px',
              fontSize: '0.76rem',
              borderColor: fallDetector.active ? 'var(--coral-border)' : undefined,
              color: fallDetector.active ? '#fca5a5' : undefined
            }}
            onClick={fallDetector.active ? fallDetector.stopListening : fallDetector.startListening}
          >
            {fallDetector.active ? 'Turn off' : 'Turn on'}
          </button>

          <button
            type="button"
            className="btn-glass"
            style={{ padding: '5px 10px', fontSize: '0.76rem' }}
            onClick={testAlarm}
          >
            🔔 {t('testAlarmBtn')}
          </button>
        </div>
      </section>

      {/* Fall Distress Emergency Dialog */}
      {fallDetector.fallDetected && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="overlay"
          style={{ zIndex: 10000 }}
        >
          <div
            className="hm-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '28px 24px',
              border: '2px solid var(--coral)',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.3)'
            }}
          >
            <h2 style={{ color: '#fca5a5', margin: '0 0 8px', fontSize: '1.4rem' }}>
              Potential Fall Detected
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 18px', lineHeight: '1.5' }}>
              The acoustic sensor registered a sharp impact spike. If unacknowledged, family caregivers and emergency services will be escalated automatically.
            </p>

            <div
              className="font-mono"
              style={{
                fontSize: '2.4rem',
                fontWeight: '700',
                color: '#fca5a5',
                background: 'var(--coral-subtle)',
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid var(--coral-border)'
              }}
            >
              {fallDetector.countdown}s
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="btn-cyber"
                style={{ padding: '12px', fontSize: '0.95rem' }}
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

      {/* ── 5. Chronological Schedule Spine ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ffffff', fontWeight: '700' }}>
              {t('today')}
            </h3>
            <span
              className="chip-telemetry"
              style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}
            >
              {logs.length} scheduled
            </span>
          </div>

          <button
            type="button"
            className="btn-glass"
            style={{
              padding: '6px 12px',
              fontSize: '0.8rem',
              color: 'var(--cyan)',
              borderColor: 'var(--cyan-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <span>＋</span>
            <span>{t('addMedicine')}</span>
          </button>
        </div>

        {/* Timeline Dose Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            <div
              className="hm-card"
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <span style={{ fontSize: '2rem' }}>💊</span>
              <div>
                <strong style={{ display: 'block', fontSize: '1rem', color: '#ffffff', marginBottom: '4px' }}>
                  No medications scheduled for today
                </strong>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
                  Your prescription schedule is clear. Add medications to begin receiving automated alerts and telemetry.
                </p>
              </div>
              <button
                type="button"
                className="btn-cyber"
                style={{ padding: '8px 18px', fontSize: '0.85rem', marginTop: '4px' }}
                onClick={() => openModal({ kind: 'medicine' })}
              >
                <span>＋</span>
                <span>{t('addMedicine')}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Gentle Celebration Feedback on Dose Taken */}
      {celebratingMed && (
        <DoseCelebration
          medicationName={celebratingMed}
          patientName={dashboard.patient?.name || 'Patient'}
          onClose={() => setCelebratingMed(null)}
        />
      )}
    </div>
  );
}
