import { ENV } from './env';

/**
 * Why: the hosting account allows only ~20 simultaneous MySQL connections and every
 * PHP request holds one. A dashboard load (sidebar counts, notifications, heartbeat,
 * CODO, per-user work stats…) can fire 30+ requests at once, and the overflow fails
 * with "Database connection failed". Capping in-flight API calls per tab and retrying
 * the "server busy" responses keeps a normal page load from tripping that limit.
 */
const MAX_IN_FLIGHT = 6;
const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 4000;

let inFlight = 0;
const waiters: Array<() => void> = [];

export function acquireApiSlot(): Promise<void> {
  if (inFlight < MAX_IN_FLIGHT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

export function releaseApiSlot(): void {
  inFlight = Math.max(0, inFlight - 1);
  const next = waiters.shift();
  if (next) next();
}

/**
 * Why: both responses are emitted before any business logic runs (DB connect in the
 * API constructor), so retrying is safe even for POST — nothing was written.
 */
export function isServerBusyResponse(status: number, message: unknown): boolean {
  if (status === 503) return true;
  return (
    status === 500 &&
    typeof message === 'string' &&
    /database connection failed|server is busy/i.test(message)
  );
}

/** Exponential backoff with jitter, honouring Retry-After when the server sends one. */
export function retryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
  const base = Number.isFinite(retryAfterSec) && retryAfterSec > 0
    ? retryAfterSec * 1000
    : 400 * 2 ** attempt;
  return Math.min(base, MAX_RETRY_DELAY_MS) + Math.floor(Math.random() * 300);
}

export const API_MAX_RETRIES = MAX_RETRIES;

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isApiUrl(url: string): boolean {
  const base = ENV.API_URL.replace(/\/$/, '');
  return url.startsWith(base) || url.startsWith('https://bugbackend.bugricer.com/');
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

async function busyMessage(res: Response): Promise<string | undefined> {
  if (res.status !== 500) return undefined;
  try {
    const data = (await res.clone().json()) as { message?: unknown };
    return typeof data?.message === 'string' ? data.message : undefined;
  } catch {
    return undefined;
  }
}

let installed = false;

/**
 * Routes every `fetch` to the BugRicer API through the shared slot limiter and retries
 * transient "server busy" answers. Non-API URLs are untouched.
 */
export function installApiFetchGuard(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isApiUrl(requestUrl(input))) {
      return nativeFetch(input, init);
    }
    const method = requestMethod(input, init);
    const replayable = !(input instanceof Request) || method === 'GET' || method === 'HEAD';

    for (let attempt = 0; ; attempt += 1) {
      const attemptInput = input instanceof Request ? input.clone() : input;
      await acquireApiSlot();
      let res: Response;
      try {
        res = await nativeFetch(attemptInput, init);
      } catch (error) {
        releaseApiSlot();
        const canRetry =
          attempt < MAX_RETRIES &&
          (method === 'GET' || method === 'HEAD') &&
          !(error instanceof DOMException && error.name === 'AbortError');
        if (!canRetry) throw error;
        await sleep(retryDelayMs(attempt));
        continue;
      }
      releaseApiSlot();

      if (attempt < MAX_RETRIES && replayable && isServerBusyResponse(res.status, res.status === 503 ? '' : await busyMessage(res))) {
        await sleep(retryDelayMs(attempt, res.headers.get('Retry-After')));
        continue;
      }
      return res;
    }
  };
}
