import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/index.js';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

const DEMO_ACCOUNTS = { patient: 'meera@demo.health', caregiver: 'arjun@demo.health' };

export function AuthPage({ onLogin }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const { busy, error, run } = useAsyncAction();
  const field = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  const submit = (event) => {
    event.preventDefault();
    run(async () => onLogin((mode === 'login' ? await authApi.login(form.email, form.password) : await authApi.register(form, role)).user));
  };
  const demo = (email) => run(async () => onLogin((await authApi.login(email, 'demo123')).user));
  const switchMode = () => setMode(mode === 'login' ? 'register' : 'login');

  return <main className="auth">
    <section className="brand-panel">
      <div className="brand-mark" aria-hidden="true">✚</div>
      <p className="eyebrow">HEALTHMITRA</p>
      <h1>{t('brandTitle')}<br /><em>{t('brandTitleAccent')}</em></h1>
      <p>{t('brandDescription')}</p>
      <div className="trust"><span aria-hidden="true">●</span> {t('privacyNote')}</div>
      <div className="brand-pills"><span>{t('pillVoice')}</span><span>{t('pillCare')}</span><span>{t('pillBilingual')}</span></div>
    </section>
    <section className="auth-card">
      <div className="mobile-brand">✚ HealthMitra</div>
      <p className="eyebrow">{mode === 'login' ? t('welcomeLabel') : t('newAccountLabel')}</p>
      <h2>{mode === 'login' ? t('welcomeBack') : t('createAccount')}</h2>
      <p className="muted">{mode === 'login' ? t('signInSubtitle') : t('accountSubtitle')}</p>
      {mode === 'register' && <div className="role-toggle" aria-label={t('chooseRole')}>
        <button type="button" className={role === 'patient' ? 'active' : ''} onClick={() => setRole('patient')}>{t('patient')}</button>
        <button type="button" className={role === 'caregiver' ? 'active' : ''} onClick={() => setRole('caregiver')}>{t('caregiver')}</button>
      </div>}
      <form onSubmit={submit}>
        {mode === 'register' && <>
          <label>{t('name')}<input required value={form.name} onChange={field('name')} placeholder={t('namePlaceholder')} /></label>
          <label>{t('phone')}<input value={form.phone} onChange={field('phone')} placeholder="+91 ..." /></label>
        </>}
        <label>{t('email')}<input required type="email" value={form.email} onChange={field('email')} placeholder="you@example.com" /></label>
        <label>{t('password')}<input required type="password" minLength="6" value={form.password} onChange={field('password')} placeholder="••••••••" /></label>
        <ErrorText error={error} />
        <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')}</button>
      </form>
      {mode === 'login' && <div className="demo"><span>{t('tryDemo')}</span><button type="button" onClick={() => demo(DEMO_ACCOUNTS.patient)} disabled={busy}>{t('patientDemo')}</button><button type="button" onClick={() => demo(DEMO_ACCOUNTS.caregiver)} disabled={busy}>{t('caregiverDemo')}</button></div>}
      <p className="switch">{mode === 'login' ? t('newToHealthMitra') : t('alreadyAccount')} <button type="button" onClick={switchMode}>{mode === 'login' ? t('createAccount') : t('signIn')}</button></p>
      <p className="prototype-note">{t('prototypeNote')}</p>
    </section>
  </main>;
}
