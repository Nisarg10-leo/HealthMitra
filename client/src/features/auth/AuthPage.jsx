import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/index.js';
import { CinematicSunHero } from '../../components/ui/CinematicSunHero.jsx';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function AuthPage({ onLogin }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [validationError, setValidationError] = useState('');
  const { busy, error, run } = useAsyncAction();

  const field = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
    setValidationError('');
  };

  const passwordRules = useMemo(() => {
    const pwd = form.password || '';
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
      match: mode === 'register' ? (pwd.length > 0 && pwd === form.confirmPassword) : true
    };
  }, [form.password, form.confirmPassword, mode]);

  const allRulesPass = passwordRules.length && passwordRules.upper && passwordRules.lower && passwordRules.number && passwordRules.special && passwordRules.match;

  const submit = (event) => {
    event.preventDefault();
    if (mode === 'register') {
      if (!allRulesPass) {
        if (!passwordRules.match) {
          setValidationError('Passwords do not match.');
          return;
        }
        setValidationError('Please ensure your password meets all security requirements.');
        return;
      }
    }
    run(async () => {
      const res = mode === 'login'
        ? await authApi.login(form.email, form.password)
        : await authApi.register({ name: form.name, email: form.email, phone: form.phone, password: form.password }, role);
      onLogin(res.user);
    });
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setValidationError('');
  };

  return (
    <main className="auth">
      {/* Sub-surface Ambient Luminescence */}
      <div className="sub-luminescence-cyan" />
      <div className="sub-luminescence-violet" />

      <section className="brand-panel">
        <CinematicSunHero />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p className="eyebrow" style={{ color: '#00f2fe', letterSpacing: '0.14em', fontWeight: '700' }}>
            HEALTHMITRA • VITALIS NEURAL PLATFORM
          </p>
          <h1 style={{ fontSize: '3rem', lineHeight: '1.08', margin: '8px 0 16px', color: '#ffffff' }}>
            {t('brandTitle')}<br />
            <em style={{ color: '#00f2fe', fontStyle: 'normal' }}>{t('brandTitleAccent')}</em>
          </h1>
          <p style={{ color: '#b9cacb', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '480px' }}>
            {t('brandDescription')}
          </p>
          <div className="trust" style={{ color: '#6ffbbe', marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6ffbbe', display: 'inline-block', boxShadow: '0 0 8px #6ffbbe' }} />
            256-bit HIPAA compliant family health network
          </div>
          <div className="brand-pills" style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span className="chip-telemetry chip-cyan">Voice-assisted</span>
            <span className="chip-telemetry chip-violet">Caregiver loop</span>
            <span className="chip-telemetry chip-mint">English + हिन्दी</span>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="glass-matrix" style={{ padding: '36px 32px' }}>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', marginBottom: '10px' }}>
            {mode === 'login' ? 'Secure Authentication' : 'Create Encrypted Account'}
          </span>
          <h2 style={{ fontSize: '1.85rem', margin: '4px 0 6px', color: '#ffffff' }}>
            {mode === 'login' ? t('welcomeBack') : t('createAccount')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 20px', lineHeight: '1.5' }}>
            {mode === 'login' ? 'Sign in to access real-time telemetry and medication scheduling.' : 'Set up your secure HealthMitra profile.'}
          </p>

          {mode === 'register' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: 'rgba(10, 14, 23, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '20px'
              }}
              aria-label={t('chooseRole')}
            >
              <button
                type="button"
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: role === 'patient' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'transparent',
                  color: role === 'patient' ? '#090d16' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setRole('patient')}
              >
                {t('patient')}
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: role === 'caregiver' ? 'linear-gradient(135deg, #00f2fe, #4facfe)' : 'transparent',
                  color: role === 'caregiver' ? '#090d16' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setRole('caregiver')}
              >
                {t('caregiver')}
              </button>
            </div>
          )}

          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                  {t('name')}
                  <input
                    required
                    value={form.name}
                    onChange={field('name')}
                    placeholder={t('namePlaceholder')}
                    autoComplete="name"
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
                  />
                </label>
                <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                  {t('phone')}
                  <input
                    value={form.phone}
                    onChange={field('phone')}
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
                  />
                </label>
              </>
            )}

            <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
              {t('email')}
              <input
                required
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="name@example.com"
                autoComplete="email"
                style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
              {t('password')}
              <input
                required
                type="password"
                value={form.password}
                onChange={field('password')}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
              />
            </label>

            {mode === 'register' && (
              <>
                <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                  Confirm Password
                  <input
                    required
                    type="password"
                    value={form.confirmPassword}
                    onChange={field('confirmPassword')}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
                  />
                </label>

                {/* Vitalis Dark Glass Password Security Checklist */}
                <div
                  style={{
                    background: 'rgba(10, 14, 23, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '14px',
                    margin: '12px 0 16px',
                    fontSize: '0.8rem'
                  }}
                >
                  <strong style={{ color: '#00f2fe', display: 'block', marginBottom: '8px', fontSize: '0.78rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Security Requirements:
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <span style={{ color: passwordRules.length ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.length ? '✓' : '○'}</span> 8+ characters
                    </span>
                    <span style={{ color: passwordRules.upper ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.upper ? '✓' : '○'}</span> Uppercase letter
                    </span>
                    <span style={{ color: passwordRules.lower ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.lower ? '✓' : '○'}</span> Lowercase letter
                    </span>
                    <span style={{ color: passwordRules.number ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.number ? '✓' : '○'}</span> At least 1 number
                    </span>
                    <span style={{ color: passwordRules.special ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.special ? '✓' : '○'}</span> Special symbol
                    </span>
                    <span style={{ color: passwordRules.match ? '#6ffbbe' : '#ffb4ab', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{passwordRules.match ? '✓' : '○'}</span> Passwords match
                    </span>
                  </div>
                </div>
              </>
            )}

            <ErrorText error={validationError || error} />

            <button
              className="btn-cyber"
              disabled={busy || (mode === 'register' && !allRulesPass)}
              style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '1.02rem' }}
            >
              {busy ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.86rem', color: '#94a3b8' }}>
            {mode === 'login' ? 'Need a new HealthMitra account?' : t('alreadyAccount')}
            <button
              type="button"
              onClick={switchMode}
              style={{
                marginLeft: '8px',
                fontWeight: '700',
                color: '#00f2fe',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {mode === 'login' ? t('createAccount') : t('signIn')}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
