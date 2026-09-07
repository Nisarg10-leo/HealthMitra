import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavButtons } from './NavButtons.jsx';

export function Sidebar({ session, items, activeTab, onSelect, unreadAlerts, onToggleLanguage, onLogout }) {
  const { t } = useTranslation();
  return <aside className="sidebar">
    <div className="logo"><b aria-hidden="true">✚</b> HealthMitra</div>
    <div className="role-badge">{session.role === 'patient' ? t('patientMode') : t('caregiverMode')}</div>
    <nav aria-label={t('mainNavigation')}><NavButtons items={items} activeTab={activeTab} onSelect={onSelect} unreadAlerts={unreadAlerts} /></nav>
    <div className="side-bottom">
      <button onClick={onToggleLanguage}><span aria-hidden="true">अ / A</span> {t('language')}</button>
      <button onClick={onLogout}><span aria-hidden="true">↪</span> {t('logout')}</button>
      <div className="profile"><div>{session.name?.[0] || 'H'}</div><span><strong>{session.name}</strong><small>{session.role === 'patient' ? t('patient') : t('caregiver')}</small></span></div>
    </div>
  </aside>;
}
