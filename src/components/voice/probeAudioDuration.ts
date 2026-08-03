/**
 * Why: MediaRecorder WebM often reports Infinity until seeked to the end.
 * Returns seconds, or null if duration cannot be discovered.
 */
export function probeAudioDuration(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), 8000);

    const accept = (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds <= 0) return false;
      window.clearTimeout(timer);
      finish(seconds);
      return true;
    };

    const trySeekProbe = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        accept(audio.duration);
        return;
      }
      // Classic WebM Infinity duration trick
      const onSeeked = () => {
        audio.removeEventListener("seeked", onSeeked);
        if (accept(audio.currentTime)) return;
        finish(null);
      };
      audio.addEventListener("seeked", onSeeked);
      try {
        audio.currentTime = 1e101;
      } catch {
        audio.removeEventListener("seeked", onSeeked);
        finish(null);
      }
    };

    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        accept(audio.duration);
      } else {
        trySeekProbe();
      }
    });
    audio.addEventListener("durationchange", () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        accept(audio.duration);
      }
    });
    audio.addEventListener("error", () => {
      window.clearTimeout(timer);
      finish(null);
    });

    audio.preload = "metadata";
    audio.src = src;
  });
}
