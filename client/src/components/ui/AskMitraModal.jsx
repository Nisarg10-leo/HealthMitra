import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';

const QUICK_QUESTIONS = [
  { en: 'Why shouldn’t I take grapefruit with Amlodipine?', hi: 'एम्लोडिपिन के साथ चकोतरा क्यों नहीं लेना चाहिए?' },
  { en: 'Can I take Paracetamol with my BP medicine?', hi: 'क्या बीपी की दवा के साथ पैरासिटामोल ले सकते हैं?' },
  { en: 'What should I do if I missed a dose of Metformin?', hi: 'अगर मेटफ़ॉर्मिन की खुराक छूट जाए तो क्या करें?' },
  { en: 'Why does my blood pressure medicine make me dizzy?', hi: 'बीपी की दवा से चक्कर क्यों आते हैं?' }
];

export function AskMitraModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const listen = useSpeechInput((msg) => alert(msg));

  const handleAsk = async (queryToAsk) => {
    const q = queryToAsk || question;
    if (!q.trim()) return;
    setLoading(true);
    setAnswerData(null);
    try {
      const result = await guidanceApi.askMitra(q, i18n.language);
      setAnswerData(result);
    } catch (err) {
      alert('Could not fetch answer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    listen((transcript) => {
      setQuestion(transcript);
      handleAsk(transcript);
    });
  };

  const speakAnswer = () => {
    if (!window.speechSynthesis || !answerData?.answer) return;
    const utterance = new SpeechSynthesisUtterance(answerData.answer);
    utterance.lang = i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div
        className="glass-matrix"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '26px',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          boxShadow: '0 0 40px rgba(0, 242, 254, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
              <div
                className="animate-orb"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00f2fe, #8b5cf6, #6ffbbe)',
                  filter: 'blur(5px)',
                  opacity: 0.8
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  margin: '3px',
                  borderRadius: '50%',
                  background: '#080c15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00f2fe',
                  fontSize: '1.2rem',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                🧠
              </div>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff' }}>Ask Mitra Anything</h2>
              <span style={{ color: '#00f2fe', fontSize: '0.78rem', letterSpacing: '0.04em', fontWeight: '600' }}>
                Clinical AI Medical & Food Safety Reasoning
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div style={{ marginBottom: '14px' }}>
          <small style={{ color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '8px', fontSize: '0.78rem' }}>
            {i18n.language === 'hi' ? 'सुझाए गए प्रश्न:' : 'Suggested clinical queries:'}
          </small>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {QUICK_QUESTIONS.map((qObj, idx) => {
              const text = i18n.language === 'hi' ? qObj.hi : qObj.en;
              return (
                <button
                  key={idx}
                  type="button"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    color: '#dfe2ef',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    setQuestion(text);
                    handleAsk(text);
                  }}
                >
                  💬 {text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input area */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={i18n.language === 'hi' ? 'अपनी दवा या खाने के बारे में पूछें…' : 'Ask about medication, food rules, or timing…'}
            style={{ flex: 1, padding: '12px 16px', fontSize: '0.92rem' }}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Speak your question"
            className="btn-glass"
            style={{ padding: '0 14px', fontSize: '1.2rem' }}
          >
            🎙️
          </button>
          <button
            type="button"
            className="btn-cyber"
            disabled={loading || !question.trim()}
            onClick={() => handleAsk()}
            style={{ padding: '0 20px' }}
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>

        {/* Answer Display */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#00f2fe' }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear', marginRight: '8px' }}>⚙️</span>
            Mitra is evaluating clinical guidance…
          </div>
        )}

        {answerData && !loading && (
          <div
            style={{
              background: 'rgba(10, 14, 23, 0.85)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              borderRadius: '14px',
              padding: '16px',
              overflowY: 'auto',
              flex: 1
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="chip-telemetry chip-violet" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                {answerData.source}
              </span>
              <button
                type="button"
                className="btn-glass"
                onClick={speakAnswer}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                🔊 {i18n.language === 'hi' ? 'उत्तर सुनें' : 'Listen aloud'}
              </button>
            </div>
            <p style={{ margin: '0 0 10px', color: '#ffffff', fontSize: '0.96rem', lineHeight: '1.6' }}>
              {answerData.answer}
            </p>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', fontSize: '0.76rem', color: '#849495' }}>
              ℹ️ {answerData.disclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
