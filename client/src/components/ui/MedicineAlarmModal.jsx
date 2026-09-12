import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { playAlarmChime } from '../../utils/audio.js';
import { formatTime } from '../../utils/format.js';

export function MedicineAlarmModal({ dose, medication, patientName, onConfirm, onSnooze, onClose }) {
  const { t, i18n } = useTranslation();
  const intervalRef = useRef(null);

  // Spoken voice announcement
  const announceAlarm = () => {
    if (!window.speechSynthesis) return;
    const medName = medication?.name || t('medication');
    const dosage = medication?.dosage || '';
    const name = patientName || 'Friend';

    const text = i18n.language === 'hi'
      ? `${name} जी, ${medName} ${dosage} लेने का समय हो गया है। कृपया समय पर दवा लें।`
      : `Attention ${name}! It is time to take your ${medName} ${dosage}. Please take it now.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    playAlarmChime();
    setTimeout(announceAlarm, 700);

    intervalRef.current = setInterval(() => {
      playAlarmChime();
    }, 10_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [dose?.id, medication?.name, i18n.language]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.88)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="glass-matrix"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '32px 28px',
          textAlign: 'center',
          position: 'relative',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 50px rgba(239, 68, 68, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Radiating Concentric Sonar Ripple Rings */}
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="sonar-ring ring-1" />
          <span className="sonar-ring ring-2" />
          <span className="sonar-ring ring-3" />
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(239, 68, 68, 0.1))',
              border: '2px solid #ef4444',
              color: '#ffb4ab',
              fontSize: '34px',
              boxShadow: '0 0 24px rgba(239, 68, 68, 0.5)',
              animation: 'bellTink 1.2s ease-in-out infinite'
            }}
          >
            🔔
          </div>
        </div>

        <span className="chip-telemetry chip-error" style={{ fontSize: '0.74rem', marginBottom: '8px', padding: '3px 12px' }}>
          Medicine Reminder Alarm
        </span>

        <style>{`
          .sonar-ring {
            position: absolute;
            border-radius: 50%;
            border: 2px solid rgba(239, 68, 68, 0.45);
            pointer-events: none;
            animation: sonarPulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
          .ring-1 { width: 76px; height: 76px; animation-delay: 0s; }
          .ring-2 { width: 76px; height: 76px; animation-delay: 0.6s; }
          .ring-3 { width: 76px; height: 76px; animation-delay: 1.2s; }
          @keyframes sonarPulse {
            0% { transform: scale(1); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes bellTink {
            0%, 100% { transform: rotate(0deg) scale(1); }
            15% { transform: rotate(-10deg) scale(1.05); }
            30% { transform: rotate(10deg) scale(1.05); }
            45% { transform: rotate(-5deg); }
            60% { transform: rotate(5deg); }
            75% { transform: rotate(0deg); }
          }
        `}</style>

        <h2 style={{ fontSize: '1.6rem', color: '#ffffff', margin: '4px 0 6px' }}>
          {medication?.name || t('medication')}
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#00f2fe', fontWeight: '600', margin: '0 0 14px' }}>
          {medication?.dosage} · {formatTime(dose?.scheduledTime, i18n.language)}
        </p>

        {/* Pill color preview tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'rgba(10, 14, 23, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '16px'
          }}
        >
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: medication?.color || '#00f2fe', boxShadow: `0 0 8px ${medication?.color || '#00f2fe'}` }} />
          <span style={{ fontSize: '0.84rem', color: '#dfe2ef' }}>Prescribed Dose</span>
        </div>

        {/* Dietary note if available */}
        {medication?.safety && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '10px 14px',
              margin: '0 0 20px',
              fontSize: '0.88rem',
              color: '#6ffbbe',
              textAlign: 'left',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{medication.safety.icon}</span>
            <span>{medication.safety.instruction}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn-cyber"
            style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
            onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              onConfirm(dose, 'taken');
            }}
          >
            ✓ {t('taken')}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-glass"
              style={{ flex: 1, padding: '12px' }}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onSnooze(dose);
              }}
            >
              ⏰ Snooze 5m
            </button>

            <button
              type="button"
              className="btn-glass"
              style={{ flex: 1, padding: '12px', color: '#94a3b8' }}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onConfirm(dose, 'skipped');
              }}
            >
              {t('skipped')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
