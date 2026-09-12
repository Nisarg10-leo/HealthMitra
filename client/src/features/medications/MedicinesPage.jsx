import React from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { formatClock } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function MedicinesPage() {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const { dashboard, refresh, notify, openModal } = useWorkspace();

  const canEdit = Boolean(dashboard?.permissions?.canEdit ?? (session.role === 'patient'));
  const medications = Array.isArray(dashboard?.medications) ? dashboard.medications : [];

  const remove = async (medication) => {
    if (!window.confirm(t('removeMedicineConfirm', { name: medication.name }))) return;
    try {
      await medicationsApi.remove(medication.id);
      notify(t('medicineRemoved'));
      refresh();
    } catch (requestError) {
      notify(requestError.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Page Header ── */}
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', marginBottom: '8px' }}>
            {session.role === 'caregiver' ? t('caregiverView') : t('patientToday')} • Prescriptions Telemetry
          </span>
          <h1 style={{ fontSize: '2rem', margin: '4px 0', color: '#ffffff' }}>
            {t('medicineSchedule')}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
            {t('scheduleSubtitle')}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn-cyber"
            style={{ padding: '11px 20px', fontSize: '0.92rem' }}
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <span>＋</span>
            <span>{t('addMedicine')}</span>
          </button>
        )}
      </section>

      {!canEdit && (
        <div
          className="glass-matrix"
          style={{
            padding: '12px 16px',
            color: '#94a3b8',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderLeft: '3px solid #00f2fe'
          }}
        >
          <span style={{ color: '#00f2fe', fontSize: '1.1rem' }}>⌁</span>
          <span>{t('readOnlySchedule')}</span>
        </div>
      )}

      {/* ── Medication Cards Grid ── */}
      {medications.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}
        >
          {medications.map((medication) => (
            <article
              key={medication.id}
              className="glass-matrix"
              style={{
                padding: '22px 20px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflow: 'hidden'
              }}
            >
              {/* Colored Glow Accent Strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '4px',
                  background: medication.color || '#00f2fe',
                  boxShadow: `0 0 10px ${medication.color || '#00f2fe'}`
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.18rem', color: '#ffffff', fontWeight: '700' }}>
                    {medication.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#dfe2ef',
                        fontWeight: '600'
                      }}
                    >
                      {medication.dosage}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {medication.frequencyPerDay} {t('timesDaily')}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      aria-label={`${t('edit')} ${medication.name}`}
                      onClick={() => openModal({ kind: 'medicine', medication })}
                      style={{
                        background: 'rgba(0, 242, 254, 0.1)',
                        border: '1px solid rgba(0, 242, 254, 0.25)',
                        color: '#00f2fe',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`${t('remove')} ${medication.name}`}
                      onClick={() => remove(medication)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#ffb4ab',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.9rem',
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Scheduled Time Chips */}
              <div style={{ paddingLeft: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(medication.times || []).map((time) => (
                  <span
                    key={time}
                    style={{
                      background: 'rgba(0, 242, 254, 0.08)',
                      border: '1px solid rgba(0, 242, 254, 0.25)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.78rem',
                      color: '#00f2fe',
                      fontFamily: 'monospace',
                      fontWeight: '600'
                    }}
                  >
                    ⏱ {formatClock(time, i18n.language)}
                  </span>
                ))}
              </div>

              {/* Dietary / Clinical Safety Notice */}
              {medication.safety && (
                <div
                  style={{
                    marginLeft: '8px',
                    background: 'rgba(10, 14, 23, 0.6)',
                    border: '1px solid rgba(0, 242, 254, 0.2)',
                    borderLeft: '3px solid #00f2fe',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#cbd5e1'
                  }}
                >
                  <strong style={{ color: '#00f2fe' }}>
                    {medication.safety.icon} {t('dietaryAdvice')}:
                  </strong>{' '}
                  {medication.safety.instruction}
                </div>
              )}

              {/* Date Range Footer */}
              <div style={{ paddingLeft: '8px', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <small style={{ color: '#64748b', fontSize: '0.74rem' }}>
                  {medication.startDate}
                  {medication.endDate ? ` → ${medication.endDate}` : ` • ${t('ongoing')}`}
                </small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          className="glass-matrix"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>💊</span>
          <div>
            <h3 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '1.25rem' }}>
              {t('noMeds')}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, maxWidth: '400px' }}>
              No medications are currently active in this schedule. Add a prescription to generate daily dose reminders and telemetry.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-cyber"
              style={{ marginTop: '8px', padding: '12px 24px', fontSize: '0.95rem' }}
              onClick={() => openModal({ kind: 'medicine' })}
            >
              <span>＋</span>
              <span>{t('addMedicine')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

