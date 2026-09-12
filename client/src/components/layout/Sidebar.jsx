import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavButtons } from './NavButtons.jsx';

export function Sidebar({ session, items, activeTab, onSelect, unreadAlerts, onToggleLanguage, onLogout }) {
  const { t } = useTranslation();
  const initial = session.name?.[0] || 'H';

  return (
    <aside className="sidebar">
      <div className="logo" style={{ marginBottom: '18px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #00f2fe 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#090d16',
            fontSize: '1.1rem',
            fontWeight: '900',
            boxShadow: '0 0 12px rgba(0, 242, 254, 0.4)'
          }}
        >
          ✚
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ letterSpacing: '-0.02em', fontSize: '1.15rem' }}>HealthMitra</span>
          <span style={{ fontSize: '0.65rem', color: '#00f2fe', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: '700' }}>
            Vitalis Neural
          </span>
        </div>
      </div>

      <div
        className="chip-telemetry chip-cyan"
        style={{
          margin: '0 4px 20px',
          fontSize: '0.68rem',
          padding: '4px 10px',
          borderRadius: '8px',
          width: 'fit-content'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f2fe' }} />
        {session.role === 'patient' ? t('patientMode') : t('caregiverMode')}
      </div>

      <nav aria-label={t('mainNavigation')}>
        <NavButtons items={items} activeTab={activeTab} onSelect={onSelect} unreadAlerts={unreadAlerts} />
      </nav>

      <div className="side-bottom" style={{ marginTop: 'auto', display: 'grid', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleLanguage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8',
            fontSize: '0.84rem'
          }}
        >
          <span aria-hidden="true" style={{ color: '#00f2fe' }}>🌐</span>
          <span>{t('language')}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8',
            fontSize: '0.84rem'
          }}
        >
          <span aria-hidden="true" style={{ color: '#ffb4ab' }}>↪</span>
          <span>{t('logout')}</span>
        </button>

        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '14px',
            marginTop: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              padding: '1.5px',
              background: 'linear-gradient(135deg, #10b981, #00f2fe)',
              flexShrink: 0
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
                fontWeight: '700',
                fontSize: '0.9rem'
              }}
            >
              {initial}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <strong
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {session.name}
            </strong>
            <small style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'capitalize' }}>
              {session.role === 'patient' ? t('patient') : t('caregiver')}
            </small>
          </div>
        </div>
      </div>
    </aside>
  );
}
