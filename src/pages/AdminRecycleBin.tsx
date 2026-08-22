import {
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  LIST_TABS_CONTENT,
} from '@/components/layout/list-page';
import { ListPagination } from '@/components/pagination/ListPagination';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DashboardPeriodFilter } from '@/components/dashboard/DashboardPeriodFilter';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useUrlPagination,
  useResetUrlPageOnChange,
  useClampUrlPage,
  useMergeSearchParam,
} from '@/hooks/useUrlPagination';
import { extractApiErrorMessage } from '@/lib/apiError';
import {
  resolveWorkPeriod,
  type WorkPeriodPreset,
} from '@/lib/dashboardPeriod';
import { formatLocalDate } from '@/lib/utils/dateUtils';
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import {
  bulkRecycleBinAction,
  fetchRecycleBinStats,
  listRecycleBin,
  purgeRecycleBinItem,
  RECYCLE_BIN_ENTITY_LABELS,
  RecycleBinItem,
  restoreRecycleBinItem,
} from '@/services/recycleBinService';
import {
  Activity,
  Archive,
  Bug,
  Building2,
  Calendar,
  Clapperboard,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  Megaphone,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  ClipboardList,
  ListTodo,
  BookOpen,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 20;

const PERIOD_PRESETS: WorkPeriodPreset[] = [
  'all',
  'today',
  'yesterday',
  'week',
  'last_week',
  'month',
  'last_month',
  'year',
  'last_year',
  'custom',
];

function parsePeriodPreset(
  raw: string | null,
  from: string,
  to: string
): WorkPeriodPreset {
  if (raw && PERIOD_PRESETS.includes(raw as WorkPeriodPreset)) {
    return raw as WorkPeriodPreset;
  }
  if (from || to) return 'custom';
  return 'all';
}

const TAB_TYPES = ['all', 'bug', 'project', 'update', 'user', 'client'] as const;

type TabType = (typeof TAB_TYPES)[number];

const TAB_CONFIG: Record<
  TabType,
  {
    label: string;
    shortLabel: string;
    icon: typeof Trash2;
    badgeClass: string;
  }
> = {
  all: {
    label: 'All items',
    shortLabel: 'All',
    icon: Trash2,
    badgeClass:
      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  },
  bug: {
    label: 'Bugs',
    shortLabel: 'Bugs',
    icon: Bug,
    badgeClass:
      'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  },
  project: {
    label: 'Projects',
    shortLabel: 'Projects',
    icon: FolderOpen,
    badgeClass:
      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  update: {
    label: 'Updates',
    shortLabel: 'Updates',
    icon: RefreshCw,
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  user: {
    label: 'Users',
    shortLabel: 'Users',
    icon: User,
    badgeClass:
      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  },
  client: {
    label: 'Clients',
    shortLabel: 'Clients',
    icon: Building2,
    badgeClass:
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  },
};

function entityIcon(type: string) {
  switch (type) {
    case 'bug':
      return Bug;
    case 'project':
      return FolderOpen;
    case 'update':
      return RefreshCw;
    case 'user':
      return User;
    case 'client':
      return Building2;
    case 'weekly_report':
      return Calendar;
    case 'announcement':
      return Megaphone;
    case 'feedback':
      return MessageSquare;
    case 'short':
      return Clapperboard;
    case 'activity':
      return Activity;
    case 'doc':
      return FileText;
    case 'sheet':
      return FileSpreadsheet;
    case 'role':
      return Shield;
    case 'performance_review':
      return ClipboardList;
    case 'work_submission':
      return Archive;
    case 'shared_task':
    case 'user_task':
      return ListTodo;
    case 'codo_rule':
      return BookOpen;
    default:
      return Trash2;
  }
}

function getEntityTypeColor(type: string) {
  switch (type) {
    case 'bug':
      return 'text-orange-600 border-orange-200 bg-orange-50 dark:text-orange-300 dark:border-orange-800 dark:bg-orange-950/40';
    case 'project':
      return 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/40';
    case 'update':
      return 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/40';
    case 'user':
      return 'text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:bg-purple-950/40';
    case 'client':
      return 'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/40';
    default:
      return 'text-rose-600 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-800 dark:bg-rose-950/40';
  }
}

const filterFieldClass = 'flex items-center gap-2 min-w-0 w-full';
const filterTriggerClass =
  'h-11 w-full min-w-0 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm';

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-4 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-[22px] w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-[200px]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-28" />
      </TableCell>
      <TableCell className="text-right">
        <Skeleton className="h-9 w-[140px] ml-auto" />
      </TableCell>
    </TableRow>
  );
}

function CardSkeleton() {
  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="p-4 sm:p-5">
        <div className="flex justify-between items-center gap-3">
          <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
          <Skeleton className="h-6 w-16 sm:w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5 pt-0">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </CardContent>
      <CardFooter className="p-4 sm:p-5 pt-0 gap-2">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </CardFooter>
    </Card>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
      <div className="space-y-2 sm:space-y-3">
        <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 lg:w-48" />
        <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 lg:w-80" />
      </div>
      <Skeleton className="h-12 w-full sm:w-32 lg:w-40 rounded-xl" />
    </div>
  );
}

export default function AdminRecycleBin() {
  const { currentUser } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canView = hasPermissionOrAdmin(role, hasPermission, 'RECYCLE_BIN_VIEW');
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'RECYCLE_BIN_MANAGE');

  const [searchParams, setSearchParams] = useSearchParams();
  const mergeSearchParam = useMergeSearchParam();
  const initialTab = (searchParams.get('tab') || 'all') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(
    TAB_TYPES.includes(initialTab) ? initialTab : 'all'
  );
  const q = searchParams.get('q') || '';
  const entityFilter = searchParams.get('type') || 'all';
  const customFrom = searchParams.get('from') || '';
  const customTo = searchParams.get('to') || '';
  const periodPreset = parsePeriodPreset(
    searchParams.get('period'),
    customFrom,
    customTo
  );

  const period = useMemo(
    () => resolveWorkPeriod(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo]
  );

  const [searchDraft, setSearchDraft] = useState(q);

  const { page, setPage, pageSize, setPageSize, clampToTotalPages } =
    useUrlPagination({ defaultPageSize: PAGE_SIZE });
  useResetUrlPageOnChange(setPage, [
    activeTab,
    q,
    entityFilter,
    periodPreset,
    customFrom,
    customTo,
  ]);

  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<string, number>>({ all: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<RecycleBinItem | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<RecycleBinItem | null>(null);
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);

  const activeEntityType = activeTab !== 'all' ? activeTab : entityFilter;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft !== q) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (searchDraft.trim()) next.set('q', searchDraft.trim().slice(0, 100));
          else next.delete('q');
          return next;
        });
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, q, setSearchParams]);

  useEffect(() => {
    const urlTab = (searchParams.get('tab') || 'all') as TabType;
    if (TAB_TYPES.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [list, statData] = await Promise.all([
        listRecycleBin({
          entity_type: activeEntityType,
          q,
          date_from: periodPreset === 'all' ? undefined : period.from,
          date_to: periodPreset === 'all' ? undefined : period.to,
          page,
          limit: pageSize,
        }),
        fetchRecycleBinStats(),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setStats(statData);
      setSelected(new Set());
    } catch (err) {
      toast({
        title: 'Could not load recycle bin',
        description: extractApiErrorMessage(err, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [canView, activeEntityType, q, periodPreset, period.from, period.to, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useClampUrlPage(clampToTotalPages, totalPages, !loading);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  const hasActiveFilters = Boolean(
    searchDraft.trim() || entityFilter !== 'all' || periodPreset !== 'all'
  );

  const setPeriodPreset = useCallback(
    (value: WorkPeriodPreset) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === 'all') {
          next.delete('period');
          next.delete('from');
          next.delete('to');
        } else {
          next.set('period', value);
          if (value !== 'custom') {
            next.delete('from');
            next.delete('to');
          }
        }
        return next;
      });
      setPage(1);
    },
    [setSearchParams, setPage]
  );

  const setCustomFrom = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', 'custom');
        if (value) next.set('from', value);
        else next.delete('from');
        return next;
      });
      setPage(1);
    },
    [setSearchParams, setPage]
  );

  const setCustomTo = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('period', 'custom');
        if (value) next.set('to', value);
        else next.delete('to');
        return next;
      });
      setPage(1);
    },
    [setSearchParams, setPage]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async () => {
    if (!restoreTarget || !canManage || restoringId) return;
    setRestoringId(restoreTarget.id);
    try {
      await restoreRecycleBinItem(restoreTarget.id);
      toast({
        title: 'Restored',
        description: `"${restoreTarget.title}" was restored.`,
      });
      notifyAdminNavCountsChanged();
      setRestoreTarget(null);
      await load();
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: extractApiErrorMessage(err, 'Could not restore item.'),
        variant: 'destructive',
      });
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget || !canManage || purgingId) return;
    setPurgingId(purgeTarget.id);
    try {
      await purgeRecycleBinItem(purgeTarget.id);
      toast({
        title: 'Permanently deleted',
        description: `"${purgeTarget.title}" was removed.`,
      });
      notifyAdminNavCountsChanged();
      setPurgeTarget(null);
      await load();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: extractApiErrorMessage(err, 'Could not permanently delete.'),
        variant: 'destructive',
      });
    } finally {
      setPurgingId(null);
    }
  };

  const handleBulkRestore = async () => {
    if (!canManage || bulkLoading || selected.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkRecycleBinAction('restore', [...selected]);
      toast({
        title: 'Bulk restore complete',
        description: `${result.restored ?? 0} restored${result.failed?.length ? `, ${result.failed.length} failed` : ''}.`,
      });
      notifyAdminNavCountsChanged();
      setBulkRestoreOpen(false);
      await load();
    } catch (err) {
      toast({
        title: 'Bulk restore failed',
        description: extractApiErrorMessage(err, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPurge = async () => {
    if (!canManage || bulkLoading || selected.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkRecycleBinAction('purge', [...selected]);
      toast({
        title: 'Bulk purge complete',
        description: `${result.purged ?? 0} deleted${result.failed?.length ? `, ${result.failed.length} failed` : ''}.`,
      });
      notifyAdminNavCountsChanged();
      setBulkPurgeOpen(false);
      await load();
    } catch (err) {
      toast({
        title: 'Bulk purge failed',
        description: extractApiErrorMessage(err, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('type');
      next.delete('period');
      next.delete('from');
      next.delete('to');
      return next;
    });
    setPage(1);
  };

  const getTabCount = (key: string) => {
    const n = stats[key] ?? 0;
    return n > 99 ? '99+' : String(n);
  };

  const renderEmptyState = () => {
    const noMatches = hasActiveFilters && (stats.all ?? 0) > 0;
    return (
      <div className="relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-red-50/30 to-orange-50/50 dark:from-rose-950/20 dark:via-red-950/10 dark:to-orange-950/20 rounded-2xl" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <Trash2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {noMatches ? 'No matching items' : 'Recycle bin is empty'}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {noMatches
              ? 'Try adjusting your search or filters to find what you are looking for.'
              : 'Deleted bugs, projects, users, and other items will appear here for admin recovery.'}
          </p>
          {noMatches && (
            <Button
              variant="outline"
              onClick={clearFilters}
              className="rounded-xl border-gray-200 dark:border-gray-700"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderItemActions = (item: RecycleBinItem, mobile = false) => {
    if (!canManage) return null;
    const btnClass = mobile
      ? 'flex-1 min-w-[7rem] h-11 font-semibold shadow-sm hover:shadow-md transition-all duration-300'
      : 'text-xs sm:text-sm h-9 px-3 font-semibold shadow-sm transition-all duration-300';

    return (
      <div className={cn('flex gap-2', mobile ? 'w-full' : 'justify-end flex-wrap')}>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            btnClass,
            'bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-400 dark:hover:border-emerald-600 text-emerald-700 dark:text-emerald-300'
          )}
          disabled={restoringId === item.id || purgingId === item.id}
          onClick={() => setRestoreTarget(item)}
        >
          {restoringId === item.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RotateCcw className={cn('h-4 w-4', !mobile && 'mr-1.5')} />
              {mobile ? 'Restore' : 'Restore'}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={cn(
            btnClass,
            'bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600 text-red-700 dark:text-red-300'
          )}
          disabled={restoringId === item.id || purgingId === item.id}
          onClick={() => setPurgeTarget(item)}
        >
          Delete
        </Button>
      </div>
    );
  };

  if (permissionsLoading) {
    return (
      <ListPageShell>
        <HeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </ListPageShell>
    );
  }

  if (!canView) {
    return (
      <ListPageShell>
        <div className="relative overflow-hidden min-h-[300px]">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-red-50/30 to-orange-50/50 dark:from-rose-950/20 dark:via-red-950/10 dark:to-orange-950/20 rounded-2xl" />
          <div className="relative flex flex-col items-center justify-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl px-6 py-16 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl">
              <Trash2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Access denied
            </h1>
            <p className="max-w-md text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Only administrators with Recycle Bin access can view deleted items.
            </p>
          </div>
        </div>
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="Recycle Bin"
        description="Review, restore, or permanently remove soft-deleted items across BugRicer."
        accentBarClassName="from-rose-600 to-red-700"
        underlayClassName="from-rose-50/50 via-transparent to-red-50/50 dark:from-rose-950/20 dark:via-transparent dark:to-red-950/20"
        count={stats.all ?? total}
        countIcon={<Trash2 className="h-5 w-5" />}
        countClassName="from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
        loading={loading && items.length === 0}
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          const nextTab = val as TabType;
          setActiveTab(nextTab);
          mergeSearchParam('tab', nextTab === 'all' ? null : nextTab, {
            replace: true,
          });
          setPage(1);
        }}
        className="w-full"
      >
        <ListPageTabsShell
          columns={6}
          underlayClassName="from-gray-50/50 to-rose-50/50 dark:from-gray-800/50 dark:to-rose-900/50"
        >
          {TAB_TYPES.map((t) => {
            const config = TAB_CONFIG[t];
            const Icon = config.icon;
            return (
              <ListPageTabTrigger key={t} value={t}>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline truncate">{config.label}</span>
                <span className="sm:hidden truncate">{config.shortLabel}</span>
                <span
                  className={cn(
                    'ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shrink-0',
                    config.badgeClass
                  )}
                >
                  {getTabCount(t)}
                </span>
              </ListPageTabTrigger>
            );
          })}
        </ListPageTabsShell>

        <TabsContent value={activeTab} className={LIST_TABS_CONTENT}>
          {/* Search & Filter — Updates-style panel */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-rose-50/30 dark:from-gray-800/30 dark:to-rose-900/30 rounded-2xl pointer-events-none" />
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-rose-500 rounded-lg">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Search & Filter
                    </h3>
                  </div>
                  {hasActiveFilters && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-primary">{total}</span>{' '}
                      matching item{total === 1 ? '' : 's'}
                    </p>
                  )}
                </div>

                <div className="relative group w-full min-w-0">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-rose-500 transition-colors pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search title, subtitle, or ID..."
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value.slice(0, 100))}
                    className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    autoComplete="off"
                    aria-label="Search recycle bin"
                  />
                </div>

                <div className="flex flex-col md:flex-row md:flex-wrap md:items-stretch gap-3 min-w-0">
                  {activeTab === 'all' && (
                    <div
                      className={cn(
                        filterFieldClass,
                        'w-full md:w-auto md:flex-1 md:min-w-[11rem] md:max-w-[16rem]'
                      )}
                    >
                      <div className="p-1.5 bg-orange-500 rounded-lg shrink-0" aria-hidden>
                        <Layers className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Select
                          value={entityFilter}
                          onValueChange={(v) => {
                            setSearchParams((prev) => {
                              const next = new URLSearchParams(prev);
                              if (v === 'all') next.delete('type');
                              else next.set('type', v);
                              return next;
                            });
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className={filterTriggerClass}>
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[100]">
                            {Object.entries(RECYCLE_BIN_ENTITY_LABELS).map(
                              ([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="w-full md:flex-1 md:min-w-[14rem] min-w-0">
                    <DashboardPeriodFilter
                      preset={periodPreset}
                      customFrom={customFrom}
                      customTo={customTo}
                      period={period}
                      onPresetChange={setPeriodPreset}
                      onCustomFromChange={setCustomFrom}
                      onCustomToChange={setCustomTo}
                      isFetching={loading}
                      disableFuture={false}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={!hasActiveFilters}
                    onClick={clearFilters}
                    className="h-11 md:h-12 w-full md:w-auto md:shrink-0 px-4 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 font-medium disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4 shrink-0 mr-1.5" />
                    <span className="truncate">Clear filters</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {selected.size > 0 && canManage && (
            <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/40 to-rose-50/40 dark:from-emerald-950/20 dark:to-rose-950/20 pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 sm:px-5 py-3 sm:py-4">
                <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  {selected.size} selected
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
                  <Button
                    size="sm"
                    disabled={bulkLoading}
                    onClick={() => setBulkRestoreOpen(true)}
                    className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-semibold shadow-sm"
                  >
                    {bulkLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                    )}
                    Restore selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={bulkLoading}
                    onClick={() => setBulkPurgeOpen(true)}
                    className="h-11 rounded-xl font-semibold shadow-sm"
                  >
                    Delete permanently
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && total > 0 && (
            <ListPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="items"
            />
          )}

          {loading ? (
            <>
              <div className="hidden xl:block relative overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="bg-muted/30">
                      {['', 'Type', 'Item', 'Deleted by', 'Deleted', 'Actions'].map(
                        (h) => (
                          <TableHead
                            key={h}
                            className="font-semibold text-sm sm:text-base"
                          >
                            {h}
                          </TableHead>
                        )
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </>
          ) : items.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div className="hidden xl:block relative overflow-x-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-rose-50/20 dark:from-gray-800/20 dark:to-rose-900/20 rounded-2xl pointer-events-none" />
                <div className="relative min-w-[980px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                  <Table className="w-full">
                    <TableHeader className="bg-gradient-to-r from-gray-50 to-rose-50 dark:from-gray-800 dark:to-rose-900">
                      <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                        {canManage && (
                          <TableHead className="w-12 px-4 py-4">
                            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                          </TableHead>
                        )}
                        <TableHead className="w-[120px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                          Type
                        </TableHead>
                        <TableHead className="min-w-[220px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                          Item
                        </TableHead>
                        <TableHead className="min-w-[140px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                          Deleted by
                        </TableHead>
                        <TableHead className="min-w-[140px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                          Deleted
                        </TableHead>
                        {canManage && (
                          <TableHead className="w-[200px] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => {
                        const Icon = entityIcon(item.entity_type);
                        return (
                          <TableRow
                            key={item.id}
                            className={cn(
                              'group hover:bg-gradient-to-r hover:from-rose-50/50 hover:to-red-50/50 dark:hover:from-rose-900/20 dark:hover:to-red-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50',
                              index % 2 === 0
                                ? 'bg-white/50 dark:bg-gray-900/50'
                                : 'bg-gray-50/30 dark:bg-gray-800/30'
                            )}
                          >
                            {canManage && (
                              <TableCell className="px-4 py-4">
                                <Checkbox
                                  checked={selected.has(item.id)}
                                  onCheckedChange={() => toggleOne(item.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="w-[120px] px-4 py-4">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'gap-1 font-medium text-xs sm:text-sm px-2 py-1 rounded-full shadow-sm',
                                  getEntityTypeColor(item.entity_type)
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {item.entity_label ?? item.entity_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="min-w-[220px] px-4 py-4">
                              <div className="flex items-start gap-2 min-w-0">
                                <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0 mt-2" />
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white break-words group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors">
                                    {item.title}
                                  </p>
                                  {item.subtitle && (
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[140px] px-4 text-sm text-gray-700 dark:text-gray-300 py-4 font-medium">
                              {item.deleted_by_username ?? item.deleted_by ?? '—'}
                            </TableCell>
                            <TableCell className="min-w-[140px] px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 py-4 whitespace-nowrap">
                              {formatLocalDate(item.deleted_at, 'datetime')}
                            </TableCell>
                            {canManage && (
                              <TableCell className="w-[200px] pr-4 text-right py-4">
                                {renderItemActions(item)}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
                {items.map((item) => {
                  const Icon = entityIcon(item.entity_type);
                  return (
                    <Card
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col justify-between hover:shadow-2xl transition-all duration-300"
                    >
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-50/40 via-transparent to-red-50/40 dark:from-rose-950/15 dark:via-transparent dark:to-red-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <CardHeader className="relative p-4 sm:p-5">
                        <div className="flex items-start gap-3 min-w-0">
                          {canManage && (
                            <Checkbox
                              checked={selected.has(item.id)}
                              onCheckedChange={() => toggleOne(item.id)}
                              className="mt-1 shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'gap-1 text-xs sm:text-sm h-fit shrink-0 px-2 py-1 rounded-full shadow-sm',
                                  getEntityTypeColor(item.entity_type)
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {item.entity_label ?? item.entity_type}
                              </Badge>
                            </div>
                            <CardTitle className="text-base sm:text-lg font-bold leading-tight break-words">
                              {item.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="relative space-y-2 text-sm sm:text-base p-4 sm:p-5 pt-0">
                        {item.subtitle && (
                          <p className="text-muted-foreground break-words">{item.subtitle}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs sm:text-sm">
                          <User className="h-4 w-4 shrink-0 text-primary/70" />
                          <span className="font-medium text-foreground">
                            {item.deleted_by_username ?? item.deleted_by ?? 'Unknown'}
                          </span>
                          <span aria-hidden>·</span>
                          <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
                          <span>{formatLocalDate(item.deleted_at, 'datetime')}</span>
                        </div>
                      </CardContent>
                      {canManage && (
                        <CardFooter className="relative p-4 sm:p-5 pt-0">
                          {renderItemActions(item, true)}
                        </CardFooter>
                      )}
                    </Card>
                  );
                })}
              </div>

              <ListPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                itemsPerPage={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="items"
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {restoreTarget
                ? `"${restoreTarget.title}" will be restored and visible again across BugRicer.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl bg-emerald-600 text-white hover:bg-emerald-700'
              )}
              disabled={Boolean(restoringId)}
              onClick={(e) => {
                e.preventDefault();
                handleRestore();
              }}
            >
              {restoringId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkRestoreOpen} onOpenChange={setBulkRestoreOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {selected.size} items?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected items will be restored and visible again across BugRicer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl bg-emerald-600 text-white hover:bg-emerald-700'
              )}
              disabled={bulkLoading}
              onClick={(e) => {
                e.preventDefault();
                handleBulkRestore();
              }}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Restore all'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(purgeTarget)} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget
                ? `"${purgeTarget.title}" will be permanently removed. This cannot be undone.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              disabled={Boolean(purgingId)}
              onClick={(e) => {
                e.preventDefault();
                handlePurge();
              }}
            >
              {purgingId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkPurgeOpen} onOpenChange={setBulkPurgeOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} items permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Selected items will be permanently removed from the system. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              disabled={bulkLoading}
              onClick={(e) => {
                e.preventDefault();
                handleBulkPurge();
              }}
            >
              {bulkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete all'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageShell>
  );
}
