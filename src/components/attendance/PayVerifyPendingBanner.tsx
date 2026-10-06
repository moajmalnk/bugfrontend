import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { isWorkforceUser } from '@/lib/utils';
import { fetchPayVerifyPending } from '@/services/payVerifyService';

/**
 * Why: Mandatory hour verification must surface outside Pay Verify so users
 * cannot miss pending week/month attestations (same pattern as weekly report).
 * Admins manage payroll on Pay Verify but are not required to self-verify hours.
 */
export function PayVerifyPendingBanner() {
  const { currentUser } = useAuth();
  const isAdmin = (currentUser?.role || '').toLowerCase() === 'admin';
  const workforce = isWorkforceUser(currentUser || {});
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!workforce || isAdmin) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchPayVerifyPending();
        if (!cancelled) setPending(Number(res.total) || 0);
      } catch {
        if (!cancelled) setPending(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workforce, isAdmin, currentUser?.id]);

  if (isAdmin || !workforce || pending <= 0) return null;

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {pending} hour verification{pending === 1 ? '' : 's'} pending
          </p>
          <p className="text-xs text-muted-foreground">
            Confirm weekly hours or flag a correction, then verify the month total.
          </p>
        </div>
      </div>
      <Button type="button" asChild size="sm" className="rounded-xl shrink-0">
        <Link to="/pay-verify">Open Pay Verify</Link>
      </Button>
    </div>
  );
}
