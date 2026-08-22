import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/components/ui/use-toast';
import {
  performanceReviewService,
  REVIEW_DEPARTMENTS,
  type ActiveReviewUser,
  type ReviewQuestion,
  type ReviewStatus,
} from '@/services/performanceReviewService';

const fieldClass =
  'h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/50';

function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function monthOptions(count = 18): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function formatMonthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function groupBySection(questions: ReviewQuestion[]) {
  const map = new Map<string, ReviewQuestion[]>();
  for (const q of questions) {
    const key = q.section_name || 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(q);
  }
  return Array.from(map.entries());
}

const PerformanceReviewForm = () => {
  const { id } = useParams();
  const reviewIdParam = id ? Number(id) : null;
  const isEdit = Number.isFinite(reviewIdParam) && (reviewIdParam as number) > 0;

  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const navigate = useNavigate();
  const role = getEffectiveRole(currentUser || {});
  const canManage = hasPermissionOrAdmin(
    role,
    hasPermission,
    'PERFORMANCE_REVIEWS_MANAGE'
  );

  const [users, setUsers] = useState<ActiveReviewUser[]>([]);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [reviewMonth, setReviewMonth] = useState(currentMonthYm());
  const [reviewDate, setReviewDate] = useState(todayIso());
  const [reviewId, setReviewId] = useState<number | null>(
    isEdit ? (reviewIdParam as number) : null
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [employeeLocked, setEmployeeLocked] = useState(false);

  const months = useMemo(() => monthOptions(), []);
  const sections = useMemo(() => groupBySection(questions), [questions]);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [userList, template] = await Promise.all([
        performanceReviewService.getActiveUsers(),
        performanceReviewService.getTemplate(),
      ]);
      setUsers(userList);
      setQuestions(template.questions || []);

      if (isEdit && reviewIdParam) {
        const review = await performanceReviewService.getReview(reviewIdParam);
        setReviewId(review.id);
        setEmployeeId(review.employee_id);
        setDepartment(review.department || '');
        setReviewMonth(review.review_month);
        setReviewDate(review.review_date);
        setEmployeeLocked(true);
        const map: Record<number, string> = {};
        (review.answers || []).forEach((a) => {
          map[a.question_id] = a.answer_text ?? '';
        });
        setAnswers(map);
      }
    } catch (err) {
      toast({
        title: 'Failed to load form',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [canManage, isEdit, reviewIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const setAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setDirty(true);
  };

  const requiredOk = useMemo(
    () =>
      questions.every((q) => {
        if (!q.is_required) return true;
        return (answers[q.id] ?? '').trim() !== '';
      }),
    [questions, answers]
  );

  const metaOk = Boolean(employeeId && department && reviewMonth && reviewDate);

  const answerPayload = () =>
    questions.map((q) => ({
      question_id: q.id,
      answer_text: answers[q.id] ?? '',
    }));

  const ensureReviewCreated = async (): Promise<number> => {
    if (reviewId) return reviewId;
    const created = await performanceReviewService.createReview({
      employee_id: employeeId,
      department,
      review_month: reviewMonth,
      review_date: reviewDate,
    });
    setReviewId(created.id);
    setEmployeeLocked(true);
    return created.id;
  };

  const handleSave = async (nextStatus: ReviewStatus) => {
    if (saving) return;
    if (!metaOk) {
      toast({
        title: 'Select employee, department, month, and date',
        variant: 'destructive',
      });
      return;
    }
    if (nextStatus === 'completed' && !requiredOk) {
      toast({
        title: 'Answer all required questions before completing',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const idNum = await ensureReviewCreated();
      await performanceReviewService.saveAnswers({
        review_id: idNum,
        department,
        review_date: reviewDate,
        status: nextStatus,
        answers: answerPayload(),
      });
      setDirty(false);
      toast({
        title: nextStatus === 'completed' ? 'Review completed' : 'Draft saved',
      });
      navigate(`/${role}/performance-reviews`);
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    navigate(`/${role}/performance-reviews`);
  };

  const confirmLeave = () => {
    setDirty(false);
    setLeaveOpen(false);
    navigate(`/${role}/performance-reviews`);
  };

  if (!canManage) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-violet-50/50 via-transparent to-indigo-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    {isEdit ? 'Edit Review' : 'Conduct Review'}
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Active employees only · monthly growth review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-xl shadow-sm shrink-0">
                <div className="p-1.5 bg-violet-500 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                  {isEdit ? 'Editing' : 'New'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 sm:p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 · Employee & period
            </h2>
          </div>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 space-y-2">
              <Label>Employee (active only)</Label>
              <Select
                value={employeeId || undefined}
                onValueChange={(v) => {
                  setEmployeeId(v);
                  setDirty(true);
                }}
                disabled={employeeLocked || saving}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                      {u.role ? ` (${u.role})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label>Department</Label>
              <Select
                value={department || undefined}
                onValueChange={(v) => {
                  setDepartment(v);
                  setDirty(true);
                }}
                disabled={saving}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label>Review month</Label>
              <Select
                value={reviewMonth}
                onValueChange={(v) => {
                  setReviewMonth(v);
                  setDirty(true);
                }}
                disabled={employeeLocked || saving}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {formatMonthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-12 sm:col-span-6 space-y-2">
              <Label>Review date</Label>
              <DatePicker
                value={reviewDate}
                onChange={(v) => {
                  setReviewDate(v);
                  setDirty(true);
                }}
                placeholder="Pick review date"
                displayFormat="d MMM yyyy"
                disableFuture={false}
                disabled={saving}
                className={`${fieldClass} justify-between border-gray-200/70 dark:border-gray-700/70 bg-white/70 dark:bg-gray-800/70`}
              />
            </div>
          </div>
        </div>

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 sm:p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 shrink-0 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Step 2 · Review questions
            </h2>
          </div>

          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions in the active template.{' '}
              <Link
                className="underline text-violet-600"
                to={`/${role}/performance-reviews/template`}
              >
                Manage template
              </Link>
            </p>
          ) : (
            sections.map(([section, qs]) => (
              <div key={section} className="space-y-4">
                <h3 className="text-base font-semibold border-b border-border/60 pb-2">
                  {section}
                </h3>
                <div className="flex flex-col gap-4">
                  {qs.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label className="leading-snug">
                        {q.question_text}
                        {q.is_required ? (
                          <span className="text-destructive ml-1">*</span>
                        ) : null}
                      </Label>
                      {q.question_type === 'rating_1_5' && (
                        <Select
                          value={answers[q.id] || undefined}
                          onValueChange={(v) => setAnswer(q.id, v)}
                          disabled={saving}
                        >
                          <SelectTrigger className={`${fieldClass} max-w-xs`}>
                            <SelectValue placeholder="Rate 1–5" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {q.question_type === 'short_text' && (
                        <Input
                          className={fieldClass}
                          maxLength={500}
                          value={answers[q.id] ?? ''}
                          onChange={(e) =>
                            setAnswer(q.id, e.target.value.slice(0, 500))
                          }
                          disabled={saving}
                        />
                      )}
                      {q.question_type === 'long_text' && (
                        <Textarea
                          className="rounded-xl min-h-[100px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/50"
                          maxLength={5000}
                          value={answers[q.id] ?? ''}
                          onChange={(e) =>
                            setAnswer(q.id, e.target.value.slice(0, 5000))
                          }
                          disabled={saving}
                        />
                      )}
                      {q.question_type === 'boolean' && (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`q-${q.id}`}
                            checked={answers[q.id] === 'true'}
                            onCheckedChange={(c) =>
                              setAnswer(q.id, c ? 'true' : 'false')
                            }
                            disabled={saving}
                          />
                          <Label htmlFor={`q-${q.id}`} className="font-normal">
                            Yes
                          </Label>
                        </div>
                      )}
                      {q.question_type === 'multi_select' && (
                        <div className="flex flex-col gap-2 rounded-xl border border-border/50 p-3 bg-muted/20">
                          {(q.options || []).map((opt) => {
                            let selected: string[] = [];
                            try {
                              const parsed = JSON.parse(answers[q.id] || '[]');
                              selected = Array.isArray(parsed) ? parsed : [];
                            } catch {
                              selected = [];
                            }
                            const checked = selected.includes(opt);
                            return (
                              <label
                                key={opt}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={saving}
                                  onCheckedChange={(c) => {
                                    const next = c
                                      ? [...selected, opt]
                                      : selected.filter((x) => x !== opt);
                                    setAnswer(q.id, JSON.stringify(next));
                                  }}
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 flex flex-wrap gap-3 justify-end">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 rounded-xl font-semibold"
            disabled={saving || !metaOk}
            onClick={() => void handleSave('draft')}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save as Draft
          </Button>
          <Button
            size="lg"
            className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            disabled={saving || !metaOk || !requiredOk}
            onClick={() => void handleSave('completed')}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Mark as Completed
          </Button>
        </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leave this page and discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Stay</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={confirmLeave}>
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PerformanceReviewForm;
