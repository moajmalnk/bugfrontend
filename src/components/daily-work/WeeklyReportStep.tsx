import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { extractApiErrorMessage } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import {
  clampWeeklyReportField,
  emptyWeeklyReportFields,
  formatWeeklyReportAttendanceBlock,
  getWeeklyReport,
  isWeeklyReportValid,
  saveWeeklyReport,
  type WeeklyReportAttendance,
  type WeeklyReportFields,
} from '@/services/weeklyReportService';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Loader2,
  PenLine,
} from 'lucide-react';

const INITIAL_FIELDS = emptyWeeklyReportFields();
const FIELD_MAX = 20000;

type Props = {
  active: boolean;
  workDate: string;
  fallbackName: string;
  onContinue: () => void;
  onSkipToCheckout?: () => void;
  onDirtyChange: (dirty: boolean) => void;
  /** Files a missed past week (Monday Y-m-d) instead of the Saturday checkout report. */
  lateWeekStart?: string;
  /** Shows a Cancel button in the footer (the parent applies its own unsaved-changes guard). */
  onCancel?: () => void;
};

type FieldKey = keyof WeeklyReportFields;

const FIELD_CONFIG: {
  key: FieldKey;
  id: string;
  label: string;
  required: boolean;
  dot: string;
  placeholder: string;
}[] = [
  {
    key: 'work_completed',
    id: 'weekly-completed',
    label: 'Work completed',
    required: true,
    dot: 'bg-emerald-500',
    placeholder: 'One item per line — what shipped or got done this week?',
  },
  {
    key: 'work_in_progress',
    id: 'weekly-wip',
    label: 'Work in progress',
    required: true,
    dot: 'bg-blue-500',
    placeholder: 'What is still underway?',
  },
  {
    key: 'issues_blockers',
    id: 'weekly-blockers',
    label: 'Issues / blockers',
    required: false,
    dot: 'bg-orange-500',
    placeholder: 'No major blockers.',
  },
  {
    key: 'plan_next_week',
    id: 'weekly-plan',
    label: 'Plan for next week',
    required: true,
    dot: 'bg-violet-500',
    placeholder: 'What will you take up next week?',
  },
];

function countLines(text: string): number {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean).length;
}

function hoursLabel(value: unknown): string {
  const n = Number(value) || 0;
  return `${Number.isInteger(n) ? n : n.toFixed(2)}h`;
}

function Section({
  icon,
  accent,
  title,
  subtitle,
  aside,
  children,
}: {
  icon: ReactNode;
  accent: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', accent)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

function WeeklyReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 h-12 rounded-xl md:col-span-4" />
          <Skeleton className="col-span-12 h-12 rounded-xl md:col-span-4" />
          <Skeleton className="col-span-12 h-12 rounded-xl md:col-span-4" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="grid grid-cols-12 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="col-span-6 h-16 rounded-xl md:col-span-3" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="col-span-12 h-36 rounded-2xl md:col-span-6" />
        ))}
      </div>
    </div>
  );
}

/**
 * Why: Structured attendance (tiles + per-day rows) is far easier to scan than the
 * plain-text block; the text is kept as a fallback when the API omits the object.
 */
