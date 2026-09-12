import React from 'react';
import { useTranslation } from 'react-i18next';
import { Empty } from '../../components/ui/Empty.jsx';
import { formatDate, formatTime } from '../../utils/format.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const { dashboard } = useWorkspace();
  const logs = dashboard.logs.slice(0, 30);

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Page Header ── */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', marginBottom: '6px' }}>
            {t('caregiverView')}
          </span>
          <h1 style={{ fontSize: '1.75rem', margin: '4px 0 2px', color: '#ffffff', fontWeight: '700' }}>
            {t('medicationHistory')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {t('historySubtitle', { name: dashboard.patient.name })}
          </p>
        </div>

        <span className="chip-telemetry chip-mint" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>
          🔥 {dashboard.streak} {t('dayStreak')}
        </span>
      </section>

      {/* ── Chronological Log Feed ── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: '4px 0 2px', fontSize: '1.15rem', color: '#ffffff', fontWeight: '600' }}>
          Verified Dose Stream
        </h3>

        {logs.map((log) => {
          const medication = dashboard.medications.find((item) => item.id === log.medicationId);
          const isTaken = log.status === 'taken';

          return (
            <article
              key={log.id}
              className="hm-card"
              style={{
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                borderLeft: isTaken ? '4px solid var(--emerald)' : '4px solid var(--coral)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: isTaken ? 'var(--emerald-subtle)' : 'var(--coral-subtle)',
                    color: isTaken ? 'var(--emerald)' : 'var(--coral)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                >
                  {isTaken ? '✓' : '!'}
                </div>

                <div>
                  <strong style={{ fontSize: '1rem', color: '#ffffff', display: 'block' }}>
                    {medication?.name || 'Medication'}
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: '400', marginLeft: '6px' }}>
                      {medication?.dosage}
                    </span>
                  </strong>
                  <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }} className="font-mono">
                    {formatDate(log.scheduledTime, i18n.language)} : {formatTime(log.scheduledTime, i18n.language)}
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
      </section>
    </div>
  );
}
