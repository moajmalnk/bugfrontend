import { containsMalayalamScript } from '@/lib/malayalamUtils';
import { ENV } from '@/lib/env';

export type SpeechLanguage = 'en' | 'ml';
export type SpeechPlaybackMode = 'idle' | 'synthesis' | 'audio';

const LANG_TAGS: Record<SpeechLanguage, string> = {
  en: 'en-IN',
  ml: 'ml-IN',
};

let voicesCache: SpeechSynthesisVoice[] | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let keepAliveTimer: number | null = null;
let playbackMode: SpeechPlaybackMode = 'idle';
let playbackAborted = false;
let isUserPaused = false;
let pauseWaiters: Array<() => void> = [];
let finishAudioPlayback: (() => void) | null = null;
let activeSessionId = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function notifyPauseWaiters(): void {
  const waiters = pauseWaiters;
  pauseWaiters = [];
  waiters.forEach((resolve) => resolve());
}

async function waitWhilePaused(sessionId: number): Promise<boolean> {
  while (isUserPaused && !playbackAborted && sessionId === activeSessionId) {
    await new Promise<void>((resolve) => pauseWaiters.push(resolve));
  }
  return sessionId === activeSessionId && !playbackAborted;
}

function setPlaybackMode(mode: SpeechPlaybackMode): void {
  playbackMode = mode;
}

export function getPlaybackMode(): SpeechPlaybackMode {
  return playbackMode;
}

export function isSpeechPaused(): boolean {
  return isUserPaused;
}

export function isSpeechActive(): boolean {
  if (isUserPaused) return true;
  if (playbackMode === 'audio' && activeAudio) {
    return !activeAudio.ended;
  }
  if (playbackMode === 'synthesis' && typeof window !== 'undefined' && window.speechSynthesis) {
    return window.speechSynthesis.speaking || window.speechSynthesis.pending;
  }
  return playbackMode !== 'idle';
}

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

export function loadVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  if (!isTextToSpeechSupported()) {
    return Promise.resolve([]);
  }

  const cached = getVoices();
  if (cached.length > 0) {
    return Promise.resolve(cached);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(getVoices());
    };

    const timer = window.setTimeout(finish, timeoutMs);

    const onVoicesChanged = () => {
      window.clearTimeout(timer);
      voicesCache = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      finish();
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    window.speechSynthesis.getVoices();
  });
}

function pickVoice(lang: SpeechLanguage): SpeechSynthesisVoice | undefined {
  const voices = getVoices();

  if (lang === 'ml') {
    const malayalamVoices = voices.filter(
      (voice) =>
        voice.lang.toLowerCase().startsWith('ml') ||
        voice.name.toLowerCase().includes('malayalam')
    );

    return (
      malayalamVoices.find(
        (voice) => voice.lang.toLowerCase() === 'ml-in' && voice.localService
      ) ||
      malayalamVoices.find((voice) => voice.lang.toLowerCase() === 'ml-in') ||
      malayalamVoices.find((voice) => voice.localService) ||
      malayalamVoices[0]
    );
  }

  const englishVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith('en')
  );

  return (
    englishVoices.find(
      (voice) => voice.lang.toLowerCase() === 'en-in' && voice.localService
    ) ||
    englishVoices.find((voice) => voice.lang.toLowerCase() === 'en-in') ||
    englishVoices.find((voice) => voice.lang.toLowerCase() === 'en-gb') ||
    englishVoices.find((voice) => voice.localService) ||
    englishVoices[0]
  );
}

function splitForSpeech(text: string, maxLen = 280): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return [normalized];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLen) {
    let splitAt = remaining.lastIndexOf('. ', maxLen);
    if (splitAt < maxLen * 0.35) {
      splitAt = remaining.lastIndexOf(' ', maxLen);
    }
    if (splitAt < maxLen * 0.2) {
      splitAt = maxLen;
    }

    const piece = remaining.slice(0, splitAt).trim();
    if (piece) chunks.push(piece);
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function startSpeechKeepAlive(): void {
  stopSpeechKeepAlive();
  keepAliveTimer = window.setInterval(() => {
    if (
      !isUserPaused &&
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    ) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 8000);
}

function stopSpeechKeepAlive(): void {
  if (keepAliveTimer !== null) {
    window.clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function revokeActiveObjectUrl(): void {
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
}

function completeAudioPlayback(): void {
  if (finishAudioPlayback) {
    const done = finishAudioPlayback;
    finishAudioPlayback = null;
    done();
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token')
  );
}

function playAudioUrl(url: string, sessionId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sessionId !== activeSessionId || playbackAborted) {
      resolve();
      return;
    }

    const audio = new Audio(url);
    activeAudio = audio;
    setPlaybackMode('audio');

    const finish = () => {
      if (finishAudioPlayback === finishPlayback) {
        finishAudioPlayback = null;
      }
      if (activeAudio === audio) {
        activeAudio = null;
      }
      resolve();
    };

    const finishPlayback = finish;
    finishAudioPlayback = finishPlayback;

    audio.onended = finish;
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      if (finishAudioPlayback === finishPlayback) finishAudioPlayback = null;
      reject(new Error('audio_playback_failed'));
    };

    void audio.play().catch((error) => {
      if (activeAudio === audio) activeAudio = null;
      if (finishAudioPlayback === finishPlayback) finishAudioPlayback = null;
      reject(error);
    });
  });
}

