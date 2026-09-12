import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';

const QUICK_QUESTIONS = [
  { en: 'Why shouldn’t I take grapefruit with Amlodipine?', hi: 'एम्लोडिपिन के साथ चकोतरा क्यों नहीं लेना चाहिए?' },
  { en: 'Can I take Paracetamol with my BP medicine?', hi: 'क्या बीपी की दवा के साथ पैरासिटामोल ले सकते हैं?' },
  { en: 'What should I do if I missed a dose of Metformin?', hi: 'अगर मेटफ़ॉर्मिन की खुराक छूट जाए तो क्या करें?' },
  { en: 'Why does my blood pressure medicine make me dizzy?', hi: 'बीपी की दवा से चक्कर क्यों आते हैं?' },
  { en: 'What is a normal fasting blood sugar for seniors?', hi: 'बुजुर्गों के लिए सामान्य खाली पेट ब्लड शुगर कितना होना चाहिए?' },
  { en: 'Can I exercise right after taking morning medicines?', hi: 'क्या सुबह की दवा लेने के तुरंत बाद व्यायाम कर सकते हैं?' },
  { en: 'What are the red-flag symptoms to call an ambulance?', hi: 'कौन से गंभीर लक्षणों में तुरंत एम्बुलेंस बुलानी चाहिए?' },
  { en: 'How should I store insulin and liquid medications?', hi: 'इंसुलिन और तरल दवाइयों को कैसे स्टोर करना चाहिए?' }
];

export function AskMitraModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const chatBottomRef = useRef(null);
  const listen = useSpeechInput((msg) => alert(msg));

  const handleAsk = async (queryToAsk) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    // Append user message immediately
    const userMsg = { role: 'user', text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setConversation((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const result = await guidanceApi.askMitra(q, i18n.language);
      const aiMsg = {
        role: 'mitra',
        text: result?.answer || 'No response available.',
        source: result?.source || 'Groq Neural AI',
        disclaimer: result?.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation((prev) => [...prev, aiMsg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      const errorMsg = {
        role: 'mitra',
        text: 'Sorry, I could not complete the clinical evaluation: ' + err.message,
        source: 'System Alert',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation((prev) => [...prev, errorMsg]);
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

  const speakAnswer = (text) => {
    if (!window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
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
        backgroundColor: 'rgba(5, 8, 14, 0.88)',
        backdropFilter: 'blur(20px)',
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
          maxWidth: '720px',
          width: '100%',
          padding: '24px',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          boxShadow: '0 0 50px rgba(0, 242, 254, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          height: '88vh',
          maxHeight: '850px'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', pb: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
              <div
                className="animate-orb"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00f2fe, #8b5cf6, #6ffbbe)',
                  filter: 'blur(6px)',
                  opacity: 0.85
                }}
              />
              <div
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  margin: '3px',
                  borderRadius: '50%',
                  background: '#080c15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00f2fe',
                  fontSize: '1.25rem',
                  border: '1px solid rgba(0, 242, 254, 0.4)'
                }}
              >
                🧠
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: '700' }}>VITA Intelligence • Ask Mitra</h2>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.3)', fontWeight: '600' }}>
                  Groq 120B Active
                </span>
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                Clinical Medical AI, Prescription Safety & Geriatric Drug Guidance
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Quick Suggestion Chips (show when few messages) */}
        {conversation.length === 0 && (
          <div style={{ marginBottom: '14px' }}>
            <small style={{ color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '8px', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {i18n.language === 'hi' ? 'सुझाए गए नैदानिक प्रश्न:' : 'Common clinical queries:'}
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
                      borderRadius: '14px',
                      padding: '6px 11px',
                      fontSize: '0.78rem',
                      color: '#cfe4ec',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onClick={() => {
                      handleAsk(text);
                    }}
                  >
                    💬 {text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversation Chat Stream */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingRight: '6px',
            marginBottom: '14px'
          }}
        >
          {conversation.length === 0 && !loading && (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b', maxWidth: '360px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💬</div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Ask any health question in English or Hindi.</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Mitra cross-references your active medications, chronic conditions, and food interactions.</p>
            </div>
          )}

          {conversation.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '80%' : '94%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(139, 92, 246, 0.25))'
                    : 'rgba(12, 17, 29, 0.95)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(0, 242, 254, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '14px 16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {msg.role === 'mitra' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.12)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                      ⚡ {msg.source}
                    </span>
                    <button
                      type="button"
                      className="btn-glass"
                      onClick={() => speakAnswer(msg.text)}
                      style={{ padding: '3px 8px', fontSize: '0.72rem', color: '#94a3b8' }}
                      title="Listen aloud"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}

                <div style={{ color: '#ffffff', fontSize: '0.92rem', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                  {msg.text}
                </div>

                {msg.disclaimer && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '10px', paddingTop: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                    ℹ️ {msg.disclaimer}
                  </div>
                )}
              </div>

              <span style={{ fontSize: '0.68rem', color: '#64748b', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                {msg.time}
              </span>
            </div>
          ))}

          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'rgba(12, 17, 29, 0.95)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '16px 16px 16px 4px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#00f2fe',
                fontSize: '0.88rem'
              }}
            >
              <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear' }}>⚙️</span>
              Evaluating medical guidelines & calculating clinical response…
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={i18n.language === 'hi' ? 'अपनी दवा, खुराक, या खाने के बारे में पूछें…' : 'Ask about medication, food safety, or symptoms…'}
            style={{ flex: 1, padding: '12px 16px', fontSize: '0.92rem', background: 'rgba(8, 12, 21, 0.8)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', color: '#ffffff', outline: 'none' }}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Speak your question"
            className="btn-glass"
            style={{ padding: '0 14px', fontSize: '1.2rem', borderRadius: '12px' }}
          >
            🎙️
          </button>
          <button
            type="button"
            className="btn-cyber"
            disabled={loading || !question.trim()}
            onClick={() => handleAsk()}
            style={{ padding: '0 22px', borderRadius: '12px', fontWeight: '600' }}
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}
