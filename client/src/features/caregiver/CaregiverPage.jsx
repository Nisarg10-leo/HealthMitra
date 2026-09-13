import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { caregiversApi, checkupApi, patientsApi } from '../../api/index.js';
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  PhoneIcon,
  PlusIcon,
  ShieldIcon,
  SparklesIcon,
  UserIcon,
  WhatsAppIcon
} from '../../components/ui/Icons.jsx';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

const MOODS = [
  { id: 'great', label: 'Feeling Great', labelHi: 'बहुत अच्छा', color: 'var(--mint-bright)' },
  { id: 'good', label: 'Good & Active', labelHi: 'अच्छा और सक्रिय', color: 'var(--cyan)' },
  { id: 'okay', label: 'Just Okay', labelHi: 'ठीक-ठाक', color: 'var(--amber)' },
  { id: 'unwell', label: 'Feeling Unwell', labelHi: 'अस्वस्थ', color: 'var(--coral)' }
];

export function CaregiverPage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const { notify, refresh } = useWorkspace();

  const [caregivers, setCaregivers] = useState([]);
  const [checkups, setCheckups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Everyday Checkup Form State
  const [showCheckupForm, setShowCheckupForm] = useState(false);
  const [submittingCheckup, setSubmittingCheckup] = useState(false);
  const [selectedMood, setSelectedMood] = useState('great');
  const [bp, setBp] = useState('120/80');
  const [sugar, setSugar] = useState('105');
  const [sleep, setSleep] = useState('good');
  const [notes, setNotes] = useState('');

  // Reassure status
  const [reassuring, setReassuring] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [connectCode, setConnectCode] = useState(() => `MITRA-${session.id.slice(0, 4).toUpperCase()}`);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cgList, chkList, codeRes] = await Promise.all([
        caregiversApi.list().catch(() => []),
        checkupApi.list(session.id).catch(() => []),
        patientsApi.getInviteCode(session.id).catch(() => null)
      ]);
      setCaregivers(cgList);
      setCheckups(chkList);
      if (codeRes?.inviteCode) {
        setConnectCode(codeRes.inviteCode);
      }
    } catch (err) {
      console.error('Failed loading caregiver data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.id]);

  const handleSendReassurance = async () => {
    setReassuring(true);
    try {
      await patientsApi.reassure(session.id);
      notify(i18n.language === 'hi' ? 'देखभालकर्ता को सूचित किया गया: आप सुरक्षित और सक्रिय हैं।' : 'Caregivers reassured: You are safe & active!');
      refresh();
      loadData();
    } catch (err) {
      notify('Failed to send reassurance: ' + err.message);
    } finally {
      setReassuring(false);
    }
  };

  const handleSaveCheckup = async (e) => {
    e.preventDefault();
    setSubmittingCheckup(true);
    try {
      await checkupApi.create(session.id, {
        mood: selectedMood,
        bloodPressure: bp.trim(),
        bloodSugar: sugar.trim(),
        sleepQuality: sleep,
        notes: notes.trim()
      });
      notify(i18n.language === 'hi' ? 'दैनिक चेकअप सफलतापूर्वक दर्ज किया गया!' : 'Everyday checkup logged successfully!');
      setShowCheckupForm(false);
      setNotes('');
      refresh();
      loadData();
    } catch (err) {
      notify('Failed to log checkup: ' + err.message);
    } finally {
      setSubmittingCheckup(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await patientsApi.linkCaregiver(session.id, inviteEmail, 'view');
      notify(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      loadData();
    } catch (err) {
      notify('Failed to invite caregiver: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(connectCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      notify('Connect code copied to clipboard!');
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
            <ShieldIcon size={12} />
            <span>Family Care Circle</span>
          </span>
          <h1 className="page-intro-title">
            {t('myCaregivers') || 'My Caregivers'}
          </h1>
          <p className="page-intro-desc">
            Your family and guardians monitoring your everyday health, medication routine, and well-being.
          </p>
        </div>

        <button
          type="button"
          className="btn-cyber"
          onClick={handleSendReassurance}
          disabled={reassuring}
          title="Send instant 'I am safe and active' ping to all caregivers"
        >
          <ActivityIcon size={15} />
          <span>{reassuring ? 'Pinging…' : "I'm Safe & Active"}</span>
        </button>
      </section>

      {/* ── 2. Everyday Check-in & Vitals Card ── */}
      <section className="hm-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <span className="chip-telemetry chip-mint" style={{ marginBottom: '6px' }}>
              <HeartIcon size={12} />
              <span>Everyday Checkup</span>
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 4px', color: 'var(--ink)' }}>
              Daily Well-Being & Checkup
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', margin: 0 }}>
              Keep your connected caregivers informed with your daily mood, vitals, and comfort level.
            </p>
          </div>

          {todayCheckup ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="chip-telemetry chip-mint font-mono" style={{ fontSize: '0.8rem' }}>
                <CheckIcon size={13} />
                <span>Checked in today at {todayCheckup.time}</span>
              </span>
              <button
                type="button"
                className="btn-subtle"
                style={{ fontSize: '0.8rem' }}
                onClick={() => setShowCheckupForm(!showCheckupForm)}
              >
                {showCheckupForm ? 'Hide Form' : 'Update Checkup'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-cyber"
              onClick={() => setShowCheckupForm(!showCheckupForm)}
            >
              <SparklesIcon size={14} />
              <span>{showCheckupForm ? 'Close Form' : 'Log Today’s Checkup'}</span>
            </button>
          )}
        </div>

        {/* Today's Summary if recorded */}
        {todayCheckup && !showCheckupForm && (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: MOODS.find((m) => m.id === todayCheckup.mood)?.color || 'var(--mint-bright)',
                    boxShadow: `0 0 10px ${MOODS.find((m) => m.id === todayCheckup.mood)?.color || 'var(--mint-bright)'}`
                  }}
                />
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mood</span>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--ink)' }}>
                    {i18n.language === 'hi'
                      ? MOODS.find((m) => m.id === todayCheckup.mood)?.labelHi
                      : MOODS.find((m) => m.id === todayCheckup.mood)?.label || 'Great'}
                  </strong>
                </div>
              </div>

              {todayCheckup.bloodPressure && (
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '14px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blood Pressure</span>
                  <strong className="font-mono" style={{ display: 'block', fontSize: '0.95rem', color: 'var(--leaf)' }}>
                    {todayCheckup.bloodPressure} mmHg
                  </strong>
                </div>
              )}

              {todayCheckup.bloodSugar && (
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '14px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Blood Sugar</span>
                  <strong className="font-mono" style={{ display: 'block', fontSize: '0.95rem', color: 'var(--leaf)' }}>
                    {todayCheckup.bloodSugar} mg/dL
                  </strong>
                </div>
              )}

              {todayCheckup.sleepQuality && (
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '14px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sleep</span>
                  <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--ink)', textTransform: 'capitalize' }}>
                    {todayCheckup.sleepQuality}
                  </strong>
                </div>
              )}
            </div>

            {todayCheckup.notes && (
              <p style={{ margin: '12px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                "{todayCheckup.notes}"
              </p>
            )}
          </div>
        )}

        {/* Everyday Checkup Interactive Form */}
        {showCheckupForm && (
          <form onSubmit={handleSaveCheckup} style={{ background: 'var(--paper)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 14px', color: 'var(--ink)' }}>
              How are you feeling right now?
            </h3>

            {/* Mood selector buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '16px' }}>
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMood(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? `1.5px solid ${m.color}` : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(45, 122, 88, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--leaf)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '0.86rem',
                      transition: 'all 120ms ease'
                    }}
                  >
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        background: m.color,
                        boxShadow: isSelected ? `0 0 8px ${m.color}` : 'none',
                        flexShrink: 0
                      }}
                    />
                    <span>{i18n.language === 'hi' ? m.labelHi : m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Vitals Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Blood Pressure (mmHg)
                </label>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  placeholder="e.g. 120/80"
                  className="setup-input font-mono"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Fasting Blood Sugar (mg/dL)
                </label>
                <input
                  type="text"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                  placeholder="e.g. 105"
                  className="setup-input font-mono"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Sleep Quality
                </label>
                <select
                  value={sleep}
                  onChange={(e) => setSleep(e.target.value)}
                  className="setup-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                >
                  <option value="good">Good (7-8 hours peaceful)</option>
                  <option value="fair">Fair (Interrupted sleep)</option>
                  <option value="poor">Poor (Trouble sleeping)</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Everyday Note for Caregivers (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Took morning meds with oats. Going for a short garden walk."
                className="setup-input"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-subtle"
                onClick={() => setShowCheckupForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-cyber"
                disabled={submittingCheckup}
              >
                {submittingCheckup ? 'Saving…' : 'Submit Everyday Checkup'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── 3. Connected Caregivers Directory ── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Active Care Circle ({caregivers.length})
          </h2>
          <span className="chip-telemetry chip-mint" style={{ fontSize: '0.72rem' }}>
            Synced & Active
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {caregivers.map((cg, idx) => {
            const isAlt = idx % 2 === 1;
            const relation = cg.relation || (cg.email === 'arjun@demo.health' ? 'Son' : cg.email === 'kavya@demo.health' ? 'Daughter' : 'Caregiver');

            return (
              <div
                key={cg.id || cg.caregiverId}
                className="hm-card"
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: isAlt ? 'rgba(217, 119, 70, 0.12)' : 'rgba(45, 122, 88, 0.12)',
                      color: isAlt ? 'var(--apricot)' : 'var(--leaf)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700
                    }}
                    className="font-mono"
                  >
                    {cg.name?.[0] || 'C'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '1.02rem', color: 'var(--ink)' }}>{cg.name}</strong>
                      <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {relation}
                      </span>
                      <span className="chip-telemetry chip-mint" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {cg.permissionLevel === 'edit' ? 'Edit & Manage' : 'View Alerts'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <span className="font-mono">{cg.phone || '+91 98100 00002'}</span>
                      <span>•</span>
                      <span>{cg.email}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {cg.phone && (
                    <a
                      href={`tel:${cg.phone}`}
                      className="btn-glass"
                      style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title={`Call ${cg.name}`}
                    >
                      <PhoneIcon size={14} />
                      <span>Call</span>
                    </a>
                  )}

                  <a
                    href={`https://wa.me/${(cg.phone || '+919810000002').replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste ${cg.name}, I am active and doing well. Sent from HealthMitra.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-glass"
                    style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                    title={`WhatsApp ${cg.name}`}
                  >
                    <WhatsAppIcon size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}

          {caregivers.length === 0 && !loading && (
            <div className="hm-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: '0 0 10px' }}>No caregivers linked yet.</p>
              <p style={{ fontSize: '0.84rem', margin: 0 }}>Share your Connect Code below to link your family member.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Connect Another Family Member ── */}
      <section className="hm-card" style={{ padding: '22px' }}>
        <h2 style={{ fontSize: '1.08rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px' }}>
          Connect a New Caregiver
        </h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Give your family member this one-time code to let them link their HealthMitra account to your profile.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'var(--paper)',
              border: '1.5px dashed var(--leaf)',
              color: 'var(--leaf)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.08em'
            }}
            className="font-mono"
          >
            {connectCode}
          </div>

          <button
            type="button"
            className="btn-glass"
            onClick={handleCopyCode}
          >
            {copied ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hi, please connect to my HealthMitra profile using invite code: ${connectCode}. Visit http://localhost:5173/ to join my care circle.`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-glass"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <WhatsAppIcon size={14} />
            <span>Share on WhatsApp</span>
          </a>
        </div>

        {/* Email Invite form */}
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter family member's email (e.g. rahul@example.com)"
            className="setup-input"
            style={{ flex: 1, minWidth: '220px', padding: '9px 12px', fontSize: '0.88rem' }}
          />
          <button
            type="submit"
            className="btn-cyber"
            disabled={inviting || !inviteEmail}
            style={{ padding: '9px 16px', fontSize: '0.88rem' }}
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </form>
      </section>

      {/* ── 5. Past Checkup History ── */}
      {checkups.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.08rem', fontWeight: 600, color: 'var(--ink)', margin: '0 0 12px' }}>
            Recent Checkup Timeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {checkups.slice(0, 5).map((chk) => (
              <div
                key={chk.id}
                className="hm-card"
                style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: MOODS.find((m) => m.id === chk.mood)?.color || 'var(--leaf)',
                      boxShadow: `0 0 6px ${MOODS.find((m) => m.id === chk.mood)?.color || 'var(--leaf)'}`,
                      flexShrink: 0
                    }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>
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
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
