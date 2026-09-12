import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactsApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  CrossMedicalIcon,
  LinkIcon,
  PhoneIcon,
  PlusIcon,
  UserIcon
} from '../../components/ui/Icons.jsx';

const SECTIONS = [
  { type: 'doctors', labelKey: 'doctors', detail: 'specialty', iconKey: 'doctor' },
  { type: 'chemists', labelKey: 'pharmacies', detail: 'address', iconKey: 'chemist' }
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
    <div className="page-shell-container max-w-prose">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <span className="chip-telemetry chip-cyan">
            {t('patientTool')}
          </span>
          <h1 className="page-intro-title">
            {t('helpfulContacts')}
          </h1>
          <p className="page-intro-desc">
            {t('contactsSubtitle')}
          </p>
        </div>

        <div className="page-intro-actions">
          {session.role === 'patient' && (
            <button
              type="button"
              className="btn-glass"
              onClick={() => openModal({ kind: 'link' })}
            >
              <LinkIcon size={15} />
              <span>{t('linkCaregiver')}</span>
            </button>
          )}
          {dashboard.permissions?.canEdit && (
            <button
              type="button"
              className="btn-cyber"
              onClick={() => openModal({ kind: 'contact' })}
            >
              <PlusIcon size={15} />
              <span>{t('addContact')}</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Directory Sections ── */}
      <div className="contacts-columns-grid">
        {SECTIONS.map(({ type, labelKey, detail, iconKey }) => (
          <section key={type} className="contacts-section-card">
            <div className="contacts-section-header">
              <div className="contacts-section-title-wrap">
                <span className="contacts-section-icon" aria-hidden="true">
                  {iconKey === 'doctor' ? <UserIcon size={18} /> : <CrossMedicalIcon size={18} />}
                </span>
                <h3 className="contacts-section-title">
                  {t(labelKey)}
                </h3>
              </div>
              <span className="chip-telemetry chip-cyan font-mono">
                {contacts[type].length} Listed
              </span>
            </div>

            <div className="contacts-list-stack">
              {contacts[type].map((contact) => (
                <article key={contact.id} className="contact-card-item">
                  <div className="contact-card-info">
                    <strong className="contact-card-name">
                      {contact.name}
                    </strong>
                    <p className="contact-card-detail">
                      {contact[detail] || t('detailsNotAdded')}
                    </p>
                  </div>

                  <a
                    href={`tel:${contact.phone}`}
                    className="btn-glass contact-call-btn"
                  >
                    <PhoneIcon size={13} />
                    <span className="font-mono">{contact.phone}</span>
                  </a>
                </article>
              ))}

              {!contacts[type].length && (
                <div className="contacts-empty-box">
                  <p className="contacts-empty-hint">
                    {t('noContacts')}
                  </p>
                  {dashboard.permissions?.canEdit && (
                    <button
                      type="button"
                      className="btn-glass btn-sm"
                      style={{ marginTop: '10px' }}
                      onClick={() => openModal({ kind: 'contact' })}
                    >
                      <PlusIcon size={12} />
                      <span>{type === 'doctors' ? 'Add Doctor' : 'Add Pharmacy'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
