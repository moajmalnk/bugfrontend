import { useCallback, useEffect, useState } from 'react';
import {
  isSpeechActive,
  isSpeechPaused,
  isTextToSpeechSupported,
  pauseSpeaking,
  resumeSpeaking,
  speakText,
  SpeechLanguage,
  stopSpeaking,
  warmUpTextToSpeech,
} from '@/lib/textToSpeech';

export function useTextToSpeech() {
  const [speakingLang, setSpeakingLang] = useState<SpeechLanguage | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const supported = isTextToSpeechSupported();

  const syncPausedState = useCallback(() => {
    setIsPaused(isSpeechPaused());
  }, []);

  useEffect(() => {
    warmUpTextToSpeech();
    return () => stopSpeaking();
  }, []);

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeakingLang(null);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (pauseSpeaking()) {
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (resumeSpeaking()) {
      setIsPaused(false);
    }
  }, []);

  const togglePause = useCallback(() => {
    if (isSpeechPaused() || isPaused) {
      resume();
      return;
    }
    pause();
  }, [isPaused, pause, resume]);

  const speak = useCallback(
    async (text: string, lang: SpeechLanguage) => {
      if (!text.trim()) return;

      setSpeakingLang(lang);
      setIsPaused(false);

      try {
        await speakText(text, lang, () => {
          setSpeakingLang(null);
          setIsPaused(false);
        });
      } catch (error) {
        setSpeakingLang(null);
        setIsPaused(false);
        throw error;
      } finally {
        syncPausedState();
      }
    },
    [syncPausedState]
  );

  const restart = useCallback(
    async (text: string, lang: SpeechLanguage) => {
      if (!text.trim()) return;
      await speak(text, lang);
    },
    [speak]
  );

  return {
    speak,
    restart,
    stop,
    pause,
    resume,
    togglePause,
    speakingLang,
    isPaused,
    isActive: () => isSpeechActive(),
    supported,
  };
};
