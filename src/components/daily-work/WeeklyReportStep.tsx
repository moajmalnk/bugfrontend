import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { extractApiErrorMessage } from '@/lib/apiError';
import {
  clampWeeklyReportField,
  emptyWeeklyReportFields,
  getWeeklyReport,
  isWeeklyReportValid,
  saveWeeklyReport,
  type WeeklyReportFields,
} from '@/services/weeklyReportService';
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';

const INITIAL_FIELDS = emptyWeeklyReportFields();
const FIELD_MAX = 20000;

type Props = {
  active: boolean;
  workDate: string;
  fallbackName: string;
  onContinue: () => void;
  onSkipToCheckout: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

function countLines(text: string): number {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean).length;
}

function WeeklyReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 h-16 rounded-xl md:col-span-4" />
          <Skeleton className="col-span-12 h-16 rounded-xl md:col-span-4" />
          <Skeleton className="col-span-12 h-16 rounded-xl md:col-span-4" />
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-40 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-40 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-40 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-40 rounded-xl md:col-span-6" />
      </div>
    </div>
  );
}

export function WeeklyReportStep({
  active,
  workDate,
  fallbackName,
  onContinue,
  onSkipToCheckout,
  onDirtyChange,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState(fallbackName);
  const [dateLabel, setDateLabel] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [fields, setFields] = useState<WeeklyReportFields>(INITIAL_FIELDS);
  const [baseline, setBaseline] = useState<WeeklyReportFields>(INITIAL_FIELDS);

  const [revealed, setRevealed] = useState(false);

  const dirty =
    fields.work_completed !== baseline.work_completed ||
    fields.work_in_progress !== baseline.work_in_progress ||
    fields.issues_blockers !== baseline.issues_blockers ||
    fields.plan_next_week !== baseline.plan_next_week;

  const isValid = isWeeklyReportValid(fields);

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!active) {
      setRevealed(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setRevealed(false);
      setError('');
      try {
        const data = await getWeeklyReport(workDate);
        if (cancelled) return;
        if (!data.required) {
          onSkipToCheckout();
          return;
        }
        const next: WeeklyReportFields = {
          work_completed: clampWeeklyReportField(
            data.report?.work_completed || data.suggestions?.work_completed || ''
          ),
          work_in_progress: clampWeeklyReportField(
            data.report?.work_in_progress || data.suggestions?.work_in_progress || ''
          ),
          issues_blockers: clampWeeklyReportField(data.report?.issues_blockers || ''),
          plan_next_week: clampWeeklyReportField(
            data.report?.plan_next_week || data.suggestions?.plan_next_week || ''
          ),
        };
        setUserName(data.user_name || fallbackName);
        setDateLabel(data.date_label);
        setWeekLabel(data.week_label);
        setFields(next);
        setBaseline(next);
        setRevealed(true);
      } catch (err) {
        if (cancelled) return;
        setError(extractApiErrorMessage(err, 'Could not load weekly report.'));
        setRevealed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, workDate, fallbackName, onSkipToCheckout]);

  useEffect(() => {
    return () => {
      setFields(INITIAL_FIELDS);
      setBaseline(INITIAL_FIELDS);
      onDirtyChange(false);
    };
  }, [onDirtyChange]);

  const updateField = (key: keyof WeeklyReportFields, value: string) => {
    const next = clampWeeklyReportField(value);
    setFields((prev) => ({ ...prev, [key]: next }));
    if (error) setError('');
  };

  const handleContinue = async () => {
    if (saving || !isValid) return;
    setSaving(true);
    setError('');
    try {
      await saveWeeklyReport(fields, workDate);
      onDirtyChange(false);
      onContinue();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Could not save weekly report.'));
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo(
    () => ({
      completed: countLines(fields.work_completed),
      wip: countLines(fields.work_in_progress),
      blockers: countLines(fields.issues_blockers),
      plan: countLines(fields.plan_next_week),
    }),
    [fields]
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-900/50 sm:p-6">
        {loading ? (
          <WeeklyReportSkeleton />
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-1.5 dark:bg-indigo-900/30">
                  <ClipboardList className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Weekly Report</h3>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{userName || fallbackName}</p>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{dateLabel || workDate}</p>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Week</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground">{weekLabel}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 flex flex-col gap-2 md:col-span-6">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="weekly-completed" className="text-sm font-medium text-foreground">
                    Work Completed This Week <span className="text-red-500">*</span>
                  </Label>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {counts.completed}
                  </span>
                </div>
                <Textarea
                  id="weekly-completed"
                  value={fields.work_completed}
                  maxLength={FIELD_MAX}
                  onChange={(e) => updateField('work_completed', e.target.value)}
                  className="min-h-[140px] resize-none rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  placeholder="List completed work this week..."
                />
                {!fields.work_completed.trim() ? (
                  <span className="text-xs text-red-500">Required</span>
                ) : null}
              </div>

              <div className="col-span-12 flex flex-col gap-2 md:col-span-6">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="weekly-wip" className="text-sm font-medium text-foreground">
                    Work in Progress <span className="text-red-500">*</span>
                  </Label>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {counts.wip}
                  </span>
                </div>
                <Textarea
                  id="weekly-wip"
                  value={fields.work_in_progress}
                  maxLength={FIELD_MAX}
                  onChange={(e) => updateField('work_in_progress', e.target.value)}
                  className="min-h-[140px] resize-none rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  placeholder="List work still in progress..."
                />
                {!fields.work_in_progress.trim() ? (
                  <span className="text-xs text-red-500">Required</span>
                ) : null}
              </div>

              <div className="col-span-12 flex flex-col gap-2 md:col-span-6">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="weekly-blockers" className="text-sm font-medium text-foreground">
                    Issues / Blockers
                  </Label>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    {counts.blockers}
                  </span>
                </div>
                <Textarea
                  id="weekly-blockers"
                  value={fields.issues_blockers}
                  maxLength={FIELD_MAX}
                  onChange={(e) => updateField('issues_blockers', e.target.value)}
                  className="min-h-[140px] resize-none rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  placeholder="No major blockers."
                />
              </div>

              <div className="col-span-12 flex flex-col gap-2 md:col-span-6">
                <div className="flex min-h-5 items-center justify-between gap-2">
                  <Label htmlFor="weekly-plan" className="text-sm font-medium text-foreground">
                    Plan for Next Week <span className="text-red-500">*</span>
                  </Label>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {counts.plan}
                  </span>
                </div>
                <Textarea
                  id="weekly-plan"
                  value={fields.plan_next_week}
                  maxLength={FIELD_MAX}
                  onChange={(e) => updateField('plan_next_week', e.target.value)}
                  className="min-h-[140px] resize-none rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  placeholder="What will you take up next week..."
                />
                {!fields.plan_next_week.trim() ? (
                  <span className="text-xs text-red-500">Required</span>
                ) : null}
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-3 rounded-xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                <div className="shrink-0 rounded-lg bg-red-500 p-1.5">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm leading-relaxed text-red-700 dark:text-red-300">{error}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
        <Button
          type="button"
          disabled={!isValid || saving || loading}
          onClick={() => void handleContinue()}
          className="h-11 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white hover:from-indigo-700 hover:to-violet-700"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Continue to Checkout
            </span>
          )}
        </Button>
      </div>
    </>
  );
}
