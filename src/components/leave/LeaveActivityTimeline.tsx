import { memo } from 'react';
import { Ban, CheckCircle2, Gift, Pencil, Send, XCircle, type LucideIcon } from 'lucide-react';
import type { LeaveActivityEvent } from '@/services/leaveService';
import { formatAbsoluteDate, formatFullTimestamp } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

const EVENT_META: Record<LeaveActivityEvent['event'], { verb: string; icon: LucideIcon; tone: string }> = {
  requested: { verb: 'Requested', icon: Send, tone: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30' },
  approved: {
    verb: 'Approved',
    icon: CheckCircle2,
    tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  rejected: { verb: 'Rejected', icon: XCircle, tone: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
  cancelled: { verb: 'Cancelled', icon: Ban, tone: 'text-muted-foreground bg-muted border-border' },
  granted: { verb: 'Granted', icon: Gift, tone: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/30' },
  updated: { verb: 'Edited', icon: Pencil, tone: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
};

type Props = {
  events?: LeaveActivityEvent[] | null;
  /** Note already rendered by the card (e.g. the Admin note box) — not repeated here. */
  omitNote?: string | null;
  className?: string;
};

/**
 * Who did what to a leave request, oldest first.
 * Why: the request row only keeps the latest reviewer, so approvals, edits and
 * cancellations come from the server-side activity log.
 */
function LeaveActivityTimelineImpl({ events, omitNote, className }: Props) {
  const items = (events ?? []).filter((e) => e && EVENT_META[e.event]);
  if (items.length === 0) return null;
  const hasDerived = items.some((e) => e.derived);
  const skipNote = omitNote?.trim() || null;

  return (
    <section aria-label="Leave activity" className={cn('rounded-xl border border-border bg-muted/30 px-4 py-3', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Activity</p>
      <ol className="space-y-3">
        {items.map((e, i) => {
          const meta = EVENT_META[e.event];
          const Icon = meta.icon;
          const actor = e.actor_name?.trim() || 'Unknown user';
          const note = e.note?.trim();
          return (
            <li key={`${e.event}-${e.at}-${i}`} className="flex items-start gap-3 min-w-0">
              <span
                className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', meta.tone)}
                aria-hidden
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground [overflow-wrap:anywhere]">
                  <span className="font-semibold">{meta.verb}</span> by <span className="font-semibold">{actor}</span>
                  {e.impersonated_by_name ? (
                    <span className="text-muted-foreground"> (via admin {e.impersonated_by_name})</span>
                  ) : null}
                </p>
                {e.at ? (
                  <time
                    dateTime={e.at.replace(' ', 'T')}
                    title={formatFullTimestamp(e.at)}
                    className="block text-xs text-muted-foreground tabular-nums"
                  >
                    {formatAbsoluteDate(e.at)}
                  </time>
                ) : null}
                {note && note !== skipNote ? (
                  <p className="mt-1 text-xs text-foreground/80 whitespace-pre-wrap [overflow-wrap:anywhere]">{note}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {hasDerived ? (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Recorded before activity tracking — shows the latest known reviewer.
        </p>
      ) : null}
    </section>
  );
}

export const LeaveActivityTimeline = memo(LeaveActivityTimelineImpl);
