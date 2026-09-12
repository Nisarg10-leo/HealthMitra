import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sosApi } from '../../api/index.js';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  AlertTriangleIcon,
  CheckIcon,
  PhoneIcon,
  ShieldAlertIcon,
  WhatsAppIcon
} from '../../components/ui/Icons.jsx';

// Location is best-effort: a denied or unavailable geolocation still sends the SOS.
const currentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      () => resolve(null),
      { timeout: 5000 }
    );
  });

export function SosModal({ onClose }) {
  const { t } = useTranslation();
  const session = useSession();
  const { notify, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const caregiverName = 'Arjun Shah';
  const caregiverPhone = '919810000002';
  const waMessage = encodeURIComponent(
    `EMERGENCY MEDICAL SOS: Patient ${session?.name || 'Meera Shah'} needs immediate medical assistance! Please check HealthMitra immediately.`
  );
  const waUrl = `https://wa.me/${caregiverPhone}?text=${waMessage}`;

  const send = async () => {
    setBusy(true);
    try {
      const coords = await currentPosition();
      await sosApi.trigger(session.id, coords);
      notify(t('sosSent'));
      setSent(true);
      if (refresh) refresh();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell eyebrow={null} onClose={onClose} className="sos-modal-shell">
      {!sent ? (
        <div className="sos-dialog-body">
          <div className="sos-badge-wrap">
            <div className="sos-pulse-ring" />
            <div className="sos-badge-icon">
              <ShieldAlertIcon size={32} />
            </div>
          </div>

          <div className="sos-text-group">
            <span className="sos-eyebrow font-mono">{t('emergencyAction')}</span>
            <h2 className="sos-headline">{t('requestEmergencyHelp')}</h2>
            <p className="sos-description">
              {t('sosModalBody')} Caregiver <strong>{caregiverName}</strong> will be alerted with your live GPS location.
            </p>
          </div>

          <div className="sos-action-stack">
            <button
              type="button"
              className="sos-btn-emergency"
              onClick={send}
              disabled={busy}
            >
              <AlertTriangleIcon size={18} />
              <span>{busy ? t('sending') : t('sendEmergencySos')}</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="sos-btn-whatsapp"
            >
              <WhatsAppIcon size={18} />
              <span>Alert {caregiverName} on WhatsApp</span>
            </a>

            <div className="sos-hotlines-row">
              <a href="tel:108" className="sos-btn-helpline">
                <PhoneIcon size={14} />
                <span>Ambulance (108)</span>
              </a>
              <a href="tel:112" className="sos-btn-helpline">
                <PhoneIcon size={14} />
                <span>National (112)</span>
              </a>
            </div>
          </div>

          <button type="button" className="sos-btn-cancel" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      ) : (
        <div className="sos-dialog-body sos-success-state">
          <div className="sos-badge-wrap">
            <div className="sos-badge-icon badge-icon-success">
              <CheckIcon size={32} />
            </div>
          </div>

          <div className="sos-text-group">
            <span className="sos-eyebrow font-mono text-leaf">SIGNAL BROADCAST</span>
            <h2 className="sos-headline">{t('sosSent')}</h2>
            <p className="sos-description">
              Your emergency signal with GPS coordinates has been dispatched to <strong>{caregiverName}</strong>. Please stay calm.
            </p>
          </div>

          <div className="sos-action-stack">
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="sos-btn-whatsapp"
            >
              <WhatsAppIcon size={18} />
              <span>Open WhatsApp with {caregiverName}</span>
            </a>

            <a
              href={`tel:${caregiverPhone}`}
              className="sos-btn-call"
            >
              <PhoneIcon size={16} />
              <span>Call {caregiverName} (+91 98100 00002)</span>
            </a>
          </div>

          <button type="button" className="sos-btn-close" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      )}
    </ModalShell>
  );
}
