import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isToday } from '../utils/format.js';

const speechLocale = (language) => (language === 'hi' ? 'hi-IN' : 'en-IN');

// Wraps the browser Web Speech APIs so features only deal with transcripts.
export function useSpeechInput(notify) {
  const { t, i18n } = useTranslation();
  return useCallback((onTranscript) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify(t('voiceUnsupported'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale(i18n.language);
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => onTranscript(event.results[0][0].transcript);
    recognition.onerror = () => notify(t('voiceTryAgain'));
    recognition.start();
    notify(t('listening'));
  }, [i18n.language, notify, t]);
}

export function useSpokenText(text, key) {
  const { i18n } = useTranslation();
  useEffect(() => {
    if (!window.speechSynthesis || !text) return undefined;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale(i18n.language);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [key, text, i18n.language]);
}

// ── Interactive Conversational Voice Companion ────────────────────────────────

export function useVoiceCompanion(dashboard, onConfirmDose, notify) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState('');
  const activeRef = useRef(false);
  const recognitionRef = useRef(null);

  const speakText = useCallback((text, onEnd) => {
    if (!window.speechSynthesis || !activeRef.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLocale(i18n.language);
    utterance.rate = 0.95; // Slightly calmer and clearer for seniors
    utterance.onstart = () => { setSpeaking(true); setListening(false); };
    utterance.onend = () => {
      setSpeaking(false);
      if (activeRef.current && onEnd) onEnd();
    };
    utterance.onerror = () => { setSpeaking(false); };
    window.speechSynthesis.speak(utterance);
  }, [i18n.language]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setSpeaking(false);
    setListening(false);
    setStatusText('');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
  }, []);

  const listenForReply = useCallback((onResult) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !activeRef.current) {
      notify(t('voiceUnsupported'));
      stop();
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = speechLocale(i18n.language);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => { setListening(true); };
      recognition.onresult = (event) => {
        setListening(false);
        const transcript = event.results[0][0].transcript.toLowerCase();
        onResult(transcript);
      };
      recognition.onerror = () => {
        setListening(false);
        if (activeRef.current) {
          const retryMsg = i18n.language === 'hi' ? 'माफ़ कीजिए, सुन नहीं पाया। कृपया दोबारा बोलें।' : 'Sorry, I did not catch that. Please say again.';
          speakText(retryMsg, () => listenForReply(onResult));
        }
      };
      recognition.start();
    } catch {
      stop();
    }
  }, [i18n.language, notify, speakText, stop, t]);

  const start = useCallback(() => {
    activeRef.current = true;
    setActive(true);

    const medMap = new Map((dashboard?.medications || []).map((m) => [m.id, m]));
    const pendingLogs = (dashboard?.logs || [])
      .filter((log) => isToday(log.scheduledTime) && log.status === 'pending')
      .map((log) => ({ log, medication: medMap.get(log.medicationId) }));

    if (pendingLogs.length === 0) {
      const msg = i18n.language === 'hi'
        ? 'नमस्ते! आज के लिए आपकी कोई दवा बाकी नहीं है। बहुत अच्छा!'
        : 'Hello! You have no pending medicines right now. Wonderful job!';
      setStatusText(msg);
      speakText(msg, () => setTimeout(stop, 2500));
      return;
    }

    let currentIndex = 0;

    const askNext = () => {
      if (!activeRef.current) return;
      if (currentIndex >= pendingLogs.length) {
        const doneMsg = i18n.language === 'hi'
          ? 'बहुत बढ़िया! आज की सभी दवाएँ पूरी हो चुकी हैं। अपना ध्यान रखें।'
          : 'Wonderful! All your pending medicines are confirmed. Take care!';
        setStatusText(doneMsg);
        speakText(doneMsg, () => setTimeout(stop, 3000));
        return;
      }

      const { log, medication } = pendingLogs[currentIndex];
      const medName = medication?.name || 'Medication';
      const dosage = medication?.dosage || '';
      const prompt = i18n.language === 'hi'
        ? `क्या आपने ${medName} ${dosage} ले ली? बोलें: हाँ ले ली, या छोड़ दी।`
        : `Did you take your ${medName} ${dosage}? Say yes, taken, or skip.`;

      setStatusText(prompt);
      speakText(prompt, () => {
        listenForReply(async (reply) => {
          if (!activeRef.current) return;
          const isAffirmative = /yes|taken|took|done|haan|ha|le li|ho gaya|kha li/i.test(reply);
          const isNegative = /no|skip|skipped|nahi|chhoda|chhod/i.test(reply);

          if (isAffirmative) {
            await onConfirmDose(log.id, 'taken', 'voice');
            const confirmMsg = i18n.language === 'hi' ? `${medName} दर्ज हो गई।` : `Marked ${medName} as taken.`;
            setStatusText(confirmMsg);
            currentIndex += 1;
            speakText(confirmMsg, askNext);
          } else if (isNegative) {
            await onConfirmDose(log.id, 'skipped', 'voice');
            const skipMsg = i18n.language === 'hi' ? `${medName} छोड़ दी गई दर्ज हुई।` : `Marked ${medName} as skipped.`;
            setStatusText(skipMsg);
            currentIndex += 1;
            speakText(skipMsg, askNext);
          } else {
            const unclearMsg = i18n.language === 'hi' ? 'कृपया हाँ या छोड़ दी बोलें।' : 'Please say yes, taken, or skip.';
            speakText(unclearMsg, () => askNext());
          }
        });
      });
    };

    askNext();
  }, [dashboard, i18n.language, onConfirmDose, speakText, listenForReply, stop]);

  return { active, speaking, listening, statusText, start, stop };
}
