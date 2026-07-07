import { formatLocalDate } from '@/lib/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Update } from '@/services/updateService';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

type UpdateTimingSource = Pick<
  Update,
  'created_at' | 'status' | 'approved_at' | 'declined_at'
>;

export function formatUpdateReviewLabel(update: UpdateTimingSource): string | null {
  if (update.status === 'approved' && update.approved_at) return 'Approved';
  if (update.status === 'declined' && update.declined_at) return 'Declined';
  return null;
}

export function formatUpdateReviewedAt(update: UpdateTimingSource): string | null {
  if (update.status === 'approved' && update.approved_at) {
    return formatLocalDate(update.approved_at, 'datetime');
  }
  if (update.status === 'declined' && update.declined_at) {
    return formatLocalDate(update.declined_at, 'datetime');
  }
  return null;
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

  return (
    <div className={cn('space-y-1.5', className)}>
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

      {reviewLabel && reviewedAt ? (
        <div className="flex items-start gap-2 text-muted-foreground">
          {reviewLabel === 'Approved' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <div className={cn(compact ? 'text-xs' : 'text-xs sm:text-sm')}>
            <span className="font-medium text-foreground/80">{reviewLabel}: </span>
            <span className="text-foreground">{reviewedAt}</span>
          </div>
        </div>
      ) : (
        <p className={cn('text-muted-foreground italic pl-6', compact ? 'text-[11px]' : 'text-[11px] sm:text-xs')}>
          Awaiting approval
        </p>
      )}
    </div>
  );
}
