export type SpeechLanguage = 'en' | 'ml';

const LANG_TAGS: Record<SpeechLanguage, string> = {
  en: 'en-IN',
  ml: 'ml-IN',
};

let voicesCache: SpeechSynthesisVoice[] | null = null;

function getVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    voicesCache = voices;
  }
  return voicesCache ?? voices;
}

function pickVoice(lang: SpeechLanguage): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  const prefix = lang === 'ml' ? 'ml' : 'en';
  return (
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => voice.lang.toLowerCase().includes(prefix))
  );
}

export function isTextToSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function speakText(
  text: string,
  lang: SpeechLanguage,
  onEnd?: () => void
): boolean {
  const trimmed = text?.trim();
  if (!trimmed || !isTextToSpeechSupported()) {
    return false;
  }

  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voice = pickVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = LANG_TAGS[lang];
  utterance.rate = 0.92;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
  return true;
}

export function warmUpTextToSpeech(): void {
  if (!isTextToSpeechSupported()) return;
  getVoices();
  if (voicesCache && voicesCache.length > 0) return;
  window.speechSynthesis.addEventListener(
    'voiceschanged',
    () => {
      voicesCache = window.speechSynthesis.getVoices();
    },
    { once: true }
  );
}
