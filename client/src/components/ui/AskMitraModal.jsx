import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';
import {
  CrossMedicalIcon,
  MicrophoneIcon,
  SparklesIcon,
  Volume2Icon
} from './Icons.jsx';

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ask-mitra-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <header className="ask-mitra-header">
          <div className="ask-mitra-brand">
            <div className="ask-mitra-badge">
              <SparklesIcon size={18} />
            </div>
            <div>
              <h2 className="ask-mitra-title">
                {t('talkToMitra') || 'Mitra Clinical AI'}
              </h2>
              <span className="ask-mitra-subtitle">
                {i18n.language === 'hi'
                  ? 'दवा समय, भोजन परस्पर प्रभाव व सुरक्षा मार्गदर्शन'
                  : 'Prescription guidance, food interactions, and safety advice'}
              </span>
            </div>
          </div>

          <div className="ask-mitra-actions">
            {conversation.length > 0 && (
              <button
                type="button"
                onClick={handleResetChat}
                className="ask-mitra-clear-btn"
              >
                ↺ Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ask-mitra-close-btn"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        {/* Center Chat View */}
        <div className="ask-mitra-chat-body">
          {/* Welcome Screen */}
          {conversation.length === 0 && !loading && (
            <div className="ask-mitra-empty">
              <div className="ask-mitra-empty-icon">
                <CrossMedicalIcon size={24} strokeWidth={2.4} />
              </div>

              <h3 className="ask-mitra-empty-title">
                {i18n.language === 'hi' ? 'मित्रा से क्या पूछना चाहते हैं?' : 'How can Mitra assist you today?'}
              </h3>

              <p className="ask-mitra-empty-desc">
                {i18n.language === 'hi'
                  ? 'अपनी दवाओं के समय, खाने के साथ परहेज़, दुष्प्रभावों या सामान्य स्वास्थ्य सावधानियों के बारे में पूछें।'
                  : 'Ask clinical questions regarding food interactions, medicine timings, dietary precautions, or missed doses.'}
              </p>

              <div className="ask-mitra-suggestions">
                {(i18n.language === 'hi' ? [
                  'क्या मैं दवा दूध के साथ ले सकता हूँ?',
                  'अगर खुराक छूट जाए तो क्या करूँ?',
                  'पैरासिटामोल के सामान्य दुष्प्रभाव क्या हैं?'
                ] : [
                  'Can I take Metformin with milk?',
                  'What should I do if I miss my dose?',
                  'Are there food interactions with my medicines?'
                ]).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleAsk(suggestion)}
                    className="ask-mitra-suggestion-pill"
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
              className={`ask-msg-row ${msg.role === 'user' ? 'msg-user-row' : 'msg-mitra-row'}`}
            >
              <div className={`ask-msg-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-mitra'}`}>
                {msg.role === 'mitra' && (
                  <div className="ask-msg-mitra-top">
                    <span className="chip-telemetry chip-mint">
                      <SparklesIcon size={12} />
                      <span>Mitra AI</span>
                    </span>
                    <button
                      type="button"
                      className="ask-speak-btn"
                      onClick={() => speakAnswer(msg.text)}
                      title="Listen aloud"
                    >
                      <Volume2Icon size={14} />
                      <span>Listen</span>
                    </button>
                  </div>
                )}

                <div className="ask-msg-text">
                  {msg.text}
                </div>

                {msg.disclaimer && (
                  <div className="ask-msg-disclaimer">
                    <span>Notice: {msg.disclaimer}</span>
                  </div>
                )}
              </div>

              <span className="ask-msg-timestamp font-mono">
                {msg.time}
              </span>
            </div>
          ))}

          {loading && (
            <div className="ask-msg-row msg-mitra-row">
              <div className="ask-msg-bubble bubble-mitra bubble-loading">
                <span className="loading-dot" />
                <span>Consulting clinical knowledge base…</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="ask-mitra-input-bar">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={i18n.language === 'hi' ? 'अपनी समस्या या दवा के बारे में पूछें…' : 'Ask about your medicines, timings, or diet…'}
            className="ask-mitra-input"
            autoFocus
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Speak query"
            className="ask-mitra-voice-btn"
          >
            <MicrophoneIcon size={18} />
          </button>
          <button
            type="button"
            className="ask-mitra-send-btn"
            disabled={loading || !question.trim()}
            onClick={() => handleAsk()}
          >
            {loading ? '…' : (i18n.language === 'hi' ? 'भेजें' : 'Ask')}
          </button>
        </div>
      </div>
    </div>
  );
}
