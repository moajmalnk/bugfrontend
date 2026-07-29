/**
 * Prefetch the FixBug route chunk so clicking Fix feels instant.
 * Keep this in a tiny module so callers don't import the FixBug page itself.
 */
let prefetchPromise: Promise<unknown> | null = null;

export function prefetchFixBugPage(): void {
  if (prefetchPromise) return;
  prefetchPromise = import("@/pages/FixBug").catch(() => {
    prefetchPromise = null;
  });
}
