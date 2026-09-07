import React from 'react';
import { useTranslation } from 'react-i18next';
import { dosesApi, guidanceApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { isToday } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import { DoseCard } from './DoseCard.jsx';

export function TodayPage() {
  const { t } = useTranslation();
  const { dashboard, refresh, notify, listen, openModal } = useWorkspace();
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

  const { today } = dashboard;
  const complete = today.total > 0 && today.taken === today.total;
  return <>
    <section className="hero-card">
      <div><p>{t('reassurance')}</p><h2>{complete ? t('allCaughtUp') : t('dosesComplete', { taken: today.taken, total: today.total })}</h2><div className="progress" aria-label={`${today.score}% complete`}><span style={{ width: `${today.score}%` }} /></div></div>
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
