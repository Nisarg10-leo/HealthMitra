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
    // 1. Play immediate chime + announce
    playAlarmChime();
    setTimeout(announceAlarm, 700);

    // 2. Repeat gentle chime every 10 seconds while alarm is active
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          animation: 'popIn 0.3s ease-out'
        }}
      >
        {/* Pulsing Alarm Header */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', fontSize: '32px', marginBottom: '16px', boxShadow: '0 0 0 8px rgba(239, 68, 68, 0.15)' }}>
          🔔
        </div>

        <span style={{ display: 'inline-block', background: '#fee2e2', color: '#b91c1c', fontSize: '0.8em', fontWeight: '700', padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Medicine Reminder Alarm
        </span>

        <h2 style={{ fontSize: '1.6em', color: '#0f172a', margin: '4px 0 6px' }}>
          {medication?.name || t('medication')}
        </h2>
        <p style={{ fontSize: '1.15em', color: '#475569', fontWeight: '500', margin: '0 0 12px' }}>
          {medication?.dosage} · {formatTime(dose?.scheduledTime, i18n.language)}
        </p>

        {/* Pill pill preview tag */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: medication?.color || '#4f67d8' }} />
          <span style={{ fontSize: '0.88em', color: '#334155' }}>Prescribed Dose</span>
        </div>

        {/* Dietary note if available */}
        {medication?.safety && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', margin: '0 0 20px', fontSize: '0.88em', color: '#166534', textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2em' }}>{medication.safety.icon}</span>
            <span>{medication.safety.instruction}</span>
          </div>
        )}

        {/* Large Accessible Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '1.1em', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)' }}
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
              style={{ flex: 1, background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '11px', borderRadius: '10px', fontSize: '0.95em', fontWeight: '600', cursor: 'pointer' }}
              onClick={() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                onSnooze(dose);
              }}
            >
              ⏰ Snooze 5m
            </button>
            <button
              type="button"
              style={{ flex: 1, background: '#f8fafc', color: '#64748b', border: '1px solid #cbd5e1', padding: '11px', borderRadius: '10px', fontSize: '0.95em', fontWeight: '600', cursor: 'pointer' }}
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
