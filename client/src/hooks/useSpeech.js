import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

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
