import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkupApi, patientsApi } from '../../api/index.js';
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  PhoneIcon,
  PillIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
  WhatsAppIcon
} from '../../components/ui/Icons.jsx';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

const MOODS = [
  { id: 'great', label: 'Feeling Great', labelHi: 'बहुत अच्छा', color: 'var(--mint-bright)', icon: '😄' },
  { id: 'good', label: 'Good & Active', labelHi: 'अच्छा और सक्रिय', color: 'var(--cyan)', icon: '🙂' },
  { id: 'okay', label: 'Just Okay', labelHi: 'ठीक-ठाक', color: 'var(--amber)', icon: '😐' },
  { id: 'unwell', label: 'Feeling Unwell', labelHi: 'अस्वस्थ', color: 'var(--coral)', icon: '🙁' }
];

export function PatientPage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const { dashboard, patients, selectedPatientId, selectPatient, notify, refresh, setTab, openModal } = useWorkspace();

  const [checkups, setCheckups] = useState([]);
  const [loadingCheckups, setLoadingCheckups] = useState(false);
  const [requestingPing, setRequestingPing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const activePatient = dashboard?.patient || patients?.find((p) => p.patient?.id === selectedPatientId)?.patient || {
    id: selectedPatientId || '',
    name: 'Patient',
    phone: '',
    email: '',
    age: null,
    bloodGroup: null,
    conditions: [],
    allergies: []
  };

  const patientId = activePatient.id || selectedPatientId;

  const loadCheckups = async () => {
    if (!patientId) return;
    try {
      setLoadingCheckups(true);
      const data = await checkupApi.list(patientId);
      setCheckups(data);
    } catch (err) {
      console.error('Failed to load checkups:', err);
    } finally {
      setLoadingCheckups(false);
    }
  };

  useEffect(() => {
    loadCheckups();
  }, [patientId]);

  const handleRequestCheckup = async () => {
    setRequestingPing(true);
    try {
      await checkupApi.request(patientId);
      notify(i18n.language === 'hi' ? `${activePatient.name} को दैनिक चेकअप का अनुरोध भेजा गया!` : `Everyday checkup ping sent to ${activePatient.name}!`);
      refresh();
    } catch (err) {
      notify('Failed to send checkup request: ' + err.message);
    } finally {
      setRequestingPing(false);
    }
  };

  const handleJoinWithCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      await patientsApi.joinWithCode(joinCode.trim());
      notify(i18n.language === 'hi' ? 'रोगी के साथ सफलतापूर्वक जुड़ गए!' : 'Successfully connected to patient!');
      setJoinCode('');
      refresh();
    } catch (err) {
      notify('Failed to connect: ' + err.message);
    } finally {
      setJoining(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCheckup = checkups.find((c) => c.date === todayStr);

  return (
    <div className="page-shell-container max-w-prose">
      {/* ── 1. Page Header ── */}
      <section className="page-intro-header">
        <div>
          <span className="chip-telemetry chip-cyan">
            <UserIcon size={12} />
            <span>Monitored Family Member</span>
          </span>
          <h1 className="page-intro-title">
            {t('monitoredPatient') || 'My Patient'}
          </h1>
          <p className="page-intro-desc">
            Live clinical telemetry, everyday checkups, vitals, and health records for your family member.
          </p>
        </div>

        <button
          type="button"
          className="btn-cyber"
          onClick={handleRequestCheckup}
          disabled={requestingPing}
          title="Send a friendly Everyday Checkup reminder to the patient"
        >
          <SparklesIcon size={14} />
          <span>{requestingPing ? 'Sending Ping…' : 'Request Checkup Ping'}</span>
        </button>
      </section>

      {/* ── Patient Switcher if multiple patients ── */}
      {patients.length > 1 && (
        <div className="patient-selector-scroll" style={{ marginBottom: '16px' }}>
          {patients.map((item) => (
            <button
              key={item.patient.id}
              type="button"
              onClick={() => selectPatient(item.patient.id)}
              className={`patient-tab-btn ${item.patient.id === selectedPatientId ? 'patient-tab-active' : ''}`}
            >
              <span className="patient-tab-avatar font-mono">
                {item.patient.name[0]}
              </span>
              <div className="patient-tab-text">
                <span className="patient-tab-name">{item.patient.name}</span>
                <span className="patient-tab-sub">O+ • 68y</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── 2. Patient Identity & Clinical Summary Card ── */}
      <section className="hm-card" style={{ padding: '24px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.12)',
                color: 'var(--cyan)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '1.5rem',
                fontWeight: 700
              }}
              className="font-mono"
            >
              {activePatient.name[0]}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  {activePatient.name}
                </h2>
                <span className="chip-telemetry chip-mint">
                  <ActivityIcon size={12} />
                  <span>Telemetry Live</span>
                </span>
                <span className="chip-telemetry chip-cyan font-mono" style={{ fontSize: '0.74rem' }}>
                  O+ Blood Group
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <span>Age: <strong style={{ color: '#ffffff' }}>{activePatient.age || 68} yrs</strong></span>
                <span>•</span>
                <span>Hospital: <strong style={{ color: '#ffffff' }}>Lilavati, Mumbai</strong></span>
                <span>•</span>
                <span>Physician: <strong style={{ color: 'var(--cyan)' }}>Dr. R. Nair</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {activePatient.phone && (
              <a
                href={`tel:${activePatient.phone}`}
                className="btn-glass"
                style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PhoneIcon size={14} />
                <span>Call Patient</span>
              </a>
            )}

            <a
              href={`https://wa.me/${(activePatient.phone || '+919810000001').replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${activePatient.name} ji, checking in to see how you are doing today. Please remember your scheduled medicines.`)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-glass"
              style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <WhatsAppIcon size={14} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Clinical Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
            Conditions:
          </span>
          {(activePatient.conditions || ['Type 2 Diabetes', 'Hypertension']).map((c) => (
            <span key={c} className="chip-telemetry chip-amber" style={{ fontSize: '0.74rem' }}>
              {c}
            </span>
          ))}

          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
            Allergies:
          </span>
          {(activePatient.allergies || ['Sulfa Drugs']).map((a) => (
            <span key={a} className="chip-telemetry chip-error" style={{ fontSize: '0.74rem' }}>
              {a}
            </span>
          ))}
        </div>
      </section>

      {/* ── 3. Everyday Checkup Station ── */}
      <section className="hm-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <span className="chip-telemetry chip-mint" style={{ marginBottom: '4px' }}>
              <HeartIcon size={12} />
              <span>Everyday Checkup Station</span>
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 4px', color: '#ffffff' }}>
              Today’s Wellness & Checkup Status
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: 0 }}>
              Live record of {activePatient.name}’s daily morning and evening wellness check-ins.
            </p>
          </div>

          <button
            type="button"
            className="btn-glass"
            onClick={handleRequestCheckup}
            disabled={requestingPing}
            style={{ fontSize: '0.84rem' }}
          >
            <SparklesIcon size={13} />
            <span>Send Checkup Prompt</span>
          </button>
        </div>

        {todayCheckup ? (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <span className="chip-telemetry chip-mint font-mono" style={{ fontSize: '0.8rem' }}>
                <CheckIcon size={13} />
                <span>Completed today at {todayCheckup.time}</span>
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Recorded via Patient Portal
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Daily Mood</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '1.3rem' }}>
                    {MOODS.find((m) => m.id === todayCheckup.mood)?.icon || '😄'}
                  </span>
                  <strong style={{ fontSize: '0.92rem', color: '#ffffff' }}>
                    {MOODS.find((m) => m.id === todayCheckup.mood)?.label || 'Great'}
                  </strong>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blood Pressure</span>
                <div style={{ marginTop: '4px' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: 'var(--cyan)' }}>
                    {todayCheckup.bloodPressure || '120/80'}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '4px' }}>mmHg</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fasting Sugar</span>
                <div style={{ marginTop: '4px' }}>
                  <strong className="font-mono" style={{ fontSize: '1.05rem', color: 'var(--mint-bright)' }}>
                    {todayCheckup.bloodSugar || '105'}
                  </strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginLeft: '4px' }}>mg/dL</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sleep Quality</span>
                <div style={{ marginTop: '4px' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#ffffff', textTransform: 'capitalize' }}>
                    {todayCheckup.sleepQuality || 'Good'}
                  </strong>
                </div>
              </div>
            </div>

            {todayCheckup.notes && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(0, 242, 254, 0.04)', borderRadius: '8px', borderLeft: '3px solid var(--cyan)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cyan)', fontWeight: 600, textTransform: 'uppercase' }}>Patient’s Personal Note:</span>
                <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: '#ffffff', fontStyle: 'italic' }}>
                  "{todayCheckup.notes}"
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', border: '1px dashed var(--border-subtle)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '8px' }}>⏰</span>
            <strong style={{ display: 'block', fontSize: '1rem', color: '#ffffff', marginBottom: '4px' }}>
              No Everyday Checkup Logged Yet Today
            </strong>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              {activePatient.name} has not yet submitted today's wellness checkup. You can send an instant prompt.
            </p>
            <button
              type="button"
              className="btn-cyber"
              onClick={handleRequestCheckup}
              disabled={requestingPing}
            >
              <SparklesIcon size={14} />
              <span>{requestingPing ? 'Sending Ping…' : 'Ping Patient for Checkup'}</span>
            </button>
          </div>
        )}
      </section>

      {/* ── 4. Quick Actions Station ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="hm-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <PillIcon size={18} style={{ color: 'var(--cyan)' }} />
            <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>Medication Plan</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            Manage {activePatient.name}’s prescriptions, adjust dosage, or scan new doctor slips.
          </p>
          <button
            type="button"
            className="btn-glass"
            style={{ width: '100%', fontSize: '0.84rem' }}
            onClick={() => setTab && setTab('medications')}
          >
            View Medications & Scanner
          </button>
        </div>

        <div className="hm-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <ActivityIcon size={18} style={{ color: 'var(--mint-bright)' }} />
            <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>Adherence History</strong>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            14-day verified dose stream showing taken, missed, and delayed doses.
          </p>
          <button
            type="button"
            className="btn-glass"
            style={{ width: '100%', fontSize: '0.84rem' }}
            onClick={() => setTab && setTab('history')}
          >
            View 14-Day Audit Trail
          </button>
        </div>
      </section>

      {/* ── 5. Connect Another Family Member ── */}
      <section className="hm-card" style={{ padding: '22px' }}>
        <h2 style={{ fontSize: '1.08rem', fontWeight: 600, color: '#ffffff', margin: '0 0 6px' }}>
          Connect to Another Patient
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Enter the Connect Code generated by another family member's HealthMitra profile to monitor them.
        </p>

        <form onSubmit={handleJoinWithCode} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g. MITRA-4821)"
            className="setup-input font-mono"
            style={{ flex: 1, minWidth: '200px', padding: '9px 14px', fontSize: '0.92rem', letterSpacing: '0.06em' }}
          />
          <button
            type="submit"
            className="btn-cyber"
            disabled={joining || !joinCode.trim()}
            style={{ padding: '9px 18px', fontSize: '0.88rem' }}
          >
            {joining ? 'Connecting…' : 'Join Patient'}
          </button>
        </form>
      </section>

      {/* ── 6. Checkup History Timeline ── */}
      {checkups.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 600, color: '#ffffff', margin: '0 0 12px' }}>
            Past Checkup Timeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {checkups.map((chk) => (
              <div
                key={chk.id}
                className="hm-card"
                style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.3rem' }}>
                    {MOODS.find((m) => m.id === chk.mood)?.icon || '😄'}
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                      {chk.date} at {chk.time}
                    </strong>
                    {chk.notes && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        "{chk.notes}"
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem' }}>
                  {chk.bloodPressure && (
                    <span className="font-mono" style={{ color: 'var(--cyan)' }}>
                      BP: {chk.bloodPressure}
                    </span>
                  )}
                  {chk.bloodSugar && (
                    <span className="font-mono" style={{ color: 'var(--mint-bright)' }}>
                      Sugar: {chk.bloodSugar} mg/dL
                    </span>
                  )}
                  <span className="chip-telemetry chip-mint" style={{ fontSize: '0.7rem' }}>
                    {chk.sleepQuality || 'Good'} Sleep
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
