import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import {
  performanceReviewService,
  type ReviewQuestion,
  type ReviewQuestionType,
  type ReviewTemplate,
} from '@/services/performanceReviewService';

const fieldInputClass =
  'h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/40';

function FieldLabel({
  children,
  color = 'bg-violet-500',
  htmlFor,
}: {
  children: ReactNode;
  color?: string;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {children}
    </Label>
  );
}

const QUESTION_TYPES: { value: ReviewQuestionType; label: string }[] = [
  { value: 'rating_1_5', label: 'Rating (1–5)' },
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'boolean', label: 'Yes / No' },
];

type DraftQuestion = {
  id?: number;
  section_name: string;
  question_text: string;
  question_type: ReviewQuestionType;
  is_required: boolean;
  display_order: number;
  optionsText: string;
};

const emptyDraft = (): DraftQuestion => ({
  section_name: '',
  question_text: '',
  question_type: 'short_text',
  is_required: false,
  display_order: 0,
  optionsText: '',
});

const PerformanceReviewTemplate = () => {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const navigate = useNavigate();
  const role = getEffectiveRole(currentUser || {});
  const canManage = hasPermissionOrAdmin(
    role,
    hasPermission,
    'PERFORMANCE_REVIEWS_MANAGE'
  );

  const [template, setTemplate] = useState<ReviewTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<DraftQuestion>(emptyDraft());
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      setTemplate(await performanceReviewService.getTemplate());
    } catch (err) {
      toast({
        title: 'Failed to load template',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = template?.questions || [];
  const sections = useMemo(() => {
    const map = new Map<string, ReviewQuestion[]>();
    for (const q of questions) {
      const key = q.section_name || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return Array.from(map.entries());
  }, [questions]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEdit = (q: ReviewQuestion) => {
    setDraft({
      id: q.id,
      section_name: q.section_name || '',
      question_text: q.question_text || '',
      question_type: q.question_type,
      is_required: !!q.is_required,
      display_order: q.display_order,
      optionsText: (q.options || []).join('\n'),
    });
    setDialogOpen(true);
  };

  const draftValid =
    draft.question_text.trim().length > 0 &&
    draft.section_name.trim().length > 0 &&
    (draft.question_type !== 'multi_select' ||
      draft.optionsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean).length > 0);

  const saveDraft = async () => {
    if (!draftValid || saving) return;
    setSaving(true);
    try {
      const options =
        draft.question_type === 'multi_select'
          ? draft.optionsText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 30)
          : undefined;
      await performanceReviewService.saveQuestion({
        id: draft.id,
        template_id: template?.id,
        section_name: draft.section_name.trim().slice(0, 100),
        question_text: draft.question_text.trim().slice(0, 2000),
        question_type: draft.question_type,
        is_required: draft.is_required,
        display_order: draft.display_order || undefined,
        options,
      } as Parameters<typeof performanceReviewService.saveQuestion>[0]);
      toast({ title: draft.id ? 'Question updated' : 'Question added' });
      setDialogOpen(false);
      setDraft(emptyDraft());
      await load();
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

  const moveQuestion = async (q: ReviewQuestion, direction: -1 | 1) => {
    const sorted = [...questions].sort(
      (a, b) => a.display_order - b.display_order || a.id - b.id
    );
    const idx = sorted.findIndex((x) => x.id === q.id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    setSaving(true);
    try {
      await Promise.all([
        performanceReviewService.saveQuestion({
          id: q.id,
          template_id: q.template_id,
          section_name: q.section_name,
          question_text: q.question_text,
          question_type: q.question_type,
          is_required: q.is_required,
          display_order: other.display_order,
          options: q.options || undefined,
        }),
        performanceReviewService.saveQuestion({
          id: other.id,
          template_id: other.template_id,
          section_name: other.section_name,
          question_text: other.question_text,
          question_type: other.question_type,
          is_required: other.is_required,
          display_order: q.display_order,
          options: other.options || undefined,
        }),
      ]);
      await load();
    } catch (err) {
      toast({
        title: 'Reorder failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteId == null || deleting) return;
    setDeleting(true);
    try {
      await performanceReviewService.deleteQuestion(deleteId);
      toast({ title: 'Question deleted' });
      setDeleteId(null);
      await load();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!canManage) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-indigo-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => navigate(`/${role}/performance-reviews`)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                  <Settings2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    Review Template
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full mt-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {template?.title || 'Monthly Growth Review'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-violet-500 rounded-lg">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xl font-bold text-violet-700 dark:text-violet-300">
                    {questions.length}
                  </span>
                </div>
                <Button
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={openCreate}
                  disabled={loading}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Question
                </Button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : sections.length === 0 ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-indigo-50/50 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Settings2 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No questions yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Add sections and questions for monthly growth reviews.
              </p>
              <Button
                size="lg"
                className="h-12 px-6 bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-semibold"
                onClick={openCreate}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Question
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:gap-6">
            {sections.map(([section, qs]) => (
              <div
                key={section}
                className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-50/20 to-indigo-50/10 dark:from-violet-950/10 dark:to-indigo-950/5" />
                <div className="relative p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full" />
                    <h2 className="font-semibold text-lg">{section}</h2>
                    <Badge variant="secondary" className="rounded-full ml-auto">
                      {qs.length}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-3">
                    {qs.map((q) => (
                      <div
                        key={q.id}
                        className="rounded-xl border border-border/60 bg-background/60 p-4 flex flex-wrap gap-3 items-start justify-between hover:border-violet-300/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="font-medium leading-snug">{q.question_text}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="rounded-xl">
                              {QUESTION_TYPES.find((t) => t.value === q.question_type)
                                ?.label || q.question_type}
                            </Badge>
                            {q.is_required ? (
                              <Badge className="rounded-xl bg-violet-600">Required</Badge>
                            ) : null}
                            <span className="text-xs text-muted-foreground self-center">
                              Order {q.display_order}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl"
                            disabled={saving}
                            onClick={() => void moveQuestion(q, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl"
                            disabled={saving}
                            onClick={() => void moveQuestion(q, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => openEdit(q)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl text-destructive"
                            onClick={() => setDeleteId(q.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!saving) setDialogOpen(o);
        }}
      >
        <DialogContent className="w-[min(96vw,520px)] max-w-none rounded-2xl p-0 gap-0 overflow-hidden border-gray-200/50 dark:border-gray-700/50">
          <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
                {draft.id ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                  {draft.id ? 'Edit question' : 'Add question'}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {draft.id
                    ? 'Update this template question and its settings.'
                    : 'Add a question to the monthly growth review template.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="section-name" color="bg-violet-500">
                Section name
              </FieldLabel>
              <Input
                id="section-name"
                className={fieldInputClass}
                maxLength={100}
                placeholder="e.g. Core Execution & Quality"
                value={draft.section_name}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    section_name: e.target.value.slice(0, 100),
                  }))
                }
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="question-text" color="bg-indigo-500">
                Question
              </FieldLabel>
              <Textarea
                id="question-text"
                className="min-h-[100px] rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/40"
                maxLength={2000}
                placeholder="Enter the question prompt"
                value={draft.question_text}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    question_text: e.target.value.slice(0, 2000),
                  }))
                }
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel color="bg-emerald-500">Type</FieldLabel>
                <Select
                  value={draft.question_type}
                  onValueChange={(v) =>
                    setDraft((d) => ({
                      ...d,
                      question_type: v as ReviewQuestionType,
                    }))
                  }
                  disabled={saving}
                >
                  <SelectTrigger className={fieldInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="req"
                  checked={draft.is_required}
                  onCheckedChange={(c) =>
                    setDraft((d) => ({ ...d, is_required: !!c }))
                  }
                  disabled={saving}
                />
                <Label htmlFor="req" className="font-normal">
                  Required
                </Label>
              </div>
            </div>

            {draft.question_type === 'multi_select' ? (
              <div className="space-y-2">
                <FieldLabel htmlFor="options-text" color="bg-orange-500">
                  Options (one per line)
                </FieldLabel>
                <Textarea
                  id="options-text"
                  className="min-h-[100px] rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/40"
                  placeholder={'Option A\nOption B\nOption C'}
                  value={draft.optionsText}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, optionsText: e.target.value }))
                  }
                  disabled={saving}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4 gap-2 sm:gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
              className="h-11 px-6 rounded-xl border-gray-200 dark:border-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!draftValid || saving}
              onClick={() => void saveDraft()}
              className="h-11 px-8 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : draft.id ? (
                'Save changes'
              ) : (
                'Save question'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              Answers linked to this question will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PerformanceReviewTemplate;
