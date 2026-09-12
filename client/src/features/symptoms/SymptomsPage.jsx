import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckIcon,
  MicrophoneIcon,
  ShieldIcon,
  SparklesIcon,
  Volume2Icon,
  WhatsAppIcon
} from '../../components/ui/Icons.jsx';

export const COMMON_SYMPTOMS = [
  'headache',
  'mild fever',
  'common cold',
  'mild cough',
  'mild body ache',
  'acidity & heartburn',
  'nausea & upset stomach',
  'mild dizziness',
  'joint pain',
  'fatigue'
];

const HINDI_HINTS = {
  'mild fever': /बुखार/i,
  headache: /सिरदर्द|सरदर्द/i,
  'common cold': /जुकाम|सर्दी/i,
  'mild cough': /खाँसी|खांसी/i,
  'mild body ache': /बदन दर्द/i,
  'mild dizziness': /चक्कर/i
};

export function SymptomsPage() {
  const { t, i18n } = useTranslation();
  const { dashboard, notify, listen } = useWorkspace();
  const [symptom, setSymptom] = useState('');
  const [customText, setCustomText] = useState('');
  const [severe, setSevere] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const caregiverName = 'Arjun Shah';
  const caregiverPhone = '919810000002';
  const patientId = dashboard?.patient?.id;

  const choosePreset = (value) => {
    setSymptom(value);
    setCustomText('');
    setResult(null);
  };

  const checkSymptomWithAI = async () => {
    const query = (customText.trim() || symptom.trim());
    if (!query) return;

    setLoading(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);

    try {
      const data = await guidanceApi.symptom(query, severe, i18n.language, patientId);
      setResult(data);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseByVoice = () => {
    listen((transcript) => {
      const spoken = transcript.trim();
      if (!spoken) {
        notify(t('voiceTryAgain'));
        return;
      }
      setCustomText(spoken);
      setSymptom(spoken);
      setResult(null);
      notify(`Captured: "${spoken}"`);
    });
  };

  const speakAdvice = () => {
    if (!window.speechSynthesis || !result?.suggestion) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(result.suggestion);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.cancel();
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const getWhatsAppShareUrl = () => {
    const pName = dashboard?.patient?.name || 'Meera Shah';
    const text = encodeURIComponent(
      `HealthMitra Clinical AI Update\nPatient: ${pName}\nReported Symptom: ${result?.symptom || symptom}\nSeverity: ${severe ? 'SEVERE' : 'MILD'}\n\nClinical Guidance:\n${result?.suggestion || ''}\n\nTime: ${new Date().toLocaleTimeString()}`
    );
    return `https://wa.me/${caregiverPhone}?text=${text}`;
  };

  return (
    <div className="page-shell-container max-w-prose">
      {/* ── Page Header ── */}
      <section className="page-intro-header">
        <div>
          <div className="page-intro-badges">
            <span className="chip-telemetry chip-cyan">
              <SparklesIcon size={12} />
              <span>CLINICAL AI TRIAGE</span>
            </span>
          </div>
          <h1 className="page-intro-title">
            {t('feelingQuestion')}
          </h1>
          <p className="page-intro-desc">
            Mitra Clinical AI evaluates symptoms against your active prescriptions and medical history for safe, personalized self-care guidance.
          </p>
        </div>

        <button
          type="button"
          className="btn-glass"
          onClick={chooseByVoice}
          title="Speak your symptom in Hindi or English"
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

        {/* Common Symptom Chips */}
        <div className="symptom-chips-row">
          {COMMON_SYMPTOMS.map((item) => {
            const isSelected = !customText && symptom === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => choosePreset(item)}
                className={`symptom-pill-btn ${isSelected ? 'symptom-pill-active' : ''}`}
              >
                {t(item) || item}
              </button>
            );
          })}
        </div>

        {/* Custom Symptom Free-Text Input */}
        <div className="symptom-custom-box">
          <label htmlFor="custom-symptom" className="symptom-input-label font-mono">
            Or describe your symptom in your own words:
          </label>
          <div className="symptom-input-row">
            <input
              id="custom-symptom"
              type="text"
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value);
                setSymptom(e.target.value);
                setResult(null);
              }}
              placeholder="e.g. sharp headache since morning, mild nausea after taking medicine..."
              className="symptom-custom-input"
            />
            {customText && (
              <button
                type="button"
                className="symptom-clear-btn"
                onClick={() => {
                  setCustomText('');
                  setSymptom('');
                }}
                aria-label="Clear input"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Severe Symptom Toggle */}
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

        {/* Trigger AI Evaluation Button */}
        <button
          type="button"
          className="btn-cyber btn-full"
          disabled={(!symptom && !customText.trim()) || loading}
          onClick={checkSymptomWithAI}
        >
          {loading ? (
            <span>Consulting Mitra Clinical AI...</span>
          ) : (
            <>
              <SparklesIcon size={16} />
              <span>Analyze with Clinical AI</span>
            </>
          )}
        </button>

        {/* ── Clinical AI Guidance Result ── */}
        {result && (
          <div
            className={`symptom-guidance-box ${
              result.triage === 'urgent'
                ? 'guidance-alert'
                : result.triage === 'moderate'
                ? 'guidance-moderate'
                : 'guidance-safe'
            }`}
          >
            {/* Header / Triage Banner */}
            <div className="guidance-meta-top">
              <div className="guidance-source-tag font-mono">
                <SparklesIcon size={13} />
                <span>{result.source || 'Mitra Clinical AI'}</span>
              </div>

              <span
                className={`guidance-triage-pill font-mono ${
                  result.triage === 'urgent'
                    ? 'triage-urgent'
                    : result.triage === 'moderate'
                    ? 'triage-moderate'
                    : 'triage-safe'
                }`}
              >
                {result.triage === 'urgent' ? (
                  <>
                    <AlertTriangleIcon size={13} />
                    <span>Immediate Medical Attention Recommended</span>
                  </>
                ) : result.triage === 'moderate' ? (
                  <>
                    <AlertCircleIcon size={13} />
                    <span>Consult Physician if Persistent</span>
                  </>
                ) : (
                  <>
                    <CheckIcon size={13} />
                    <span>Mild · Safe for Home Care</span>
                  </>
                )}
              </span>
            </div>

            {/* AI Guidance Text */}
            <div className="guidance-body-text">
              {result.suggestion}
            </div>

            {/* Red Flags Notice if provided */}
            {result.redFlags && (
              <div className="guidance-redflags-card">
                <strong className="redflags-title font-mono">
                  Emergency Red Flags:
                </strong>
                <p className="redflags-text">{result.redFlags}</p>
              </div>
            )}

            {/* Audio & WhatsApp Action Row */}
            <div className="guidance-actions-row">
              <button
                type="button"
                className={`guidance-listen-btn ${speaking ? 'listen-active' : ''}`}
                onClick={speakAdvice}
              >
                <Volume2Icon size={15} />
                <span>{speaking ? 'Stop Audio' : 'Listen to AI Advice'}</span>
              </button>

              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="guidance-whatsapp-btn"
              >
                <WhatsAppIcon size={15} />
                <span>Share with {caregiverName} on WhatsApp</span>
              </a>
            </div>

            {/* Medical Disclaimer */}
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
