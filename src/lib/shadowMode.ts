import { ENV } from '@/lib/env';

export interface ShadowModeOptions {
  enabled: boolean;
  /** POST target; default BugRicer shadow-ingest */
  endpoint?: string;
  debounceMs?: number;
  maxBatch?: number;
}

/**
 * Optional client hook for future automatic error capture (2030 / Shadow Mode).
 * Default off. When enabled, batches window errors and POSTs them authenticated.
 */
export function initShadowMode(options: ShadowModeOptions): () => void {
  if (!options.enabled || typeof window === 'undefined') {
    return () => {};
  }

  const endpoint =
    options.endpoint ?? `${ENV.API_URL.replace(/\/$/, '')}/bugbot/shadow-ingest.php`;
  const debounceMs = options.debounceMs ?? 4000;
  const maxBatch = options.maxBatch ?? 20;

  const queue: Array<Record<string, unknown>> = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;
    const batch = queue.splice(0, maxBatch);
    const token =
      sessionStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token');
    if (!token) return;

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: batch }),
    }).catch(() => {});
  };

  const schedule = () => {
    if (timer) return;
    timer = setTimeout(flush, debounceMs);
  };

  const onError = (msg: string, source?: string, lineno?: number, colno?: number, err?: Error) => {
    queue.push({
      type: 'error',
      message: msg,
      source: source ?? null,
      lineno: lineno ?? null,
      colno: colno ?? null,
      stack: err?.stack ?? null,
      t: new Date().toISOString(),
      href: window.location.href,
    });
    if (queue.length >= maxBatch) flush();
    else schedule();
  };

  const onRejection = (ev: PromiseRejectionEvent) => {
    const reason = ev.reason;
    queue.push({
      type: 'unhandledrejection',
      message: typeof reason === 'string' ? reason : reason?.message ?? String(reason),
      stack: reason?.stack ?? null,
      t: new Date().toISOString(),
      href: window.location.href,
    });
    if (queue.length >= maxBatch) flush();
    else schedule();
  };

  const errHandler = (ev: ErrorEvent) => {
    onError(ev.message || 'Error', ev.filename, ev.lineno, ev.colno, ev.error);
  };

  window.addEventListener('error', errHandler);
  window.addEventListener('unhandledrejection', onRejection);

  return () => {
    window.removeEventListener('error', errHandler);
    window.removeEventListener('unhandledrejection', onRejection);
    if (timer) clearTimeout(timer);
    flush();
  };
}
