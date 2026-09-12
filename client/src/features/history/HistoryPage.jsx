import React from 'react';
import { useTranslation } from 'react-i18next';
import { Empty } from '../../components/ui/Empty.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  ActivityIcon,
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  PillIcon
} from '../../components/ui/Icons.jsx';

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { dashboard } = useWorkspace();
  const logs = (dashboard?.logs || []).slice(0, 30);

  return (
    <div className="page-shell-container max-w-prose">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <span className="chip-telemetry chip-cyan">
            {t('caregiverView')}
          </span>
          <h1 className="page-intro-title">
            {t('medicationHistory')}
          </h1>
          <p className="page-intro-desc">
            {t('historySubtitle', { name: dashboard.patient?.name || 'Patient' })}
          </p>
        </div>

        <span className="chip-telemetry chip-mint">
          <ActivityIcon size={12} />
          <span className="font-mono">{dashboard.streak || 1} {t('dayStreak')}</span>
        </span>
      </section>

      {/* ── Chronological Log Feed ── */}
      <section className="history-stream-section">
        <h3 className="section-subtitle">
          Verified Dose Stream
        </h3>

        <div className="history-stream-stack">
          {logs.map((log) => {
            const medication = dashboard.medications?.find((item) => item.id === log.medicationId);
            const isTaken = log.status === 'taken';

            return (
              <article
                key={log.id}
                className={`history-log-item ${isTaken ? 'log-taken' : 'log-missed'}`}
              >
                <div className="history-log-left">
                  <div className={`history-log-badge ${isTaken ? 'badge-taken' : 'badge-missed'}`}>
                    {isTaken ? <CheckIcon size={16} /> : <AlertCircleIcon size={16} />}
                  </div>

                  <div>
                    <strong className="history-med-title">
                      {medication?.name || 'Medication'}
                      <span className="history-med-dosage font-mono">
                        {medication?.dosage}
                      </span>
                    </strong>
                    <p className="history-med-time font-mono">
                      {formatDate(log.scheduledTime, i18n.language)} • {formatTime(log.scheduledTime, i18n.language)}
                      {log.responseMethod ? ` (${log.responseMethod})` : ''}
                    </p>
                  </div>
                </div>

                <span className={`chip-telemetry ${isTaken ? 'chip-mint' : 'chip-error'}`}>
                  {t(log.status)}
                </span>
              </article>
            );
          })}

          {!logs.length && <Empty text={t('noHistory')} />}
        </div>
      </section>
    </div>
  );
}
