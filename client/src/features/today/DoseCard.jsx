import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/format.js';

export function DoseCard({ log, medication, onConfirm, onSpeak, onVerifyPill }) {
  const { t, i18n } = useTranslation();
  const isPending = log.status === 'pending';
  const isTaken = log.status === 'taken';
  const isMissed = log.status === 'missed';
  const isSkipped = log.status === 'skipped';

  const cardBorderColor = isTaken
    ? 'var(--emerald-border)'
    : isMissed
    ? 'var(--coral-border)'
    : isPending
    ? 'rgba(255, 255, 255, 0.1)'
    : 'var(--surface-border)';

  const cardBg = isTaken
    ? 'rgba(16, 185, 129, 0.04)'
    : isMissed
    ? 'rgba(239, 68, 68, 0.04)'
    : 'var(--surface)';

  return (
    <article
      className="hm-card"
      style={{
        padding: '18px 20px',
        backgroundColor: cardBg,
        borderColor: cardBorderColor,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header: Time, Pill Dot, Medicine Name & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* Solid Color Pill Dot */}
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: medication?.color || 'var(--cyan)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              marginTop: '4px',
              flexShrink: 0
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="font-mono"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  color: isTaken ? 'var(--mint-bright)' : 'var(--cyan)',
                  letterSpacing: '0.02em'
                }}
              >
                {formatTime(log.scheduledTime, i18n.language)}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>•</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {medication?.dosage || 'Prescription dose'}
              </span>
            </div>

            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: '#ffffff',
                margin: '3px 0 2px'
              }}
            >
              {medication?.name || t('medication')}
            </h3>
          </div>
        </div>

        {/* Status Indicator */}
        {!isPending && (
          <span
            className={`chip-telemetry ${isTaken ? 'chip-mint' : isMissed ? 'chip-error' : 'chip-telemetry'}`}
            style={{
              fontSize: '0.74rem',
              padding: '3px 10px',
              background: isSkipped ? 'rgba(255,255,255,0.05)' : undefined,
              color: isSkipped ? 'var(--text-muted)' : undefined,
              border: isSkipped ? '1px solid rgba(255,255,255,0.1)' : undefined
            }}
          >
            {isTaken && <span>✓</span>}
            {isMissed && <span>⚠</span>}
            {isTaken ? t('taken') : isMissed ? t('missed') : t('skipped')}
          </span>
        )}
      </div>

      {/* Safety guideline notes */}
      {medication?.safety && (
        <div
          style={{
            background: 'rgba(0, 210, 211, 0.05)',
            borderLeft: '3px solid var(--cyan)',
            padding: '7px 12px',
            borderRadius: '0 8px 8px 0',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ color: 'var(--cyan)', fontSize: '0.9rem' }}>ℹ</span>
          <span>{medication.safety.instruction}</span>
        </div>
      )}

      {/* Action Strip for Pending Dose */}
      {isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
          <button
            type="button"
            className="btn-cyber"
            style={{ width: '100%', padding: '12px', fontSize: '0.98rem' }}
            onClick={() => onConfirm(log, 'taken')}
          >
            <span>✓</span>
            <span>{t('taken')}</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
            {onVerifyPill && (
              <button
                type="button"
                className="btn-glass"
                style={{ padding: '7px 10px', fontSize: '0.8rem' }}
                onClick={() => onVerifyPill(log, medication)}
              >
                <span>📷</span>
                <span>{t('verifyPill')}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-glass"
              style={{ padding: '7px 10px', fontSize: '0.8rem' }}
              onClick={() => onSpeak(log)}
            >
              <span>🎙️</span>
              <span>{t('sayIt')}</span>
            </button>

            <button
              type="button"
              className="btn-glass"
              style={{
                padding: '7px 10px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
              onClick={() => onConfirm(log, 'skipped')}
            >
              <span>{t('skipped')}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
