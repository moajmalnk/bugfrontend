import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Pencil,
  Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  performanceReviewService,
  type PerformanceReview,
  type ReviewAnswer,
} from '@/services/performanceReviewService';

function formatMonthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

type FormattedAnswer =
  | { kind: 'text'; value: string }
  | { kind: 'rating'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'tags'; value: string[] }
  | { kind: 'empty' };

function formatAnswer(answer: ReviewAnswer): FormattedAnswer {
  const raw = (answer.answer_text ?? '').trim();
  if (!raw) return { kind: 'empty' };

  if (answer.question_type === 'rating_1_5') {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      return { kind: 'rating', value: n };
    }
  }
  if (answer.question_type === 'boolean') {
    if (raw === 'true') return { kind: 'boolean', value: true };
    if (raw === 'false') return { kind: 'boolean', value: false };
  }
  if (answer.question_type === 'multi_select') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const tags = parsed.map(String).filter(Boolean);
        return tags.length ? { kind: 'tags', value: tags } : { kind: 'empty' };
      }
    } catch {
      /* plain text */
    }
  }
  return { kind: 'text', value: raw };
}

function RatingStars({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              'h-3.5 w-3.5',
              n <= filled
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/35'
            )}
          />
        ))}
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

function AnswerBody({ answer }: { answer: ReviewAnswer }) {
  const formatted = formatAnswer(answer);

  if (formatted.kind === 'empty') {
    return (
      <p className="text-sm italic text-muted-foreground/70">Not answered</p>
    );
  }
  if (formatted.kind === 'rating') {
    return <RatingStars value={formatted.value} />;
  }
  if (formatted.kind === 'boolean') {
    return (
      <Badge
        className={cn(
          'rounded-full font-medium',
          formatted.value
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        )}
      >
        {formatted.value ? 'Yes' : 'No'}
      </Badge>
    );
  }
  if (formatted.kind === 'tags') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {formatted.value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-violet-200/60 dark:border-violet-800/50 bg-violet-50/80 dark:bg-violet-950/40 px-2.5 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-200"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  }
  return (
    <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
      {formatted.value}
    </p>
  );
}

function groupAnswers(answers: ReviewAnswer[]) {
  const map = new Map<string, ReviewAnswer[]>();
  const sorted = [...answers].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  for (const a of sorted) {
    const key = a.section_name || 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries());
}

type Props = {
  reviewId: number | null;
  role: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PerformanceReviewDetailDialog({
  reviewId,
  role,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<PerformanceReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || reviewId == null) {
      setReview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    performanceReviewService
      .getReview(reviewId)
      .then((data) => {
        if (!cancelled) setReview(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setReview(null);
          setError(err instanceof Error ? err.message : 'Failed to load review');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, reviewId]);

  const sections = useMemo(
    () => groupAnswers(review?.answers || []),
    [review?.answers]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,600px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden border-gray-200/40 dark:border-gray-700/40 bg-background shadow-2xl max-h-[90vh] flex flex-col">
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 pointer-events-none" />
          <DialogHeader className="relative px-6 pt-6 pb-5 text-left space-y-0">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {loading
                      ? 'Loading…'
                      : review
                        ? review.employee_username || 'Employee'
                        : 'Review'}
                  </DialogTitle>
                  {review ? (
                    <Badge
                      className={cn(
                        'rounded-full capitalize font-medium',
                        review.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0'
                      )}
                    >
                      {review.status}
                    </Badge>
                  ) : null}
                </div>
                <DialogDescription className="text-sm text-muted-foreground">
                  {review
                    ? `${formatMonthLabel(review.review_month)} · ${formatDisplayDate(review.review_date)}`
                    : 'Monthly performance review'}
                </DialogDescription>
              </div>
            </div>

            {review && !loading ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground border-t border-border/40 pt-4">
                <span>
                  <span className="text-foreground/50">Dept</span>{' '}
                  <span className="font-medium text-foreground">
                    {review.department || '—'}
                  </span>
                </span>
                <span className="hidden sm:inline text-border">·</span>
                <span>
                  <span className="text-foreground/50">Reviewer</span>{' '}
                  <span className="font-medium text-foreground">
                    {review.reviewer_username || '—'}
                  </span>
                </span>
                <span className="hidden sm:inline text-border">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-foreground/50">Overall</span>
                  {review.overall_rating != null ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(review.overall_rating).toFixed(2)}
                    </span>
                  ) : (
                    <span className="font-medium text-foreground">—</span>
                  )}
                </span>
              </div>
            ) : null}
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-4 w-40 rounded-lg" />
              <div className="space-y-4">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : review ? (
            sections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                No answers recorded for this review yet.
              </p>
            ) : (
              <div className="flex flex-col gap-8">
                {sections.map(([section, answers]) => (
                  <section key={section} className="space-y-4">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {section}
                    </h3>
                    <div className="relative space-y-0 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                      {answers.map((a) => (
                        <div
                          key={`${a.question_id}-${a.id ?? 0}`}
                          className="relative pl-7 pb-5 last:pb-0"
                        >
                          <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-violet-500/70 bg-background" />
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground leading-snug">
                              {a.question_text}
                              {a.is_required ? (
                                <span className="text-destructive/70 ml-0.5">*</span>
                              ) : null}
                            </p>
                            <AnswerBody answer={a} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/40 bg-muted/20 px-6 py-4 gap-2 sm:gap-3 sm:justify-end shrink-0">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-5 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {review ? (
            <Button
              asChild
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-md shadow-violet-500/20"
            >
              <Link
                to={`/${role}/performance-reviews/${review.id}/edit`}
                onClick={() => onOpenChange(false)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit review
              </Link>
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
