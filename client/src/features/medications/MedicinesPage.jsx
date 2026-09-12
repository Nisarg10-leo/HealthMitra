import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { medicationsApi } from '../../api/index.js';
import { useSession } from '../../hooks/useSession.js';
import { formatClock } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  AlertCircleIcon,
  ClockIcon,
  CrossIcon,
  EditIcon,
  PillIcon,
  PlusIcon,
  TrashIcon
} from '../../components/ui/Icons.jsx';

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
    <div className="page-shell-container">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <div className="page-intro-badges">
            <span className="chip-telemetry chip-cyan">
              {session.role === 'caregiver' ? t('caregiverView') : t('patientToday')}
            </span>
            <span className="page-intro-count font-mono">
              {medications.length} active prescriptions
            </span>
          </div>
          <h1 className="page-intro-title">
            {t('medicineSchedule')}
          </h1>
          <p className="page-intro-desc">
            {t('scheduleSubtitle')}
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            className="btn-cyber"
            onClick={() => openModal({ kind: 'medicine' })}
          >
            <PlusIcon size={16} />
            <span>{t('addMedicine')}</span>
          </button>
        )}
      </section>

      {!canEdit && (
        <div className="readonly-notice-banner">
          <AlertCircleIcon size={16} className="notice-icon" />
          <span>{t('readOnlySchedule')}</span>
        </div>
      )}

      {/* ── Medication Cards Grid ── */}
      {medications.length > 0 ? (
        <div className="prescriptions-grid">
          {medications.map((medication) => (
            <article key={medication.id} className="prescription-card">
              {/* Left Color Indicator Rail */}
              <div
                className="prescription-rail"
                style={{ backgroundColor: medication.color || 'var(--leaf)' }}
                aria-hidden="true"
              />

              <div className="prescription-card-body">
                <div className="prescription-header">
                  <div>
                    <h3 className="prescription-name">
                      {medication.name}
                    </h3>
                    <div className="prescription-badges-row">
                      <span className="prescription-dosage-chip font-mono">
                        {medication.dosage}
                      </span>
                      <span className="prescription-frequency">
                        {medication.frequencyPerDay} {t('timesDaily')}
                      </span>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="prescription-actions">
                      <button
                        type="button"
                        aria-label={`${t('edit')} ${medication.name}`}
                        className="prescription-icon-btn btn-edit"
                        onClick={() => openModal({ kind: 'medicine', medication })}
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t('remove')} ${medication.name}`}
                        className="prescription-icon-btn btn-trash"
                        onClick={() => remove(medication)}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Scheduled Time Chips */}
                <div className="prescription-times-wrap">
                  {(medication.times || []).map((time) => (
                    <span key={time} className="prescription-time-chip font-mono">
                      <ClockIcon size={12} />
                      <span>{formatClock(time, i18n.language)}</span>
                    </span>
                  ))}
                </div>

                {/* Dietary / Clinical Safety Notice */}
                {medication.safety && (
                  <div className="prescription-dietary-box">
                    <span className="dietary-label font-mono">
                      {t('dietaryAdvice')}:
                    </span>{' '}
                    <span className="dietary-text">{medication.safety.instruction}</span>
                  </div>
                )}

                {/* Date Range Footer */}
                <div className="prescription-footer">
                  <span className="prescription-date-range font-mono">
                    {medication.startDate}
                    {medication.endDate ? ` → ${medication.endDate}` : ` • ${t('ongoing')}`}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="empty-schedule-card empty-meds-view">
          <div className="empty-schedule-icon">
            <PillIcon size={36} />
          </div>
          <div className="empty-schedule-text">
            <h3 className="empty-title">
              {t('noMeds')}
            </h3>
            <p className="empty-desc">
              No medications are currently active in this schedule. Add a prescription to generate automated daily reminders and safety telemetry.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              className="btn-cyber"
              onClick={() => openModal({ kind: 'medicine' })}
            >
              <PlusIcon size={15} />
              <span>{t('addMedicine')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
