import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/format.js';

export function DoseCard({ log, medication, onConfirm, onSpeak, onVerifyPill }) {
  const { t, i18n } = useTranslation();
  const isPending = log.status === 'pending';
  const isTaken = log.status === 'taken';
  const isMissed = log.status === 'missed';
  const isSkipped = log.status === 'skipped';

  return (
    <article
      className={`glass-matrix glass-matrix-hover ${isTaken ? 'glass-matrix-active' : ''}`}
      style={{
        padding: '20px 22px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        position: 'relative'
      }}
    >
      {/* Header: Time, Color Dot, Name & Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* Glowing pill color dot */}
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: medication?.color || '#00f2fe',
              boxShadow: `0 0 10px ${medication?.color || '#00f2fe'}`,
              marginTop: '4px',
              flexShrink: 0
            }}
          />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: '#00f2fe',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                {formatTime(log.scheduledTime, i18n.language)}
              </span>
              <span style={{ color: '#849495', fontSize: '0.75rem' }}>•</span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {medication?.dosage || 'Prescription'}
              </span>
            </div>

            <h3
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: '1.35rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: '2px 0 2px'
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
              fontSize: '0.78rem',
              padding: '4px 12px',
              background: isSkipped ? 'rgba(255,255,255,0.05)' : undefined,
              color: isSkipped ? '#94a3b8' : undefined,
              border: isSkipped ? '1px solid rgba(255,255,255,0.1)' : undefined
            }}
          >
            {isTaken && <span>✓</span>}
            {isMissed && <span>⚠</span>}
            {isTaken ? t('taken') : isMissed ? t('missed') : t('skipped')}
          </span>
        )}
      </div>

      {/* Safety guideline notes in dark glass accent callout */}
      {medication?.safety && (
        <div
          style={{
            background: 'rgba(0, 242, 254, 0.05)',
            borderLeft: '3px solid #00f2fe',
            padding: '8px 12px',
            borderRadius: '0 8px 8px 0',
            fontSize: '0.84rem',
            color: '#b9cacb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ color: '#00f2fe' }}>ℹ</span>
          <span>{medication.safety.instruction}</span>
        </div>
      )}

      {/* Action Strip for Pending Dose */}
      {isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
          <button
            type="button"
            className="btn-cyber"
            style={{ width: '100%', padding: '14px', fontSize: '1.05rem' }}
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
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                onClick={() => onVerifyPill(log, medication)}
              >
                <span>📷</span>
                <span>{t('verifyPill')}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-glass"
              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              onClick={() => onSpeak(log)}
            >
              <span>🎙️</span>
              <span>{t('sayIt')}</span>
            </button>

            <button
              type="button"
              className="btn-glass"
              style={{
                padding: '8px 12px',
                fontSize: '0.82rem',
                color: '#94a3b8',
                borderColor: 'rgba(255, 255, 255, 0.06)'
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
