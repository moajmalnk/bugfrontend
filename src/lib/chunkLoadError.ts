/**
 * Why: Distinguish offline/transient dynamic-import failures from stale deploy chunks.
 * Offline navigation must not show "Force Refresh & Clear Cache".
 */

import { isBrowserOnline } from '@/lib/networkStatus';

export function isChunkLoadFailureMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('loading chunk') ||
    m.includes('chunkloaderror') ||
    m.includes('loading css chunk') ||
    m.includes('error loading dynamically imported module') ||
    (m.includes('expected a javascript module script') && m.includes('mime'))
  );
}

export function isOfflineOrDisconnectedMessage(message: string | undefined | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes('err_internet_disconnected') ||
    m.includes('err_network_changed') ||
    m.includes('err_name_not_resolved') ||
    m.includes('networkerror') ||
    m.includes('network error') ||
    m.includes('failed to fetch') ||
    m.includes('load failed')
  );
}

/** True when a route/page chunk failed because the device is offline (or just flapped). */
export function isOfflineChunkFailure(message?: string | null): boolean {
  if (!isBrowserOnline()) return true;
  if (isOfflineOrDisconnectedMessage(message) && isChunkLoadFailureMessage(message)) {
    return true;
  }
  return false;
}
