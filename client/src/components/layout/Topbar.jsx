import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '../../utils/format.js';

export function Topbar({ session, patients, selectedPatient, selectedPatientId, onSelectPatient, onToggleLanguage, onSos }) {
  const { t, i18n } = useTranslation();
  const firstName = session?.name ? session.name.split(' ')[0] : 'User';
  const initial = session?.name ? session.name.charAt(0).toUpperCase() : 'H';

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Profile Avatar with Neon Status Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              padding: '2px',
              background: 'linear-gradient(135deg, #6ffbbe 0%, #00f2fe 50%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: '#0a0e17',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe',
                fontWeight: '800',
                fontSize: '1.1rem'
              }}
            >
              {initial}
            </div>
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#6ffbbe',
              border: '2px solid #080c15',
              boxShadow: '0 0 8px #6ffbbe'
            }}
          />
        </div>

        {/* Greetings and Telemetry Status Chips */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#e0fdff' }}>
              {t('greeting')}, {firstName}
            </h1>
            <span style={{ color: '#00f2fe', fontSize: '1rem' }}>✦</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span
              className="chip-telemetry chip-mint"
              style={{ fontSize: '0.68rem', padding: '2px 8px', letterSpacing: '0.04em' }}
            >
              <span
                className="animate-ping"
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6ffbbe', display: 'inline-block' }}
              />
              All systems nominal
            </span>

            <span
              className="chip-telemetry"
              style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8'
              }}
            >
              🔒 256-bit Secure
            </span>

            {session.role === 'caregiver' && selectedPatient && (
              <span
                className="chip-telemetry chip-cyan"
                style={{ fontSize: '0.68rem', padding: '2px 8px' }}
              >
                {t('watching')}: {selectedPatient.name}
              </span>
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
              background: 'rgba(10, 14, 23, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '4px 10px',
              fontSize: '0.8rem',
              color: '#94a3b8',
              fontWeight: '600'
            }}
          >
            <span>{t('patient')}:</span>
            <select
              value={selectedPatientId}
              onChange={(event) => onSelectPatient(event.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00f2fe',
                fontWeight: '700',
                cursor: 'pointer',
                paddingRight: '12px'
              }}
            >
              {patients.map((item) => (
                <option key={item.patient.id} value={item.patient.id} style={{ background: '#0a0e17', color: '#fff' }}>
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
          style={{ padding: '6px 12px', fontSize: '0.82rem', borderRadius: '10px' }}
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
