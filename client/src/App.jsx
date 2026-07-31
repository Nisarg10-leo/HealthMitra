import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = async (path, options = {}, session) => {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'x-user-id': session.id } : {}),
      ...(options.headers || {})
    }
  });
  const raw = response.status === 204 ? '' : await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = { error: raw }; }
  if (!response.ok) throw new Error(body?.error || 'Something went wrong.');
  return body;
};

const dateKey = (value = new Date()) => new Intl.DateTimeFormat('en-CA').format(new Date(value));
const formatTime = (value, language = 'en') => new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const formatDate = (value, language = 'en') => new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short' }).format(new Date(value));
const formatDateTime = (value, language = 'en') => new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value));

function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('healthmitra-user') || 'null');
      const validRole = saved?.role === 'patient' || saved?.role === 'caregiver';
      return saved?.id && typeof saved?.name === 'string' && validRole ? saved : null;
    } catch { return null; }
  });

  const signIn = (next) => {
    localStorage.setItem('healthmitra-user', JSON.stringify(next));
    setSession(next);
  };
  const signOut = () => {
    localStorage.removeItem('healthmitra-user');
    setSession(null);
  };

  return session ? <Workspace session={session} onLogout={signOut} /> : <Auth onLogin={signIn} />;
}

function Auth({ onLogin }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('patient');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email: form.email, password: form.password } : { ...form, role };
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const demo = async (email) => {
    setBusy(true);
    setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'demo123' }) });
      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

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
          <label>{t('name')}<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={t('namePlaceholder')} /></label>
          <label>{t('phone')}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 ..." /></label>
        </>}
        <label>{t('email')}<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
        <label>{t('password')}<input required type="password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••" /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : mode === 'login' ? t('signIn') : t('createAccount')}</button>
      </form>
      {mode === 'login' && <div className="demo"><span>{t('tryDemo')}</span><button type="button" onClick={() => demo('meera@demo.health')} disabled={busy}>{t('patientDemo')}</button><button type="button" onClick={() => demo('arjun@demo.health')} disabled={busy}>{t('caregiverDemo')}</button></div>}
      <p className="switch">{mode === 'login' ? t('newToHealthMitra') : t('alreadyAccount')} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? t('createAccount') : t('signIn')}</button></p>
      <p className="prototype-note">{t('prototypeNote')}</p>
    </section>
  </main>;
}

