import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';

// Clean text formatting utility to strip any residual markdown artifacts
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '') // remove ###, ##
    .replace(/^\s*[-*_]{3,}\s*$/gm, '') // remove ---, ***
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // remove **bold** or *italic*
    .replace(/^[|\s]+|[|\s]+$/gm, '') // remove table pipes
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
        source: 'Mitra AI',
        disclaimer: result?.disclaimer,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation((prev) => [...prev, aiMsg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      const errorMsg = {
        role: 'mitra',
        text: 'Sorry, I encountered a problem: ' + err.message,
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.90)',
        backdropFilter: 'blur(24px)',
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
          maxWidth: '760px',
          width: '100%',
          padding: '28px',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          boxShadow: '0 0 60px rgba(0, 242, 254, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          height: '88vh',
          maxHeight: '840px',
          borderRadius: '24px'
        }}
      >
        {/* Top Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(0, 242, 254, 0.12)',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe',
                fontSize: '1.2rem'
              }}
            >
              🧠
            </div>
            <div>
              <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#ffffff', letterSpacing: '0.02em' }}>
                Mitra Health Assistant
              </span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>
                Clinical Health & Medication Intelligence
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {conversation.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="btn-glass"
                style={{ padding: '6px 12px', fontSize: '0.76rem', color: '#94a3b8', borderRadius: '10px' }}
              >
                ↺ New Question
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
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
        </div>

        {/* Center / Chat Screen */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingRight: '6px',
            marginBottom: '16px'
          }}
        >
          {/* Welcome Screen with BIG BOLD LETTER TITLE */}
          {conversation.length === 0 && !loading && (
            <div
              style={{
                margin: 'auto',
                textAlign: 'center',
                maxWidth: '540px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
                padding: '20px 0'
              }}
            >
              {/* Glowing Orb */}
              <div style={{ position: 'relative', width: '70px', height: '70px', marginBottom: '8px' }}>
                <div
                  className="animate-orb"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00f2fe, #8b5cf6)',
                    filter: 'blur(10px)',
                    opacity: 0.8
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: '64px',
                    height: '64px',
                    margin: '3px',
                    borderRadius: '50%',
                    background: '#080c15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f2fe',
                    fontSize: '2rem',
                    border: '1px solid rgba(0, 242, 254, 0.5)'
                  }}
                >
                  ✚
                </div>
              </div>

              {/* Big Bold Headline */}
              <h1
                style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  lineHeight: '1.15'
                }}
              >
                How can Mitra help you?
              </h1>

              {/* Gentle Subtitle */}
              <p style={{ margin: 0, fontSize: '0.98rem', color: '#94a3b8', lineHeight: '1.6' }}>
                Ask anything about your medicines, dosage timing, food safety, or symptoms.
              </p>
            </div>
          )}

          {/* Chat Messages */}
          {conversation.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.role === 'user' ? '78%' : '94%',
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
                    ? '1px solid rgba(0, 242, 254, 0.45)'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '16px 20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {msg.role === 'mitra' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.12)', padding: '3px 10px', borderRadius: '8px', fontWeight: '600' }}>
                      ✚ Mitra
                    </span>
                    <button
                      type="button"
                      className="btn-glass"
                      onClick={() => speakAnswer(msg.text)}
                      style={{ padding: '3px 10px', fontSize: '0.74rem', color: '#94a3b8', borderRadius: '8px' }}
                      title="Listen aloud"
                    >
                      🔊 Listen
                    </button>
                  </div>
                )}

                <div
                  style={{
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {msg.text}
                </div>

                {msg.disclaimer && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '12px', paddingTop: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
                    ℹ️ {msg.disclaimer}
                  </div>
                )}
              </div>

              <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
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
                borderRadius: '18px 18px 18px 4px',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#00f2fe',
                fontSize: '0.9rem'
              }}
            >
              <span style={{ display: 'inline-block', animation: 'spin 1s infinite linear' }}>⚙️</span>
              Thinking and preparing clinical guidance…
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={i18n.language === 'hi' ? 'अपनी समस्या या दवा के बारे में पूछें…' : 'Type your health or medicine question…'}
            style={{
              flex: 1,
              padding: '14px 18px',
              fontSize: '0.95rem',
              background: 'rgba(8, 12, 21, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '14px',
              color: '#ffffff',
              outline: 'none'
            }}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Speak your question"
            className="btn-glass"
            style={{ padding: '0 16px', fontSize: '1.25rem', borderRadius: '14px' }}
          >
            🎙️
          </button>
          <button
            type="button"
            className="btn-cyber"
            disabled={loading || !question.trim()}
            onClick={() => handleAsk()}
            style={{ padding: '0 24px', borderRadius: '14px', fontWeight: '600', fontSize: '0.95rem' }}
          >
            {loading ? '…' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
}
