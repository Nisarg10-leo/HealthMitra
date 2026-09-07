import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { contactsApi } from '../../api/index.js';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
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

  return <>
    <SectionHeading kicker={t('patientTool')} title={t('helpfulContacts')} subtitle={t('contactsSubtitle')} action={<div className="heading-actions">
      {session.role === 'patient' && <button className="secondary" onClick={() => openModal({ kind: 'link' })}>{t('linkCaregiver')}</button>}
      {dashboard.permissions?.canEdit && <button className="primary" onClick={() => openModal({ kind: 'contact' })}>＋ {t('addContact')}</button>}
    </div>} />
    <div className="contact-sections">{SECTIONS.map(({ type, labelKey, detail, icon }) => <section key={type}>
      <div className="contact-section-heading"><h3>{t(labelKey)}</h3><span>{contacts[type].length}</span></div>
      {contacts[type].map((contact) => <article className="contact" key={contact.id}><span aria-hidden="true">{icon}</span><div><strong>{contact.name}</strong><p>{contact[detail] || t('detailsNotAdded')}</p><a href={`tel:${contact.phone}`}>☎ {contact.phone}</a></div></article>)}
      {!contacts[type].length && <p className="empty-inline">{t('noContacts')}</p>}
    </section>)}</div>
  </>;
}
