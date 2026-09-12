import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/format.js';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CameraIcon,
  CheckIcon,
  MicrophoneIcon
} from '../../components/ui/Icons.jsx';

export function DoseCard({ log, medication, onConfirm, onSpeak, onVerifyPill }) {
  const { t, i18n } = useTranslation();
  const isPending = log.status === 'pending';
  const isTaken = log.status === 'taken';
  const isMissed = log.status === 'missed';
  const isSkipped = log.status === 'skipped';

  const statusClass = isTaken
    ? 'dose-card-taken'
    : isMissed
    ? 'dose-card-missed'
    : isPending
    ? 'dose-card-pending'
    : 'dose-card-skipped';

  return (
    <article className={`dose-card ${statusClass}`}>
      {/* Header: Time, Pill Dot, Medicine Name & Status */}
      <div className="dose-card-header">
        <div className="dose-card-meta-left">
          {/* Pill color indicator pip */}
          <span
            className="dose-pill-pip"
            style={{ backgroundColor: medication?.color || 'var(--cyan)' }}
            aria-hidden="true"
          />

          <div>
            <div className="dose-timing-row">
              <span className="dose-time font-mono">
                {formatTime(log.scheduledTime, i18n.language)}
              </span>
              <span className="dose-timing-dot">•</span>
              <span className="dose-dosage">
                {medication?.dosage || 'Prescription dose'}
              </span>
            </div>

            <h3 className="dose-med-name">
              {medication?.name || t('medication')}
            </h3>
          </div>
        </div>

        {/* Status Chip */}
        {!isPending && (
          <span
            className={`chip-telemetry ${
              isTaken ? 'chip-mint' : isMissed ? 'chip-error' : 'chip-neutral'
            }`}
          >
            {isTaken && <CheckIcon size={12} />}
            {isMissed && <AlertTriangleIcon size={12} />}
            <span>{isTaken ? t('taken') : isMissed ? t('missed') : t('skipped')}</span>
          </span>
        )}
      </div>

      {/* Safety guideline notes */}
      {medication?.safety?.instruction && (
        <div className="dose-safety-banner">
          <AlertCircleIcon size={14} className="safety-icon" />
          <span>{medication.safety.instruction}</span>
        </div>
      )}

      {/* Action Area for Pending Dose */}
      {isPending && (
        <div className="dose-card-actions">
          <button
            type="button"
            className="btn-cyber dose-take-btn"
            onClick={() => onConfirm(log, 'taken')}
          >
            <span className="btn-icon-pip">
              <CheckIcon size={16} strokeWidth={2.2} />
            </span>
            <span>{t('taken')}</span>
          </button>

          <div className="dose-secondary-actions">
            {onVerifyPill && (
              <button
                type="button"
                className="btn-glass"
                onClick={() => onVerifyPill(log, medication)}
                title={t('verifyPill')}
              >
                <CameraIcon size={14} />
                <span>{t('verifyPill')}</span>
              </button>
            )}

            <button
              type="button"
              className="btn-glass"
              onClick={() => onSpeak(log)}
              title={t('sayIt')}
            >
              <MicrophoneIcon size={14} />
              <span>{t('sayIt')}</span>
            </button>

            <button
              type="button"
              className="btn-glass btn-skip"
              onClick={() => onConfirm(log, 'skipped')}
              title={t('skipped')}
            >
              <span>{t('skipped')}</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
