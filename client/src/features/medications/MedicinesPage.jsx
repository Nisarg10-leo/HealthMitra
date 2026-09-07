import React from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsApi } from '../../api/index.js';
import { Empty } from '../../components/ui/Empty.jsx';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { useSession } from '../../hooks/useSession.js';
import { formatClock } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function MedicinesPage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const { dashboard, refresh, notify, openModal } = useWorkspace();
  const canEdit = Boolean(dashboard.permissions?.canEdit);

  const remove = async (medication) => {
    if (!window.confirm(t('removeMedicineConfirm', { name: medication.name }))) return;
    try { await medicationsApi.remove(medication.id); notify(t('medicineRemoved')); refresh(); } catch (requestError) { notify(requestError.message); }
  };

  return <>
    <SectionHeading kicker={session.role === 'caregiver' ? t('caregiverView') : t('patientToday')} title={t('medicineSchedule')} subtitle={t('scheduleSubtitle')} action={canEdit && <button className="primary" onClick={() => openModal({ kind: 'medicine' })}>＋ {t('addMedicine')}</button>} />
    {!canEdit && <div className="read-only-note"><span>⌁</span>{t('readOnlySchedule')}</div>}
    <div className="medicine-grid">{dashboard.medications.map((medication) => <article className="medicine" key={medication.id}>
      <span className="medicine-color" style={{ background: medication.color }} />
      <div style={{ flex: 1 }}>
        <h3>{medication.name}</h3>
        <p>{medication.dosage} · {medication.frequencyPerDay} {t('timesDaily')}</p>
        <div className="time-chips">{medication.times.map((time) => <span key={time}>{formatClock(time, i18n.language)}</span>)}</div>
        <small className="date-range">{medication.startDate}{medication.endDate ? ` → ${medication.endDate}` : ` · ${t('ongoing')}`}</small>

        {medication.safety && (
          <div style={{ marginTop: '8px', background: '#f8fafc', borderLeft: '3px solid #3b82f6', padding: '6px 10px', borderRadius: '4px', fontSize: '0.82em', color: '#475569' }}>
            <strong>{medication.safety.icon} {t('dietaryAdvice')}:</strong> {medication.safety.instruction}
          </div>
        )}
      </div>
      {canEdit && <div className="medicine-actions"><button aria-label={`${t('edit')} ${medication.name}`} onClick={() => openModal({ kind: 'medicine', medication })}>✎</button><button aria-label={`${t('remove')} ${medication.name}`} onClick={() => remove(medication)}>×</button></div>}
    </article>)}</div>
    {!dashboard.medications.length && <Empty text={t('noMeds')} />}
  </>;
}
