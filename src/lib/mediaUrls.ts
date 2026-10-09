import { ENV } from "@/lib/env";
import { getBackendOrigin } from "@/lib/avatarUrl";

function apiBaseUrl(): string {
  return ENV.API_URL.replace(/\/$/, "");
}

/**
 * Why: Static /uploads responses omit CORS headers (Cloudflare may cache that
 * way), so canvas / html-to-image / fetch(blob) fail from localhost and other
 * app origins. image.php streams the file with Access-Control-Allow-Origin.
 */
export function buildCorsImageUrl(urlOrPath: string): string {
  const raw = urlOrPath.trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return raw;
  if (/\/image\.php\?/i.test(raw)) return raw;

  let uploadsPath: string | null = null;
  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://bugs.bugricer.com";
    const parsed = new URL(raw, base);
    const match = parsed.pathname.match(/\/?(uploads\/[^?#]+)/i);
    if (match) {
      const backendHost = new URL(
        getBackendOrigin().includes("://")
          ? getBackendOrigin()
          : `https://${getBackendOrigin()}`
      ).hostname.toLowerCase();
      const host = parsed.hostname.toLowerCase();
      const relative = !raw.includes("://") && !raw.startsWith("//");
      const ours =
        relative ||
        host === "" ||
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === backendHost ||
        host.endsWith("bugricer.com") ||
        host.endsWith("moajmalnk.in");
      if (ours) uploadsPath = match[1].replace(/^\/+/, "");
    }
  } catch {
    const match = raw.match(/uploads\/[^?#]+/i);
    if (match) uploadsPath = match[0].replace(/^\/+/, "");
  }

  if (!uploadsPath) return raw;
  return `${apiBaseUrl()}/image.php?path=${encodeURIComponent(uploadsPath)}`;
}

/** Stream uploaded audio through the API with correct headers (CORS + MIME). */
export function buildAudioUrl(
  filePath?: string | null,
  fullUrl?: string | null
): string {
  const apiBase = apiBaseUrl();
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
