import React, { useState } from 'react';
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

  const [activeSlot, setActiveSlot] = useState('all');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
              {session.role === 'caregiver' ? t('caregiverView') : t('patientToday')}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {medications.length} active prescriptions
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: '2px 0 4px', color: '#ffffff', fontWeight: '700' }}>
            {t('medicineSchedule')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {t('scheduleSubtitle')}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn-cyber"
            style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <span>＋</span>
            <span>{t('addMedicine')}</span>
          </button>
        )}
      </section>

      {!canEdit && (
        <div
          className="hm-card"
          style={{
            padding: '12px 16px',
            color: 'var(--text-secondary)',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderLeft: '3px solid var(--cyan)'
          }}
        >
          <span style={{ color: 'var(--cyan)', fontSize: '1rem' }}>ℹ</span>
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
              className="hm-card"
              style={{
                padding: '20px 20px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflow: 'hidden'
              }}
            >
              {/* Colored Indicator Left Strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '3px',
                  background: medication.color || 'var(--cyan)'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingLeft: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
                    {medication.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-primary)',
                        fontWeight: '500'
                      }}
                    >
                      {medication.dosage}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
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
                        background: 'rgba(0, 210, 211, 0.08)',
                        border: '1px solid var(--cyan-border)',
                        color: 'var(--cyan)',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      aria-label={`${t('remove')} ${medication.name}`}
                      onClick={() => remove(medication)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid var(--coral-border)',
                        color: '#fca5a5',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
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
                    className="font-mono"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '0.78rem',
                      color: 'var(--cyan)',
                      fontWeight: '500'
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
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderLeft: '2px solid var(--cyan)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <strong style={{ color: 'var(--cyan)', fontWeight: '600' }}>
                    {medication.safety.icon} {t('dietaryAdvice')}:
                  </strong>{' '}
                  {medication.safety.instruction}
                </div>
              )}

              {/* Date Range Footer */}
              <div style={{ paddingLeft: '8px', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid var(--surface-border)' }}>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
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
          className="hm-card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '2.5rem' }}>💊</span>
          <div>
            <h3 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '1.2rem', fontWeight: '600' }}>
              {t('noMeds')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '420px' }}>
              No medications are currently active in this schedule. Add a prescription to generate automated daily reminders and safety telemetry.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-cyber"
              style={{ marginTop: '8px', padding: '10px 20px', fontSize: '0.9rem' }}
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
