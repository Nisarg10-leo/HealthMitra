import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { guidanceApi } from '../../api/index.js';
import { useSpeechInput } from '../../hooks/useSpeech.js';
import {
  CameraIcon,
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
  const [attachedImage, setAttachedImage] = useState(null); // { base64, name, size }
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const listen = useSpeechInput((msg) => alert(msg));

  const processImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert(i18n.language === 'hi' ? 'कृपया एक मान्य छवि फ़ाइल चुनें।' : 'Please select a valid image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(i18n.language === 'hi' ? 'छवि का आकार 10MB से कम होना चाहिए।' : 'Image must be under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      setAttachedImage({
        base64,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleClearImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddSymptomChip = (symptom) => {
    setQuestion((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return symptom;
      if (trimmed.includes(symptom)) return trimmed;
      return `${trimmed}, ${symptom}`;
    });
    inputRef.current?.focus();
  };

  const handleAsk = async (queryToAsk) => {
    const hasImage = Boolean(attachedImage?.base64);
    let q = (queryToAsk || question).trim();

    if (!q && !hasImage) return;

    if (!q && hasImage) {
      q = i18n.language === 'hi'
        ? 'कृपया इस छवि का विस्तार से विश्लेषण करें। किसी भी दिखाई देने वाले दाने, त्वचा की स्थिति, शारीरिक लक्षण या बीमारी के संभावित कारणों की पहचान करें, खतरे के संकेतों की जांच करें और मेरी दवाओं के साथ सुरक्षा बताएं।'
        : 'Please analyze this clinical image in detail. Identify any visible rash, skin lesion, physical symptoms, disease characteristics, or health condition, evaluate potential causes (differential diagnosis), red-flag symptoms, and check against my medical profile.';
    }

    const currentImage = attachedImage?.base64 || null;
    const userMsg = {
      role: 'user',
      text: q,
      image: currentImage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversation((prev) => [...prev, userMsg]);
    setQuestion('');
    handleClearImage();
    setLoading(true);

    try {
      const result = await guidanceApi.askMitra(q, i18n.language, currentImage);
      const isVision = Boolean(result?.hasImage || result?.source?.toLowerCase().includes('vision'));
      const aiMsg = {
        role: 'mitra',
        text: cleanText(result?.answer || 'I could not generate an answer at this time.'),
        source: isVision
          ? (i18n.language === 'hi' ? 'मित्रा विज़न एआई' : 'Mitra Vision AI')
          : (i18n.language === 'hi' ? 'मित्रा एआई' : 'Mitra AI'),
        isVision,
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
    handleClearImage();
    inputRef.current?.focus();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) processImageFile(blob);
        break;
      }
    }
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
      >
        {/* Drag & Drop Visual Dropzone Overlay */}
        {isDragging && (
          <div className="ask-mitra-drop-overlay">
            <CameraIcon size={36} />
            <span>
              {i18n.language === 'hi'
                ? 'एआई विश्लेषण के लिए छवि यहाँ छोड़ें'
                : 'Drop image here for AI Clinical Vision Analysis'}
            </span>
          </div>
        )}

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
                  ? 'रोग व त्वचा लक्षण, पर्चा व लैब रिपोर्ट विश्लेषण व सुरक्षा मार्गदर्शन'
                  : 'Symptom & disease analysis, prescriptions, lab reports & safety'}
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
                  ? 'त्वचा पर दाने, घाव, सूजन, दवाओं, लैब रिपोर्ट या भोजन की फोटो अपलोड करें और तुरंत क्लिनिकल सलाह पाएं।'
                  : 'Upload or snap a photo of any skin rash, physical symptom, medicine strip, lab report, or meal for instant AI clinical reasoning.'}
              </p>

              {/* Visual Prompt Suggestions */}
              <div className="ask-mitra-suggestions">
                {attachedImage ? (
                  // Suggestions when an image is attached
                  (i18n.language === 'hi' ? [
                    'यह दाने या त्वचा की क्या समस्या हो सकती है?',
                    'क्या यह त्वचा की समस्या गंभीर है? खतरे के लक्षण क्या हैं?',
                    'इस दवा के पत्ते की जांच करें',
                    'इस लैब रिपोर्ट की व्याख्या करें'
                  ] : [
                    'What is this rash or skin condition?',
                    'Is this skin condition serious? What are the red flags?',
                    'Analyze this medicine packaging',
                    'Explain this lab test report'
                  ]).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAsk(suggestion)}
                      className="ask-mitra-suggestion-pill chip-mint"
                    >
                      "{suggestion}"
                    </button>
                  ))
                ) : (
                  // Standard suggestions when no image is attached
                  <>
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

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="ask-mitra-suggestion-pill ask-mitra-attach-suggestion"
                    >
                      <CameraIcon size={14} />
                      <span>
                        {i18n.language === 'hi'
                          ? 'दाने, दवा का पत्ता या रिपोर्ट स्कैन करें'
                          : 'Scan rash, medicine packaging, or lab report'}
                      </span>
                    </button>
                  </>
                )}
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
                {/* Attached Image Thumbnail in User Bubble */}
                {msg.image && (
                  <div
                    className="ask-msg-image-wrap"
                    onClick={() => setEnlargedImage(msg.image)}
                    title={i18n.language === 'hi' ? 'बड़ा देखने के लिए क्लिक करें' : 'Click to enlarge image'}
                  >
                    <img src={msg.image} alt="Uploaded medical document or medicine" className="ask-msg-image" />
                    <span className="ask-msg-image-hint">
                      <CameraIcon size={12} />
                      <span>{i18n.language === 'hi' ? 'बड़ा देखें' : 'View Full Image'}</span>
                    </span>
                  </div>
                )}

                {msg.role === 'mitra' && (
                  <div className="ask-msg-mitra-top">
                    <span className={`chip-telemetry ${msg.isVision ? 'chip-amber' : 'chip-mint'}`}>
                      {msg.isVision ? <CameraIcon size={12} /> : <SparklesIcon size={12} />}
                      <span>{msg.source || 'Mitra AI'}</span>
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
                <span>
                  {attachedImage || conversation[conversation.length - 1]?.image
                    ? (i18n.language === 'hi' ? 'छवि का क्लिनिकल विज़न विश्लेषण किया जा रहा है…' : 'Analyzing medical image with clinical vision…')
                    : (i18n.language === 'hi' ? 'क्लिनिकल डेटाबेस से परामर्श लिया जा रहा है…' : 'Consulting clinical knowledge base…')}
                </span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Image Attachment Preview Bar */}
        {imagePreview && (
          <>
            <div className="ask-mitra-preview-bar">
            <div
              className="ask-mitra-preview-thumb-wrap"
              onClick={() => setEnlargedImage(imagePreview)}
              title={i18n.language === 'hi' ? 'बड़ा देखें' : 'Click to preview'}
            >
              <img src={imagePreview} alt="Attached preview" className="ask-mitra-preview-thumb" />
            </div>
            <div className="ask-mitra-preview-meta">
              <span className="ask-mitra-preview-name">{attachedImage?.name || 'Attached Image'}</span>
              <span className="ask-mitra-preview-size font-mono">{attachedImage?.size}</span>
            </div>
            <div className="ask-mitra-preview-actions">
              <span className="chip-telemetry chip-mint">
                <CameraIcon size={11} />
                <span>Vision Ready</span>
              </span>
              <button
                type="button"
                className="ask-mitra-preview-clear-btn"
                onClick={handleClearImage}
                title="Remove attachment"
                aria-label="Remove attachment"
              >
                ×
              </button>
            </div>
          </div>

          {/* Quick Symptom Description Chips */}
          <div className="ask-mitra-symptom-chips-bar">
            <span className="ask-mitra-symptom-label font-mono">
              {i18n.language === 'hi' ? 'लक्षण जोड़ें:' : 'Add Symptoms:'}
            </span>
            <div className="ask-mitra-symptom-chips">
              {(i18n.language === 'hi' ? [
                'खुजली है',
                'हल्का दर्द',
                'जलन का अहसास',
                '1-2 दिन पहले शुरू हुआ',
                'फैल रहा है',
                'हल्का बुखार है'
              ] : [
                'Itching',
                'Mild pain',
                'Burning sensation',
                'Started 1-2 days ago',
                'Spreading',
                'Fever / Chills'
              ]).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleAddSymptomChip(chip)}
                  className={`ask-mitra-symptom-chip ${question.includes(chip) ? 'is-active' : ''}`}
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        </>
        )}

        {/* Input Bar */}
        <div className="ask-mitra-input-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={i18n.language === 'hi' ? 'छवि या पर्चा जोड़ें' : 'Attach medicine strip, lab report, or rash photo'}
            className={`ask-mitra-attach-btn ${attachedImage ? 'is-attached' : ''}`}
          >
            <CameraIcon size={18} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
            placeholder={
              attachedImage
                ? (i18n.language === 'hi' ? 'लक्षण बताएं (जैसे: खुजली, दर्द, जलन, कब शुरू हुआ) या सीधे भेजें…' : 'Describe symptoms (e.g., itchy, painful, when it started) or press Ask…')
                : (i18n.language === 'hi' ? 'अपनी समस्या, दवा या रिपोर्ट के बारे में पूछें…' : 'Ask about your medicines, timings, or diet…')
            }
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
            disabled={loading || (!question.trim() && !attachedImage)}
            onClick={() => handleAsk()}
          >
            {loading ? '…' : (i18n.language === 'hi' ? 'भेजें' : 'Ask')}
          </button>
        </div>

        {/* Enlarged Image Lightbox Overlay */}
        {enlargedImage && (
          <div
            className="ask-mitra-lightbox-overlay"
            onClick={() => setEnlargedImage(null)}
          >
            <div
              className="ask-mitra-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="ask-mitra-lightbox-close"
                onClick={() => setEnlargedImage(null)}
                aria-label="Close"
              >
                ×
              </button>
              <img
                src={enlargedImage}
                alt="Enlarged medical document preview"
                className="ask-mitra-lightbox-img"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
