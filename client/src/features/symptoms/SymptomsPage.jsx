import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { SectionHeading } from '../../components/ui/SectionHeading.jsx';
import { useWorkspace } from '../../workspace/WorkspaceContext.jsx';

// Mirrors the curated list in server/src/services/symptomService.js.
export const SYMPTOMS = ['headache', 'mild fever', 'common cold', 'mild body ache', 'mild cough'];
const HINDI_HINTS = { 'mild fever': /बुखार/ };

export function SymptomsPage() {
  const { t, i18n } = useTranslation();
  const { notify, listen } = useWorkspace();
  const [symptom, setSymptom] = useState('');
  const [severe, setSevere] = useState(false);
  const [result, setResult] = useState(null);

  const choose = (value) => { setSymptom(value); setResult(null); };
  const check = async () => { try { setResult(await guidanceApi.symptom(symptom, severe, i18n.language)); } catch (error) { notify(error.message); } };
  const chooseByVoice = () => listen((transcript) => {
    const spoken = transcript.toLowerCase();
    const found = SYMPTOMS.find((item) => spoken.includes(item) || (i18n.language === 'hi' && HINDI_HINTS[item]?.test(transcript)));
    if (found) { choose(found); notify(t('symptomHeard', { symptom: t(found) })); } else notify(t('symptomUnclear'));
  });

  return <>
    <SectionHeading kicker={t('patientTool')} title={t('feelingQuestion')} subtitle={t('symptomSubtitle')} />
    <div className="symptom-card">
      <div className="card-heading"><h3>{t('selectSymptom')}</h3><button className="voice small-voice" onClick={chooseByVoice}>◉ {t('speak')}</button></div>
      <div className="symptom-options">{SYMPTOMS.map((item) => <button key={item} className={symptom === item ? 'chosen' : ''} onClick={() => choose(item)}>{t(item)}</button>)}</div>
      <label className="check"><input type="checkbox" checked={severe} onChange={(event) => { setSevere(event.target.checked); setResult(null); }} /> {t('severeCheck')}</label>
      <button className="primary" disabled={!symptom} onClick={check}>{t('safeGuidance')}</button>
      {result && <div className={`guidance ${result.safe ? '' : 'urgent'}`}><strong>{result.safe ? t('gentleSuggestion') : t('seekMedicalGuidance')}</strong><p>{result.suggestion}</p><small>⚕ {result.disclaimer}</small></div>}
    </div>
    <div className="medical-disclaimer"><strong>{t('safetyFirst')}</strong><p>{t('persistentDisclaimer')}</p></div>
  </>;
}
