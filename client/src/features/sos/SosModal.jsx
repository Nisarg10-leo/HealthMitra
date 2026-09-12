import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sosApi } from '../../api/index.js';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

import { ShieldAlertIcon, CheckIcon } from '../../components/ui/Icons.jsx';

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
  const [sent, setSent] = useState(false);

  const caregiverPhone = '919810000002'; // Arjun Shah
  const waMessage = encodeURIComponent(`EMERGENCY MEDICAL SOS: Patient ${session.name || 'Meera Shah'} needs immediate assistance! Please check HealthMitra immediately.`);
  const waUrl = `https://wa.me/${caregiverPhone}?text=${waMessage}`;

  const send = async () => {
    setBusy(true);
    try {
      await sosApi.trigger(session.id, await currentPosition());
      notify(t('sosSent'));
      setSent(true);
    } catch (error) {
      notify(error.message);
      setBusy(false);
    }
  };

  return <ModalShell eyebrow={null} onClose={onClose} className="sos-modal">
    <div className="sos-icon" style={{ display: 'grid', placeItems: 'center' }}>
      <ShieldAlertIcon size={24} />
    </div>
    <p className="eyebrow">{t('emergencyAction')}</p>
    <h2>{t('requestEmergencyHelp')}</h2>
    <p>{t('sosModalBody')}</p>

    {!sent ? (
      <>
        <button className="danger full" onClick={send} disabled={busy}>{busy ? t('sending') : t('sendEmergencySos')}</button>
        <a
          className="secondary full"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textDecoration: 'none',
            background: '#25D366',
            color: '#fff',
            padding: '12px',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginTop: '10px',
            boxShadow: '0 2px 8px rgba(37, 211, 102, 0.3)'
          }}
          href={waUrl}
          target="_blank"
          rel="noreferrer"
        >
          Alert Family on WhatsApp
        </a>
        <button className="text-button modal-cancel" onClick={onClose}>{t('cancel')}</button>
      </>
    ) : (
      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <p style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <CheckIcon size={16} /> {t('sosSent')}
        </p>
        <a
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textDecoration: 'none',
            background: '#25D366',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 'bold',
            marginTop: '8px'
          }}
          href={waUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open WhatsApp to Arjun Shah
        </a>
        <div style={{ marginTop: '16px' }}>
          <button className="text-button" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    )}
  </ModalShell>;
}