function Workspace({ session, onLogout }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState(session.role === 'caregiver' ? 'dashboard' : 'today');
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(session.role === 'patient' ? session.id : '');
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3600);
  }, []);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const availablePatients = await api('/patients', {}, session);
        if (!active) return;
        setPatients(availablePatients);
        const firstPatientId = session.role === 'patient' ? session.id : selectedPatientId || availablePatients[0]?.patient?.id;
        if (session.role === 'caregiver' && firstPatientId && firstPatientId !== selectedPatientId) setSelectedPatientId(firstPatientId);
        if (!firstPatientId) {
          setDashboard(null);
          setAlerts([]);
          return;
        }
        const query = `?patient_id=${encodeURIComponent(firstPatientId)}`;
        const [nextDashboard, nextAlerts, nextNotifications] = await Promise.all([
          api(`/dashboard${query}`, {}, session),
          api('/alerts', {}, session),
          api('/notifications', {}, session)
        ]);
        if (!active) return;
        setDashboard(nextDashboard);
        setAlerts(nextAlerts);
        setNotifications(nextNotifications);
      } catch (requestError) {
        if (active) notify(requestError.message);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey, selectedPatientId, session, notify]);

  const listen = useCallback((onTranscript) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify(t('voiceUnsupported'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => onTranscript(event.results[0][0].transcript);
    recognition.onerror = () => notify(t('voiceTryAgain'));
    recognition.start();
    notify(t('listening'));
  }, [i18n.language, notify, t]);

  const nav = session.role === 'patient'
    ? [['today', '◷', t('today')], ['medications', '▣', t('medications')], ['symptoms', '♡', t('symptoms')], ['contacts', '☎', t('contacts')]]
    : [['dashboard', '▦', t('dashboard')], ['history', '◷', t('history')], ['medications', '▣', t('medications')], ['alerts', '●', t('alerts')], ['contacts', '☎', t('contacts')]];
  const unreadAlerts = alerts.filter((item) => !item.readBy?.includes(session.id)).length;
  const selectedPatient = dashboard?.patient;

  return <div className="shell">
    <aside className="sidebar">
      <div className="logo"><b aria-hidden="true">✚</b> HealthMitra</div>
      <div className="role-badge">{session.role === 'patient' ? t('patientMode') : t('caregiverMode')}</div>
      <nav aria-label={t('mainNavigation')}>{nav.map(([id, icon, name]) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}><span aria-hidden="true">{icon}</span>{name}{id === 'alerts' && unreadAlerts > 0 && <i aria-label={`${unreadAlerts} unread`} />}</button>)}</nav>
      <div className="side-bottom">
        <button onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}><span aria-hidden="true">अ / A</span> {t('language')}</button>
        <button onClick={onLogout}><span aria-hidden="true">↪</span> {t('logout')}</button>
        <div className="profile"><div>{session.name?.[0] || 'H'}</div><span><strong>{session.name}</strong><small>{session.role === 'patient' ? t('patient') : t('caregiver')}</small></span></div>
      </div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div className="topbar-copy">
          <p className="eyebrow">{new Intl.DateTimeFormat(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1>{t('greeting')}, {session.name.split(' ')[0]} <span className="wave" aria-hidden="true">✦</span></h1>
          {session.role === 'caregiver' && selectedPatient && <p className="context-line">{t('watching')} <strong>{selectedPatient.name}</strong></p>}
        </div>
        <div className="topbar-actions">
          {session.role === 'caregiver' && patients.length > 0 && <label className="patient-picker"><span>{t('patient')}</span><select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>{patients.map((item) => <option key={item.patient.id} value={item.patient.id}>{item.patient.name}</option>)}</select></label>}
          <button className="language-chip" onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}>अ / A</button>
          {session.role === 'patient' && <button className="sos" onClick={() => setModal({ kind: 'sos' })}>⚠ {t('sos')}</button>}
        </div>
      </header>

      {!dashboard ? <div className="loading"><div className="loading-mark">✚</div><p>{session.role === 'caregiver' ? t('noLinkedPatients') : t('loadingPlan')}</p>{session.role === 'caregiver' && <button className="primary" onClick={() => setModal({ kind: 'join' })}>{t('joinWithCode')}</button>}</div> : <>
        {notifications.find((item) => item.type === 'reminder' && !item.readAt) && <ReminderBanner notification={notifications.find((item) => item.type === 'reminder' && !item.readAt)} session={session} refresh={refresh} />}
        <Content tab={tab} session={session} dashboard={dashboard} alerts={alerts} patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} refresh={refresh} notify={notify} openModal={setModal} listen={listen} />
      </>}
    </main>
    {modal && <Modal {...modal} session={session} dashboard={dashboard} close={() => setModal(null)} refresh={refresh} notify={notify} />}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
    <nav className="mobile-nav" aria-label={t('mainNavigation')}>{nav.map(([id, icon, name]) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}><span aria-hidden="true">{icon}</span>{name}{id === 'alerts' && unreadAlerts > 0 && <i />}</button>)}</nav>
  </div>;
}

function ReminderBanner({ notification, session, refresh }) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    if (!window.speechSynthesis) return undefined;
    const utterance = new SpeechSynthesisUtterance(notification.body);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [notification.id, notification.body, i18n.language]);
  const read = async () => { await api(`/notifications/${notification.id}/read`, { method: 'POST' }, session); refresh(); };
  return <div className="reminder-banner"><span className="reminder-icon" aria-hidden="true">◷</span><div><strong>{notification.title}</strong><p>{notification.body}</p></div><button onClick={read}>{t('dismiss')} · {formatTime(notification.createdAt, i18n.language)}</button></div>;
}

