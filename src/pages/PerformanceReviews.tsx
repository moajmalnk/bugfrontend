import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Settings2,
  Star,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { ItemsPerPageSelect } from '@/components/pagination/ItemsPerPageSelect';
import {
  useUrlPagination,
  useResetUrlPageOnChange,
} from '@/hooks/useUrlPagination';
import {
  performanceReviewService,
  REVIEW_DEPARTMENTS,
  type ActiveReviewUser,
  type ChallengeEntry,
  type ChallengesMonthGroup,
  type PerformanceReview,
} from '@/services/performanceReviewService';
import { PerformanceReviewDetailDialog } from '@/components/reviews/PerformanceReviewDetailDialog';

const filterTriggerClass =
  'w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-violet-500/40';

function formatMonthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
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

function formatChallengeAnswer(
  questionType: string,
  answerText: string
): { text?: string; tags?: string[] } {
  const raw = (answerText ?? '').trim();
  if (!raw) return { text: '—' };
  if (questionType === 'boolean') {
    return { text: raw === 'true' ? 'Yes' : raw === 'false' ? 'No' : raw };
  }
  if (questionType === 'multi_select') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const tags = parsed.map(String).filter(Boolean);
        return tags.length ? { tags } : { text: '—' };
      }
    } catch {
      /* fall through */
    }
  }
  return { text: raw };
}

type EmployeeChallengeGroup = {
  review_id: number;
  employee_id: string;
  employee_username: string;
  department: string;
  overall_rating: number | null;
  status: string;
  notes: ChallengeEntry[];
};

function groupChallengesByEmployee(
  entries: ChallengeEntry[]
): EmployeeChallengeGroup[] {
  const map = new Map<string, EmployeeChallengeGroup>();
  for (const e of entries) {
    const key = `${e.review_id}:${e.employee_id}`;
    if (!map.has(key)) {
      map.set(key, {
        review_id: e.review_id,
        employee_id: e.employee_id,
        employee_username: e.employee_username,
        department: e.department,
        overall_rating: e.overall_rating ?? null,
        status: e.status,
        notes: [],
      });
    }
    map.get(key)!.notes.push(e);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.employee_username.localeCompare(b.employee_username)
  );
}

const TableRowSkeleton = () => (
  <TableRow>
    {Array.from({ length: 7 }).map((_, i) => (
      <TableCell key={i}>
        <Skeleton className="h-5 w-24" />
      </TableCell>
    ))}
  </TableRow>
);

const CardSkeleton = () => (
  <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-5 space-y-3">
    <Skeleton className="h-5 w-2/5" />
    <Skeleton className="h-4 w-3/5" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-9 w-24 ml-auto" />
  </div>
);

