/**
 * BugRicer in-app notification chime (`/bug-tune.mp3`).
 * Singleton + gesture unlock + cooldown so browsers allow playback and bursts stay polite.
 */

export const NOTIFICATION_SOUND_URL = '/bug-tune.mp3';

const DEFAULT_VOLUME = 0.7;
const COOLDOWN_MS = 1600;

let audioEl: HTMLAudioElement | null = null;
let unlocked = false;
let unlockListenersBound = false;
let lastPlayedAt = 0;
let playInFlight: Promise<void> | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio(NOTIFICATION_SOUND_URL);
    audioEl.preload = 'auto';
    audioEl.volume = DEFAULT_VOLUME;
  }
  return audioEl;
}

/** Soft-unlock after a user gesture so later autoplay is allowed. */
export function unlockNotificationSound(): void {
  if (typeof window === 'undefined' || unlocked) return;
  try {
    const audio = getAudio();
    const wasMuted = audio.muted;
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = wasMuted;
        unlocked = true;
      })
      .catch(() => {
        audio.muted = wasMuted;
      });
  } catch {
    // Ignore unlock failures — play will retry on next gesture.
  }
}

/** Bind once-per-session unlock on first pointer/key interaction. */
export function bindNotificationSoundUnlock(): void {
  if (typeof window === 'undefined' || unlockListenersBound) return;
  unlockListenersBound = true;

  const unlock = () => {
    unlockNotificationSound();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
}

export type PlayNotificationSoundOptions = {
  /** Skip cooldown (settings “Preview”). */
  force?: boolean;
  /** 0–1; defaults to a comfortable level. */
  volume?: number;
};

/**
 * Play the BugRicer notification tune.
 * Returns false if blocked by cooldown or autoplay policy.
 */
export async function playBugTune(
  options: PlayNotificationSoundOptions = {}
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  if (!options.force && now - lastPlayedAt < COOLDOWN_MS) {
    return false;
  }

  if (playInFlight) {
    return playInFlight.then(() => true).catch(() => false);
  }

  playInFlight = (async () => {
    const audio = getAudio();
    if (typeof options.volume === 'number') {
      audio.volume = Math.min(1, Math.max(0, options.volume));
    } else {
      audio.volume = DEFAULT_VOLUME;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
      await audio.play();
      lastPlayedAt = Date.now();
      unlocked = true;
    } catch {
      // Autoplay blocked — unlock on next gesture, then caller can retry.
      bindNotificationSoundUnlock();
      throw new Error('notification-sound-blocked');
    } finally {
      playInFlight = null;
    }
  })();

  try {
    await playInFlight;
    return true;
  } catch {
    return false;
  }
}
