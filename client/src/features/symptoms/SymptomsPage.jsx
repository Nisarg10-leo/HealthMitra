import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  HeartIcon,
  MicrophoneIcon,
  ShieldIcon,
  SparklesIcon
} from '../../components/ui/Icons.jsx';

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
    <div className="page-shell-container max-w-prose">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <span className="chip-telemetry chip-cyan">
            {t('patientTool')}
          </span>
          <h1 className="page-intro-title">
            {t('feelingQuestion')}
          </h1>
          <p className="page-intro-desc">
            {t('symptomSubtitle')}
          </p>
        </div>

        <button
          type="button"
          className="btn-glass"
          onClick={chooseByVoice}
        >
          <MicrophoneIcon size={16} />
          <span>{t('speak')}</span>
        </button>
      </section>

      {/* ── Interactive Symptom Selector ── */}
      <section className="symptom-selector-card">
        <h3 className="symptom-selector-title">
          {t('selectSymptom')}
        </h3>

        <div className="symptom-chips-row">
          {SYMPTOMS.map((item) => {
            const isSelected = symptom === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => choose(item)}
                className={`symptom-pill-btn ${isSelected ? 'symptom-pill-active' : ''}`}
              >
                {t(item)}
              </button>
            );
          })}
        </div>

        <div className="symptom-severe-row">
          <input
            type="checkbox"
            id="severe-check"
            checked={severe}
            onChange={(e) => {
              setSevere(e.target.checked);
              setResult(null);
            }}
            className="symptom-checkbox"
          />
          <label htmlFor="severe-check" className="symptom-severe-label">
            {t('severeCheck')}
          </label>
        </div>

        <button
          type="button"
          className="btn-cyber btn-full"
          disabled={!symptom || loading}
          onClick={check}
        >
          {loading ? (
            <span>Analyzing Clinical Patterns...</span>
          ) : (
            <>
              <SparklesIcon size={16} />
              <span>{t('safeGuidance')}</span>
            </>
          )}
        </button>

        {/* Clinical Guidance Result */}
        {result && (
          <div
            className={`symptom-guidance-box ${
              result.safe ? 'guidance-safe' : 'guidance-alert'
            }`}
          >
            <div className="guidance-header-row">
              {result.safe ? <CheckIcon size={18} /> : <AlertTriangleIcon size={18} />}
              <strong className="guidance-title">
                {result.safe ? t('gentleSuggestion') : t('seekMedicalGuidance')}
              </strong>
            </div>
            <p className="guidance-body-text">
              {result.suggestion}
            </p>
            <span className="guidance-disclaimer font-mono">
              {result.disclaimer}
            </span>
          </div>
        )}
      </section>

      {/* ── Persistent Medical Disclaimer ── */}
      <div className="symptom-footer-disclaimer">
        <ShieldIcon size={18} className="disclaimer-shield-icon" />
        <div>
          <strong className="disclaimer-title font-mono">
            {t('safetyFirst')}
          </strong>
          <p className="disclaimer-text">
            {t('persistentDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
