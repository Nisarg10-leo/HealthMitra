import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '../../utils/format.js';

export function Topbar({ session, patients, selectedPatient, selectedPatientId, onSelectPatient, onToggleLanguage, onSos }) {
  const { t, i18n } = useTranslation();
  const firstName = session?.name ? session.name.split(' ')[0] : 'User';
  const initial = session?.name ? session.name.charAt(0).toUpperCase() : 'H';
  const todayFormatted = formatLongDate(new Date(), i18n.language);

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Profile Avatar */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#151d2f',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--cyan)',
            fontWeight: '700',
            fontSize: '1rem',
            flexShrink: 0
          }}
        >
          {initial}
        </div>

        {/* Greeting & Date */}
        <div>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#ffffff', letterSpacing: '-0.02em' }}>
            {t('greeting')}, {firstName}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {todayFormatted}
            </span>
            {session.role === 'caregiver' && selectedPatient && (
              <>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>•</span>
                <span
                  className="chip-telemetry chip-cyan"
                  style={{ fontSize: '0.68rem', padding: '2px 8px' }}
                >
                  {t('watching')}: {selectedPatient.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Actions: Patient Selector, Language Toggle, SOS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {session.role === 'caregiver' && patients.length > 0 && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-item)',
              padding: '5px 10px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              fontWeight: '500'
            }}
          >
            <span>{t('patient')}:</span>
            <select
              value={selectedPatientId}
              onChange={(event) => onSelectPatient(event.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cyan)',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '0.82rem'
              }}
            >
              {patients.map((item) => (
                <option key={item.patient.id} value={item.patient.id} style={{ background: '#0e1422', color: '#ffffff' }}>
                  {item.patient.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          className="btn-glass"
          onClick={onToggleLanguage}
          style={{ padding: '6px 12px', fontSize: '0.82rem' }}
          title={t('language')}
        >
          🌐 {i18n.language === 'en' ? 'हिन्दी' : 'English'}
        </button>

        {session.role === 'patient' && (
          <button
            type="button"
            className="btn-emergency"
            onClick={onSos}
            title="Trigger Emergency SOS"
          >
            <span>🚨</span>
            <span>SOS</span>
          </button>
        )}
      </div>
    </header>
  );
}
