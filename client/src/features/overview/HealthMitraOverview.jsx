import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, sosApi } from '../../api/index.js';
import {
  CheckIcon,
  ClockIcon,
  ShieldAlertIcon,
  PhoneIcon,
  Volume2Icon,
  UserIcon,
  PillIcon
} from '../../components/ui/Icons.jsx';
import { AskMitraModal } from '../../components/ui/AskMitraModal.jsx';
import { ProfilePage } from '../profile/ProfilePage.jsx';
import { isToday } from '../../utils/format.js';

const defaultTrendData = {
  "7d": [84, 88, 80, 89, 82, 91, 88],
  "30d": [78, 80, 84, 82, 85, 87, 88],
  "90d": [72, 75, 79, 81, 84, 86, 88],
};

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

const initialFallbackRoutines = [
  { id: 'fall-1', label: "Metformin (500mg)", detail: "with breakfast", done: true },
  { id: 'fall-2', label: "Amlodipine (5mg)", detail: "morning walk", done: true },
  { id: 'fall-3', label: "Atorvastatin (20mg)", detail: "9:30 pm", done: false },
  { id: 'fall-4', label: "Hydration check (2.5L)", detail: "1.8L so far", done: false },
];

export function HealthMitraOverview({
  session,
  dashboard,
  refresh,
  notify,
  onLogout,
  hideHeader = false,
  onSelectTab,
  onOpenModal
}) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = useState("7d");
  const [activePoint, setActivePoint] = useState(6);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [askMitraOpen, setAskMitraOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [energy, setEnergy] = useState("");
  const [note, setNote] = useState("");
  const [formState, setFormState] = useState("idle");
  const [error, setError] = useState("");
  const [localRoutineState, setLocalRoutineState] = useState({});

  // Real dose logs from backend
  const todayLogs = useMemo(() => {
    return (dashboard?.logs || []).filter((l) => isToday(l.scheduledTime));
  }, [dashboard?.logs]);

  // Merge backend logs into routines list
  const routines = useMemo(() => {
    if (todayLogs.length > 0) {
      return todayLogs.map((log) => {
        const med = (dashboard?.medications || []).find((m) => m.id === log.medicationId);
        const timeStr = new Date(log.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isDone = localRoutineState[log.id] !== undefined
          ? localRoutineState[log.id]
          : log.status === 'taken';

        return {
          id: log.id,
          rawLog: log,
          label: `${med?.name || 'Medication'} (${med?.dosage || ''})`,
          detail: timeStr,
          done: isDone
        };
      });
    }
    return initialFallbackRoutines.map((r) => ({
      ...r,
      done: localRoutineState[r.id] !== undefined ? localRoutineState[r.id] : r.done
    }));
  }, [todayLogs, dashboard?.medications, localRoutineState]);

  const completed = useMemo(() => routines.filter((r) => r.done).length, [routines]);
  const values = defaultTrendData[range];

  const toggleRoutine = async (routine) => {
    const nextDone = !routine.done;
    setLocalRoutineState((prev) => ({ ...prev, [routine.id]: nextDone }));

    if (routine.rawLog) {
      try {
        await dosesApi.confirm(routine.rawLog.id, nextDone ? 'taken' : 'pending', 'tap');
        if (notify) notify(nextDone ? 'Dose recorded as taken' : 'Dose marked pending');
        if (refresh) refresh();
      } catch (err) {
        if (notify) notify(err.message);
      }
    } else {
      if (notify) notify(nextDone ? 'Routine marked completed' : 'Routine marked pending');
    }
  };

  const submitEntry = (event) => {
    event.preventDefault();
    if (!energy) {
      setError("Choose how your energy feels today.");
      return;
    }
    setError("");
    setFormState("loading");
    window.setTimeout(() => {
      setFormState("success");
      if (notify) notify("Health reflection logged");
    }, 600);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    window.setTimeout(() => {
      setEnergy("");
      setNote("");
      setError("");
      setFormState("idle");
    }, 200);
  };

  const handleSosCall = async () => {
    try {
      if (session?.id) {
        await sosApi.trigger(session.id, null);
      }
      if (notify) notify("Emergency alert transmitted to family caregivers");
    } catch (e) {
      // ignore
    }
  };

  const patientName = dashboard?.patient?.name || session?.name || "Meera Shah";
  const initials = patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "MS";

  return (
    <div className="hc-wrapper">
      {/* Sticky Header */}
      {!hideHeader && (
        <header className="hc-header">
          <div className="hc-header-inner">
            <a href="#overview" className="hc-brand" aria-label="HealthMitra overview">
              <span className="hc-brand-badge">H</span>
              <span>
                <span className="hc-brand-title">HealthMitra</span>
                <span className="hc-brand-subtitle">personal health & medicine companion</span>
              </span>
            </a>

            <nav className="hc-nav" aria-label="Primary navigation">
              <a className="active" href="#overview">Overview</a>
              <a href="#trends">Trends</a>
              <a href="#routines">Routines</a>
              <a href="#history">History</a>
              <a onClick={() => setAskMitraOpen(true)}>Ask Mitra</a>
              <a onClick={() => setProfileOpen(true)}>Profile</a>
            </nav>

            <div className="hc-header-right">
              <button
                type="button"
                onClick={() => {
                  setSosOpen(true);
                  handleSosCall();
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(217, 56, 58, 0.3)',
                  backgroundColor: 'rgba(217, 56, 58, 0.1)',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: 'var(--destructive)',
                  cursor: 'pointer'
                }}
                aria-label="Emergency SOS"
              >
                <ShieldAlertIcon size={14} />
                <span>SOS</span>
              </button>

              <span className="font-mono" style={{ fontSize: '11px', color: 'rgba(28, 40, 38, 0.55)', display: 'none' }}>
                Sat, 12 Sep
              </span>

              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                className="hc-avatar"
                title={`${patientName} · Lilavati Hospital`}
                aria-label={`Profile for ${patientName}`}
              >
                {initials}
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: 'rgba(28, 40, 38, 0.45)',
                    cursor: 'pointer',
                    padding: '4px 8px'
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main id="overview" className="hc-main">
        {/* Top Disclaimer Banner */}
        <div className="hc-disclaimer">
          <span className="hc-disclaimer-dot" aria-hidden="true" />
          Lilavati Hospital Cardiology Protocol · Dr. R. Nair supervising · Direct Caregiver Sync
        </div>

        {/* 2-Column Split */}
        <section className="hc-hero-grid" aria-labelledby="state-heading">
          {/* Left Sticky Hero */}
          <div className="hc-hero-left enter-up">
            <p className="hc-kicker">Today&apos;s state</p>
            <h1 id="state-heading" className="hc-title">
              Gentle, and <span className="hc-title-accent">on track</span> with morning doses.
            </h1>
            <p className="hc-narrative">
              You completed Metformin (500mg) and Amlodipine (5mg) on time. Next scheduled: Atorvastatin at 9:30 PM after dinner.
            </p>

            <dl className="hc-metrics">
              <div className="hc-metric-item">
                <dd className="hc-metric-badge-leaf">88%</dd>
                <div>
                  <dt className="hc-metric-label">Adherence score</dt>
                  <p className="hc-metric-sub-sage">▲ 4% this week</p>
                </div>
              </div>
              <div className="hc-metric-divider" />
              <div className="hc-metric-item">
                <dd className="hc-metric-badge-apricot">14</dd>
                <div>
                  <dt className="hc-metric-label">Day streak</dt>
                  <p className="hc-metric-sub-muted">best: 28 days</p>
                </div>
              </div>
            </dl>

            <div className="hc-actions">
              <button type="button" className="hc-btn-primary" onClick={() => setDialogOpen(true)}>
                Log today&apos;s state
              </button>
              <a href="#trends" className="hc-btn-outline">
                View trends
              </a>
              <button type="button" className="hc-btn-outline" onClick={() => setAskMitraOpen(true)}>
                Ask Mitra
              </button>
            </div>

            <aside className="hc-aside-footnote" aria-label="Clinical context">
              <p>
                Clinical guidance synced with Lilavati Hospital prescriptions. Speak with Dr. R. Nair or caregiver Rahul Shah for acute changes.
              </p>
            </aside>
          </div>

          {/* Right Column Panels */}
          <div className="hc-panels-right">
            {/* Trends Section */}
            <section id="trends" className="dashboard-panel subtle-lift" style={{ scrollMarginTop: '6rem' }}>
              <div className="hc-trend-header">
                <div>
                  <h2 style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>Medication adherence</h2>
                  <p className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)', margin: '4px 0 0' }}>
                    Adherence score · higher is steadier
                  </p>
                </div>
                <div className="hc-trend-toggle-group" role="group" aria-label="Trend range">
                  {["7d", "30d", "90d"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setRange(item)}
                      className={`hc-trend-toggle-btn ${range === item ? 'active' : ''}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="hc-bars-container" role="img" aria-label={`${range} adherence trend ending at 88%`}>
                {values.map((value, index) => (
                  <button
                    key={`${range}-${index}`}
                    type="button"
                    onMouseEnter={() => setActivePoint(index)}
                    onFocus={() => setActivePoint(index)}
                    className="hc-bar-col"
                    aria-label={`${dayLabels[index]}, adherence score ${value}%`}
                  >
                    <span
                      className="hc-bar-value"
                      style={{ opacity: activePoint === index ? 1 : 0 }}
                    >
                      {value}%
                    </span>
                    <span
                      className={`hc-bar-fill ${index === 6 ? 'active' : 'inactive'}`}
                      style={{ height: `${Math.max(28, value)}%` }}
                    />
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '10px',
                        color: index === 6 ? 'var(--ink)' : 'rgba(28, 40, 38, 0.45)',
                        fontWeight: index === 6 ? '600' : '400'
                      }}
                    >
                      {dayLabels[index]}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* 2 Metric Cards */}
            <div className="hc-metrics-grid-2">
              <section className="dashboard-panel subtle-lift">
                <p className="font-mono" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(28, 40, 38, 0.45)', margin: 0 }}>
                  Today&apos;s Doses
                </p>
                <p className="font-display" style={{ fontSize: '1.75rem', fontWeight: '600', margin: '10px 0 0' }}>
                  {completed} of {routines.length}
                </p>
                <p className="font-mono" style={{ fontSize: '11px', color: 'var(--sage)', margin: '4px 0 0' }}>
                  ▲ Morning completed
                </p>
              </section>

              <section className="dashboard-panel subtle-lift">
                <p className="font-mono" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(28, 40, 38, 0.45)', margin: 0 }}>
                  Next Scheduled
                </p>
                <p className="font-display" style={{ fontSize: '1.75rem', fontWeight: '600', margin: '10px 0 0' }}>
                  9:30 <span style={{ fontSize: '1.1rem', color: 'rgba(28, 40, 38, 0.45)' }}>PM</span>
                </p>
                <p className="font-mono" style={{ fontSize: '11px', color: 'var(--apricot)', margin: '4px 0 0' }}>
                  Atorvastatin (20mg)
                </p>
              </section>
            </div>

            {/* Today's Routine Checklist */}
            <section id="routines" className="dashboard-panel" style={{ scrollMarginTop: '6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>Today&apos;s routine</h2>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--leaf)' }}>
                  {completed} of {routines.length} done
                </span>
              </div>

              <ul className="hc-routine-list">
                {routines.map((routine) => (
                  <li key={routine.id} className="hc-routine-item">
                    <button
                      type="button"
                      onClick={() => toggleRoutine(routine)}
                      role="checkbox"
                      aria-checked={routine.done}
                      className={`hc-check-btn ${routine.done ? 'done' : ''}`}
                    >
                      {routine.done && <CheckIcon size={14} />}
                    </button>
                    <span style={{ fontSize: '13px', color: routine.done ? 'var(--ink)' : 'rgba(28, 40, 38, 0.55)' }}>
                      {routine.label}
                    </span>
                    <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '10px', color: 'rgba(28, 40, 38, 0.4)' }}>
                      {routine.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        {/* History Stream Section */}
        <section id="history" className="hc-history-section">
          <div className="hc-history-grid">
            <div>
              <p className="font-mono" style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(28, 40, 38, 0.45)', margin: 0 }}>
                Recent verifications
              </p>
              <h2 className="font-display" style={{ fontSize: '1.875rem', margin: '8px 0 0', fontWeight: '500' }}>
                Dose stream, verified in context.
              </h2>
            </div>

            <ol className="hc-history-list">
              <li className="hc-history-item">
                <time className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)' }}>Today, 8:15 AM</time>
                <span style={{ fontSize: '14px' }}>Amlodipine (5mg) verified taken by patient</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--leaf)' }}>verified</span>
              </li>
              <li className="hc-history-item">
                <time className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)' }}>Today, 8:00 AM</time>
                <span style={{ fontSize: '14px' }}>Metformin (500mg) taken with breakfast</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--leaf)' }}>verified</span>
              </li>
              <li className="hc-history-item">
                <time className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)' }}>11 Sep, 9:35 PM</time>
                <span style={{ fontSize: '14px' }}>Evening Atorvastatin (20mg) logged on time</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--leaf)' }}>steady</span>
              </li>
              <li className="hc-history-item">
                <time className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)' }}>11 Sep, 4:15 PM</time>
                <span style={{ fontSize: '14px' }}>Blood Pressure measured: 126/82 mmHg</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--sage)' }}>normal</span>
              </li>
              <li className="hc-history-item">
                <time className="font-mono" style={{ fontSize: '10px', color: 'rgba(28, 40, 38, 0.45)' }}>10 Sep, 9:30 PM</time>
                <span style={{ fontSize: '14px' }}>Hydration target reached (2.4 L recorded)</span>
                <span className="font-mono" style={{ fontSize: '11px', color: 'var(--leaf)' }}>goal met</span>
              </li>
            </ol>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="hc-footer">
        <div className="hc-footer-inner">
          <span>HealthMitra · personal health & medicine companion</span>
          <span>Supervised care · Dr. R. Nair, Lilavati Hospital · Emergency contact: Rahul Shah</span>
        </div>
      </footer>

      {/* Log Today's State Modal */}
      {dialogOpen && (
        <div className="hc-modal-overlay" onClick={closeDialog}>
          <div className="hc-modal-card" onClick={(e) => e.stopPropagation()}>
            {formState === 'success' ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <span style={{ display: 'grid', width: '3rem', height: '3rem', placeItems: 'center', borderRadius: '9999px', backgroundColor: 'var(--mist)', color: 'var(--leaf)', margin: '0 auto' }}>
                  <CheckIcon size={20} />
                </span>
                <h3 className="font-display" style={{ fontSize: '1.5rem', margin: '16px 0 8px' }}>Entry recorded</h3>
                <p style={{ fontSize: '14px', color: 'rgba(28, 40, 38, 0.65)' }}>Your check-in and symptoms are logged in your HealthMitra timeline.</p>
                <button type="button" className="hc-btn-primary" style={{ marginTop: '20px' }} onClick={closeDialog}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submitEntry}>
                <h3 className="font-display" style={{ fontSize: '1.5rem', margin: '0 0 6px' }}>Log today&apos;s state</h3>
                <p style={{ fontSize: '13px', color: 'rgba(28, 40, 38, 0.6)', margin: '0 0 20px' }}>
                  A quick reflection helps put your adherence and symptoms in context.
                </p>

                <div style={{ marginTop: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                    How is your energy today?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {["Low", "Steady", "High"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => { setEnergy(option); setError(""); }}
                        className={energy === option ? 'hc-btn-primary' : 'hc-btn-outline'}
                        style={{ height: '2.5rem', padding: 0 }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {error && <p style={{ color: 'var(--destructive)', fontSize: '12px', marginTop: '6px' }}>{error}</p>}
                </div>

                <div style={{ marginTop: '18px' }}>
                  <label htmlFor="hc-note" style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Optional symptom or wellbeing note
                  </label>
                  <input
                    id="hc-note"
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any sensations? (e.g. mild dizziness, appetite, sleep)"
                    maxLength={120}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '0.5rem',
                      border: '1px solid rgba(28, 40, 38, 0.2)',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <p className="font-mono" style={{ textAlign: 'right', fontSize: '10px', color: 'rgba(28, 40, 38, 0.4)', margin: '4px 0 0' }}>
                    {note.length}/120
                  </p>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button type="button" className="hc-btn-outline" onClick={closeDialog}>Cancel</button>
                  <button type="submit" className="hc-btn-primary" disabled={formState === 'loading'}>
                    {formState === 'loading' ? 'Saving…' : 'Save entry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Emergency SOS Modal */}
      {sosOpen && (
        <div className="hc-modal-overlay" onClick={() => setSosOpen(false)}>
          <div className="hc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ display: 'grid', width: '2rem', height: '2rem', placeItems: 'center', borderRadius: '9999px', backgroundColor: 'rgba(217, 56, 58, 0.15)', color: 'var(--destructive)' }}>
                <ShieldAlertIcon size={18} />
              </span>
              <h3 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Emergency Assistance</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(28, 40, 38, 0.65)', margin: '0 0 16px' }}>
              Direct contact lines registered for {patientName}. Tap any contact to initiate priority call.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderRadius: '1rem', border: '1px solid rgba(28, 40, 38, 0.1)', backgroundColor: 'rgba(250, 247, 242, 0.6)', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(28, 40, 38, 0.1)' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Rahul Shah (Son / Primary Caregiver)</p>
                  <p className="font-mono" style={{ fontSize: '12px', color: 'rgba(28, 40, 38, 0.55)', margin: '2px 0 0' }}>+91 98201 44321</p>
                </div>
                <a
                  href="tel:+919820144321"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', backgroundColor: 'var(--leaf)', color: '#FFFFFF', padding: '6px 12px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}
                >
                  <PhoneIcon size={12} /> Call
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(28, 40, 38, 0.1)' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Dr. R. Nair (Cardiologist, Lilavati Hospital)</p>
                  <p className="font-mono" style={{ fontSize: '12px', color: 'rgba(28, 40, 38, 0.55)', margin: '2px 0 0' }}>+91 98200 11223</p>
                </div>
                <a
                  href="tel:+919820011223"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', backgroundColor: 'var(--ink)', color: '#FFFFFF', padding: '6px 12px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}
                >
                  <PhoneIcon size={12} /> Call
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>Lilavati Hospital Emergency Desk</p>
                  <p className="font-mono" style={{ fontSize: '12px', color: 'rgba(28, 40, 38, 0.55)', margin: '2px 0 0' }}>022-2675-1000 · Bandra West, Mumbai</p>
                </div>
                <a
                  href="tel:02226751000"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', backgroundColor: 'var(--destructive)', color: '#FFFFFF', padding: '6px 12px', fontSize: '12px', fontWeight: '500', textDecoration: 'none' }}
                >
                  <PhoneIcon size={12} /> Call Desk
                </a>
              </div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="hc-btn-outline" onClick={() => setSosOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask Mitra Modal */}
      {askMitraOpen && (
        <AskMitraModal onClose={() => setAskMitraOpen(false)} />
      )}

      {/* Profile Page Modal */}
      {profileOpen && (
        <div className="hc-modal-overlay" onClick={() => setProfileOpen(false)}>
          <div className="hc-modal-card" style={{ maxWidth: '44rem', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="font-display" style={{ fontSize: '1.5rem', margin: 0 }}>Health Profile & Clinical Record</h2>
              <button type="button" className="hc-btn-outline" style={{ height: '2rem', padding: '0 12px' }} onClick={() => setProfileOpen(false)}>
                Close
              </button>
            </div>
            <ProfilePage />
          </div>
        </div>
      )}
    </div>
  );
}
