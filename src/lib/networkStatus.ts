/**
 * Shared online / tab-visibility helpers for background work.
 * Prefer a single subtle offline banner over toast spam (Google/Microsoft style).
 *
 * Why: Page open often races Wi-Fi/DNS flaps (ERR_NETWORK_CHANGED, brief
 * ERR_NAME_NOT_RESOLVED). Those must not flash Connection Issue UI.
 */

type NetworkListener = (online: boolean) => void;

const listeners = new Set<NetworkListener>();
let initialized = false;

/** First paint / session start — suppress connection alerts during boot flaps */
const APP_BOOT_AT = typeof performance !== 'undefined' ? performance.now() : Date.now();
const BOOT_GRACE_MS = 12_000;

/** After online/offline events, browser DNS/routes are still settling */
const SETTLE_MS = 4_000;
let lastNetworkTransitionAt = 0;

/** Require sustained failures before surfacing Connection Issue */
const FAILURE_WINDOW_MS = 25_000;
const FAILURES_BEFORE_ALERT = 3;
let consecutiveNetworkFailures = 0;
let firstFailureInWindowAt = 0;
let lastNetworkAlertAt = 0;
const ALERT_COOLDOWN_MS = 120_000;

/** Optional endpoints that must never open Connection Issue UI */
const SILENT_URL_PATTERNS = [
  /\/shorts\//i,
  /\/permissions\//i,
  /\/user\/heartbeat/i,
  /\/notifications\//i,
  /\/announcements\/get_latest/i,
  /\/broadcast/i,
  /health\.php/i,
];

function notify(online: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(online);
    } catch {
      /* ignore */
    }
  });
}

function markNetworkTransition() {
  lastNetworkTransitionAt = Date.now();
}

function ensureNetworkListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('online', () => {
    markNetworkTransition();
    consecutiveNetworkFailures = 0;
    firstFailureInWindowAt = 0;
    notify(true);
  });
  window.addEventListener('offline', () => {
    markNetworkTransition();
    notify(false);
  });
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

/** True when background polls / heartbeats should run. */
export function shouldRunBackgroundNetworkWork(): boolean {
  return isBrowserOnline() && isDocumentVisible();
}

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  ensureNetworkListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function bootElapsedMs(): number {
  if (typeof performance !== 'undefined') {
    return performance.now() - APP_BOOT_AT;
  }
  return Date.now() - (APP_BOOT_AT as number);
}

/** True while Wi-Fi/DNS is still settling after boot or online/offline flaps. */
export function isNetworkSettling(): boolean {
  ensureNetworkListeners();
  if (bootElapsedMs() < BOOT_GRACE_MS) return true;
  if (!isBrowserOnline()) return false;
  return Date.now() - lastNetworkTransitionAt < SETTLE_MS;
}

export function isSilentNetworkUrl(url: string | undefined): boolean {
  if (!url) return false;
  return SILENT_URL_PATTERNS.some((re) => re.test(url));
}

export function noteNetworkSuccess(): void {
  consecutiveNetworkFailures = 0;
  firstFailureInWindowAt = 0;
}

/**
 * Record a transport-level failure. Returns true only when the UI should
 * show a Connection Issue (sustained outage while the browser reports online).
 */
export function noteNetworkFailureAndShouldAlert(url?: string): boolean {
  ensureNetworkListeners();

  if (!isBrowserOnline()) return false;
  if (isSilentNetworkUrl(url)) return false;
  if (isNetworkSettling()) return false;

  const now = Date.now();

  if (!firstFailureInWindowAt || now - firstFailureInWindowAt > FAILURE_WINDOW_MS) {
    firstFailureInWindowAt = now;
    consecutiveNetworkFailures = 1;
    return false;
  }

  consecutiveNetworkFailures += 1;

  if (consecutiveNetworkFailures < FAILURES_BEFORE_ALERT) {
    return false;
  }

  if (now - lastNetworkAlertAt < ALERT_COOLDOWN_MS) {
    return false;
  }

  lastNetworkAlertAt = now;
  // Reset so the next sustained outage needs another streak
  consecutiveNetworkFailures = 0;
  firstFailureInWindowAt = 0;
  return true;
}
