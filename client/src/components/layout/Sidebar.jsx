import React from 'react';
import { useTranslation } from 'react-i18next';
import { CrossMedicalIcon, GlobeIcon, LogoutIcon } from '../ui/Icons.jsx';
import { NavButtons } from './NavButtons.jsx';

export function Sidebar({ session, items, activeTab, onSelect, unreadAlerts, onToggleLanguage, onLogout }) {
  const { t, i18n } = useTranslation();
  const initial = session.name?.[0]?.toUpperCase() || 'H';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <CrossMedicalIcon size={16} strokeWidth={2.2} />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-title">HealthMitra</span>
          <span className="sidebar-brand-subtitle">Clinical Platform</span>
        </div>
      </div>

      {/* Role Pill */}
      <div className="sidebar-role-badge">
        <span className="sidebar-role-dot" />
        <span>{session.role === 'patient' ? t('patientMode') : t('caregiverMode')}</span>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav" aria-label={t('mainNavigation')}>
        <NavButtons items={items} activeTab={activeTab} onSelect={onSelect} unreadAlerts={unreadAlerts} />
      </nav>

      {/* Bottom Controls */}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-action-btn"
          onClick={onToggleLanguage}
          title={t('language')}
        >
          <GlobeIcon size={16} />
          <span>{i18n.language === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        <button
          type="button"
          className="sidebar-action-btn logout-btn"
          onClick={onLogout}
          title={t('logout')}
        >
          <LogoutIcon size={16} />
          <span>{t('logout')}</span>
        </button>

        {/* User Identity */}
        <div className="sidebar-user-card">
          <div className="sidebar-user-avatar">
            {initial}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{session.name}</span>
            <span className="sidebar-user-role">
              {session.role === 'patient' ? t('patient') : t('caregiver')}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
