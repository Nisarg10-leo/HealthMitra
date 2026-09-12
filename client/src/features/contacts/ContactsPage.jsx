import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactsApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

const SECTIONS = [
  { type: 'doctors', labelKey: 'doctors', detail: 'specialty', icon: '⚕' },
  { type: 'chemists', labelKey: 'pharmacies', detail: 'address', icon: '✚' }
];

export function ContactsPage() {
  const { t } = useTranslation();
  const session = useSession();
  const { dashboard, openModal, notify } = useWorkspace();
  const [contacts, setContacts] = useState({ doctors: [], chemists: [] });
  const patientId = dashboard.patient.id;

  useEffect(() => {
    Promise.all(SECTIONS.map(({ type }) => contactsApi.list(type, patientId)))
      .then(([doctors, chemists]) => setContacts({ doctors, chemists }))
      .catch((error) => notify(error.message));
  }, [patientId, notify]);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Page Header ── */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', marginBottom: '6px' }}>
            {t('patientTool')}
          </span>
          <h1 style={{ fontSize: '1.75rem', margin: '4px 0 2px', color: '#ffffff', fontWeight: '700' }}>
            {t('helpfulContacts')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {t('contactsSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {session.role === 'patient' && (
            <button
              type="button"
              className="btn-glass"
              style={{ padding: '9px 15px', fontSize: '0.85rem' }}
              onClick={() => openModal({ kind: 'link' })}
            >
              🔗 {t('linkCaregiver')}
            </button>
          )}
          {dashboard.permissions?.canEdit && (
            <button
              type="button"
              className="btn-cyber"
              style={{ padding: '9px 15px', fontSize: '0.85rem' }}
              onClick={() => openModal({ kind: 'contact' })}
            >
              ＋ {t('addContact')}
            </button>
          )}
        </div>
      </section>

      {/* ── Directory Sections ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
        {SECTIONS.map(({ type, labelKey, detail, icon }) => (
          <section key={type} className="hm-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--cyan)' }}>{icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
                  {t(labelKey)}
                </h3>
              </div>
              <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                {contacts[type].length} Listed
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contacts[type].map((contact) => (
                <article
                  key={contact.id}
                  style={{
                    background: 'var(--surface-dim)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.94rem', color: '#ffffff', display: 'block' }}>
                      {contact.name}
                    </strong>
                    <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {contact[detail] || t('detailsNotAdded')}
                    </p>
                  </div>

                  <a
                    href={`tel:${contact.phone}`}
                    className="btn-glass"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      color: 'var(--cyan)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ☎ {contact.phone}
                  </a>
                </article>
              ))}

              {!contacts[type].length && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '8px 0' }}>
                  {t('noContacts')}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
