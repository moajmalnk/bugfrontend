/** Same-origin path precached by the service worker (see public/service-worker.js). */
export const BRAND_STATUS_VIDEO_SRC = "/404.mp4";

/**
 * Why: Warm SW/HTTP cache after first paint so 404/offline screens never buffer.
 * Avoids `<link rel="preload">` on every route — that warned on login because React
 * replaces the boot shell before the preloaded fetch was consumed.
 */
export function warmBrandStatusVideo(): void {
  const run = async () => {
    if ("caches" in window) {
      const hit = await caches.match(BRAND_STATUS_VIDEO_SRC);
      if (hit) return;
    }
    try {
      await fetch(BRAND_STATUS_VIDEO_SRC, { cache: "force-cache" });
    } catch {
      /* offline — SW may still serve on next request */
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => void run(), { timeout: 8000 });
    return;
  }

  window.setTimeout(() => void run(), 1500);
}