function AttendanceSummary({
  attendance,
  fallbackText,
}: {
  attendance: WeeklyReportAttendance | null;
  fallbackText: string;
}) {
  const [showDays, setShowDays] = useState(false);

  if (!attendance?.summary) {
    if (!fallbackText) return null;
    return (
      <Section
        icon={<CalendarDays className="h-4 w-4" />}
        accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        title="Attendance this week"
      >
        <pre className="m-0 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-3 font-sans text-sm leading-relaxed text-muted-foreground">
          {fallbackText}
        </pre>
      </Section>
    );
  }

  const s = attendance.summary;
  const tiles: { label: string; value: string; tone?: string }[] = [
    { label: 'Worked days', value: String(Number(s.days_worked) || 0) },
    { label: 'Total hours', value: hoursLabel(s.total_hours) },
    { label: 'Leave days', value: String(Number(s.leave_days) || 0) },
    { label: 'Check-ins', value: String(Number(s.check_ins) || 0) },
    { label: 'Office', value: String(Number(s.office_days) || 0) },
    { label: 'WFH', value: String(Number(s.wfh_days) || 0) },
    {
      label: 'Late',
      value: String(Number(s.late_days) || 0),
      tone: Number(s.late_days) > 0 ? 'text-amber-600 dark:text-amber-400' : undefined,
    },
    { label: 'Overtime', value: hoursLabel(s.overtime_hours) },
  ];
  const days = Array.isArray(attendance.days) ? attendance.days : [];

  return (
    <Section
      icon={<CalendarDays className="h-4 w-4" />}
      accent="bg-sky-500/10 text-sky-600 dark:text-sky-400"
      title="Attendance this week"
      subtitle={`Break total ${Number(s.break_minutes) || 0} min`}
    >
      <div className="grid grid-cols-12 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="col-span-6 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 sm:col-span-3"
          >
            <p className="text-[11px] font-medium text-muted-foreground">{tile.label}</p>
            <p className={cn('mt-0.5 text-base font-semibold tabular-nums text-foreground', tile.tone)}>
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      {days.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDays((v) => !v)}
            aria-expanded={showDays}
            className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <span>Daily breakdown · {days.length} days</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', showDays && 'rotate-180')} />
          </button>
          {showDays ? (
            <ul className="mt-2 divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
              {days.map((day) => {
                const status =
                  day.day_status === 'leave'
                    ? { label: day.leave_type_name ? `Leave · ${day.leave_type_name}` : 'Leave', cls: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' }
                    : day.day_status === 'worked'
                      ? { label: day.work_mode === 'wfh' ? 'WFH' : day.work_mode === 'office' ? 'Office' : 'Worked', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' }
                      : { label: 'No record', cls: 'bg-muted text-muted-foreground' };
                return (
                  <li key={day.date} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-xs">
                    <span className="col-span-12 truncate font-medium text-foreground sm:col-span-4">
                      {day.date_label}
                    </span>
                    <span className="col-span-12 flex flex-wrap items-center gap-1.5 sm:col-span-8 sm:justify-end">
                      <span className={cn('rounded-lg px-2 py-0.5 font-medium', status.cls)}>{status.label}</span>
                      {day.day_status === 'worked' && day.check_in ? (
                        <span className="text-muted-foreground">In {day.check_in}</span>
                      ) : null}
                      {Number(day.hours) > 0 ? (
                        <span className="tabular-nums text-muted-foreground">{hoursLabel(day.hours)}</span>
                      ) : null}
                      {day.is_late ? (
                        <span className="rounded-lg bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
                          Late
                        </span>
                      ) : null}
                      {Number(day.overtime_hours) > 0 ? (
                        <span className="tabular-nums text-muted-foreground">+{hoursLabel(day.overtime_hours)} OT</span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}

export function WeeklyReportStep({
  active,
  workDate,
  fallbackName,
  onContinue,
  onSkipToCheckout,
  onDirtyChange,
  lateWeekStart,
  onCancel,
}: Props) {
  const isLate = Boolean(lateWeekStart);
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState(fallbackName);
  const [dateLabel, setDateLabel] = useState('');
  const [weekLabel, setWeekLabel] = useState('');
  const [attendancePreview, setAttendancePreview] = useState('');
  const [attendance, setAttendance] = useState<WeeklyReportAttendance | null>(null);
  const [fields, setFields] = useState<WeeklyReportFields>(INITIAL_FIELDS);
  const [baseline, setBaseline] = useState<WeeklyReportFields>(INITIAL_FIELDS);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

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
    if (!active) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setBlocked(false);
      setTouched({});
      try {
        const data = await getWeeklyReport(lateWeekStart || workDate);
        if (cancelled) return;
        if (lateWeekStart) {
          if (!data.can_file_late) {
            setBlocked(true);
            setError(
              data.report
                ? 'A weekly report is already filed for this week.'
                : 'This week can no longer take a late report.'
            );
          }
        } else if (!data.required) {
          onSkipToCheckout?.();
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
        setAttendance(data.attendance ?? null);
        setAttendancePreview(
          String(data.attendance_text || '').trim() ||
            formatWeeklyReportAttendanceBlock(data.attendance)
        );
        setFields(next);
        setBaseline(next);
      } catch (err) {
        if (cancelled) return;
        setError(extractApiErrorMessage(err, 'Could not load weekly report.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, workDate, fallbackName, onSkipToCheckout, lateWeekStart]);

  useEffect(() => {
    return () => {
      setFields(INITIAL_FIELDS);
      setBaseline(INITIAL_FIELDS);
      setAttendancePreview('');
      setAttendance(null);
      onDirtyChange(false);
    };
  }, [onDirtyChange]);

  const updateField = (key: FieldKey, value: string) => {
    const next = clampWeeklyReportField(value);
    setFields((prev) => ({ ...prev, [key]: next }));
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
    if (error && !blocked) setError('');
  };

  const handleContinue = async () => {
    if (saving || !isValid || blocked) return;
    setSaving(true);
    setError('');
    try {
      await saveWeeklyReport(fields, workDate, lateWeekStart);
      notifyAdminNavCountsChanged();
      onDirtyChange(false);
      onContinue();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Could not save weekly report.'));
    } finally {
      setSaving(false);
    }
  };

  const counts = useMemo<Record<FieldKey, number>>(
    () => ({
      work_completed: countLines(fields.work_completed),
      work_in_progress: countLines(fields.work_in_progress),
      issues_blockers: countLines(fields.issues_blockers),
      plan_next_week: countLines(fields.plan_next_week),
    }),
    [fields]
  );

  const requiredCount = FIELD_CONFIG.filter((f) => f.required).length;
  const missing = FIELD_CONFIG.filter((f) => f.required && !fields[f.key].trim()).map((f) =>
    f.label.toLowerCase()
  );

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-muted/30 px-5 py-5 sm:px-6">
        {loading ? (
          <WeeklyReportSkeleton />
        ) : (
          <div className="flex flex-col gap-4">
            <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
              <div className="grid grid-cols-12 gap-4">
                {[
                  { label: 'Name', value: userName || fallbackName },
                  { label: isLate ? 'Week ending' : 'Date', value: dateLabel || workDate },
                  { label: 'Week', value: weekLabel || '—' },
                ].map((item) => (
                  <div key={item.label} className="col-span-12 min-w-0 sm:col-span-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-foreground" title={item.value}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {isLate && !blocked ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Late submission</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
                    This report will be marked as filed late today and sent to admins when you submit.
                    Attendance and suggestions from your daily notes are prefilled below.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <p className="min-w-0 pt-1.5 text-sm leading-relaxed text-destructive">{error}</p>
              </div>
            ) : null}

            {!blocked ? (
              <>
                <AttendanceSummary attendance={attendance} fallbackText={attendancePreview} />

                <Section
                  icon={<PenLine className="h-4 w-4" />}
                  accent="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  title="Your summary"
                  subtitle="One item per line. Prefilled from your daily updates — edit as needed."
                  aside={
                    <span className="rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
                      {requiredCount - missing.length}/{requiredCount} required
                    </span>
                  }
                >
                  <div className="grid grid-cols-12 gap-4">
                    {FIELD_CONFIG.map((cfg) => {
                      const value = fields[cfg.key];
                      const showError = cfg.required && touched[cfg.key] && !value.trim();
                      const count = counts[cfg.key];
                      return (
                        <div key={cfg.key} className="col-span-12 flex flex-col gap-1.5 md:col-span-6">
                          <div className="flex items-center justify-between gap-2">
                            <Label
                              htmlFor={cfg.id}
                              className="flex items-center gap-2 text-sm font-medium leading-5 text-foreground"
                            >
                              <span className={cn('h-2 w-2 rounded-full', cfg.dot)} aria-hidden />
                              {cfg.label}
                              {cfg.required ? (
                                <span className="text-destructive">*</span>
                              ) : (
                                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                              )}
                            </Label>
                            <span className="text-[11px] tabular-nums text-muted-foreground">
                              {count} {count === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <Textarea
                            id={cfg.id}
                            value={value}
                            maxLength={FIELD_MAX}
                            onChange={(e) => updateField(cfg.key, e.target.value)}
                            onBlur={() =>
                              setTouched((prev) => (prev[cfg.key] ? prev : { ...prev, [cfg.key]: true }))
                            }
                            aria-invalid={showError || undefined}
                            aria-describedby={showError ? `${cfg.id}-error` : undefined}
                            className={cn(
                              'min-h-[128px] resize-y rounded-xl bg-background text-sm leading-relaxed',
                              showError && 'border-destructive focus-visible:ring-destructive/30'
                            )}
                            placeholder={cfg.placeholder}
                          />
                          {showError ? (
                            <p id={`${cfg.id}-error`} className="text-xs text-destructive" role="alert">
                              This field is required.
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-border/60 bg-background px-5 py-4 sm:px-6">
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-xs sm:max-w-[55%]" aria-live="polite">
            {loading || blocked ? null : missing.length > 0 ? (
              <span className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Still needed: {missing.join(', ')}.</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                {isLate ? 'Ready to submit.' : 'Ready — next you will log hours.'}
              </span>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={onCancel}
                className="h-10 w-full rounded-xl sm:w-auto sm:min-w-[110px]"
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={!isValid || saving || loading || blocked}
              onClick={() => void handleContinue()}
              className="h-10 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white hover:from-indigo-700 hover:to-violet-700 sm:w-auto sm:min-w-[170px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  {isLate ? <ClipboardList className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {isLate ? 'Submit late report' : 'Continue to checkout'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
