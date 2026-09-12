import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, guidanceApi, patientsApi, sosApi } from '../../api/index.js';
import { DoseCelebration } from '../../components/ui/DoseCelebration.jsx';
import {
  ActivityIcon,
  AlertCircleIcon,
  BellIcon,
  CheckIcon,
  CrossMedicalIcon,
  MicrophoneIcon,
  PillIcon,
  PlusIcon,
  QrCodeIcon,
  ShieldIcon,
  SparklesIcon
} from '../../components/ui/Icons.jsx';
import { useFallDetector } from '../../hooks/useFallDetector.js';
import { useVoiceCompanion } from '../../hooks/useSpeech.js';
import { isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { DoseCard } from './DoseCard.jsx';

export function TodayPage() {
  const { t, i18n } = useTranslation();
  const { dashboard, refresh, notify, listen, openModal, triggerAlarm } = useWorkspace();
  const [reassuranceSent, setReassuranceSent] = useState(false);
  const [celebratingMed, setCelebratingMed] = useState(null);

  const logs = (dashboard?.logs || [])
    .filter((log) => isToday(log.scheduledTime))
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  const medicationById = (id) => dashboard?.medications?.find((medication) => medication.id === id);

  const handleFallEmergency = async () => {
    try {
      await sosApi.trigger(dashboard.patient.id, null);
      notify('Emergency assistance request sent to family caregivers');
      refresh();
      const text = encodeURIComponent(
        `EMERGENCY: Impact sensor registered a potential fall for ${dashboard.patient.name || 'Meera Shah'}. Immediate caregiver attention requested.`
      );
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } catch (err) {
      notify(err.message);
    }
  };

  const fallDetector = useFallDetector(handleFallEmergency);

  const testAlarm = () => {
    const firstPending = logs.find((l) => l.status === 'pending') || logs[0] || {
      id: 'test-alarm-id',
      scheduledTime: new Date().toISOString(),
      status: 'pending',
      medicationId: dashboard?.medications?.[0]?.id || 'demo-med'
    };
    triggerAlarm(firstPending);
  };

  const confirm = async (log, status, source = 'manual') => {
    try {
      await dosesApi.confirm(log.id, status, source);
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      refresh();

      if (status === 'taken') {
        const med = medicationById(log.medicationId);
        setCelebratingMed(med?.name || t('medication'));
      }
    } catch (error) {
      notify(error.message);
    }
  };

  const confirmByVoice = (log) =>
    listen(async (transcript) => {
      const positive = /yes|taken|haan|ha|le li|done/i.test(transcript);
      const negative = /no|skip|chhod|nahi/i.test(transcript);
      if (!positive && !negative) {
        notify(t('voiceUnclear'));
        return;
      }
      await confirm(log, positive ? 'taken' : 'skipped', 'voice');
    });

  const handleReassurance = async () => {
    try {
      await patientsApi.reassure(dashboard.patient.id);
      setReassuranceSent(true);
      notify(t('reassuranceSent'));
    } catch (err) {
      notify(err.message);
    }
  };

  const companion = useVoiceCompanion(dashboard, (doseId, status) => {
    const log = logs.find((l) => l.id === doseId);
    if (log) confirm(log, status, 'voice-dialog');
  });

  const today = dashboard?.summary?.today || { taken: 0, total: 0 };
  const complete = today.total > 0 && today.taken === today.total;
  const pendingDoses = Math.max(0, today.total - today.taken);
  const adherenceScore = today.total > 0 ? Math.round((today.taken / today.total) * 100) : 100;
  const showReassurancePrompt = (dashboard?.alerts || []).some(
    (a) => a.type === 'missed-dose' && !reassuranceSent
  );

  return (
    <div className="page-shell-container">
      {/* ── Reassurance Banner if a dose was missed ── */}
      {showReassurancePrompt && (
        <aside className="reassurance-card" role="region" aria-label="Caregiver check-in">
          <div className="reassurance-info">
            <span className="reassurance-icon" aria-hidden="true">
              <ShieldIcon size={18} />
            </span>
            <div>
              <strong className="reassurance-title">{t('areYouOkayTitle')}</strong>
              <p className="reassurance-desc">{t('areYouOkayBody')}</p>
            </div>
          </div>
          <button type="button" className="btn-cyber reassurance-btn" onClick={handleReassurance}>
            <CheckIcon size={16} />
            <span>{t('iAmOkayBtn')}</span>
          </button>
        </aside>
      )}

      {/* ── Primary Daily Medication Overview ── */}
      <section className="overview-hero-card">
        <div className="overview-header-row">
          <div>
            <div className="overview-status-pill-row">
              <span className={`chip-telemetry ${complete ? 'chip-mint' : 'chip-cyan'}`}>
                {complete ? <CheckIcon size={13} /> : <ActivityIcon size={13} />}
                <span>{complete ? 'All Doses Completed' : 'Today\'s Doses in Progress'}</span>
              </span>
              <span className="overview-date-text font-mono">
                {new Date().toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            </div>

            <h2 className="overview-headline">
              {t('patientToday') || "Today's Medicine Schedule"}
            </h2>
            <p className="overview-subtext">
              {today.taken} of {today.total} medicines recorded for today.
              {pendingDoses > 0
                ? ` ${pendingDoses} dose${pendingDoses > 1 ? 's' : ''} remaining.`
                : ' All medicines completed on time.'}
            </p>
          </div>

          <button
            type="button"
            className="btn-glass overview-qr-btn"
            onClick={() =>
              openModal({
                kind: 'emergencyQr',
                patient: dashboard.patient,
                medications: dashboard.medications
              })
            }
          >
            <QrCodeIcon size={16} />
            <span>{t('emergencyQrBtn') || 'Show Medical Card'}</span>
          </button>
        </div>

        {/* Precision Progress Track */}
        <div className="progress-section">
          <div className="progress-label-row">
            <span
              className={`progress-pct font-mono ${
                complete ? 'color-mint' : 'color-cyan'
              }`}
            >
              {adherenceScore}%
            </span>
            <span className="progress-status-caption">
              {complete ? '100% Target Met' : `${pendingDoses} remaining`}
            </span>
          </div>

          <div className="progress-track" role="progressbar" aria-valuenow={adherenceScore} aria-valuemin="0" aria-valuemax="100">
            <div
              className={`progress-fill ${complete ? 'fill-mint' : 'fill-cyan'}`}
              style={{ width: `${adherenceScore}%` }}
            />
          </div>
        </div>

        {/* Tabular Authoritative Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-cell">
            <span className="metric-label">Doses Taken</span>
            <strong className="metric-value font-mono">
              {today.taken} <span className="metric-denom">/ {today.total}</span>
            </strong>
          </div>

          <div className="metric-cell">
            <span className="metric-label">Remaining Today</span>
            <strong
              className={`metric-value font-mono ${
                pendingDoses === 0 ? 'color-mint' : 'color-cyan'
              }`}
            >
              {pendingDoses}
            </strong>
          </div>

          <div className="metric-cell">
            <span className="metric-label">Routine Streak</span>
            <strong className="metric-value font-mono">
              {dashboard.streak || 1} {t('dayStreak')}
            </strong>
          </div>

          <div className="metric-cell">
            <span className="metric-label">Safety Status</span>
            <strong className="metric-value color-mint metric-safe">
              <CheckIcon size={14} />
              <span>All Clear</span>
            </strong>
          </div>
        </div>
      </section>

      {/* ── Telehealth Intelligence & Sensors Asymmetric Row ── */}
      <div className="telehealth-row">
        {/* Mitra Clinical Assistant */}
        <section className="telehealth-cell assistant-cell">
          <div className="telehealth-cell-body">
            <div className="telehealth-icon-wrap">
              <SparklesIcon size={18} />
            </div>

            <div className="telehealth-content">
              <div className="telehealth-header">
                <div className="telehealth-title-group">
                  <h3 className="telehealth-title">
                    {companion.active ? 'Mitra Voice Companion Active' : 'Mitra Telehealth Assistant'}
                  </h3>
                  <span className="chip-telemetry chip-cyan">CLINICAL AI</span>
                </div>
                <span className="telehealth-status-indicator font-mono">
                  {companion.active ? 'Live Listening' : 'Ready'}
                </span>
              </div>

              <p className="telehealth-text">
                {companion.active
                  ? companion.speaking
                    ? t('mitraSpeaking')
                    : companion.listening
                    ? t('mitraListening')
                    : companion.statusText
                  : 'Prescriptions calibrated. Ask clinical questions regarding food interactions, timings, or side effects.'}
              </p>

              <div className="telehealth-action-row">
                <button
                  type="button"
                  className="btn-cyber"
                  onClick={() => openModal({ kind: 'askMitra' })}
                >
                  <SparklesIcon size={15} />
                  <span>{t('askMitraBtn')}</span>
                </button>

                <button
                  type="button"
                  className={`btn-glass ${companion.active ? 'btn-danger-outline' : ''}`}
                  onClick={companion.active ? companion.stop : companion.start}
                >
                  <MicrophoneIcon size={15} />
                  <span>{companion.active ? t('stopVoiceDialog') : t('startVoiceDialog')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Acoustic Impact Guard */}
        <section className="telehealth-cell guard-cell">
          <div className="telehealth-cell-body">
            <div className={`telehealth-icon-wrap ${fallDetector.active ? 'active-guard-icon' : ''}`}>
              <ShieldIcon size={18} />
            </div>

            <div className="telehealth-content">
              <div className="telehealth-header">
                <div className="telehealth-title-group">
                  <h3 className="telehealth-title">Acoustic Impact Guard</h3>
                  {fallDetector.active && <span className="live-dot" />}
                </div>
              </div>

              <p className="telehealth-text">
                {fallDetector.active ? t('fallGuardActive') : t('fallGuardInactive')}
              </p>

              <div className="guard-actions-row">
                {fallDetector.active && (
                  <button
                    type="button"
                    className="btn-glass btn-sm"
                    onClick={fallDetector.simulateFall}
                  >
                    Test Sensor
                  </button>
                )}

                <button
                  type="button"
                  className={`btn-glass btn-sm ${fallDetector.active ? 'btn-danger-outline' : ''}`}
                  onClick={fallDetector.active ? fallDetector.stopListening : fallDetector.startListening}
                >
                  {fallDetector.active ? 'Turn off' : 'Turn on'}
                </button>

                <button
                  type="button"
                  className="btn-glass btn-sm"
                  onClick={testAlarm}
                >
                  <BellIcon size={13} />
                  <span>{t('testAlarmBtn')}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Fall Distress Emergency Dialog */}
      {fallDetector.fallDetected && (
        <div role="alertdialog" aria-modal="true" className="overlay z-modal-top">
          <div className="fall-dialog-card">
            <h2 className="fall-dialog-title">Potential Fall Detected</h2>
            <p className="fall-dialog-desc">
              The acoustic sensor registered a sharp impact spike. If unacknowledged, family caregivers will be alerted immediately.
            </p>

            <div className="fall-countdown-circle font-mono">
              {fallDetector.countdown}s
            </div>

            <div className="fall-dialog-actions">
              <button
                type="button"
                className="btn-cyber btn-full"
                onClick={fallDetector.dismiss}
              >
                <CheckIcon size={16} />
                <span>I am safe and well</span>
              </button>

              <button
                type="button"
                className="btn-emergency btn-full"
                onClick={() => {
                  fallDetector.dismiss();
                  handleFallEmergency();
                }}
              >
                Request Emergency Assistance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Chronological Schedule Spine ── */}
      <section className="timeline-schedule-section">
        <div className="timeline-header">
          <div className="timeline-heading-left">
            <h3 className="timeline-title">{t('today')}</h3>
            <span className="chip-telemetry chip-neutral font-mono">
              {logs.length} scheduled
            </span>
          </div>

          <button
            type="button"
            className="btn-glass timeline-add-btn"
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <PlusIcon size={14} />
            <span>{t('addMedicine')}</span>
          </button>
        </div>

        {/* Timeline Dose Cards List */}
        <div className="timeline-dose-stack">
          {logs.length ? (
            logs.map((log) => (
              <DoseCard
                key={log.id}
                log={log}
                medication={medicationById(log.medicationId)}
                onConfirm={confirm}
                onSpeak={confirmByVoice}
                onVerifyPill={(doseItem, medItem) =>
                  openModal({
                    kind: 'pillVerify',
                    dose: doseItem,
                    medication: medItem,
                    onConfirm: (d, status) => {
                      confirm(d, status, 'camera');
                      openModal(null);
                    }
                  })
                }
              />
            ))
          ) : (
            <div className="empty-schedule-card">
              <div className="empty-schedule-icon">
                <PillIcon size={32} />
              </div>
              <div className="empty-schedule-text">
                <strong className="empty-schedule-title">
                  No medications scheduled for today
                </strong>
                <p className="empty-schedule-desc">
                  Your prescription schedule is clear. Add medications to begin receiving automated reminders and telemetry.
                </p>
              </div>
              <button
                type="button"
                className="btn-cyber"
                onClick={() => openModal({ kind: 'medicine' })}
              >
                <PlusIcon size={15} />
                <span>{t('addMedicine')}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Gentle Celebration Feedback on Dose Taken */}
      {celebratingMed && (
        <DoseCelebration
          medicationName={celebratingMed}
          patientName={dashboard.patient?.name || 'Patient'}
          onClose={() => setCelebratingMed(null)}
        />
      )}
    </div>
  );
}
