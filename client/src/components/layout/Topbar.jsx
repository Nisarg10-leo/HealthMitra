import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '../../utils/format.js';
import { AlertTriangleIcon } from '../ui/Icons.jsx';

export function Topbar({ session, patients, selectedPatient, selectedPatientId, onSelectPatient, onSos }) {
  const { t, i18n } = useTranslation();
  const firstName = session?.name ? session.name.split(' ')[0] : 'User';
  const initial = session?.name ? session.name.charAt(0).toUpperCase() : 'H';
  const todayFormatted = formatLongDate(new Date(), i18n.language);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-avatar" aria-hidden="true">
          {initial}
        </div>

        <div className="topbar-meta">
          <h1 className="topbar-greeting">
            {t('greeting')}, {firstName}
          </h1>
          <div className="topbar-subline">
            <span className="topbar-date font-mono">{todayFormatted}</span>
            {session.role === 'caregiver' && selectedPatient && (
              <>
                <span className="topbar-divider">•</span>
                <span className="chip-telemetry chip-cyan">
                  {t('watching')}: {selectedPatient.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        {session.role === 'caregiver' && patients.length > 0 && (
          <label className="topbar-patient-select">
            <span className="select-label">{t('patient')}:</span>
            <select
              value={selectedPatientId}
              onChange={(event) => onSelectPatient(event.target.value)}
              className="patient-dropdown"
            >
              {patients.map((item) => (
                <option key={item.patient.id} value={item.patient.id}>
                  {item.patient.name}
                </option>
              ))}
            </select>
          </label>
        )}


        {session.role === 'patient' && (
          <button
            type="button"
            className="btn-emergency topbar-btn"
            onClick={onSos}
            title="Trigger Emergency SOS"
          >
            <AlertTriangleIcon size={15} />
            <span>SOS</span>
          </button>
        )}
      </div>
    </header>
  );
}
