import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { patientsApi } from '../../api/index.js';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function LinkCaregiverModal({ onClose }) {
  const { t } = useTranslation();
  const session = useSession();
  const { refresh, notify } = useWorkspace();
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('view');
  const { busy, error, run } = useAsyncAction();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { link } = await patientsApi.linkCaregiver(session.id, email, permissionLevel);
      notify(`${t('caregiverLinked')} ${t('inviteCodeLabel')}: ${link.inviteCode}`);
      refresh();
      onClose();
    });
  };
  return <ModalShell eyebrow={t('patientMode')} title={t('linkCaregiverTitle')} onClose={onClose} onSubmit={submit}>
    <p className="muted">{t('linkCaregiverBody')}</p>
    <label>{t('caregiverEmail')}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="caregiver@example.com" /></label>
    <label>{t('permission')}<select value={permissionLevel} onChange={(event) => setPermissionLevel(event.target.value)}><option value="view">{t('viewOnly')}</option><option value="edit">{t('canEdit')}</option></select></label>
    <ErrorText error={error} />
    <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('linkCaregiver')}</button>
  </ModalShell>;
}