function Content({ tab, session, dashboard, alerts, patients, selectedPatientId, onSelectPatient, refresh, notify, openModal, listen }) {
  if (tab === 'today') return <Today dashboard={dashboard} session={session} refresh={refresh} notify={notify} listen={listen} openModal={openModal} />;
  if (tab === 'dashboard') return <Dashboard dashboard={dashboard} alerts={alerts} patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={onSelectPatient} openModal={openModal} />;
  if (tab === 'medications') return <Medicines dashboard={dashboard} session={session} refresh={refresh} openModal={openModal} notify={notify} />;
  if (tab === 'history') return <History dashboard={dashboard} />;
  if (tab === 'alerts') return <Alerts items={alerts} session={session} dashboard={dashboard} refresh={refresh} notify={notify} />;
  if (tab === 'symptoms') return <Symptoms session={session} notify={notify} listen={listen} />;
  return <Contacts session={session} dashboard={dashboard} refresh={refresh} openModal={openModal} notify={notify} />;
}

function Today({ dashboard, session, refresh, notify, listen, openModal }) {
  const { t, i18n } = useTranslation();
  const logs = dashboard.logs.filter((log) => log.scheduledTime.slice(0, 10) === dateKey()).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const confirmation = async (log, status, method = 'tap') => {
    try {
      await api(`/dose-logs/${log.id}/confirm`, { method: 'POST', body: JSON.stringify({ status, method }) }, session);
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      refresh();
    } catch (requestError) { notify(requestError.message); }
  };
  const voiceDose = (log) => listen(async (transcript) => {
    try {
      const result = await api('/voice/intent', { method: 'POST', body: JSON.stringify({ transcript }) }, session);
      if (result.intent === 'taken' || result.intent === 'skipped') await confirmation(log, result.intent, 'voice');
      else notify(t('voiceUnclear'));
    } catch (requestError) { notify(requestError.message); }
  });
  const complete = dashboard.today.total > 0 && dashboard.today.taken === dashboard.today.total;
  return <>
    <section className="hero-card">
      <div><p>{t('reassurance')}</p><h2>{complete ? t('allCaughtUp') : t('dosesComplete', { taken: dashboard.today.taken, total: dashboard.today.total })}</h2><div className="progress" aria-label={`${dashboard.today.score}% complete`}><span style={{ width: `${dashboard.today.score}%` }} /></div></div>
      <div className="sun" aria-hidden="true">☀</div>
    </section>
    <section className="section-heading"><div><p className="section-kicker">{t('patientToday')}</p><h2>{t('today')}</h2><p>{t('tapAfterTaking')}</p></div><span className="score">{dashboard.today.score}% {t('complete')}</span></section>
    {dashboard.today.missed > 0 && <div className="inline-warning" role="alert"><span>!</span><div><strong>{t('missedDoseTitle')}</strong><p>{t('missedDoseBody')}</p></div></div>}
    <div className="dose-list">{logs.length ? logs.map((log) => <DoseCard key={log.id} log={log} med={dashboard.medications.find((medication) => medication.id === log.medicationId)} confirm={confirmation} speak={voiceDose} language={i18n.language} />) : <Empty text={t('noMeds')} />}</div>
    <section className="quick-actions"><button className="quick-action" onClick={() => openModal({ kind: 'sos' })}><span className="quick-icon danger-icon">⚠</span><span><strong>{t('needHelp')}</strong><small>{t('sosDescription')}</small></span></button><button className="quick-action" onClick={() => openModal({ kind: 'medicine' })}><span className="quick-icon">＋</span><span><strong>{t('addMedicine')}</strong><small>{t('keepScheduleCurrent')}</small></span></button></section>
    <section className="tip"><span aria-hidden="true">✦</span><div><strong>{t('consistencyTipTitle')}</strong><p>{t('consistencyTipBody')}</p></div></section>
  </>;
}

