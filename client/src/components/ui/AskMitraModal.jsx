import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';

// Clean text formatting utility to strip any residual markdown artifacts
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
    .replace(/^[|\s]+|[|\s]+$/gm, '')
    .replace(/\|\s*/g, ' - ')
    .replace(/^[-\s]{4,}$/gm, '')
    .replace(/([.?!])\s*(\d+\.\s+)/g, '$1\n\n$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function AskMitraModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const listen = useSpeechInput((msg) => alert(msg));

  const handleAsk = async (queryToAsk) => {
    const q = (queryToAsk || question).trim();
    if (!q) return;

    const userMsg = {
      role: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setConversation((prev) => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const result = await guidanceApi.askMitra(q, i18n.language);
      const aiMsg = {
        role: 'mitra',
        text: cleanText(result?.answer || 'I could not generate an answer at this time.'),
        source: 'Mitra Clinical AI',
        disclaimer: result?.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation((prev) => [...prev, aiMsg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      const errorMsg = {
        role: 'mitra',
        text: 'I encountered an issue connecting to the clinical reasoning engine: ' + err.message,
        source: 'Mitra Support',
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

  const handleResetChat = () => {
    setConversation([]);
    setQuestion('');
    inputRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="overlay"
    >
      <div
        className="hm-card"
        style={{
          maxWidth: '740px',
          width: '100%',
          padding: '24px 26px',
          display: 'flex',
          flexDirection: 'column',
          height: '86vh',
          maxHeight: '800px',
          borderRadius: 'var(--radius-panel)'
        }}
      >
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--cyan-subtle)',
                border: '1px solid var(--cyan-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cyan)',
                fontSize: '1rem',
                fontWeight: '700'
              }}
            >
              ✚
            </div>
            <div>
              <span style={{ fontSize: '0.94rem', fontWeight: '600', color: '#ffffff', letterSpacing: '-0.01em' }}>
                Mitra Clinical Intelligence
              </span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Prescription guidance, food interactions, and symptom analysis
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {conversation.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="btn-glass"
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              >
                ↺ Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-glass"
              style={{ padding: '4px 10px', fontSize: '0.84rem' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center Chat View */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingRight: '6px',
            marginBottom: '14px'
          }}
        >
          {/* Welcome Screen */}
          {conversation.length === 0 && !loading && (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                padding: '24px 0'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  background: 'var(--cyan-subtle)',
                  border: '1px solid var(--cyan-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--cyan)',
                  fontSize: '1.6rem',
                  fontWeight: '700'
                }}
              >
                ✚
              </div>

              <h2
                style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                How can Mitra help you?
              </h2>

              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Ask any clinical question regarding your prescription timings, food interactions, dietary safety, or mild symptom relief.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '10px' }}>
                {['Can I take Metformin with milk?', 'What should I do if I miss my dose?', 'Are there side effects for Amlodipine?'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAsk(suggestion)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {conversation.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '80%' : '96%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div
                style={{
                  background: msg.role === 'user' ? '#172033' : '#0B0F19',
                  border: msg.role === 'user'
                    ? '1px solid var(--surface-border-strong)'
                    : '1px solid var(--surface-border)',
                  borderLeft: msg.role === 'mitra' ? '3px solid var(--cyan)' : undefined,
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '14px 18px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}
              >
                {msg.role === 'mitra' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="chip-telemetry chip-cyan" style={{ fontSize: '0.68rem', padding: '1px 8px' }}>
                      ✚ Mitra
                    </span>
                    <button
                      type="button"
                      className="btn-glass"
                      onClick={() => speakAnswer(msg.text)}
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      title="Listen aloud"
                    >
                      🔊 Speak
                    </button>
                  </div>
                )}

                <div
                  style={{
                    color: '#f8fafc',
                    fontSize: '0.92rem',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.text}
                </div>

                {msg.disclaimer && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '10px', paddingTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    ℹ {msg.disclaimer}
                  </div>
                )}
              </div>

              <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                {msg.time}
              </span>
            </div>
          ))}

          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                background: '#0B0F19',
                border: '1px solid var(--cyan-border)',
                borderRadius: '12px 12px 12px 2px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--cyan)',
                fontSize: '0.86rem'
              }}
            >
              <span>● Preparing clinical guidance…</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={i18n.language === 'hi' ? 'अपनी समस्या या दवा के बारे में पूछें…' : 'Type your medicine, interaction, or symptom query…'}
            style={{
              flex: 1,
              padding: '12px 16px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius-item)'
            }}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Speak query"
            className="btn-glass"
            style={{ padding: '0 14px', fontSize: '1.1rem' }}
          >
            🎙️
          </button>
          <button
            type="button"
            className="btn-cyber"
            disabled={loading || !question.trim()}
            onClick={() => handleAsk()}
            style={{ padding: '0 20px', fontSize: '0.9rem' }}
          >
            {loading ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
