import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavButtons } from './NavButtons.jsx';

export function Sidebar({ session, items, activeTab, onSelect, unreadAlerts, onToggleLanguage, onLogout }) {
  const { t } = useTranslation();
  const initial = session.name?.[0]?.toUpperCase() || 'H';

  return (
    <aside className="sidebar">
      {/* Brand Mark */}
      <div className="logo" style={{ marginBottom: '20px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'var(--cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#05080f',
            fontSize: '1.05rem',
            fontWeight: '800',
            boxShadow: '0 2px 8px rgba(0, 210, 211, 0.25)',
            flexShrink: 0
          }}
        >
          ✚
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ letterSpacing: '-0.025em', fontSize: '1.12rem', fontWeight: '700', color: '#ffffff' }}>
            HealthMitra
          </span>
          <span style={{ fontSize: '0.66rem', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: '600' }}>
            Clinical Suite
          </span>
        </div>
      </div>

      {/* Role Pill */}
      <div
        className="chip-telemetry chip-cyan"
        style={{
          margin: '0 4px 18px',
          fontSize: '0.68rem',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
          width: 'fit-content'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cyan)' }} />
        {session.role === 'patient' ? t('patientMode') : t('caregiverMode')}
      </div>

      {/* Main Navigation */}
      <nav aria-label={t('mainNavigation')}>
        <NavButtons items={items} activeTab={activeTab} onSelect={onSelect} unreadAlerts={unreadAlerts} />
      </nav>

      {/* Bottom Controls */}
      <div className="side-bottom" style={{ marginTop: 'auto', display: 'grid', gap: '6px', paddingTop: '16px' }}>
        <button
          type="button"
          onClick={onToggleLanguage}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: 'var(--radius-item)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: 'var(--text-secondary)',
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#ffffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>🌐</span>
          <span>{t('language')}</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '9px 12px',
            borderRadius: 'var(--radius-item)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            color: 'var(--text-secondary)',
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#fca5a5';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '0.95rem' }}>↪</span>
          <span>{t('logout')}</span>
        </button>

        {/* User Identity */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '14px',
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#151d2f',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cyan)',
              fontWeight: '700',
              fontSize: '0.88rem',
              flexShrink: 0
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <strong
              style={{
                display: 'block',
                fontSize: '0.84rem',
                color: '#ffffff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: '600'
              }}
            >
              {session.name}
            </strong>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', textTransform: 'capitalize' }}>
              {session.role === 'patient' ? t('patient') : t('caregiver')}
            </small>
          </div>
        </div>
      </div>
    </aside>
  );
}