function DoseCard({ log, med, confirm, speak, language }) {
  const { t } = useTranslation();
  const status = log.status;
  return <article className={`dose-card ${status}`}>
    <div className="pill" style={{ background: med?.color }} aria-hidden="true" />
    <div className="dose-main"><p>{formatTime(log.scheduledTime, language)}</p><h3>{med?.name || t('medication')}</h3><span>{med?.dosage}</span></div>
    <div className="dose-action">{status === 'pending' ? <><button className="voice" onClick={() => speak(log)}><span aria-hidden="true">◉</span> {t('sayIt')}</button><button className="taken" onClick={() => confirm(log, 'taken')}>✓ {t('taken')}</button><button className="skip" onClick={() => confirm(log, 'skipped')}>{t('skipped')}</button></> : <span className={`status ${status}`}>{status === 'taken' ? `✓ ${t('taken')}` : status === 'missed' ? t('missed') : t('skipped')}{log.responseMethod === 'voice' ? ` · ${t('voice')}` : ''}</span>}</div>
  </article>;
}

function Dashboard({ dashboard, alerts, patients, selectedPatientId, onSelectPatient, openModal }) {
  const { t, i18n } = useTranslation();
  const days = Array.from({ length: 7 }, (_, index) => dateKey(Date.now() - (6 - index) * 86400000));
  const byDay = days.map((day) => {
    const dayLogs = dashboard.logs.filter((log) => log.scheduledTime.startsWith(day));
    return { day, score: dayLogs.length ? Math.round(100 * dayLogs.filter((log) => log.status === 'taken').length / dayLogs.length) : 0 };
  });
  return <>
    <section className="section-heading dashboard-heading"><div><p className="section-kicker">{t('caregiverView')}</p><h2>{t('dashboard')}</h2><p>{t('dashboardSubtitle')}</p></div><button className="primary" onClick={() => openModal({ kind: 'medicine' })}>＋ {t('addMedicine')}</button></section>
    {patients.length > 1 && <section className="linked-patients"><div className="section-heading compact"><div><h3>{t('linkedPatients')}</h3><p>{t('selectPatient')}</p></div><button className="text-button" onClick={() => openModal({ kind: 'join' })}>{t('joinWithCode')}</button></div><div className="patient-list">{patients.map((item) => <button key={item.patient.id} className={item.patient.id === selectedPatientId ? 'active' : ''} onClick={() => onSelectPatient(item.patient.id)}><span className="avatar">{item.patient.name[0]}</span><span><strong>{item.patient.name}</strong><small>{item.today.score}% {t('todayAdherence')}</small></span><b>›</b></button>)}</div></section>}
    <div className="patient-banner"><div className="avatar">{dashboard.patient.name[0]}</div><div><p>{t('yourLovedOne')}</p><h2>{dashboard.patient.name}</h2><span className={dashboard.today.missed ? 'warning' : 'good'}>● {dashboard.today.missed ? t('needsAttention') : t('doingWell')}</span></div><div className="streak">🔥 <strong>{dashboard.streak}</strong><span>{t('dayStreak')}</span></div></div>
    <div className="stats"><Stat label={t('todaysAdherence')} value={`${dashboard.today.score}%`} tone="blue" /><Stat label={t('dosesTaken')} value={`${dashboard.today.taken}/${dashboard.today.total}`} tone="green" /><Stat label={t('openAlerts')} value={alerts.filter((alert) => alert.type !== 'info').length} tone="orange" /></div>
    <section className="section-heading"><div><h2>{t('weeklyAdherence')}</h2><p>{t('weeklySubtitle')}</p></div><span className="streak-badge">🔥 {dashboard.streak} {t('dayStreak')}</span></section>
    <div className="chart" aria-label={t('weeklyAdherence')}>{byDay.map(({ day, score }, index) => <div key={day}><span>{score}%</span><i style={{ height: `${Math.max(score, 6)}%` }} /><small>{new Intl.DateTimeFormat(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' }).format(new Date(`${day}T12:00:00`))}</small></div>)}</div>
    <section className="section-heading"><div><h2>{t('todaysSchedule')}</h2><p>{t('liveSchedule')}</p></div></section>
    <div className="compact-list">{dashboard.logs.filter((log) => log.scheduledTime.startsWith(dateKey())).map((log) => { const medication = dashboard.medications.find((item) => item.id === log.medicationId); return <div key={log.id}><span className={`dot ${log.status}`} /><strong>{medication?.name}</strong><small>{formatTime(log.scheduledTime, i18n.language)} · {t(log.status)}</small></div>; })}</div>
  </>;
}

function Stat({ label, value, tone }) { return <div className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }

function Medicines({ dashboard, session, refresh, openModal, notify }) {
  const { t, i18n } = useTranslation();
  const deleteMed = async (medication) => {
    if (!window.confirm(t('removeMedicineConfirm', { name: medication.name }))) return;
    try { await api(`/medications/${medication.id}`, { method: 'DELETE' }, session); notify(t('medicineRemoved')); refresh(); } catch (requestError) { notify(requestError.message); }
  };
  return <>
    <section className="section-heading"><div><p className="section-kicker">{session.role === 'caregiver' ? t('caregiverView') : t('patientToday')}</p><h2>{t('medicineSchedule')}</h2><p>{t('scheduleSubtitle')}</p></div>{dashboard.permissions?.canEdit && <button className="primary" onClick={() => openModal({ kind: 'medicine' })}>＋ {t('addMedicine')}</button>}</section>
    {!dashboard.permissions?.canEdit && <div className="read-only-note"><span>⌁</span>{t('readOnlySchedule')}</div>}
    <div className="medicine-grid">{dashboard.medications.map((medication) => <article className="medicine" key={medication.id}><span className="medicine-color" style={{ background: medication.color }} /><div><h3>{medication.name}</h3><p>{medication.dosage} · {medication.frequencyPerDay} {t('timesDaily')}</p><div className="time-chips">{medication.times.map((time) => <span key={time}>{formatTime(`2020-01-01T${time}:00`, i18n.language)}</span>)}</div><small className="date-range">{medication.startDate}{medication.endDate ? ` → ${medication.endDate}` : ` · ${t('ongoing')}`}</small></div>{dashboard.permissions?.canEdit && <div className="medicine-actions"><button aria-label={`${t('edit')} ${medication.name}`} onClick={() => openModal({ kind: 'medicine', medication })}>✎</button><button aria-label={`${t('remove')} ${medication.name}`} onClick={() => deleteMed(medication)}>×</button></div>}</article>)}</div>
    {!dashboard.medications.length && <Empty text={t('noMeds')} />}
  </>;
}

function History({ dashboard }) {
  const { t, i18n } = useTranslation();
  const logs = dashboard.logs.slice(0, 30);
  return <><section className="section-heading"><div><p className="section-kicker">{t('caregiverView')}</p><h2>{t('medicationHistory')}</h2><p>{t('historySubtitle', { name: dashboard.patient.name })}</p></div><span className="streak-badge">🔥 {dashboard.streak} {t('dayStreak')}</span></section><div className="history-list">{logs.map((log) => { const medication = dashboard.medications.find((item) => item.id === log.medicationId); return <div key={log.id}><div className={`history-icon ${log.status}`}>{log.status === 'taken' ? '✓' : '!'}</div><div><strong>{medication?.name} <small>{medication?.dosage}</small></strong><p>{formatDate(log.scheduledTime, i18n.language)} · {formatTime(log.scheduledTime, i18n.language)}{log.responseMethod ? ` · ${log.responseMethod}` : ''}</p></div><span className={`status ${log.status}`}>{t(log.status)}</span></div>; })}</div>{!logs.length && <Empty text={t('noHistory')} />}</>;
}

function Alerts({ items, session, dashboard, refresh, notify }) {
  const { t, i18n } = useTranslation();
  const [sosEvents, setSosEvents] = useState([]);
  useEffect(() => { api(`/sos?patient_id=${dashboard.patient.id}`, {}, session).then(setSosEvents).catch((error) => notify(error.message)); }, [dashboard.patient.id, session, notify]);
  const markRead = async (id) => { try { await api(`/alerts/${id}/read`, { method: 'POST' }, session); refresh(); } catch (error) { notify(error.message); } };
  const updateSos = async (event, status) => { try { await api(`/sos/${event.id}`, { method: 'PUT', body: JSON.stringify({ status }) }, session); notify(t('sosUpdated')); setSosEvents((current) => current.map((item) => item.id === event.id ? { ...item, status } : item)); refresh(); } catch (error) { notify(error.message); } };
  return <><section className="section-heading"><div><p className="section-kicker">{t('caregiverView')}</p><h2>{t('careUpdates')}</h2><p>{t('alertsSubtitle')}</p></div></section><div className="alerts">{items.map((item) => <article className={item.type} key={item.id}><span aria-hidden="true">{item.type === 'sos' ? '⚠' : item.type === 'missed-dose' ? '!' : '✓'}</span><div><h3>{item.type === 'sos' ? t('emergencySos') : item.type === 'missed-dose' ? t('missedDoseTitle') : t('healthMitra')}</h3><p>{item.message}</p><small>{formatDateTime(item.createdAt, i18n.language)}</small></div>{!item.readBy?.includes(session.id) && <button onClick={() => markRead(item.id)}>{t('markRead')}</button>}</article>)}{!items.length && <Empty text={t('noAlerts')} />}</div><section className="section-heading"><div><h2>{t('sosHistory')}</h2><p>{t('sosHistorySubtitle')}</p></div></section><div className="sos-history">{sosEvents.map((event) => <article key={event.id}><div className="sos-history-icon">⚠</div><div><strong>{t('emergencySos')}</strong><p>{formatDateTime(event.triggeredAt, i18n.language)}{event.locationUrl ? ` · ${t('locationShared')}` : ` · ${t('locationUnavailable')}`}</p>{event.locationUrl && <a href={event.locationUrl} target="_blank" rel="noreferrer">{t('openMap')}</a>}</div><div className="sos-status"><span className={`status ${event.status}`}>{t(event.status)}</span>{event.status === 'active' && <div><button onClick={() => updateSos(event, 'acknowledged')}>{t('acknowledge')}</button><button onClick={() => updateSos(event, 'resolved')}>{t('resolve')}</button></div>}{event.status === 'acknowledged' && <button onClick={() => updateSos(event, 'resolved')}>{t('resolve')}</button>}</div></article>)}{!sosEvents.length && <Empty text={t('noSos')} />}</div></>;
}

function Symptoms({ session, notify, listen }) {
  const { t, i18n } = useTranslation();
  const [symptom, setSymptom] = useState('');
  const [severe, setSevere] = useState(false);
  const [result, setResult] = useState(null);
  const symptoms = ['headache', 'mild fever', 'common cold', 'mild body ache', 'mild cough'];
  const check = async () => { try { setResult(await api(`/symptom-suggestions?symptom=${encodeURIComponent(symptom)}&severe=${severe}&language=${i18n.language}`, {}, session)); } catch (error) { notify(error.message); } };
  const voiceSymptom = () => listen((transcript) => { const found = symptoms.find((item) => transcript.toLowerCase().includes(item) || (i18n.language === 'hi' && item === 'mild fever' && /बुखार/.test(transcript))); if (found) { setSymptom(found); notify(t('symptomHeard', { symptom: t(found) })); } else notify(t('symptomUnclear')); });
  return <><section className="section-heading"><div><p className="section-kicker">{t('patientTool')}</p><h2>{t('feelingQuestion')}</h2><p>{t('symptomSubtitle')}</p></div></section><div className="symptom-card"><div className="card-heading"><h3>{t('selectSymptom')}</h3><button className="voice small-voice" onClick={voiceSymptom}>◉ {t('speak')}</button></div><div className="symptom-options">{symptoms.map((item) => <button key={item} className={symptom === item ? 'chosen' : ''} onClick={() => { setSymptom(item); setResult(null); }}>{t(item)}</button>)}</div><label className="check"><input type="checkbox" checked={severe} onChange={(event) => { setSevere(event.target.checked); setResult(null); }} /> {t('severeCheck')}</label><button className="primary" disabled={!symptom} onClick={check}>{t('safeGuidance')}</button>{result && <div className={`guidance ${result.safe ? '' : 'urgent'}`}><strong>{result.safe ? t('gentleSuggestion') : t('seekMedicalGuidance')}</strong><p>{result.suggestion}</p><small>⚕ {result.disclaimer}</small></div>}</div><div className="medical-disclaimer"><strong>{t('safetyFirst')}</strong><p>{t('persistentDisclaimer')}</p></div></>;
}

function Contacts({ session, dashboard, refresh, openModal, notify }) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState({ doctors: [], chemists: [] });
  useEffect(() => { Promise.all(['doctors', 'chemists'].map((type) => api(`/${type}?patient_id=${dashboard.patient.id}`, {}, session))).then(([doctors, chemists]) => setContacts({ doctors, chemists })).catch((error) => notify(error.message)); }, [dashboard.patient.id, session, notify]);
  return <><section className="section-heading"><div><p className="section-kicker">{t('patientTool')}</p><h2>{t('helpfulContacts')}</h2><p>{t('contactsSubtitle')}</p></div><div className="heading-actions">{session.role === 'patient' && <button className="secondary" onClick={() => openModal({ kind: 'link' })}>{t('linkCaregiver')}</button>}{dashboard.permissions?.canEdit && <button className="primary" onClick={() => openModal({ kind: 'contact' })}>＋ {t('addContact')}</button>}</div></section><div className="contact-sections">{[['Doctors', contacts.doctors, 'specialty'], ['Pharmacies', contacts.chemists, 'address']].map(([title, list, detail]) => <section key={title}><div className="contact-section-heading"><h3>{title === 'Doctors' ? t('doctors') : t('pharmacies')}</h3><span>{list.length}</span></div>{list.map((contact) => <article className="contact" key={contact.id}><span aria-hidden="true">{title === 'Doctors' ? '⚕' : '✚'}</span><div><strong>{contact.name}</strong><p>{contact[detail] || t('detailsNotAdded')}</p><a href={`tel:${contact.phone}`}>☎ {contact.phone}</a></div></article>)}{!list.length && <p className="empty-inline">{t('noContacts')}</p>}</section>)}</div></>;
}

function Modal({ kind, medication, close, session, dashboard, refresh, notify }) {
  const { t } = useTranslation();
  if (kind === 'sos') return <SosModal close={close} session={session} notify={notify} />;
  if (kind === 'join') return <JoinModal close={close} session={session} notify={notify} refresh={refresh} />;
  if (kind === 'link') return <LinkCaregiverModal close={close} session={session} notify={notify} refresh={refresh} />;
  const isMedicine = kind === 'medicine';
  return <FormModal title={isMedicine ? medication ? t('editMedicine') : t('addMedicine') : t('addContact')} close={close} onSubmit={async (form) => {
    if (isMedicine) {
      const payload = { ...form, patientId: dashboard.patient.id, times: form.times.split(',').map((item) => item.trim()).filter(Boolean) };
      if (medication) await api(`/medications/${medication.id}`, { method: 'PUT', body: JSON.stringify(payload) }, session);
      else await api('/medications', { method: 'POST', body: JSON.stringify(payload) }, session);
      notify(medication ? t('medicineUpdated') : t('medicineAdded'));
    } else {
      const payload = { patientId: dashboard.patient.id, name: form.name, phone: form.phone, ...(form.type === 'doctors' ? { specialty: form.extra } : { address: form.extra }) };
      await api(`/${form.type}`, { method: 'POST', body: JSON.stringify(payload) }, session);
      notify(t('contactSaved'));
    }
    refresh();
    close();
  }} initial={isMedicine ? { name: medication?.name || '', dosage: medication?.dosage || '', times: medication?.times?.join(', ') || '08:00', startDate: medication?.startDate || dateKey(), endDate: medication?.endDate || '', color: medication?.color || '#4f67d8' } : { type: 'doctors', name: '', phone: '', extra: '' }} medicine={isMedicine} />;
}

function FormModal({ title, close, onSubmit, initial, medicine }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { await onSubmit(form); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={close} aria-label={t('close')}>×</button><p className="eyebrow">HEALTHMITRA</p><h2>{title}</h2>{medicine ? <><label>{t('medicineName')}<input required value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Metformin" /></label><label>{t('dosage')}<input required value={form.dosage} onChange={(event) => update('dosage', event.target.value)} placeholder="e.g. 500 mg" /></label><label>{t('timesComma')}<input required value={form.times} onChange={(event) => update('times', event.target.value)} placeholder="08:00, 20:00" /></label><div className="form-grid"><label>{t('startDate')}<input type="date" required value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></label><label>{t('endDate')}<input type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} /></label></div><label>{t('colour')}<input className="color-input" type="color" value={form.color} onChange={(event) => update('color', event.target.value)} /></label></> : <><label>{t('contactType')}<select value={form.type} onChange={(event) => update('type', event.target.value)}><option value="doctors">{t('doctor')}</option><option value="chemists">{t('pharmacy')}</option></select></label><label>{t('name')}<input required value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label>{t('phone')}<input required value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label><label>{form.type === 'doctors' ? t('specialty') : t('address')}<input value={form.extra} onChange={(event) => update('extra', event.target.value)} /></label></>}{error && <p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('save')}</button></form></div>;
}

function SosModal({ close, session, notify }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const send = async (coords) => {
    setBusy(true);
    try { await api('/sos', { method: 'POST', body: JSON.stringify({ patientId: session.id, latitude: coords?.latitude, longitude: coords?.longitude }) }, session); notify(t('sosSent')); close(); } catch (error) { notify(error.message); setBusy(false); }
  };
  const submit = () => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition((position) => send(position.coords), () => send()); else send(); };
  return <div className="overlay"><div className="modal sos-modal"><button className="close" onClick={close} aria-label={t('close')}>×</button><div className="sos-icon">⚠</div><p className="eyebrow">{t('emergencyAction')}</p><h2>{t('requestEmergencyHelp')}</h2><p>{t('sosModalBody')}</p><button className="danger full" onClick={submit} disabled={busy}>{busy ? t('sending') : t('sendEmergencySos')}</button><button className="text-button modal-cancel" onClick={close}>{t('cancel')}</button></div></div>;
}

function JoinModal({ close, session, notify, refresh }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { await api('/links/join', { method: 'POST', body: JSON.stringify({ code }) }, session); notify(t('patientLinked')); refresh(); close(); } catch (error) { notify(error.message); setBusy(false); } };
  return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={close} aria-label={t('close')}>×</button><p className="eyebrow">{t('caregiverMode')}</p><h2>{t('joinPatient')}</h2><p className="muted">{t('joinPatientBody')}</p><label>{t('inviteCode')}<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="MITRA-4821" /></label><button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('joinNow')}</button></form></div>;
}

function LinkCaregiverModal({ close, session, notify, refresh }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api(`/patients/${session.id}/link-caregiver`, { method: 'POST', body: JSON.stringify({ email, permissionLevel }) }, session);
      notify(`${t('caregiverLinked')} ${t('inviteCodeLabel')}: ${data.link.inviteCode}`);
      refresh();
      close();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };
  return <div className="overlay"><form className="modal" onSubmit={submit}><button type="button" className="close" onClick={close} aria-label={t('close')}>×</button><p className="eyebrow">{t('patientMode')}</p><h2>{t('linkCaregiverTitle')}</h2><p className="muted">{t('linkCaregiverBody')}</p><label>{t('caregiverEmail')}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="caregiver@example.com" /></label><label>{t('permission')}<select value={permissionLevel} onChange={(event) => setPermissionLevel(event.target.value)}><option value="view">{t('viewOnly')}</option><option value="edit">{t('canEdit')}</option></select></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('linkCaregiver')}</button></form></div>;
}

function Empty({ text }) { return <div className="empty">{text}</div>; }

export default App;