const ReviewCard = ({
  review,
  role,
  onOpen,
  onDelete,
}: {
  review: PerformanceReview;
  role: string;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onOpen(review.id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(review.id);
      }
    }}
    className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 cursor-pointer text-left"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-indigo-50/40 dark:from-violet-950/20 dark:to-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-bold text-gray-900 dark:text-white truncate">
            {review.employee_username || review.employee_id}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatMonthLabel(review.review_month)}
          </p>
        </div>
        <Badge
          className={cn(
            'rounded-full shrink-0 capitalize',
            review.status === 'completed'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          )}
        >
          {review.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20">
          <Users className="h-4 w-4 text-violet-600" />
          <span className="text-sm truncate">{review.department || '—'}</span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20">
          <Star className="h-4 w-4 text-amber-500" />
          <span className="text-sm">
            {review.overall_rating != null
              ? Number(review.overall_rating).toFixed(2)
              : '—'}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground truncate">
          Reviewer: {review.reviewer_username || '—'}
        </span>
        <div
          className="flex gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button size="sm" variant="outline" className="rounded-xl" asChild>
            <Link to={`/${role}/performance-reviews/${review.id}/edit`}>Edit</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl text-destructive"
            onClick={() => onDelete(review.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const PerformanceReviews = () => {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const navigate = useNavigate();
  const role = getEffectiveRole(currentUser || {});
  const canManage = hasPermissionOrAdmin(
    role,
    hasPermission,
    'PERFORMANCE_REVIEWS_MANAGE'
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'challenges' ? 'challenges' : 'reviews';

  const [search, setSearch] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [reviewMonth, setReviewMonth] = useState('');
  const [status, setStatus] = useState('');

  const { page, pageSize, setPage, setPageSize } = useUrlPagination({
    defaultPageSize: 12,
  });
  useResetUrlPageOnChange(setPage, [
    search,
    employeeId,
    department,
    reviewMonth,
    status,
  ]);

  const [users, setUsers] = useState<ActiveReviewUser[]>([]);
  const [items, setItems] = useState<PerformanceReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<ChallengesMonthGroup[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengeMonth, setChallengeMonth] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const months = useMemo(() => monthOptions(), []);
  const hasFilters = Boolean(search || employeeId || department || reviewMonth || status);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const challengePeopleCount = useMemo(() => {
    const ids = new Set<string>();
    challenges.forEach((g) =>
      g.entries.forEach((e) => ids.add(`${e.review_id}:${e.employee_id}`))
    );
    return ids.size;
  }, [challenges]);
  const challengeNoteCount = challenges.reduce((n, g) => n + g.entries.length, 0);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await performanceReviewService.getActiveUsers());
    } catch {
      /* ignore */
    }
  }, []);

  const loadReviews = useCallback(async () => {
    if (!canManage) return;
    // Only show list skeletons when the Reviews tab is visible
    if (activeTab === 'reviews') setLoading(true);
    try {
      const data = await performanceReviewService.listReviews({
        search: search.trim() || undefined,
        employee_id: employeeId || undefined,
        department: department || undefined,
        review_month: reviewMonth || undefined,
        status: status || undefined,
        page,
        limit: pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast({
        title: 'Failed to load reviews',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [
    canManage,
    activeTab,
    search,
    employeeId,
    department,
    reviewMonth,
    status,
    page,
    pageSize,
  ]);

  const loadChallenges = useCallback(async () => {
    if (!canManage) return;
    if (activeTab === 'challenges') setChallengesLoading(true);
    try {
      setChallenges(
        await performanceReviewService.getChallengesSummary(
          challengeMonth || undefined
        )
      );
    } catch (err) {
      toast({
        title: 'Failed to load challenges',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setChallengesLoading(false);
    }
  }, [canManage, activeTab, challengeMonth]);

  useEffect(() => {
    if (!canManage) return;
    void loadUsers();
  }, [canManage, loadUsers]);

  // Why: Keep both tab badges accurate even when the inactive tab is not visible.
  useEffect(() => {
    if (!canManage) return;
    void loadReviews();
  }, [canManage, loadReviews]);

  useEffect(() => {
    if (!canManage) return;
    void loadChallenges();
  }, [canManage, loadChallenges]);

  const clearFilters = () => {
    setSearch('');
    setEmployeeId('');
    setDepartment('');
    setReviewMonth('');
    setStatus('');
  };

  const confirmDelete = async () => {
    if (deleteId == null || deleting) return;
    setDeleting(true);
    try {
      await performanceReviewService.deleteReview(deleteId);
      toast({ title: 'Review deleted' });
      setDeleteId(null);
      await Promise.all([loadReviews(), loadChallenges()]);
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
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl" />
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <ClipboardList className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Access denied</h3>
              <p className="text-muted-foreground">
                You do not have permission to manage performance reviews.
              </p>
            </div>
          </div>
      </div>
    );
  }

  const searchFilterBar = (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-violet-50/30 dark:from-gray-800/30 dark:to-violet-900/20 rounded-2xl" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-500 rounded-lg">
            <Search className="h-4 w-4 text-white" />
          </div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Search & Filter</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10 h-11 rounded-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-violet-500/50"
            placeholder="Search employee name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <Select
              value={employeeId || '__all__'}
              onValueChange={(v) => setEmployeeId(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All employees</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
              <Users className="h-3.5 w-3.5 text-white" />
            </div>
            <Select
              value={department || '__all__'}
              onValueChange={(v) => setDepartment(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All departments</SelectItem>
                {REVIEW_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <Select
              value={reviewMonth || '__all__'}
              onValueChange={(v) => setReviewMonth(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All months</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
              <ClipboardList className="h-3.5 w-3.5 text-white" />
            </div>
            <Select
              value={status || '__all__'}
              onValueChange={(v) => setStatus(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className={filterTriggerClass}>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {hasFilters ? (
          <Button variant="outline" className="rounded-xl" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );

  const paginationFooter =
    total > 0 ? (
      <div className="flex flex-col gap-3 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
            </span>{' '}
            of {total} reviews
          </p>
          <ItemsPerPageSelect
            value={pageSize}
            onChange={setPageSize}
            options={[12, 25, 50]}
          />
        </div>
        {totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8 overflow-x-hidden">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-transparent to-indigo-50/50 dark:from-violet-950/20 dark:via-transparent dark:to-indigo-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 sm:gap-6 min-w-0">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl shadow-lg shrink-0">
                    <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      Reviews
                    </h1>
                    <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl min-w-0 break-words">
                  Conduct monthly reviews for active team members.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 rounded-xl font-semibold"
                  onClick={() => navigate(`/${role}/performance-reviews/template`)}
                >
                  <Settings2 className="mr-2 h-5 w-5" />
                  Manage Template
                </Button>
                <Button
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  onClick={() => navigate(`/${role}/performance-reviews/new`)}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Conduct Review
                </Button>
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border border-violet-200 dark:border-violet-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-violet-500 rounded-lg">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                    {total}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              if (tab === 'challenges') p.set('tab', 'challenges');
              else p.delete('tab');
              p.delete('page');
              return p;
            });
          }}
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-violet-50/50 dark:from-gray-800/50 dark:to-violet-900/50 rounded-2xl" />
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="reviews"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Reviews</span>
                  <span className="sm:hidden">List</span>
                  <span className="ml-2 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs font-bold">
                    {total}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="challenges"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">Challenges</span>
                  <span className="sm:hidden">Blockers</span>
                  <span className="ml-2 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                    {challengePeopleCount}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="reviews" className="space-y-6 sm:space-y-8 min-w-0">
            {searchFilterBar}

            {loading ? (
              <div className="space-y-4">
                <div className="hidden xl:block relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <TableHead key={i}>
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="grid xl:hidden grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 via-indigo-50/30 to-purple-50/50 dark:from-violet-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl" />
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    {hasFilters ? (
                      <Search className="h-10 w-10 text-white" />
                    ) : (
                      <ClipboardList className="h-10 w-10 text-white" />
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    {hasFilters ? 'No results found' : 'No reviews yet'}
                  </h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    {hasFilters
                      ? 'No reviews match your current filters. Try adjusting or clearing them.'
                      : 'Conduct a review for an active employee to get started.'}
                  </p>
                  {hasFilters ? (
                    <Button variant="outline" size="lg" className="h-12 rounded-xl" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="h-12 px-6 bg-gradient-to-r from-violet-600 to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl"
                      onClick={() => navigate(`/${role}/performance-reviews/new`)}
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Conduct Review
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="hidden xl:block relative overflow-x-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-50/20 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/10 rounded-2xl" />
                  <div className="relative min-w-[720px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-violet-50 dark:from-gray-800 dark:to-violet-900/40">
                          <TableHead className="font-bold text-gray-900 dark:text-white py-4">
                            Employee
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white">
                            Department
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white">
                            Month
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white">
                            Reviewer
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white">
                            Rating
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white">
                            Status
                          </TableHead>
                          <TableHead className="font-bold text-gray-900 dark:text-white text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((r, idx) => (
                          <TableRow
                            key={r.id}
                            onClick={() => setDetailId(r.id)}
                            className={cn(
                              'cursor-pointer hover:bg-gradient-to-r hover:from-violet-50/50 hover:to-indigo-50/50 dark:hover:from-violet-950/20 dark:hover:to-indigo-950/20',
                              idx % 2 === 1 && 'bg-muted/20'
                            )}
                          >
                            <TableCell className="font-medium">
                              {r.employee_username || r.employee_id}
                            </TableCell>
                            <TableCell>{r.department}</TableCell>
                            <TableCell>{formatMonthLabel(r.review_month)}</TableCell>
                            <TableCell>{r.reviewer_username || '—'}</TableCell>
                            <TableCell>
                              {r.overall_rating != null ? (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                  {Number(r.overall_rating).toFixed(2)}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  'rounded-full capitalize',
                                  r.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                )}
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl hover:border-violet-300 hover:text-violet-700"
                                  asChild
                                >
                                  <Link to={`/${role}/performance-reviews/${r.id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl text-destructive"
                                  onClick={() => setDeleteId(r.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid xl:hidden grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {items.map((r) => (
                    <ReviewCard
                      key={r.id}
                      review={r}
                      role={role}
                      onOpen={setDetailId}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>

                {paginationFooter}
              </>
            )}
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6 sm:space-y-8 min-w-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-amber-50/30 dark:from-gray-800/30 dark:to-amber-900/20 rounded-2xl" />
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-amber-500 rounded-lg shrink-0">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-gray-900 dark:text-white">
                        Team challenges summary
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Blockers, client delays, and overtime causes — grouped by person
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {challengePeopleCount} people
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1 text-xs font-semibold"
                    >
                      {challengeNoteCount} notes
                    </Badge>
                    <Select
                      value={challengeMonth || '__all__'}
                      onValueChange={(v) =>
                        setChallengeMonth(v === '__all__' ? '' : v)
                      }
                    >
                      <SelectTrigger className={cn(filterTriggerClass, 'w-[200px]')}>
                        <SelectValue placeholder="All months" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All months</SelectItem>
                        {months.map((m) => (
                          <SelectItem key={m} value={m}>
                            {formatMonthLabel(m)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {challengesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : challenges.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-2xl" />
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <AlertTriangle className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">No challenges recorded</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    When reviews include blockers or overtime notes, they will appear
                    here grouped by employee — like a monthly team challenges board.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {challenges.map((group) => {
                  const people = groupChallengesByEmployee(group.entries);
                  return (
                    <section
                      key={group.review_month}
                      className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/25 via-transparent to-orange-50/15 dark:from-amber-950/10 dark:to-orange-950/5 pointer-events-none" />
                      <div className="relative p-5 sm:p-6 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md shrink-0">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold tracking-tight">
                                {formatMonthLabel(group.review_month)}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                {people.length} team member
                                {people.length === 1 ? '' : 's'} with recorded challenges
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {people.map((person) => (
                            <button
                              key={`${person.review_id}-${person.employee_id}`}
                              type="button"
                              onClick={() => setDetailId(person.review_id)}
                              className="group text-left rounded-2xl border border-border/60 bg-background/70 hover:border-amber-400/50 hover:shadow-md transition-all duration-200 p-4 sm:p-5 space-y-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-base text-foreground truncate">
                                      {person.employee_username}
                                    </span>
                                    {person.department ? (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full text-xs"
                                      >
                                        {person.department}
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {person.notes.length} challenge note
                                    {person.notes.length === 1 ? '' : 's'}
                                    {person.overall_rating != null
                                      ? ` · Rating ${Number(person.overall_rating).toFixed(2)}`
                                      : ''}
                                  </p>
                                </div>
                                <Badge
                                  className={cn(
                                    'rounded-full capitalize shrink-0',
                                    person.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                  )}
                                >
                                  {person.status}
                                </Badge>
                              </div>

                              <div className="flex flex-col gap-3">
                                {person.notes.map((note, noteIdx) => {
                                  const formatted = formatChallengeAnswer(
                                    note.question_type,
                                    note.answer_text
                                  );
                                  return (
                                    <div
                                      key={`${note.question_text}-${noteIdx}`}
                                      className="rounded-xl border border-border/40 bg-muted/25 p-3 space-y-1.5"
                                    >
                                      <p className="text-xs font-medium text-muted-foreground leading-snug">
                                        {note.question_text}
                                      </p>
                                      {formatted.tags ? (
                                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                                          {formatted.tags.map((tag) => (
                                            <span
                                              key={tag}
                                              className="inline-flex items-center rounded-full bg-amber-100/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 text-xs font-medium"
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                          {formatted.text}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Click to open full review →
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

      <PerformanceReviewDetailDialog
        reviewId={detailId}
        role={role}
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review and all recorded answers.
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

export default PerformanceReviews;
