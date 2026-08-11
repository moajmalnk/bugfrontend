import { formatLocalDate } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Update } from '@/services/updateService';
import { CheckCircle2, Clock, Hourglass, XCircle } from 'lucide-react';

type UpdateTimingSource = Pick<
  Update,
  'created_at' | 'status' | 'approved_at' | 'declined_at' | 'completed_at'
>;

type ReviewTone = 'completed' | 'approved' | 'declined' | 'pending';

const REVIEW_TONE_CLASS: Record<ReviewTone, string> = {
  completed:
    'border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  approved:
    'border-teal-300/80 bg-teal-50 text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/40 dark:text-teal-200',
  declined:
    'border-rose-300/80 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-200',
  pending:
    'border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200',
};

function ReviewStatusBadge({
  tone,
  label,
  timestamp,
}: {
  tone: ReviewTone;
  label: string;
  timestamp?: string | null;
}) {
  const Icon =
    tone === 'completed' || tone === 'approved'
      ? CheckCircle2
      : tone === 'declined'
        ? XCircle
        : Hourglass;

  return (
    <span
      className={cn(
        'inline-flex flex-col gap-0.5 rounded-xl border px-2.5 py-1.5 max-w-full',
        REVIEW_TONE_CLASS[tone]
      )}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold leading-none">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      {timestamp ? (
        <span className="text-[10px] font-medium leading-snug opacity-90 pl-5">
          {timestamp}
        </span>
      ) : null}
    </span>
  );
}

export function formatUpdateReviewLabel(update: UpdateTimingSource): string | null {
  if (update.status === 'completed') return 'Completed';
  if (update.status === 'approved') return 'Approved';
  if (update.status === 'declined') return 'Declined';
  return null;
}

export function formatUpdateReviewedAt(update: UpdateTimingSource): string | null {
  if (update.status === 'completed' && update.completed_at) {
    return formatLocalDate(update.completed_at, 'datetime');
  }
  if (update.status === 'approved' && update.approved_at) {
    return formatLocalDate(update.approved_at, 'datetime');
  }
  if (update.status === 'declined' && update.declined_at) {
    return formatLocalDate(update.declined_at, 'datetime');
  }
  return null;
}

/**
 * Why: List tables share one review/completion label so completed updates
 * never fall through to "Awaiting approval".
 */
export function UpdateReviewStatusCell({ update }: { update: UpdateTimingSource }) {
  if (update.status === 'completed') {
    return (
      <ReviewStatusBadge
        tone="completed"
        label="Completed"
        timestamp={
          update.completed_at
            ? formatLocalDate(update.completed_at, 'datetime')
            : null
        }
      />
    );
  }

  if (update.status === 'approved') {
    return (
      <ReviewStatusBadge
        tone="approved"
        label="Approved"
        timestamp={
          update.approved_at
            ? formatLocalDate(update.approved_at, 'datetime')
            : null
        }
      />
    );
  }

  if (update.status === 'declined') {
    return (
      <ReviewStatusBadge
        tone="declined"
        label="Declined"
        timestamp={
          update.declined_at
            ? formatLocalDate(update.declined_at, 'datetime')
            : null
        }
      />
    );
  }

  return (
    <ReviewStatusBadge tone="pending" label="Awaiting approval" />
  );
}

export function UpdateTimingInfo({
  update,
  className,
  compact = false,
}: {
  update: UpdateTimingSource;
  className?: string;
  compact?: boolean;
}) {
  const reviewLabel = formatUpdateReviewLabel(update);
  const reviewedAt = formatUpdateReviewedAt(update);
  const reviewTone: ReviewTone | null =
    update.status === 'completed'
      ? 'completed'
      : update.status === 'approved'
        ? 'approved'
        : update.status === 'declined'
          ? 'declined'
          : update.status === 'pending'
            ? 'pending'
            : null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-2 text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
        <div className={cn(compact ? 'text-xs' : 'text-xs sm:text-sm')}>
          <span className="font-medium text-foreground/80">Created: </span>
          <span className="text-foreground">
            {update.created_at
              ? formatLocalDate(update.created_at, 'datetime')
              : '—'}
          </span>
        </div>
      </div>

      {reviewTone ? (
        <ReviewStatusBadge
          tone={reviewTone}
          label={reviewLabel ?? 'Awaiting approval'}
          timestamp={reviewedAt}
        />
      ) : null}
    </div>
  );
}
