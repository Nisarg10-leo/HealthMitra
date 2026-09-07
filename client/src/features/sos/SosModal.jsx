import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sosApi } from '../../api/index.js';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

// Location is best-effort: a denied or unavailable geolocation still sends the SOS.
const currentPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition((position) => resolve(position.coords), () => resolve(null));
});

export function SosModal({ onClose }) {
  const { t } = useTranslation();
  const session = useSession();
  const { notify } = useWorkspace();
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await sosApi.trigger(session.id, await currentPosition());
      notify(t('sosSent'));
      onClose();
    } catch (error) {
      notify(error.message);
      setBusy(false);
    }
  };

  return <ModalShell eyebrow={null} onClose={onClose} className="sos-modal">
    <div className="sos-icon">⚠</div>
    <p className="eyebrow">{t('emergencyAction')}</p>
    <h2>{t('requestEmergencyHelp')}</h2>
    <p>{t('sosModalBody')}</p>
    <button className="danger full" onClick={send} disabled={busy}>{busy ? t('sending') : t('sendEmergencySos')}</button>
    <button className="text-button modal-cancel" onClick={onClose}>{t('cancel')}</button>
  </ModalShell>;
}
