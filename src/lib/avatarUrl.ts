import { ENV } from "@/lib/env";

/** Why: When a user has no uploaded photo, show the BugRicer brand mark — not initials. */
export const DEFAULT_AVATAR_LOGO = "/logo.png";

/**
 * Why: Onboarding / messaging used to persist XAMPP-absolute paths
 * (`/BugRicer/backend/uploads/...`) which 404 on the Hostinger backend and
 * on the Vite frontend origin. Resolve every stored shape to a loadable URL.
 */
export function getBackendOrigin(): string {
  const api = ENV.API_URL.replace(/\/$/, "");
  if (/^https?:\/\//i.test(api)) {
    return api.replace(/\/api$/i, "");
  }
  const proxyTarget = (
    import.meta.env.VITE_API_PROXY_TARGET as string | undefined
  )?.replace(/\/$/, "");
  if (proxyTarget) return proxyTarget;
  return "https://bugbackend.bugricer.com";
}

/**
 * True when avatar is a real upload (not empty, not the brand logo, not ui-avatars).
 */
export function hasUploadedAvatar(avatar: string | null | undefined): boolean {
  const raw = (avatar || "").trim();
  if (!raw) return false;
  if (raw === DEFAULT_AVATAR_LOGO || raw.endsWith("/logo.png")) return false;
  if (/^https?:\/\/ui-avatars\.com\//i.test(raw)) return false;
  return true;
}

/**
 * Normalize users.avatar (or legacy profile picture paths) for <img src>.
 * Empty / missing photos resolve to the BugRicer logo.
 */
export function resolveAvatarUrl(
  avatar: string | null | undefined,
  _displayName = "User"
): string {
  const fallback = DEFAULT_AVATAR_LOGO;
  const raw = (avatar || "").trim();
  if (!raw) return fallback;
  if (/^https?:\/\/ui-avatars\.com\//i.test(raw)) return fallback;

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    // Legacy localhost uploads saved as absolute URLs
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(raw)) {
      const uploads = raw.match(/uploads\/[^?#]+/i)?.[0];
      if (uploads) return `${getBackendOrigin()}/${uploads}`;
    }
    return raw;
  }

  const uploadsMatch = raw.match(/uploads\/[^?#]+/i);
  if (uploadsMatch?.[0]) {
    return `${getBackendOrigin()}/${uploadsMatch[0].replace(/^\/+/, "")}`;
  }

  if (raw.startsWith("/")) {
    return `${getBackendOrigin()}${raw}`;
  }

  return `${getBackendOrigin()}/${raw.replace(/^\.\//, "")}`;
}
