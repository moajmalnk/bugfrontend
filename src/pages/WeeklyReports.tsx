import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardCopy,
  ClipboardList,
  Search,
  Users,
  User,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { extractApiErrorMessage } from '@/lib/apiError';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import {
  adminDeleteWeeklyReport,
  adminUpdateWeeklyReport,
  clampWeeklyReportField,
  emptyWeeklyReportFields,
  formatWeeklyReportDocument,
  isWeeklyReportValid,
  listWeeklyReports,
  recentMondaySaturdayWeeks,
  weeklyReportLines,
  type WeeklyReportFields,
  type WeeklyReportListItem,
} from '@/services/weeklyReportService';

const PAGE_SIZE = 20;
const FIELD_MAX = 20000;

function ReportCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 bg-white/80 p-5 shadow-sm dark:border-gray-700/60 dark:bg-gray-900/80 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <Skeleton className="h-5 w-40 rounded-xl" />
        <Skeleton className="h-5 w-48 rounded-xl" />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <Skeleton className="col-span-12 h-24 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-24 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-24 rounded-xl md:col-span-6" />
        <Skeleton className="col-span-12 h-24 rounded-xl md:col-span-6" />
      </div>
    </div>
  );
}

function SectionPreview({
  title,
  text,
  empty,
  tone,
}: {
  title: string;
  text: string;
  empty: string;
  tone: 'emerald' | 'blue' | 'orange' | 'violet';
}) {
  const lines = weeklyReportLines(text);
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  };
  return (
    <div className="col-span-12 min-w-0 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/50 md:col-span-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tones[tone]}`}>
          {lines.length}
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1 text-sm text-foreground">
          {lines.slice(0, 3).map((line, idx) => (
            <li key={`${title}-${idx}`} className="truncate">
              {line}
            </li>
          ))}
          {lines.length > 3 ? (
            <li className="text-xs text-muted-foreground">+{lines.length - 3} more</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export default function WeeklyReports() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = String(currentUser?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const canViewTeam = isAdmin;
  const defaultTab = canViewTeam ? 'team' : 'mine';
  const activeTab = searchParams.get('tab') === 'mine' || searchParams.get('tab') === 'team'
    ? (searchParams.get('tab') as 'team' | 'mine')
    : defaultTab;

  const weeks = useMemo(() => recentMondaySaturdayWeeks(16), []);
  const currentWeekStart = weeks[0]?.weekStart || '';
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState<WeeklyReportListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<WeeklyReportListItem | null>(null);
  const [editing, setEditing] = useState<WeeklyReportListItem | null>(null);
  const [editFields, setEditFields] = useState<WeeklyReportFields>(emptyWeeklyReportFields());
  const [editBaseline, setEditBaseline] = useState<WeeklyReportFields>(emptyWeeklyReportFields());
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WeeklyReportListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const scope = canViewTeam && activeTab === 'team' ? 'team' : 'mine';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listWeeklyReports({
        scope,
        week_start: weekStart || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setError(extractApiErrorMessage(err, 'Could not load weekly reports.'));
    } finally {
      setLoading(false);
    }
  }, [scope, weekStart, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [scope, weekStart]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.user_name} ${item.week_label} ${item.date_label}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  if (role === 'tester') {
    return <Navigate to={`/${currentUser?.role || 'tester'}/bugs`} replace />;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedDoc = selected ? formatWeeklyReportDocument(selected) : '';
  const editDirty =
    editFields.work_completed !== editBaseline.work_completed ||
    editFields.work_in_progress !== editBaseline.work_in_progress ||
    editFields.issues_blockers !== editBaseline.issues_blockers ||
    editFields.plan_next_week !== editBaseline.plan_next_week;
  const editValid = isWeeklyReportValid(editFields);

  const openEdit = (item: WeeklyReportListItem) => {
    const next: WeeklyReportFields = {
      work_completed: item.work_completed || '',
      work_in_progress: item.work_in_progress || '',
      issues_blockers: item.issues_blockers || '',
      plan_next_week: item.plan_next_week || '',
    };
    setEditFields(next);
    setEditBaseline(next);
    setEditing(item);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    if (editDirty && !window.confirm('You have unsaved changes.')) return;
    setEditing(null);
    setEditFields(emptyWeeklyReportFields());
    setEditBaseline(emptyWeeklyReportFields());
  };

  const saveEdit = async () => {
    if (!editing || savingEdit || !editValid) return;
    setSavingEdit(true);
    try {
      const updated = await adminUpdateWeeklyReport(editing.id, editFields);
      toast({ title: 'Weekly report updated' });
      setEditing(null);
      setEditFields(emptyWeeklyReportFields());
      setEditBaseline(emptyWeeklyReportFields());
      if (selected?.id === updated.id) setSelected(updated);
      await load();
    } catch (err) {
      toast({
        title: 'Update failed',
        description: extractApiErrorMessage(err, 'Could not save changes.'),
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await adminDeleteWeeklyReport(deleteTarget.id);
      toast({ title: 'Weekly report deleted' });
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      notifyAdminNavCountsChanged();
      await load();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: extractApiErrorMessage(err, 'Could not delete report.'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const copyReport = async (item: WeeklyReportListItem) => {
    const text = formatWeeklyReportDocument(item);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copied weekly report' });
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Select the report text and copy it manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-transparent to-violet-50/50 dark:from-indigo-950/20 dark:via-transparent dark:to-violet-950/20" />
          <div className="relative rounded-2xl border border-gray-200/50 bg-white/80 p-6 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2 shadow-lg">
                    <ClipboardList className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-transparent bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text dark:from-white dark:via-gray-100 dark:to-gray-300 sm:text-4xl">
                      Weekly Report
                    </h1>
                    <div className="mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600" />
                  </div>
                </div>
                <p className="max-w-2xl text-base font-medium text-muted-foreground">
                  {canViewTeam
                    ? 'Review Saturday weekly reports across the team, or open your own.'
                    : 'Your Saturday weekly summaries — work completed, in progress, blockers, and next week.'}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 shadow-sm dark:border-indigo-800 dark:from-indigo-950/30 dark:to-violet-950/30">
                <div className="rounded-lg bg-indigo-500 p-1.5">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold tabular-nums text-indigo-700 dark:text-indigo-300">{total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {canViewTeam ? (
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              p.set('tab', val);
              return p;
            });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/50 to-indigo-50/50 dark:from-gray-800/50 dark:to-indigo-900/50" />
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/60 p-2 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/60">
              <TabsList className="grid h-14 w-full grid-cols-2 bg-transparent p-1">
                <TabsTrigger
                  value="team"
                  className="rounded-xl text-sm font-semibold data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800 sm:text-base"
                >
                  <Users className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Team Reports
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {activeTab === 'team' ? total : '—'}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="mine"
                  className="rounded-xl text-sm font-semibold data-[state=active]:border data-[state=active]:border-gray-200 data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:border-gray-700 dark:data-[state=active]:bg-gray-800 sm:text-base"
                >
                  <User className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  My Reports
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {activeTab === 'mine' ? total : '—'}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </Tabs>
        ) : null}

        <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-4 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/80 sm:p-5">
          <div className="grid grid-cols-12 gap-4">
            <div className={`relative col-span-12 ${canViewTeam && scope === 'team' ? 'md:col-span-7' : 'md:col-span-8'}`}>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, 80))}
                maxLength={80}
                placeholder={scope === 'team' ? 'Search by name...' : 'Search your reports...'}
                className="h-11 rounded-xl border-2 pl-9"
              />
            </div>
            <div className={`col-span-12 ${canViewTeam && scope === 'team' ? 'md:col-span-5' : 'md:col-span-4'}`}>
              <Select value={weekStart} onValueChange={setWeekStart}>
                <SelectTrigger className="h-11 rounded-xl border-2">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {weeks.map((week) => (
                    <SelectItem key={week.weekStart} value={week.weekStart}>
                      {week.weekStart === currentWeekStart ? `This week · ${week.label}` : week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col gap-4">
            <ReportCardSkeleton />
            <ReportCardSkeleton />
            <ReportCardSkeleton />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/70 px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900/60">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
              <ClipboardList className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {items.length > 0
                ? 'No matching reports'
                : scope === 'team'
                  ? 'No team reports this week'
                  : 'No weekly report yet'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {items.length > 0
                ? 'Try a different name or clear the search.'
                : scope === 'team'
                  ? 'Reports appear here after Saturday checkout. Try another week or search.'
                  : 'File your weekly report during Saturday checkout. It will show here afterwards.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-gray-200/60 bg-white/80 p-5 shadow-sm dark:border-gray-700/60 dark:bg-gray-900/80 sm:p-6"
              >
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-foreground">{item.user_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.date_label} · {item.week_label}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => void copyReport(item)}
                    >
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
                      onClick={() => setSelected(item)}
                    >
                      Open report
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <SectionPreview
                    title="Work Completed"
                    text={item.work_completed}
                    empty="No completed items"
                    tone="emerald"
                  />
                  <SectionPreview
                    title="Work in Progress"
                    text={item.work_in_progress}
                    empty="No in-progress items"
                    tone="blue"
                  />
                  <SectionPreview
                    title="Issues / Blockers"
                    text={item.issues_blockers || 'No major blockers.'}
                    empty="No major blockers."
                    tone="orange"
                  />
                  <SectionPreview
                    title="Plan for Next Week"
                    text={item.plan_next_week}
                    empty="No plan listed"
                    tone="violet"
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        {total > PAGE_SIZE ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200/50 bg-white/80 px-4 py-3 dark:border-gray-700/50 dark:bg-gray-900/80">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white">
            <DialogHeader className="space-y-2 pr-8 text-left">
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="rounded-xl bg-white/20 p-2">
                  <ClipboardList className="h-6 w-6" />
                </div>
                Weekly Report
              </DialogTitle>
              <DialogDescription className="text-base text-white/90">
                {selected ? `${selected.user_name} · ${selected.week_label}` : ''}
              </DialogDescription>
            </DialogHeader>
          </div>
          {selected ? (
            <>
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5 dark:bg-gray-900/50 sm:p-6">
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <pre className="m-0 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {selectedDoc}
                  </pre>
                </div>
              </div>
              <div className="border-t border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div className={`grid gap-3 ${isAdmin ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
                  {isAdmin ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl"
                        onClick={() => {
                          const item = selected;
                          setSelected(null);
                          if (item) openEdit(item);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                        onClick={() => setDeleteTarget(selected)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    className={`h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white hover:from-indigo-700 hover:to-violet-700 ${isAdmin ? '' : 'w-full'}`}
                    onClick={() => void copyReport(selected)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Copy report
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="flex max-h-[92vh] w-[95vw] max-w-[600px] flex-col gap-0 overflow-hidden rounded-2xl p-0">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white">
            <DialogHeader className="space-y-2 pr-8 text-left">
              <DialogTitle className="text-xl font-bold">Edit weekly report</DialogTitle>
              <DialogDescription className="text-base text-white/90">
                {editing ? `${editing.user_name} · ${editing.week_label}` : ''}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-weekly-completed">Work Completed This Week *</Label>
                <Textarea
                  id="admin-weekly-completed"
                  value={editFields.work_completed}
                  maxLength={FIELD_MAX}
                  onChange={(e) =>
                    setEditFields((p) => ({
                      ...p,
                      work_completed: clampWeeklyReportField(e.target.value),
                    }))
                  }
                  className="min-h-[100px] resize-none rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-weekly-wip">Work in Progress *</Label>
                <Textarea
                  id="admin-weekly-wip"
                  value={editFields.work_in_progress}
                  maxLength={FIELD_MAX}
                  onChange={(e) =>
                    setEditFields((p) => ({
                      ...p,
                      work_in_progress: clampWeeklyReportField(e.target.value),
                    }))
                  }
                  className="min-h-[100px] resize-none rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-weekly-blockers">Issues / Blockers</Label>
                <Textarea
                  id="admin-weekly-blockers"
                  value={editFields.issues_blockers}
                  maxLength={FIELD_MAX}
                  onChange={(e) =>
                    setEditFields((p) => ({
                      ...p,
                      issues_blockers: clampWeeklyReportField(e.target.value),
                    }))
                  }
                  className="min-h-[80px] resize-none rounded-xl"
                  placeholder="No major blockers."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="admin-weekly-plan">Plan for Next Week *</Label>
                <Textarea
                  id="admin-weekly-plan"
                  value={editFields.plan_next_week}
                  maxLength={FIELD_MAX}
                  onChange={(e) =>
                    setEditFields((p) => ({
                      ...p,
                      plan_next_week: clampWeeklyReportField(e.target.value),
                    }))
                  }
                  className="min-h-[100px] resize-none rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-gray-200 p-5 dark:border-gray-700 sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={savingEdit}
              onClick={closeEdit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
              disabled={!editValid || savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete weekly report?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This permanently removes ${deleteTarget.user_name}'s report for ${deleteTarget.week_label}. They will need to file it again at Saturday checkout.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-700"
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
}