async function fetchTtsAudio(text: string, lang: 'ml' | 'en'): Promise<Blob> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('tts_unauthorized');
  }

  const baseUrl = ENV.API_URL.replace(/\/$/, '');
  const url = `${baseUrl}/tts/speak.php?lang=${lang}&text=${encodeURIComponent(text)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('tts_fetch_failed');
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    throw new Error('tts_fetch_failed');
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('tts_fetch_failed');
  }

  return blob;
}

async function playAudioBlob(blob: Blob, sessionId: number): Promise<void> {
  revokeActiveObjectUrl();
  const objectUrl = URL.createObjectURL(blob);
  activeObjectUrl = objectUrl;

  try {
    if (!(await waitWhilePaused(sessionId))) return;
    await playAudioUrl(objectUrl, sessionId);
  } finally {
    if (activeObjectUrl === objectUrl) {
      revokeActiveObjectUrl();
    }
  }
}

async function speakAudioFallback(
  text: string,
  lang: 'en' | 'ml',
  sessionId: number
): Promise<void> {
  const parts = splitForSpeech(text, 180);
  for (const part of parts) {
    if (sessionId !== activeSessionId || playbackAborted) return;
    if (!(await waitWhilePaused(sessionId))) return;

    const blob = await fetchTtsAudio(part, lang);
    if (sessionId !== activeSessionId || playbackAborted) return;

    await playAudioBlob(blob, sessionId);
    await delay(120);
  }
}

async function speakWithSynthesis(
  text: string,
  lang: SpeechLanguage,
  voice: SpeechSynthesisVoice | undefined,
  sessionId: number
): Promise<void> {
  const chunks = splitForSpeech(text);
  setPlaybackMode('synthesis');
  startSpeechKeepAlive();

  try {
    for (const chunk of chunks) {
      if (sessionId !== activeSessionId || playbackAborted) return;
      if (!(await waitWhilePaused(sessionId))) return;

      await new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        if (voice) utterance.voice = voice;
        utterance.lang = LANG_TAGS[lang];
        utterance.rate = lang === 'ml' ? 0.88 : 0.92;
        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
          if (playbackAborted || sessionId !== activeSessionId) {
            resolve();
            return;
          }
          reject(event.error || new Error('speech_synthesis_failed'));
        };
        window.speechSynthesis.speak(utterance);
      });

      if (!(await waitWhilePaused(sessionId))) return;
      await delay(80);
    }
  } finally {
    stopSpeechKeepAlive();
  }
}

export function isTextToSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function pauseSpeaking(): boolean {
  if (!isSpeechActive() || isUserPaused) return false;

  isUserPaused = true;

  if (playbackMode === 'audio' && activeAudio && !activeAudio.paused) {
    activeAudio.pause();
  }

  if (playbackMode === 'synthesis' && window.speechSynthesis?.speaking) {
    window.speechSynthesis.pause();
  }

  return true;
}

export function resumeSpeaking(): boolean {
  if (!isUserPaused) return false;

  isUserPaused = false;
  notifyPauseWaiters();

  if (playbackMode === 'audio' && activeAudio) {
    void activeAudio.play().catch(() => {
      /* ignore – user can stop and replay */
    });
  } else if (playbackMode === 'synthesis' && window.speechSynthesis?.paused) {
    window.speechSynthesis.resume();
  }

  return true;
}

export function stopSpeaking(): void {
  playbackAborted = true;
  isUserPaused = false;
  notifyPauseWaiters();
  stopSpeechKeepAlive();

  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  completeAudioPlayback();
  revokeActiveObjectUrl();

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  setPlaybackMode('idle');
  activeSessionId += 1;
}

export async function speakText(
  text: string,
  lang: SpeechLanguage,
  onEnd?: () => void
): Promise<void> {
  const trimmed = text?.trim();
  if (!trimmed) {
    throw new Error('empty_text');
  }
  if (!isTextToSpeechSupported()) {
    throw new Error('unsupported');
  }

  stopSpeaking();
  const sessionId = activeSessionId;
  playbackAborted = false;
  isUserPaused = false;

  const endSession = () => {
    if (sessionId !== activeSessionId) return;
    setPlaybackMode('idle');
    playbackAborted = false;
    isUserPaused = false;
    onEnd?.();
  };

  const runAudioFallback = async () => {
    if (sessionId !== activeSessionId || playbackAborted) return;
    await speakAudioFallback(trimmed, lang === 'ml' ? 'ml' : 'en', sessionId);
  };

  try {
    await loadVoices();
    await delay(200);

    if (sessionId !== activeSessionId || playbackAborted) return;

    if (lang === 'ml' && !containsMalayalamScript(trimmed)) {
      throw new Error('not_malayalam');
    }

    const voice = pickVoice(lang);
    let spoke = false;

    if (voice || lang === 'en') {
      try {
        await speakWithSynthesis(trimmed, lang, voice, sessionId);
        spoke = true;
      } catch {
        spoke = false;
      }
    }

    if (!spoke) {
      await runAudioFallback();
    }

    if (sessionId === activeSessionId && !playbackAborted) {
      endSession();
    }
  } catch (error) {
    if (
      sessionId === activeSessionId &&
      lang === 'en' &&
      !(error instanceof Error && error.message === 'not_malayalam')
    ) {
      try {
        await runAudioFallback();
        if (sessionId === activeSessionId && !playbackAborted) {
          endSession();
          return;
        }
      } catch {
        /* fall through */
      }
    }

    if (sessionId === activeSessionId) {
      setPlaybackMode('idle');
      playbackAborted = false;
      isUserPaused = false;
      onEnd?.();
    }
    throw error;
  }
}

export function warmUpTextToSpeech(): void {
  if (!isTextToSpeechSupported()) return;
  void loadVoices();
}
