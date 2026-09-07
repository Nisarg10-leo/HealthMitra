import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../../api/index.js';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function JoinModal({ onClose }) {
  const { t } = useTranslation();
  const { refresh, notify } = useWorkspace();
  const [code, setCode] = useState('');
  const { busy, run } = useAsyncAction(notify);
  const submit = (event) => {
    event.preventDefault();
    run(async () => { await patientsApi.joinWithCode(code); notify(t('patientLinked')); refresh(); onClose(); });
  };
  return <ModalShell eyebrow={t('caregiverMode')} title={t('joinPatient')} onClose={onClose} onSubmit={submit}>
    <p className="muted">{t('joinPatientBody')}</p>
    <label>{t('inviteCode')}<input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="MITRA-4821" /></label>
    <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('joinNow')}</button>
  </ModalShell>;
}
