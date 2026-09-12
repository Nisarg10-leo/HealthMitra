import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/index.js';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import {
  CheckIcon,
  CrossMedicalIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  HeartIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon
} from '../../components/ui/Icons.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';

export function AuthPage({ onLogin }) {
  const { t, i18n } = useTranslation();
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
        : await authApi.register({
            name: String(form.name || '').trim(),
            email: cleanEmail,
            phone: String(form.phone || '').trim(),
            password: form.password,
            preferredLanguage: i18n.language
          }, role);
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

  // Quick Demo Logins for effortless testing
  const fillDemoPatient = () => {
    setMode('login');
    setForm({ ...form, email: 'meera@demo.health', password: 'demo123' });
    setValidationError('');
  };

  const fillDemoCaregiver = () => {
    setMode('login');
    setForm({ ...form, email: 'arjun@demo.health', password: 'demo123' });
    setValidationError('');
  };

  const fillTestNewUser = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setMode('register');
    setRole('patient');
    setForm({
      name: 'Ramesh Patel',
      email: `ramesh${randomSuffix}@demo.health`,
      phone: '+9198200' + randomSuffix,
      password: 'Password@123',
      confirmPassword: 'Password@123'
    });
    setValidationError('');
  };

  return (
    <div className="auth-wrapper">
      {/* Top Header with Brand & Language Selector (on Login Page only) */}
      <header className="auth-top-nav">
        <div className="auth-top-brand">
          <div className="auth-brand-badge">
            <CrossMedicalIcon size={16} strokeWidth={2.4} />
          </div>
          <div>
            <span className="auth-brand-name">HealthMitra</span>
            <span className="auth-brand-sub">Personal Health Companion</span>
          </div>
        </div>

        {/* ── Language Selector exclusively on Login Page ── */}
        <div className="auth-lang-selector" aria-label="Select Language">
          <GlobeIcon size={15} />
          <button
            type="button"
            className={`auth-lang-pill ${i18n.language === 'en' ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('en')}
          >
            English
          </button>
          <span className="auth-lang-sep">/</span>
          <button
            type="button"
            className={`auth-lang-pill ${i18n.language === 'hi' ? 'active' : ''}`}
            onClick={() => i18n.changeLanguage('hi')}
          >
            हिन्दी
          </button>
        </div>
      </header>

      <main className="auth-main-layout">
        {/* Left Side: Warm Brand Narrative */}
        <section className="auth-editorial-panel">
          <div className="auth-editorial-content">
            <span className="chip-telemetry chip-mint">
              <SparklesIcon size={13} />
              <span>{t('pillCare') || 'Caregiver Loop'}</span>
            </span>

            <h1 className="auth-headline">
              {t('brandTitle') || 'Health support,'}{' '}
              <span className="auth-headline-italic">
                {t('brandTitleAccent') || 'close to home.'}
              </span>
            </h1>

            <p className="auth-narrative">
              {t('brandDescription') ||
                'Simple medicine care for you. Quiet confidence for the people who love you. Designed for older adults and their families.'}
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <HeartIcon size={16} />
                </div>
                <div>
                  <strong>Gentle Medication Routine</strong>
                  <p>Clear, large-text schedule with audible alerts and one-tap confirmations.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ShieldIcon size={16} />
                </div>
                <div>
                  <strong>Family Caregiver Sync</strong>
                  <p>Instant peace of mind with real-time missed-dose alerts and SOS escalation.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <ActivityIcon size={16} />
                </div>
                <div>
                  <strong>Mitra Clinical Intelligence</strong>
                  <p>Safe AI guidance on food interactions, timings, and symptom checks in English & Hindi.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Human Care Auth Card */}
        <section className="auth-form-panel">
          <div className="auth-card-box">
            {/* Card Header */}
            <div className="auth-card-head">
              <h2 className="auth-card-title">
                {mode === 'login' && (t('welcomeBack') || 'Welcome back')}
                {mode === 'register' && (t('createAccount') || 'Create your account')}
                {mode === 'forgot' && (t('forgotPassword') || 'Forgot Password')}
                {mode === 'reset' && (t('resetPassword') || 'Reset Password')}
              </h2>
              <p className="auth-card-sub">
                {mode === 'login' && 'Sign in to access your medicines and care circle.'}
                {mode === 'register' && 'Set up your account to start personalizing care.'}
                {mode === 'forgot' && 'Enter your email to receive a 6-digit recovery code.'}
                {mode === 'reset' && `Enter the 6-digit code sent to ${form.email || 'your email'}.`}
              </p>
            </div>

            {/* Status & Demo Hints */}
            {statusMessage && (
              <div className="auth-status-banner success">
                <CheckIcon size={16} />
                <span>{statusMessage}</span>
              </div>
            )}

            {demoOtpHint && mode === 'reset' && (
              <div className="auth-status-banner info">
                <span>Verification code: <strong className="font-mono">{demoOtpHint}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setOtp(demoOtpHint);
                    setValidationError('');
                  }}
                  className="btn-subtle"
                >
                  Auto-fill
                </button>
              </div>
            )}

            {/* Role Switcher for Registration */}
            {mode === 'register' && (
              <div className="auth-role-segmented">
                <button
                  type="button"
                  className={`auth-role-btn ${role === 'patient' ? 'active' : ''}`}
                  onClick={() => setRole('patient')}
                >
                  <UserIcon size={14} />
                  <span>{t('patient') || 'Patient'}</span>
                </button>
                <button
                  type="button"
                  className={`auth-role-btn ${role === 'caregiver' ? 'active' : ''}`}
                  onClick={() => setRole('caregiver')}
                >
                  <ShieldIcon size={14} />
                  <span>{t('caregiver') || 'Caregiver'}</span>
                </button>
              </div>
            )}

            {/* Login & Registration Form */}
            {(mode === 'login' || mode === 'register') && (
              <form onSubmit={submitAuth} className="auth-form-fields">
                {mode === 'register' && (
                  <>
                    <div className="auth-field">
                      <label htmlFor="auth-name">{t('name') || 'Your name'}</label>
                      <input
                        id="auth-name"
                        required
                        type="text"
                        value={form.name}
                        onChange={field('name')}
                        placeholder={t('namePlaceholder') || 'Full name'}
                        autoComplete="name"
                        className="setup-input"
                      />
                    </div>

                    <div className="auth-field">
                      <label htmlFor="auth-phone">{t('phone') || 'Phone number'}</label>
                      <input
                        id="auth-phone"
                        type="tel"
                        value={form.phone}
                        onChange={field('phone')}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        className="setup-input font-mono"
                      />
                    </div>
                  </>
                )}

                <div className="auth-field">
                  <label htmlFor="auth-email">{t('email') || 'Email address'}</label>
                  <input
                    id="auth-email"
                    required
                    type="email"
                    value={form.email}
                    onChange={field('email')}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="setup-input font-mono"
                  />
                </div>

                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-pwd">{t('password') || 'Password'}</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setValidationError('');
                          setStatusMessage('');
                        }}
                        className="auth-link-subtle"
                      >
                        {t('forgotPassword') || 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <div className="auth-input-eye-wrap">
                    <input
                      id="auth-pwd"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={field('password')}
                      placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="setup-input font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="auth-eye-btn"
                    >
                      {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <>
                    <div className="auth-field">
                      <label htmlFor="auth-cpwd">Confirm Password</label>
                      <div className="auth-input-eye-wrap">
                        <input
                          id="auth-cpwd"
                          required
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={form.confirmPassword}
                          onChange={field('confirmPassword')}
                          placeholder="Re-enter password"
                          autoComplete="new-password"
                          className="setup-input font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          className="auth-eye-btn"
                        >
                          {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="auth-pw-checklist">
                      <span className="auth-pw-req-title">Password Security Checklist:</span>
                      <div className="auth-pw-grid">
                        <span className={`pw-check-item ${registerRules.length ? 'pass' : ''}`}>
                          {registerRules.length ? '✓' : '○'} 8+ characters
                        </span>
                        <span className={`pw-check-item ${registerRules.upper ? 'pass' : ''}`}>
                          {registerRules.upper ? '✓' : '○'} Uppercase letter
                        </span>
                        <span className={`pw-check-item ${registerRules.lower ? 'pass' : ''}`}>
                          {registerRules.lower ? '✓' : '○'} Lowercase letter
                        </span>
                        <span className={`pw-check-item ${registerRules.number ? 'pass' : ''}`}>
                          {registerRules.number ? '✓' : '○'} 1+ number
                        </span>
                        <span className={`pw-check-item ${registerRules.special ? 'pass' : ''}`}>
                          {registerRules.special ? '✓' : '○'} Special character
                        </span>
                        <span className={`pw-check-item ${registerRules.match ? 'pass' : ''}`}>
                          {registerRules.match ? '✓' : '○'} Passwords match
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <ErrorText error={validationError || error} />

                <button
                  type="submit"
                  disabled={busy || (mode === 'register' && !allRegisterRulesPass)}
                  className="setup-submit-btn"
                >
                  {busy ? t('pleaseWait') : mode === 'login' ? t('signIn') || 'Sign in' : t('createAccount') || 'Create account'}
                </button>
              </form>
            )}

            {/* Forgot Password Request */}
            {mode === 'forgot' && (
              <form onSubmit={handleSendOtp} className="auth-form-fields">
                <div className="auth-field">
                  <label htmlFor="auth-forgot-email">{t('email') || 'Email address'}</label>
                  <input
                    id="auth-forgot-email"
                    required
                    type="email"
                    value={form.email}
                    onChange={field('email')}
                    placeholder="name@example.com"
                    autoComplete="email"
                    autoFocus
                    className="setup-input font-mono"
                  />
                </div>

                <ErrorText error={validationError || error} />

                <button type="submit" disabled={busy || !form.email} className="setup-submit-btn">
                  {busy ? t('pleaseWait') : t('sendOtp') || 'Send verification code'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="auth-back-link"
                >
                  ← {t('backToSignIn') || 'Back to sign in'}
                </button>
              </form>
            )}

            {/* Reset Password Form */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="auth-form-fields">
                <div className="auth-field">
                  <div className="auth-field-header">
                    <label htmlFor="auth-otp">{t('enterOtp') || 'Verification code (OTP)'}</label>
                    <button type="button" disabled={busy} onClick={handleSendOtp} className="auth-link-subtle">
                      {t('resendOtp') || 'Resend'}
                    </button>
                  </div>
                  <input
                    id="auth-otp"
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
                    className="setup-input font-mono auth-otp-input"
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-new-pwd">{t('newPassword') || 'New password'}</label>
                  <div className="auth-input-eye-wrap">
                    <input
                      id="auth-new-pwd"
                      required
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setValidationError('');
                      }}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      className="setup-input font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="auth-eye-btn"
                    >
                      {showNewPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="auth-cnew-pwd">{t('confirmNewPassword') || 'Confirm new password'}</label>
                  <div className="auth-input-eye-wrap">
                    <input
                      id="auth-cnew-pwd"
                      required
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setValidationError('');
                      }}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      className="setup-input font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      className="auth-eye-btn"
                    >
                      {showConfirmNewPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                    </button>
                  </div>
                </div>

                <ErrorText error={validationError || error} />

                <button
                  type="submit"
                  disabled={busy || !allResetRulesPass || otp.trim().length !== 6}
                  className="setup-submit-btn"
                >
                  {busy ? t('pleaseWait') : t('resetPassword') || 'Reset password'}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="auth-back-link"
                >
                  ← {t('backToSignIn') || 'Back to sign in'}
                </button>
              </form>
            )}

            {/* Footer Switch */}
            {(mode === 'login' || mode === 'register') && (
              <div className="auth-switch-footer">
                <span>{mode === 'login' ? (t('newToHealthMitra') || 'New to HealthMitra?') : (t('alreadyAccount') || 'Already have an account?')}</span>
                <button type="button" onClick={switchMode} className="auth-switch-btn">
                  {mode === 'login' ? (t('createAccount') || 'Create account') : (t('signIn') || 'Sign in')}
                </button>
              </div>
            )}

            {/* Quick Demo Access Bar for Developer & Review Testing */}
            <div className="auth-demo-bar">
              <span className="auth-demo-label">One-Tap Review Accounts:</span>
              <div className="auth-demo-buttons">
                <button type="button" onClick={fillDemoPatient} className="demo-chip">
                  <UserIcon size={12} />
                  <span>Meera (Patient)</span>
                </button>
                <button type="button" onClick={fillDemoCaregiver} className="demo-chip">
                  <ShieldIcon size={12} />
                  <span>Arjun (Caregiver)</span>
                </button>
                <button type="button" onClick={fillTestNewUser} className="demo-chip demo-chip-highlight" title="Creates fresh patient to test first-time profile setup wizard">
                  <SparklesIcon size={12} />
                  <span>New Patient (Test Setup Wizard)</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
