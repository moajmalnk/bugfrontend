import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getNetworkErrorMessage } from '@/lib/apiError';
import { Check, CircleHelp, Loader2, LogOut, MinusCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

export type StandardsAckStatus = 'acknowledged' | 'doubt' | 'not_required';

export type StandardsGateItem = { id: number };

export type StandardsAcknowledgementGateProps<T extends StandardsGateItem> = {
  /** Gate only runs while true (role, mode = required, onboarding done). */
  enabled: boolean;
  /** localStorage key prefix that remembers "everything answered" per user. */
  storagePrefix: string;
  fetchPending: () => Promise<{ items: T[]; total: number }>;
  acknowledge: (id: number, status: StandardsAckStatus) => Promise<unknown>;
  eyebrow: string;
  title: string;
  intro: string;
  /** Singular noun shown in "Rule 3 of 10". */
  itemNoun: string;
  acknowledgeLabel: string;
  loadErrorTitle: string;
  renderBadge: (item: T) => ReactNode;
  renderItem: (item: T) => ReactNode;
  /** Reports whether nothing is pending, so gates can run one after another. */
  onSettledChange?: (cleared: boolean) => void;
};

const AUTO_RETRY_DELAYS_MS = [2000, 5000, 10000];

function readCleared(key: string): boolean {
  if (!key) return false;
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeCleared(key: string, cleared: boolean): void {
  if (!key) return;
  try {
    if (cleared) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // Storage unavailable (private mode) — gate simply re-checks every load.
  }
}

function describeLoadError(message: string, noun: string): string {
  if (/invalid or expired token|authentication required/i.test(message)) {
    return 'Your session has expired. Sign in again to continue.';
  }
  if (/database connection|server is busy|failed to fetch|network/i.test(message)) {
    return 'The server is busy right now. We retry automatically — this usually clears within a few seconds.';
  }
  return message || `We could not reach the server to check your pending ${noun}s.`;
}

/**
 * Why: a person an admin marked "Required" must answer every active item
 * (CODO rule or Cursor tip) before the dashboard is usable. One component
 * drives both gates so loading, retry, the session-expiry path and the
 * "already cleared" fast path behave identically.
 *
 * Once a user has answered everything, a transient server error must not
 * lock them out again: the cleared flag lets them work while we re-check
 * quietly, and new items still surface on the next successful check.
 */
export function StandardsAcknowledgementGate<T extends StandardsGateItem>({
  enabled,
  storagePrefix,
  fetchPending,
  acknowledge,
  eyebrow,
  title,
  intro,
  itemNoun,
  acknowledgeLabel,
  loadErrorTitle,
  renderBadge,
  renderItem,
  onSettledChange,
}: StandardsAcknowledgementGateProps<T>) {
  const { currentUser, logout, exitImpersonateMode } = useAuth();
  const { pathname } = useLocation();
  const impersonating = Boolean(
    currentUser?.admin_id && currentUser.admin_id !== currentUser.id
  );
  const userId = currentUser?.id ? String(currentUser.id) : '';
  const clearedKey = userId ? `${storagePrefix}:${userId}` : '';

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(() =>
    readCleared(clearedKey) ? 'ready' : 'loading'
  );
  const [items, setItems] = useState<T[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [saving, setSaving] = useState<StandardsAckStatus | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const savingRef = useRef(false);
  const skipPathRefresh = useRef(true);
  const autoRetryRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  savingRef.current = !!saving;

  const loadPending = useCallback(
    (background: boolean) => {
      if (!enabled || savingRef.current) return;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const quiet = background || readCleared(clearedKey);
      if (!quiet) setStatus('loading');
      const requestId = ++requestIdRef.current;
      fetchPending()
        .then((data) => {
          if (savingRef.current || requestId !== requestIdRef.current) return;
          autoRetryRef.current = 0;
          setItems(data.items);
          setSessionTotal((prev) => Math.max(prev, data.total, data.items.length));
          setErrorMessage('');
          setStatus('ready');
          writeCleared(clearedKey, data.items.length === 0);
        })
        .catch((error: unknown) => {
          if (quiet || requestId !== requestIdRef.current) return;
          setErrorMessage(error instanceof Error ? error.message : '');
          setStatus('error');
          if (autoRetryRef.current < AUTO_RETRY_DELAYS_MS.length) {
            const delay = AUTO_RETRY_DELAYS_MS[autoRetryRef.current];
            autoRetryRef.current += 1;
            retryTimerRef.current = window.setTimeout(() => loadPending(false), delay);
          }
        })
        .finally(() => setRetrying(false));
    },
    [enabled, clearedKey, fetchPending]
  );

  useEffect(() => {
    if (!enabled) return;
    loadPending(false);
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [enabled, userId, loadPending]);

  useEffect(() => {
    if (status === 'ready' && items.length === 0) writeCleared(clearedKey, true);
  }, [status, items.length, clearedKey]);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadPending(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, loadPending]);

  useEffect(() => {
    if (!enabled) return;
    if (skipPathRefresh.current) {
      skipPathRefresh.current = false;
      return;
    }
    loadPending(true);
  }, [pathname, enabled, loadPending]);

  const cleared = !enabled || (status === 'ready' && items.length === 0);
  useEffect(() => {
    onSettledChange?.(cleared);
  }, [cleared, onSettledChange]);

  const respond = useCallback(
    async (next: StandardsAckStatus) => {
      const current = items[0];
      if (!current || saving) return;
      setSaving(next);
      try {
        await acknowledge(current.id, next);
        setItems((prev) => prev.filter((item) => item.id !== current.id));
      } catch (error) {
        toast({
          title: 'Response not saved',
          description: getNetworkErrorMessage(error),
          variant: 'destructive',
        });
      } finally {
        setSaving(null);
      }
    },
    [items, saving, acknowledge]
  );

  if (cleared) {
    return null;
  }

  const current = items[0];
  const total = Math.max(sessionTotal, items.length);
  const position = total - items.length + 1;
  const progress = total > 0 ? Math.round((position / total) * 100) : 0;
  const nounLabel = itemNoun.charAt(0).toUpperCase() + itemNoun.slice(1);
  const titleId = `${storagePrefix}-title`;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-background custom-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mx-auto grid min-h-full w-full max-w-3xl grid-cols-12 content-start gap-4 px-4 py-8 sm:px-6">
        <div className="col-span-12 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
          <h1 id={titleId} className="text-2xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{intro}</p>
        </div>

        {status === 'loading' ? (
          <div className="col-span-12 space-y-4 rounded-2xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24 rounded-xl" />
            <Skeleton className="h-6 w-2/3 rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="col-span-12 space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold text-foreground">{loadErrorTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {describeLoadError(errorMessage, itemNoun)}
            </p>
            <Button
              type="button"
              className="rounded-xl"
              disabled={retrying}
              onClick={() => {
                setRetrying(true);
                autoRetryRef.current = 0;
                loadPending(false);
              }}
            >
              {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Try again
            </Button>
          </div>
        ) : null}

        {status === 'ready' && current ? (
          <>
            <div className="col-span-12 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>
                  {nounLabel} {position} of {total}
                </span>
                <span>{items.length} remaining</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="col-span-12 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
              {renderBadge(current)}
              {renderItem(current)}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-cyan-600 text-white hover:bg-cyan-700"
                    disabled={!!saving}
                    onClick={() => void respond('acknowledged')}
                  >
                    {saving === 'acknowledged' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    {acknowledgeLabel}
                  </Button>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    disabled={!!saving}
                    onClick={() => void respond('doubt')}
                  >
                    {saving === 'doubt' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CircleHelp className="mr-2 h-4 w-4" />
                    )}
                    Doubt
                  </Button>
                </div>
                <div className="col-span-12 sm:col-span-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl"
                    disabled={!!saving}
                    onClick={() => void respond('not_required')}
                  >
                    {saving === 'not_required' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MinusCircle className="mr-2 h-4 w-4" />
                    )}
                    Not required
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <div className="col-span-12">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-muted-foreground"
            disabled={loggingOut || !!saving}
            onClick={() => {
              setLoggingOut(true);
              if (impersonating) {
                void Promise.resolve(exitImpersonateMode()).finally(() => setLoggingOut(false));
                return;
              }
              void logout().finally(() => setLoggingOut(false));
            }}
          >
            {loggingOut ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            {impersonating ? 'Exit to admin' : 'Log out'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
