import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '../../utils/format.js';

export function Topbar({ session, patients, selectedPatient, selectedPatientId, onSelectPatient, onToggleLanguage, onSos }) {
  const { t, i18n } = useTranslation();
  return <header className="topbar">
    <div className="topbar-copy">
      <p className="eyebrow">{formatLongDate(new Date(), i18n.language)}</p>
      <h1>{t('greeting')}, {session.name.split(' ')[0]} <span className="wave" aria-hidden="true">✦</span></h1>
      {session.role === 'caregiver' && selectedPatient && <p className="context-line">{t('watching')} <strong>{selectedPatient.name}</strong></p>}
    </div>
    <div className="topbar-actions">
      {session.role === 'caregiver' && patients.length > 0 && <label className="patient-picker"><span>{t('patient')}</span><select value={selectedPatientId} onChange={(event) => onSelectPatient(event.target.value)}>{patients.map((item) => <option key={item.patient.id} value={item.patient.id}>{item.patient.name}</option>)}</select></label>}
      <button className="language-chip" onClick={onToggleLanguage}>अ / A</button>
      {session.role === 'patient' && <button className="sos" onClick={onSos}>⚠ {t('sos')}</button>}
    </div>
  </header>;
}
