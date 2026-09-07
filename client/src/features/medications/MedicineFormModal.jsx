import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsApi } from '../../api/index.js';
import { ErrorText } from '../../components/ui/ErrorText.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useAsyncAction } from '../../hooks/useAsyncAction.js';
import { dateKey } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

const initialForm = (medication) => ({
  name: medication?.name || '',
  dosage: medication?.dosage || '',
  times: medication?.times?.join(', ') || '08:00',
  startDate: medication?.startDate || dateKey(),
  endDate: medication?.endDate || '',
  color: medication?.color || '#4f67d8'
});

export function MedicineFormModal({ medication, onClose }) {
  const { t } = useTranslation();
  const { dashboard, refresh, notify } = useWorkspace();
  const [form, setForm] = useState(() => initialForm(medication));
  const { busy, error, run } = useAsyncAction();
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const payload = { ...form, patientId: dashboard.patient.id, times: form.times.split(',').map((item) => item.trim()).filter(Boolean) };
      if (medication) await medicationsApi.update(medication.id, payload);
      else await medicationsApi.create(payload);
      notify(medication ? t('medicineUpdated') : t('medicineAdded'));
      refresh();
      onClose();
    });
  };

  return <ModalShell title={medication ? t('editMedicine') : t('addMedicine')} onClose={onClose} onSubmit={submit}>
    <label>{t('medicineName')}<input required value={form.name} onChange={update('name')} placeholder="e.g. Metformin" /></label>
    <label>{t('dosage')}<input required value={form.dosage} onChange={update('dosage')} placeholder="e.g. 500 mg" /></label>
    <label>{t('timesComma')}<input required value={form.times} onChange={update('times')} placeholder="08:00, 20:00" /></label>
    <div className="form-grid">
      <label>{t('startDate')}<input type="date" required value={form.startDate} onChange={update('startDate')} /></label>
      <label>{t('endDate')}<input type="date" value={form.endDate} onChange={update('endDate')} /></label>
    </div>
    <label>{t('colour')}<input className="color-input" type="color" value={form.color} onChange={update('color')} /></label>
    <ErrorText error={error} />
    <button className="primary full" disabled={busy}>{busy ? t('pleaseWait') : t('save')}</button>
  </ModalShell>;
}
