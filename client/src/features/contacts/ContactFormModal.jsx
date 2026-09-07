import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactsApi } from '../../api/index.js';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function ContactFormModal({ onClose }) {
  const { t } = useTranslation();
  const { dashboard, refresh, notify } = useWorkspace();
  const [form, setForm] = useState({ type: 'doctors', name: '', phone: '', extra: '' });
  const { busy, error, run } = useAsyncAction();
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const payload = { patientId: dashboard.patient.id, name: form.name, phone: form.phone, ...(form.type === 'doctors' ? { specialty: form.extra } : { address: form.extra }) };
      await contactsApi.create(form.type, payload);
      notify(t('contactSaved'));
      refresh();
      onClose();
    });
  };

  return <ModalShell title={t('addContact')} onClose={onClose} onSubmit={submit}>
    <label>{t('contactType')}<select value={form.type} onChange={update('type')}><option value="doctors">{t('doctor')}</option><option value="chemists">{t('pharmacy')}</option></select></label>
    <label>{t('name')}<input required value={form.name} onChange={update('name')} /></label>
    <label>{t('phone')}<input required value={form.phone} onChange={update('phone')} /></label>
    <label>{form.type === 'doctors' ? t('specialty') : t('address')}<input value={form.extra} onChange={update('extra')} /></label>
    <ErrorText error={error} />
    <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('save')}</button>
  </ModalShell>;
}
