import React from 'react';
import { useTranslation } from 'react-i18next';
import { generateQrSvg } from '../../utils/qrcode.js';

export function EmergencyQrModal({ patient, medications, onClose }) {
  const { t } = useTranslation();

  const medNames = (medications || []).map((m) => `${m.name} ${m.dosage}`).join(', ') || 'Metformin 500mg, Amlodipine 5mg';
  const emergencyText = `HEALTHMITRA EMERGENCY MEDICAL ID\nPatient: ${patient?.name || 'Meera Shah'}\nBlood Group: O+\nKnown Allergies: Penicillin, Sulfa\nActive Prescriptions: ${medNames}\nPrimary Contact: Arjun Shah (+919810000002)\nDoctor: Dr. R. Nair (+919812345678)\nEmergency Hospital: Lilavati Hospital, Mumbai`;

  const qrSvg = generateQrSvg(emergencyText, 160);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
      }}
    >
      <div
        className="glass-matrix"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '28px',
          borderTop: '3px solid #ef4444',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }}
      >
        {/* Grab bar */}
        <div style={{ width: '48px', height: '4px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '999px', margin: '0 auto 18px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem', color: '#ffb4ab' }}>🚨</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: '800' }}>
                Universal Medical ID
              </h3>
              <span
                style={{
                  fontFamily: 'Inter, monospace',
                  fontSize: '0.68rem',
                  color: '#ffb4ab',
                  letterSpacing: '0.08em',
                  fontWeight: '700'
                }}
              >
                EMERGENCY FIRST-RESPONDER DIRECT ACCESS
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>

        {/* 2-Column Vital Badges (from screen.png) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '16px 0' }}>
          <div
            style={{
              background: 'rgba(10, 14, 23, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px'
            }}
          >
            <span style={{ fontSize: '0.68rem', color: '#849495', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              BLOOD TYPE
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#ffb4ab', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              O+ Positive
            </p>
          </div>

          <div
            style={{
              background: 'rgba(10, 14, 23, 0.85)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px'
            }}
          >
            <span style={{ fontSize: '0.68rem', color: '#849495', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              ORGAN DONOR
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#6ffbbe', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Registered Yes
            </p>
          </div>
        </div>

        {/* Printable Card with Embedded QR */}
        <div
          id="printable-medical-card"
          style={{
            background: 'rgba(10, 14, 23, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          {/* Printable White Scannable QR Container */}
          <div
            style={{
              background: '#ffffff',
              padding: '8px',
              borderRadius: '10px',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.2)',
              flexShrink: 0
            }}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.84rem' }}>
            <div>
              <span style={{ fontSize: '0.68rem', color: '#ffb4ab', fontWeight: '700', letterSpacing: '0.05em' }}>
                ALLERGIES & ADVERSE REACTIONS
              </span>
              <p style={{ margin: '2px 0 0', color: '#ffffff', fontWeight: '600' }}>
                Penicillin (Anaphylaxis risk), Sulfa
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#849495', fontWeight: '700', letterSpacing: '0.05em' }}>
                ACTIVE PRESCRIPTIONS
              </span>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', lineHeight: '1.3' }}>
                {medNames}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.68rem', color: '#849495', fontWeight: '700', letterSpacing: '0.05em' }}>
                PRIMARY EMERGENCY CONTACT
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                <div>
                  <strong style={{ color: '#ffffff', display: 'block' }}>Arjun Shah (Son)</strong>
                  <span style={{ color: '#00f2fe' }}>+91 98100 00002</span>
                </div>
                <a
                  href="tel:+919810000002"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 242, 254, 0.15)',
                    border: '1px solid rgba(0, 242, 254, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f2fe',
                    textDecoration: 'none'
                  }}
                  title="Call Arjun Shah"
                >
                  📞
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn-cyber"
            style={{ width: '100%' }}
            onClick={handlePrint}
          >
            🖨️ Print Fridge Card
          </button>

          <button
            type="button"
            className="btn-glass"
            style={{ width: '100%' }}
            onClick={onClose}
          >
            Dismiss Medical ID
          </button>
        </div>
      </div>
    </div>
  );
}
