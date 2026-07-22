import { ENV } from "@/lib/env";

/** Stream uploaded audio through the API with correct headers (CORS + MIME). */
export function buildAudioUrl(
  filePath?: string | null,
  fullUrl?: string | null
): string {
  const apiBase = ENV.API_URL.replace(/\/$/, "");
  const path = filePath?.trim();

  if (path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${apiBase}/audio.php?path=${encodeURIComponent(path)}`;
  }

  const url = fullUrl?.trim();
  if (!url) {
    return "";
  }

  if (url.includes("audio.php")) {
    try {
      const parsed = new URL(url, window.location.origin);
      const audioPath = parsed.searchParams.get("path");
      if (audioPath) {
        return `${apiBase}/audio.php?path=${encodeURIComponent(audioPath)}`;
      }
    } catch {
      /* fall through */
    }
  }

  const uploadsMatch = url.match(/uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return `${apiBase}/audio.php?path=${encodeURIComponent(`uploads/${uploadsMatch[1]}`)}`;
  }

  return url;
}
