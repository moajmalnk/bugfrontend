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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { ItemsPerPageSelect } from '@/components/pagination/ItemsPerPageSelect';
import { DashboardPeriodFilter } from '@/components/dashboard/DashboardPeriodFilter';
import {
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  LIST_TABS_CONTENT,
} from '@/components/layout/list-page';
import { AssetFormModal } from '@/components/creative/AssetFormModal';
import { CreativeMediaPreview } from '@/components/creative/CreativeMediaPreview';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  resolveWorkPeriod,
  type WorkPeriodPreset,
} from '@/lib/dashboardPeriod';
import { cn, getEffectiveRole, hasPermissionOrAdmin } from '@/lib/utils';
import { projectService } from '@/services/projectService';
import { notifyAdminNavCountsChanged } from '@/services/adminNavCountsService';
import type {
  CreativeAsset,
  CreativeMaterialType,
  CreativePlatform,
  CreativeStats,
  CreativeStatus,
} from '@/services/creativeService';
import {
  CREATIVE_MATERIALS,
  CREATIVE_PLATFORMS,
  CREATIVE_STATUSES,
  deleteCreativeAsset,
  getCreativeStats,
  listCreativeAssets,
} from '@/services/creativeService';
import {
  CheckCircle2,
  FileEdit,
  FolderOpen,
  Globe2,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Palette,
  Plus,
  Search,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ASSET_PARAM = 'asset';
const STATUS_PARAM = 'tab';
const PAGE_SIZES = [12, 24, 48];

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

type StatusTab = CreativeStatus | 'all';

const TAB_META: Record<
  StatusTab,
  {
    label: string;
    shortLabel: string;
    icon: typeof Palette;
    badgeClass: string;
  }
> = {
  all: {
    label: 'All',
    shortLabel: 'All',
    icon: LayoutGrid,
    badgeClass:
      'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300',
  },
  Draft: {
    label: 'Draft',
    shortLabel: 'Draft',
    icon: FileEdit,
    badgeClass:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  },
  'In Review': {
    label: 'In Review',
    shortLabel: 'Review',
    icon: Send,
    badgeClass:
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  },
  Completed: {
    label: 'Completed',
    shortLabel: 'Done',
    icon: CheckCircle2,
    badgeClass:
      'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
  },
  Published: {
    label: 'Published',
    shortLabel: 'Live',
    icon: Globe2,
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  },
  Rejected: {
    label: 'Rejected',
    shortLabel: 'Reject',
    icon: XCircle,
    badgeClass:
      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  },
};

const STATUS_PILL: Record<CreativeStatus, string> = {
  Draft:
    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  'In Review':
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Completed:
    'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  Published:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Rejected:
    'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

function parseStatusTab(raw: string | null): StatusTab {
  if (raw && (CREATIVE_STATUSES as string[]).includes(raw)) {
    return raw as CreativeStatus;
  }
  return 'all';
}

function AssetCard({
  asset,
  onOpen,
  onDelete,
  canDelete,
}: {
  asset: CreativeAsset;
  onOpen: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-fuchsia-300/60 hover:shadow-md dark:hover:border-fuchsia-700/50">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/40"
      >
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <CreativeMediaPreview
            path={asset.preview_thumbnail_url}
            fallbackPath={asset.uploaded_file_path}
            driveLink={asset.drive_link}
            alt={asset.title}
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span
            className={cn(
              'absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm',
              STATUS_PILL[asset.status]
            )}
          >
            {asset.status}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
          <p className="truncate text-base font-semibold text-foreground">
            {asset.title}
          </p>
          <p className="truncate text-xs font-medium text-muted-foreground">
            {asset.material_type} · {asset.platform}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {asset.creator_name || 'Creator'}
            {asset.project_name ? ` · ${asset.project_name}` : ''}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2 border-t border-border/50 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 flex-1 rounded-xl"
          onClick={onOpen}
        >
          Open
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 rounded-xl px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={`Delete ${asset.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function BugCreative() {
  const { currentUser } = useAuth();
  const { hasPermission } = usePermissions(null);
  const role = getEffectiveRole(currentUser || {});
  const canView = hasPermissionOrAdmin(role, hasPermission, 'CREATIVE_VIEW');
  const canCreate = hasPermissionOrAdmin(role, hasPermission, 'CREATIVE_CREATE');
  const canManage = hasPermissionOrAdmin(role, hasPermission, 'CREATIVE_MANAGE');
  const canReview = hasPermissionOrAdmin(role, hasPermission, 'CREATIVE_REVIEW');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const assetParam = searchParams.get(ASSET_PARAM);
  const statusTab = parseStatusTab(searchParams.get(STATUS_PARAM));
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
  const periodFrom = periodPreset === 'all' ? undefined : period.from;
  const periodTo = periodPreset === 'all' ? undefined : period.to;

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [material, setMaterial] = useState<CreativeMaterialType | 'all'>('all');
  const [platform, setPlatform] = useState<CreativePlatform | 'all'>('all');
  const [projectId, setProjectId] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [items, setItems] = useState<CreativeAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<CreativeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [deleteTarget, setDeleteTarget] = useState<CreativeAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [unsavedBackOpen, setUnsavedBackOpen] = useState(false);
  const formDirtyRef = useRef(false);

  const formOpen = Boolean(assetParam) && canView;
  const tabs = useMemo(() => ['all', ...CREATIVE_STATUSES] as const, []);

  const hasActiveFilters =
    Boolean(debouncedQ) ||
    material !== 'all' ||
    platform !== 'all' ||
    projectId !== 'all' ||
    periodPreset !== 'all';

  const mergePeriodParams = useCallback(
    (preset: WorkPeriodPreset, from: string, to: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (preset === 'all') {
            next.delete('period');
            next.delete('from');
            next.delete('to');
          } else {
            next.set('period', preset);
            if (preset === 'custom') {
              if (from) next.set('from', from);
              else next.delete('from');
              if (to) next.set('to', to);
              else next.delete('to');
            } else {
              next.delete('from');
              next.delete('to');
            }
          }
          return next;
        },
        { replace: true }
      );
      setPage(1);
    },
    [setSearchParams]
  );

  const setPeriodPreset = (value: WorkPeriodPreset) => {
    mergePeriodParams(value, customFrom, customTo);
  };

  const setCustomFrom = (value: string) => {
    mergePeriodParams('custom', value, customTo || value);
  };

  const setCustomTo = (value: string) => {
    mergePeriodParams('custom', customFrom || value, value);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    projectService
      .getProjects()
      .then((rows) =>
        setProjects(
          (rows || [])
            .map((p) => ({ id: p.id, name: p.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      )
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [result, nextStats] = await Promise.all([
        listCreativeAssets({
          q: debouncedQ,
          status: statusTab,
          material_type: material,
          platform,
          project_id: projectId,
          from: periodFrom,
          to: periodTo,
          page,
          limit,
        }),
        getCreativeStats({ from: periodFrom, to: periodTo }).catch(() => null),
      ]);
      setItems(result.items);
      setTotal(result.total);
      if (nextStats) setStats(nextStats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Try again';
      toast({
        title: 'Could not load assets',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    debouncedQ,
    statusTab,
    material,
    platform,
    projectId,
    periodFrom,
    periodTo,
    page,
    limit,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onPop = () => {
      if (formDirtyRef.current) {
        setUnsavedBackOpen(true);
        window.history.pushState({ modal: 'creative' }, '');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openAsset = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(ASSET_PARAM, id);
    setSearchParams(params);
    window.history.pushState({ modal: 'creative' }, '');
  };

  const closeAsset = () => {
    const params = new URLSearchParams(searchParams);
    params.delete(ASSET_PARAM);
    setSearchParams(params, { replace: true });
    formDirtyRef.current = false;
  };

  const setStatusTab = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'all') params.delete(STATUS_PARAM);
    else params.set(STATUS_PARAM, tab);
    params.delete('page');
    setPage(1);
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    setQ('');
    setDebouncedQ('');
    setMaterial('all');
    setPlatform('all');
    setProjectId('all');
    mergePeriodParams('all', '', '');
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteCreativeAsset(deleteTarget.id);
      setItems((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setTotal((n) => Math.max(0, n - 1));
      notifyAdminNavCountsChanged();
      toast({ title: 'Asset deleted' });
      setDeleteTarget(null);
      if (assetParam === deleteTarget.id) {
        closeAsset();
      }
      void getCreativeStats({ from: periodFrom, to: periodTo })
        .then(setStats)
        .catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not delete';
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const canDeleteAsset = (asset: CreativeAsset) =>
    canManage ||
    ((asset.status === 'Draft' || asset.status === 'In Review') &&
      asset.creator_id === currentUser?.id &&
      canCreate);

  const getTabCount = (tab: StatusTab) => {
    if (!stats) return 0;
    if (tab === 'all') return stats.total;
    return stats.by_status?.[tab] ?? 0;
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const filterTriggerClass =
    'w-full min-w-0 h-11 bg-background border-border/70 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-fuchsia-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-fuchsia-500/40';
  const filterFieldClass = 'flex items-center gap-2 min-w-0 w-full';

  if (!canView) {
    return (
      <ListPageShell>
        <ListPageHeader
          icon={<Palette className="h-5 w-5 sm:h-6 sm:w-6" />}
          title="BugCreative"
          description="You do not have access to creative assets."
          accentBarClassName="from-fuchsia-600 to-violet-600"
          underlayClassName="from-fuchsia-50/50 via-transparent to-violet-50/50 dark:from-fuchsia-950/20 dark:via-transparent dark:to-violet-950/20"
        />
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<Palette className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="BugCreative"
        description="Design, review, and publish creative assets"
        accentBarClassName="from-fuchsia-600 to-violet-600"
        underlayClassName="from-fuchsia-50/50 via-transparent to-violet-50/50 dark:from-fuchsia-950/20 dark:via-transparent dark:to-violet-950/20"
        count={loading && !stats ? undefined : (stats?.total ?? total)}
        loading={loading && !stats}
        countIcon={<Palette className="h-5 w-5" />}
        countClassName="from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/30 dark:to-violet-950/30 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300"
        actions={
          <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto lg:flex-row lg:items-center">
            <DashboardPeriodFilter
              preset={periodPreset}
              customFrom={customFrom}
              customTo={customTo}
              period={period}
              onPresetChange={setPeriodPreset}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
              isFetching={loading}
              className="lg:ml-0"
            />
            {canCreate ? (
              <Button
                size="lg"
                className="h-11 w-full px-6 font-semibold text-white shadow-lg sm:h-12 sm:w-auto bg-gradient-to-r from-fuchsia-600 to-violet-700 hover:from-fuchsia-700 hover:to-violet-800"
                onClick={() => openAsset('new')}
              >
                <Plus className="mr-2 h-5 w-5" />
                New asset
              </Button>
            ) : null}
          </div>
        }
      />

      <Tabs value={statusTab} onValueChange={setStatusTab} className="w-full">
        <ListPageTabsShell
          columns={6}
          underlayClassName="from-gray-50/50 to-fuchsia-50/50 dark:from-gray-800/50 dark:to-fuchsia-900/50"
        >
          {tabs.map((tab) => {
            const meta = TAB_META[tab];
            const Icon = meta.icon;
            return (
              <ListPageTabTrigger key={tab} value={tab}>
                <Icon className="mr-1.5 h-4 w-4 shrink-0 sm:mr-2 sm:h-5 sm:w-5" />
                <span className="hidden truncate sm:inline">{meta.label}</span>
                <span className="truncate sm:hidden">{meta.shortLabel}</span>
                <span
                  className={cn(
                    'ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold sm:ml-2 sm:px-2 sm:py-1 sm:text-xs',
                    meta.badgeClass
                  )}
                >
                  {getTabCount(tab)}
                </span>
              </ListPageTabTrigger>
            );
          })}
        </ListPageTabsShell>

        <TabsContent value={statusTab} className={LIST_TABS_CONTENT}>
          <div className="relative w-full min-w-0">
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-50/30 to-fuchsia-50/30 dark:from-gray-800/30 dark:to-fuchsia-900/30" />
            <div className="relative rounded-2xl border border-gray-200/50 bg-white/70 p-4 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/70 sm:p-5 md:p-6">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="shrink-0 rounded-lg bg-fuchsia-600 p-1.5">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg">
                        Search & Filter
                      </h2>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        {periodPreset === 'all'
                          ? 'Find assets across all time'
                          : `Scoped to ${period.rangeLabel}`}
                      </p>
                    </div>
                  </div>
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="h-10 shrink-0 rounded-xl"
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>

                <div className="group relative w-full min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-fuchsia-500 sm:left-4" />
                  <input
                    type="text"
                    value={q}
                    maxLength={200}
                    onChange={(e) => {
                      setQ(e.target.value.slice(0, 200));
                      setPage(1);
                    }}
                    placeholder="Search title, hook, creator…"
                    className="w-full min-w-0 rounded-xl border border-border/70 bg-background py-2.5 pl-10 pr-3 text-sm font-medium shadow-sm transition-all duration-300 hover:shadow-md focus:border-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 sm:py-3 sm:pl-12 sm:pr-4"
                    aria-label="Search creative assets"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 min-w-0">
                  <div className={filterFieldClass}>
                    <div className="shrink-0 rounded-lg bg-violet-500 p-1.5">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={material}
                        onValueChange={(v) => {
                          setMaterial(v as CreativeMaterialType | 'all');
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="Material" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All materials</SelectItem>
                          {CREATIVE_MATERIALS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={filterFieldClass}>
                    <div className="shrink-0 rounded-lg bg-sky-500 p-1.5">
                      <Globe2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={platform}
                        onValueChange={(v) => {
                          setPlatform(v as CreativePlatform | 'all');
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="Platform" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All platforms</SelectItem>
                          {CREATIVE_PLATFORMS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className={filterFieldClass}>
                    <div className="shrink-0 rounded-lg bg-blue-500 p-1.5">
                      <FolderOpen className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Select
                        value={projectId}
                        onValueChange={(v) => {
                          setProjectId(v);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className={filterTriggerClass}>
                          <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All projects</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!loading && total > 0 ? (
            <div className="flex w-full min-w-0 flex-col gap-4 overflow-x-hidden rounded-xl border border-border/50 bg-gradient-to-r from-background via-background to-muted/10 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md sm:gap-5">
              <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600" />
                  <span className="text-sm font-semibold text-foreground sm:text-base">
                    Showing{' '}
                    <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">
                      {rangeStart}
                    </span>
                    –
                    <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">
                      {rangeEnd}
                    </span>{' '}
                    of{' '}
                    <span className="font-bold text-fuchsia-600 dark:text-fuchsia-400">
                      {total}
                    </span>{' '}
                    assets
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 sm:justify-end">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
                    Per page
                  </span>
                  <ItemsPerPageSelect
                    id="creative-items-per-page"
                    value={limit}
                    options={PAGE_SIZES}
                    onChange={(value) => {
                      setLimit(value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-12 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="col-span-12 h-72 rounded-2xl sm:col-span-6 xl:col-span-4"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-500/10">
                <Palette className="h-7 w-7 text-fuchsia-600 dark:text-fuchsia-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {hasActiveFilters || statusTab !== 'all'
                  ? 'No matching assets'
                  : 'No creative assets yet'}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try clearing filters or switching tabs.'
                  : canCreate
                    ? 'Create the first poster, reel, or mockup to start the pipeline.'
                    : 'Assets will appear here once creators submit work.'}
              </p>
              {canCreate && !hasActiveFilters && statusTab === 'all' ? (
                <Button
                  className="mt-5 h-11 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-700 text-white hover:from-fuchsia-700 hover:to-violet-800"
                  onClick={() => openAsset('new')}
                >
                  <Plus className="mr-2 h-4 w-4" /> New asset
                </Button>
              ) : hasActiveFilters ? (
                <Button
                  variant="outline"
                  className="mt-5 h-11 rounded-xl"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              {items.map((asset) => (
                <div
                  key={asset.id}
                  className="col-span-12 min-w-0 sm:col-span-6 xl:col-span-4"
                >
                  <AssetCard
                    asset={asset}
                    onOpen={() => openAsset(asset.id)}
                    onDelete={() => setDeleteTarget(asset)}
                    canDelete={canDeleteAsset(asset)}
                  />
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border/40 p-4 sm:flex-row sm:p-5">
              <p className="text-sm text-muted-foreground">
                Page{' '}
                <span className="font-semibold text-foreground">{page}</span> of{' '}
                <span className="font-semibold text-foreground">
                  {totalPages}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {formOpen ? (
        <AssetFormModal
          open={formOpen}
          assetId={assetParam}
          canManage={canManage}
          canReview={canReview}
          canCreate={canCreate}
          viewerUserId={currentUser?.id}
          projects={projects}
          onClose={closeAsset}
          onDirtyChange={(dirty) => {
            formDirtyRef.current = dirty;
          }}
          onRequestDelete={(asset) => setDeleteTarget(asset)}
          onSaved={() => {
            notifyAdminNavCountsChanged();
            void load();
          }}
        />
      ) : null}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={unsavedBackOpen} onOpenChange={setUnsavedBackOpen}>
        <AlertDialogContent className="max-w-[400px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Discard edits and close this asset?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => {
                setUnsavedBackOpen(false);
                closeAsset();
                navigate(-1);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ListPageShell>
  );
}
