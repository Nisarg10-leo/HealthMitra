import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/index.js';
import { CinematicSunHero } from '../../components/ui/CinematicSunHero.jsx';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function AuthPage({ onLogin }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const { busy, error, run } = useAsyncAction();

  const field = (key) => (event) => {
    setForm({ ...form, [key]: event.target.value });
    setValidationError('');
  };

  const registerRules = useMemo(() => {
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

  const allRegisterRulesPass =
    registerRules.length &&
    registerRules.upper &&
    registerRules.lower &&
    registerRules.number &&
    registerRules.special &&
    registerRules.match;

  const resetRules = useMemo(() => {
    const pwd = newPassword || '';
    return {
      length: pwd.length >= 8,
      upper: /[A-Z]/.test(pwd),
      lower: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
      match: pwd.length > 0 && pwd === confirmNewPassword
    };
  }, [newPassword, confirmNewPassword]);

  const allResetRulesPass =
    resetRules.length &&
    resetRules.upper &&
    resetRules.lower &&
    resetRules.number &&
    resetRules.special &&
    resetRules.match;

  const submitAuth = (event) => {
    event.preventDefault();
    if (mode === 'register') {
      if (!allRegisterRulesPass) {
        if (!registerRules.match) {
          setValidationError('Passwords do not match.');
          return;
        }
        setValidationError('Please ensure your password meets all security requirements.');
        return;
      }
    }
    const cleanEmail = String(form.email || '').trim();
    run(async () => {
      const res = mode === 'login'
        ? await authApi.login(cleanEmail, form.password)
        : await authApi.register({ name: String(form.name || '').trim(), email: cleanEmail, phone: String(form.phone || '').trim(), password: form.password }, role);
      onLogin(res.user);
    });
  };

  const handleSendOtp = (event) => {
    if (event) event.preventDefault();
    const cleanEmail = form.email ? form.email.trim() : '';
    if (!cleanEmail) {
      setValidationError('Please enter your email address.');
      return;
    }
    setValidationError('');
    setStatusMessage('');
    run(async () => {
      const res = await authApi.forgotPassword(cleanEmail);
      setStatusMessage(res.message || t('otpSent'));
      if (res.otp) {
        setDemoOtpHint(res.otp);
      }
      setMode('reset');
    });
  };

  const handleResetPassword = (event) => {
    event.preventDefault();
    const cleanOtp = otp.trim();
    if (cleanOtp.length !== 6) {
      setValidationError('Please enter the 6-digit verification code.');
      return;
    }
    if (!allResetRulesPass) {
      if (!resetRules.match) {
        setValidationError('Passwords do not match.');
        return;
      }
      setValidationError('Please ensure your new password meets all security requirements.');
      return;
    }
    setValidationError('');
    setStatusMessage('');
    run(async () => {
      const res = await authApi.resetPassword(form.email.trim(), cleanOtp, newPassword);
      setStatusMessage(res.message || t('passwordResetSuccess'));
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setDemoOtpHint('');
      setMode('login');
    });
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setValidationError('');
    setStatusMessage('');
    setDemoOtpHint('');
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
            {mode === 'login' && 'Secure Authentication'}
            {mode === 'register' && 'Create Encrypted Account'}
            {mode === 'forgot' && 'Account Recovery'}
            {mode === 'reset' && 'Verification & Reset'}
          </span>
          <h2 style={{ fontSize: '1.85rem', margin: '4px 0 6px', color: '#ffffff' }}>
            {mode === 'login' && t('welcomeBack')}
            {mode === 'register' && t('createAccount')}
            {mode === 'forgot' && (t('forgotPassword') || 'Forgot Password')}
            {mode === 'reset' && (t('resetPassword') || 'Reset Password')}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 20px', lineHeight: '1.5' }}>
            {mode === 'login' && 'Sign in to access real-time telemetry and medication scheduling.'}
            {mode === 'register' && 'Set up your secure HealthMitra profile.'}
            {mode === 'forgot' && 'Enter your registered email address to receive a 6-digit verification code.'}
            {mode === 'reset' && `Enter the 6-digit OTP sent to ${form.email || 'your email'} and set a new password.`}
          </p>

          {/* Success Status Message */}
          {statusMessage && (
            <div
              style={{
                background: 'rgba(111, 251, 190, 0.1)',
                border: '1px solid rgba(111, 251, 190, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                color: '#6ffbbe',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>✓</span>
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Demo OTP Helper (helpful for instant verification in dev & review) */}
          {demoOtpHint && mode === 'reset' && (
            <div
              style={{
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#00f2fe',
                fontSize: '0.82rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>
                Generated OTP: <strong style={{ letterSpacing: '0.12em', color: '#ffffff', fontSize: '0.95rem' }}>{demoOtpHint}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setOtp(demoOtpHint);
                  setValidationError('');
                }}
                style={{
                  background: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  color: '#00f2fe',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* REGISTER ROLE PICKER */}
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

          {/* LOGIN & REGISTER FORMS */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={submitAuth}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span>{t('password')}</span>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setValidationError('');
                        setStatusMessage('');
                        setDemoOtpHint('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#00f2fe',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {t('forgotPassword')}
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={field('password')}
                    placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#94a3b8',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <>
                  <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                    Confirm Password
                    <div style={{ position: 'relative', marginTop: '6px' }}>
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={field('confirmPassword')}
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          color: '#94a3b8',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showConfirmPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
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
                      <span style={{ color: registerRules.length ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.length ? '✓' : '○'}</span> 8+ characters
                      </span>
                      <span style={{ color: registerRules.upper ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.upper ? '✓' : '○'}</span> Uppercase letter
                      </span>
                      <span style={{ color: registerRules.lower ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.lower ? '✓' : '○'}</span> Lowercase letter
                      </span>
                      <span style={{ color: registerRules.number ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.number ? '✓' : '○'}</span> At least 1 number
                      </span>
                      <span style={{ color: registerRules.special ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.special ? '✓' : '○'}</span> Special symbol
                      </span>
                      <span style={{ color: registerRules.match ? '#6ffbbe' : '#ffb4ab', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{registerRules.match ? '✓' : '○'}</span> Passwords match
                      </span>
                    </div>
                  </div>
                </>
              )}

              <ErrorText error={validationError || error} />

              <button
                className="btn-cyber"
                disabled={busy || (mode === 'register' && !allRegisterRulesPass)}
                style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '1.02rem' }}
              >
                {busy ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM (STEP 1: REQUEST OTP) */}
          {mode === 'forgot' && (
            <form onSubmit={handleSendOtp}>
              <label style={{ display: 'block', marginBottom: '16px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                {t('email')}
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={field('email')}
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                  style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', padding: '12px 14px' }}
                />
              </label>

              <ErrorText error={validationError || error} />

              <button
                type="submit"
                className="btn-cyber"
                disabled={busy || !form.email}
                style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '1.02rem' }}
              >
                {busy ? t('pleaseWait') : t('sendOtp')}
              </button>

              <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.86rem', color: '#94a3b8' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setValidationError('');
                    setStatusMessage('');
                    setDemoOtpHint('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00f2fe',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ← {t('backToSignIn')}
                </button>
              </p>
            </form>
          )}

          {/* RESET PASSWORD FORM (STEP 2: OTP + NEW PASSWORD) */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Target account: <strong style={{ color: '#dfe2ef' }}>{form.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setValidationError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00f2fe',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Change email
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span>{t('enterOtp')}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleSendOtp}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00f2fe',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {t('resendOtp')}
                  </button>
                </div>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    setValidationError('');
                  }}
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    marginTop: '4px',
                    padding: '12px 14px',
                    fontSize: '1.3rem',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontWeight: '700'
                  }}
                />
              </label>

              <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                {t('newPassword')}
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    required
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#94a3b8',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showNewPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </label>

              <label style={{ display: 'block', marginBottom: '14px', fontSize: '0.86rem', color: '#dfe2ef', fontWeight: '600' }}>
                {t('confirmNewPassword')}
                <div style={{ position: 'relative', marginTop: '6px' }}>
                  <input
                    required
                    type={showConfirmNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      setValidationError('');
                    }}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '12px 42px 12px 14px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      color: '#94a3b8',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showConfirmNewPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </label>

              {/* Vitalis Dark Glass Password Security Checklist for Reset */}
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
                  <span style={{ color: resetRules.length ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.length ? '✓' : '○'}</span> 8+ characters
                  </span>
                  <span style={{ color: resetRules.upper ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.upper ? '✓' : '○'}</span> Uppercase letter
                  </span>
                  <span style={{ color: resetRules.lower ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.lower ? '✓' : '○'}</span> Lowercase letter
                  </span>
                  <span style={{ color: resetRules.number ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.number ? '✓' : '○'}</span> At least 1 number
                  </span>
                  <span style={{ color: resetRules.special ? '#6ffbbe' : '#849495', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.special ? '✓' : '○'}</span> Special symbol
                  </span>
                  <span style={{ color: resetRules.match ? '#6ffbbe' : '#ffb4ab', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{resetRules.match ? '✓' : '○'}</span> Passwords match
                  </span>
                </div>
              </div>

              <ErrorText error={validationError || error} />

              <button
                type="submit"
                className="btn-cyber"
                disabled={busy || !allResetRulesPass || otp.trim().length !== 6}
                style={{ width: '100%', marginTop: '16px', padding: '14px', fontSize: '1.02rem' }}
              >
                {busy ? t('pleaseWait') : t('resetPassword')}
              </button>

              <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.86rem', color: '#94a3b8' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setValidationError('');
                    setStatusMessage('');
                    setDemoOtpHint('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00f2fe',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  ← {t('backToSignIn')}
                </button>
              </p>
            </form>
          )}

          {/* FOOTER SWITCH FOR LOGIN / REGISTER */}
          {(mode === 'login' || mode === 'register') && (
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
          )}
        </div>
      </section>
    </main>
  );
}

