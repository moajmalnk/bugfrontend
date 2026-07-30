/**
 * Shared online / tab-visibility helpers for background work.
 * Prefer a single subtle offline banner over toast spam (Google/Microsoft style).
 */

type NetworkListener = (online: boolean) => void;

const listeners = new Set<NetworkListener>();
let initialized = false;

function notify(online: boolean) {
  listeners.forEach((listener) => {
    try {
      listener(online);
    } catch {
      /* ignore */
    }
  });
}

function ensureNetworkListeners() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  window.addEventListener('online', () => notify(true));
  window.addEventListener('offline', () => notify(false));
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
