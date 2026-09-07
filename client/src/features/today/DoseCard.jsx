import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../../utils/format.js';

const statusLabel = (log, t) => `${log.status === 'taken' ? `✓ ${t('taken')}` : log.status === 'missed' ? t('missed') : t('skipped')}${log.responseMethod === 'voice' ? ` · ${t('voice')}` : ''}`;

// Presentational: knows how to show one dose, not how to save it.
export function DoseCard({ log, medication, onConfirm, onSpeak }) {
  const { t, i18n } = useTranslation();
  return <article className={`dose-card ${log.status}`}>
    <div className="pill" style={{ background: medication?.color }} aria-hidden="true" />
    <div className="dose-main"><p>{formatTime(log.scheduledTime, i18n.language)}</p><h3>{medication?.name || t('medication')}</h3><span>{medication?.dosage}</span></div>
    <div className="dose-action">
      {log.status === 'pending'
        ? <>
          <button className="voice" onClick={() => onSpeak(log)}><span aria-hidden="true">◉</span> {t('sayIt')}</button>
          <button className="taken" onClick={() => onConfirm(log, 'taken')}>✓ {t('taken')}</button>
          <button className="skip" onClick={() => onConfirm(log, 'skipped')}>{t('skipped')}</button>
        </>
        : <span className={`status ${log.status}`}>{statusLabel(log, t)}</span>}
    </div>
  </article>;
}
