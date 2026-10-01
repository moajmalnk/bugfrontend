const ADMIN_NAV_COUNTS_EVENT = 'bugricer:admin-nav-counts';

/**
 * Why: Pages and services mutate data behind sidebar badges; the sidebar listens
 * for this event instead of each caller importing QueryClient. Kept dependency-free
 * so data services can import it without circular imports.
 */
export function notifyAdminNavCountsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ADMIN_NAV_COUNTS_EVENT));
}

export function subscribeAdminNavCountsChanged(onChange: () => void): () => void {
  window.addEventListener(ADMIN_NAV_COUNTS_EVENT, onChange);
  return () => window.removeEventListener(ADMIN_NAV_COUNTS_EVENT, onChange);
}
