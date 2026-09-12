import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

export const SYMPTOMS = ['headache', 'mild fever', 'common cold', 'mild body ache', 'mild cough'];
const HINDI_HINTS = { 'mild fever': /बुखार/ };

export function SymptomsPage() {
  const { t, i18n } = useTranslation();
  const { notify, listen } = useWorkspace();
  const [symptom, setSymptom] = useState('');
  const [severe, setSevere] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const choose = (value) => {
    setSymptom(value);
    setResult(null);
  };

  const check = async () => {
    if (!symptom) return;
    setLoading(true);
    try {
      setResult(await guidanceApi.symptom(symptom, severe, i18n.language));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseByVoice = () =>
    listen((transcript) => {
      const spoken = transcript.toLowerCase();
      const found = SYMPTOMS.find(
        (item) => spoken.includes(item) || (i18n.language === 'hi' && HINDI_HINTS[item]?.test(transcript))
      );
      if (found) {
        choose(found);
        notify(t('symptomHeard', { symptom: t(found) }));
      } else {
        notify(t('symptomUnclear'));
      }
    });

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Page Header ── */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', marginBottom: '6px' }}>
            {t('patientTool')}
          </span>
          <h1 style={{ fontSize: '1.75rem', margin: '4px 0 2px', color: '#ffffff', fontWeight: '700' }}>
            {t('feelingQuestion')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
            {t('symptomSubtitle')}
          </p>
        </div>

        <button
          type="button"
          className="btn-glass"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={chooseByVoice}
        >
          <span>🎙️</span>
          <span>{t('speak')}</span>
        </button>
      </section>

      {/* ── Interactive Symptom Selector ── */}
      <section className="hm-card" style={{ padding: '22px 24px' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', color: '#ffffff', fontWeight: '600' }}>
          {t('selectSymptom')}
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
          {SYMPTOMS.map((item) => {
            const isSelected = symptom === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => choose(item)}
                style={{
                  background: isSelected ? 'var(--cyan-subtle)' : 'var(--surface-dim)',
                  border: isSelected ? '1px solid var(--cyan)' : '1px solid var(--surface-border)',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected ? '0 0 12px rgba(0, 210, 211, 0.25)' : 'none'
                }}
              >
                {t(item)}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface-dim)', borderRadius: '10px', border: '1px solid var(--surface-border)', marginBottom: '18px' }}>
          <input
            type="checkbox"
            id="severe-check"
            checked={severe}
            onChange={(e) => {
              setSevere(e.target.checked);
              setResult(null);
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--coral)' }}
          />
          <label htmlFor="severe-check" style={{ color: severe ? '#fca5a5' : 'var(--text-secondary)', fontSize: '0.88rem', cursor: 'pointer', fontWeight: severe ? '600' : '400' }}>
            {t('severeCheck')}
          </label>
        </div>

        <button
          type="button"
          className="btn-cyber"
          disabled={!symptom || loading}
          onClick={check}
          style={{ width: '100%', padding: '12px 20px', fontSize: '0.95rem' }}
        >
          {loading ? 'Analyzing Clinical Patterns...' : t('safeGuidance')}
        </button>

        {/* Clinical Guidance Result */}
        {result && (
          <div
            style={{
              marginTop: '18px',
              padding: '18px 20px',
              borderRadius: '12px',
              background: result.safe ? 'var(--emerald-subtle)' : 'var(--coral-subtle)',
              borderLeft: `4px solid ${result.safe ? 'var(--emerald)' : 'var(--coral)'}`,
              border: `1px solid ${result.safe ? 'var(--emerald-border)' : 'var(--coral-border)'}`
            }}
          >
            <strong style={{ display: 'block', fontSize: '1rem', color: result.safe ? '#34d399' : '#fca5a5', marginBottom: '6px' }}>
              {result.safe ? t('gentleSuggestion') : t('seekMedicalGuidance')}
            </strong>
            <p style={{ color: '#ffffff', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 10px' }}>
              {result.suggestion}
            </p>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'block' }}>
              ⚕ {result.disclaimer}
            </small>
          </div>
        )}
      </section>

      {/* ── Persistent Medical Disclaimer ── */}
      <div
        className="hm-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--surface-dim)',
          border: '1px solid var(--surface-border)'
        }}
      >
        <span style={{ fontSize: '1.2rem', color: 'var(--cyan)' }}>⚕</span>
        <div>
          <strong style={{ fontSize: '0.82rem', color: '#ffffff', display: 'block' }}>
            {t('safetyFirst')}
          </strong>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {t('persistentDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
