import { ENV } from "@/lib/env";

/**
 * Why: `/logo.png` is dark ink on a black tile — invisible in Edit User / avatars.
 * Use the brand mark (black for light UI, white for dark UI).
 */
export const DEFAULT_AVATAR_LOGO = "/brand/bugricer-mark-black.png";
export const DEFAULT_AVATAR_LOGO_DARK = "/brand/bugricer-mark-white.png";

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

/** Local public brand assets — never rewrite these onto the API host. */
function isBrandAssetPath(raw: string): boolean {
  return (
    raw === DEFAULT_AVATAR_LOGO ||
    raw === DEFAULT_AVATAR_LOGO_DARK ||
    /\/brand\/bugricer-mark-/i.test(raw) ||
    /\/brand\/bugricer-wordmark-/i.test(raw) ||
    /\/logo\.png(?:$|\?)/i.test(raw)
  );
}

/**
 * True when avatar is a real upload (not empty, not the brand logo, not ui-avatars).
 */
export function hasUploadedAvatar(avatar: string | null | undefined): boolean {
  const raw = (avatar || "").trim();
  if (!raw) return false;
  if (isBrandAssetPath(raw)) return false;
  if (/^https?:\/\/ui-avatars\.com\//i.test(raw)) return false;
  return true;
}

/**
 * Normalize users.avatar (or legacy profile picture paths) for <img src>.
 * Empty / missing photos resolve to the BugRicer logo (light-mode mark path;
 * UI should prefer BrandAvatar so dark mode can swap to the white mark).
 */
export function resolveAvatarUrl(
  avatar: string | null | undefined,
  _displayName = "User"
): string {
  const fallback = DEFAULT_AVATAR_LOGO;
  const raw = (avatar || "").trim();
  if (!raw) return fallback;
  if (/^https?:\/\/ui-avatars\.com\//i.test(raw)) return fallback;

  // Keep Vite public brand files on the app origin.
  if (isBrandAssetPath(raw)) {
    if (/bugricer-mark-white/i.test(raw)) return DEFAULT_AVATAR_LOGO_DARK;
    if (/bugricer-mark-black/i.test(raw) || /\/logo\.png/i.test(raw)) {
      return DEFAULT_AVATAR_LOGO;
    }
    const brandPath = raw.match(/\/brand\/[^?#]+/i)?.[0];
    return brandPath || raw.replace(/^https?:\/\/[^/]+/i, "") || fallback;
  }

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
    // Public app assets stay on the frontend origin; only API uploads go to backend.
    if (raw.startsWith("/brand/") || raw === "/logo.png") return raw;
    return `${getBackendOrigin()}${raw}`;
  }

  return `${getBackendOrigin()}/${raw.replace(/^\.\//, "")}`;
}
