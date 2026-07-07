import { useCallback, useEffect, useState } from 'react';
import {
  isTextToSpeechSupported,
  speakText,
  SpeechLanguage,
  stopSpeaking,
  warmUpTextToSpeech,
} from '@/lib/textToSpeech';

export function useTextToSpeech() {
  const [speakingLang, setSpeakingLang] = useState<SpeechLanguage | null>(null);
  const supported = isTextToSpeechSupported();

  useEffect(() => {
    warmUpTextToSpeech();
    return () => stopSpeaking();
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeakingLang(null);
  }, []);

  const speak = useCallback(
    async (text: string, lang: SpeechLanguage) => {
      if (!text.trim()) return;

      if (speakingLang === lang) {
        stop();
        return;
      }

      const started = speakText(text, lang, () => setSpeakingLang(null));
      if (started) {
        setSpeakingLang(lang);
      }
    },
    [speakingLang, stop]
  );

  return { speak, stop, speakingLang, supported };
}
