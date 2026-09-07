import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, guidanceApi, patientsApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { useVoiceCompanion } from '../../hooks/useSpeech.js';
import { isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { DoseCard } from './DoseCard.jsx';

export function TodayPage() {
  const { t } = useTranslation();
  const { dashboard, refresh, notify, listen, openModal } = useWorkspace();
  const [reassuranceSent, setReassuranceSent] = useState(false);
  const logs = dashboard.logs.filter((log) => isToday(log.scheduledTime)).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  const medicationById = (id) => dashboard.medications.find((medication) => medication.id === id);

  const confirm = async (log, status, method = 'tap') => {
    try {
      await dosesApi.confirm(log.id, status, method);
      notify(status === 'taken' ? t('doseRecorded') : t('doseSkipped'));
      refresh();
    } catch (requestError) { notify(requestError.message); }
  };

  const confirmByVoice = (log) => listen(async (transcript) => {
    try {
      const { intent } = await guidanceApi.voiceIntent(transcript);
      if (intent === 'taken' || intent === 'skipped') await confirm(log, intent, 'voice');
      else notify(t('voiceUnclear'));
    } catch (requestError) { notify(requestError.message); }
  });

  // Voice Companion hook
  const companion = useVoiceCompanion(
    dashboard,
    async (doseId, status, method) => {
      await dosesApi.confirm(doseId, status, method);
      refresh();
    },
    notify
  );

  const handleReassurance = async () => {
    try {
      await patientsApi.reassure(dashboard.patient.id);
      setReassuranceSent(true);
      notify(t('reassuranceSent'));
      refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  const { today } = dashboard;
  const complete = today.total > 0 && today.taken === today.total;
  const showInactivityBanner = dashboard.inactivityCheck?.needsReassurance && !reassuranceSent;

  return <>
    {/* Inactivity Guardian Passive Safety Banner */}
    {showInactivityBanner && (
      <div className="inline-warning" style={{ background: '#fff3cd', borderColor: '#ffeeba', padding: '14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong style={{ color: '#856404' }}>{t('areYouOkayTitle')}</strong>
          <p style={{ margin: '4px 0 0', color: '#856404', fontSize: '0.9em' }}>{t('areYouOkayBody')}</p>
        </div>
        <button className="primary" style={{ background: '#28a745', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={handleReassurance}>
          {t('iAmOkayBtn')}
        </button>
      </div>
    )}

    {/* Conversational Voice Companion Banner */}
    <div style={{ background: companion.active ? 'linear-gradient(135deg, #4f67d8, #6c5ce7)' : 'linear-gradient(135deg, #f0f4ff, #e8f0fe)', border: '1px solid #d0dbff', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.8em', animation: companion.listening ? 'pulse 1.5s infinite' : 'none' }}>🎙️</span>
        <div>
          <strong style={{ color: companion.active ? '#fff' : '#2b3a8c', display: 'block' }}>{t('voiceCompanionTitle')}</strong>
          <small style={{ color: companion.active ? '#e0e7ff' : '#5c6fa8' }}>
            {companion.active
              ? (companion.speaking ? t('mitraSpeaking') : companion.listening ? t('mitraListening') : companion.statusText)
              : t('voiceCompanionPrompt')}
          </small>
          {companion.active && companion.statusText && (
            <p style={{ margin: '4px 0 0', color: '#fff', fontWeight: '500', fontSize: '0.92em' }}>"{companion.statusText}"</p>
          )}
        </div>
      </div>
      <button
        type="button"
        style={{ background: companion.active ? '#ff4757' : '#4f67d8', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88em', whiteSpace: 'nowrap' }}
        onClick={companion.active ? companion.stop : companion.start}
      >
        {companion.active ? t('stopVoiceDialog') : t('startVoiceDialog')}
      </button>
    </div>

    <section className="hero-card">
      <div>
        <p>{t('reassurance')}</p>
        <h2>{complete ? t('allCaughtUp') : t('dosesComplete', { taken: today.taken, total: today.total })}</h2>
        <div className="progress" aria-label={`${today.score}% complete`}><span style={{ width: `${today.score}%` }} /></div>
      </div>
      <div className="sun" aria-hidden="true">☀</div>
    </section>

    <SectionHeading kicker={t('patientToday')} title={t('today')} subtitle={t('tapAfterTaking')} action={<span className="score">{today.score}% {t('complete')}</span>} />
    {today.missed > 0 && <div className="inline-warning" role="alert"><span>!</span><div><strong>{t('missedDoseTitle')}</strong><p>{t('missedDoseBody')}</p></div></div>}
    <div className="dose-list">{logs.length ? logs.map((log) => <DoseCard key={log.id} log={log} medication={medicationById(log.medicationId)} onConfirm={confirm} onSpeak={confirmByVoice} />) : <Empty text={t('noMeds')} />}</div>

    <section className="quick-actions">
      <button className="quick-action" onClick={() => openModal({ kind: 'sos' })}><span className="quick-icon danger-icon">⚠</span><span><strong>{t('needHelp')}</strong><small>{t('sosDescription')}</small></span></button>
      <button className="quick-action" onClick={() => openModal({ kind: 'medicine' })}><span className="quick-icon">＋</span><span><strong>{t('addMedicine')}</strong><small>{t('keepScheduleCurrent')}</small></span></button>
    </section>
    <section className="tip"><span aria-hidden="true">✦</span><div><strong>{t('consistencyTipTitle')}</strong><p>{t('consistencyTipBody')}</p></div></section>
  </>;
}
