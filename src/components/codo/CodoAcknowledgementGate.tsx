import { CodoRuleBody } from '@/components/codo/CodoRuleBody';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getNetworkErrorMessage } from '@/lib/apiError';
import { cn, getEffectiveRole, userHasPendingOnboarding } from '@/lib/utils';
import {
  acknowledgeCodoRule,
  fetchPendingCodoAcknowledgements,
  type CodoAckStatus,
  type CodoCommonRule,
} from '@/services/codoRulesService';
import { Check, CircleHelp, Loader2, LogOut, MinusCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

const PHASE_LABEL: Record<string, string> = {
  developer: 'Developer',
  tester: 'Tester / QA',
  project: 'Project',
};

const AUTO_RETRY_DELAYS_MS = [2000, 5000, 10000];
const clearedKey = (userId: string) => `codo_ack_cleared:${userId}`;

/**
 * Why: once a user has answered every rule, a transient server error must not lock
 * them out of the dashboard again. New rules still surface on the next successful check.
 */
function hasClearedCodo(userId: string): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(clearedKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markCodoCleared(userId: string, cleared: boolean): void {
  if (!userId) return;
  try {
    if (cleared) localStorage.setItem(clearedKey(userId), '1');
    else localStorage.removeItem(clearedKey(userId));
  } catch {
    // Storage unavailable (private mode) — gate simply re-checks every load.
  }
}

function describeLoadError(message: string): string {
  if (/invalid or expired token|authentication required/i.test(message)) {
    return 'Your session has expired. Sign in again to continue.';
  }
  if (/database connection|server is busy|failed to fetch|network/i.test(message)) {
    return 'The server is busy right now. We retry automatically — this usually clears within a few seconds.';
  }
  return message || 'We could not reach the server to check your pending CODO rules.';
}

/**
 * Why: A developer or tester must answer every active CODO rule for their role
 * before the dashboard is usable. New rules stay pending until that person responds.
 */
export default function CodoAcknowledgementGate() {
  const { currentUser, logout, exitImpersonateMode } = useAuth();
  const { pathname } = useLocation();
  const role = getEffectiveRole(currentUser || {});
  const impersonating = Boolean(
    currentUser?.admin_id && currentUser.admin_id !== currentUser.id
  );
  const gated =
    !!currentUser &&
    (role === 'developer' || role === 'tester') &&
    !userHasPendingOnboarding(currentUser);

  const userId = currentUser?.id ? String(currentUser.id) : '';
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(() =>
    userId && hasClearedCodo(userId) ? 'ready' : 'loading'
  );
  const [rules, setRules] = useState<CodoCommonRule[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [saving, setSaving] = useState<CodoAckStatus | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const savingRef = useRef(false);
  const skipPathRefresh = useRef(true);
  const autoRetryRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  savingRef.current = !!saving;

  const loadPending = useCallback(
    (background: boolean) => {
      if (!gated || savingRef.current) return;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      // Users who already answered every rule keep working while we re-check quietly.
      const quiet = background || hasClearedCodo(userId);
      if (!quiet) setStatus('loading');
      fetchPendingCodoAcknowledgements()
        .then((data) => {
          if (savingRef.current) return;
          autoRetryRef.current = 0;
          setRules(data.rules);
          setSessionTotal((prev) => Math.max(prev, data.total_pending, data.rules.length));
          setErrorMessage('');
          setStatus('ready');
          markCodoCleared(userId, data.rules.length === 0);
        })
        .catch((error: unknown) => {
          if (quiet) return;
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
    [gated, userId]
  );

  useEffect(() => {
    if (!gated) return;
    loadPending(false);
    return () => {
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [gated, userId, loadPending]);

  useEffect(() => {
    if (status === 'ready' && rules.length === 0 && userId) markCodoCleared(userId, true);
  }, [status, rules.length, userId]);

  useEffect(() => {
    if (!gated) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadPending(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [gated, loadPending]);

  useEffect(() => {
    if (!gated) return;
    if (skipPathRefresh.current) {
      skipPathRefresh.current = false;
      return;
    }
    loadPending(true);
  }, [pathname, gated, loadPending]);

  const respond = useCallback(
    async (next: CodoAckStatus) => {
      const current = rules[0];
      if (!current || saving) return;
      setSaving(next);
      try {
        await acknowledgeCodoRule(current.id, next);
        setRules((prev) => prev.filter((rule) => rule.id !== current.id));
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
    [rules, saving]
  );

  if (!gated || (status === 'ready' && rules.length === 0)) {
    return null;
  }

  const current = rules[0];
  const total = Math.max(sessionTotal, rules.length);
  const position = total - rules.length + 1;
  const progress = total > 0 ? Math.round((position / total) * 100) : 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-background custom-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="codo-ack-title"
    >
      <div className="mx-auto grid min-h-full w-full max-w-3xl grid-cols-12 content-start gap-4 px-4 py-8 sm:px-6">
        <div className="col-span-12 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Common CODO
          </p>
          <h1 id="codo-ack-title" className="text-2xl font-semibold text-foreground">
            Acknowledge each rule
          </h1>
          <p className="text-sm text-muted-foreground">
            Read the standard, then record your response. The dashboard opens after every
            required rule has a response.
          </p>
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
            <h2 className="text-lg font-semibold text-foreground">Rules could not be loaded</h2>
            <p className="text-sm text-muted-foreground">{describeLoadError(errorMessage)}</p>
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
                  Rule {position} of {total}
                </span>
                <span>{rules.length} remaining</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="col-span-12 space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
              <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {PHASE_LABEL[current.phase] || current.phase}
              </span>
              <h2 className="text-lg font-semibold text-foreground">
                {current.subtitle?.trim()
                  ? `${current.subtitle}: ${current.title}`
                  : current.title}
              </h2>
              <CodoRuleBody
                hideHeading
                ruleKey={current.rule_key}
                subtitle={current.subtitle}
                title={current.title}
                description={current.description}
              />
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
                    I acknowledge this rule
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
                    className={cn('h-11 w-full rounded-xl')}
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
