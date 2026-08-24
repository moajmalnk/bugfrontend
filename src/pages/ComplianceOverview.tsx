import { ComplianceOverviewTable } from '@/components/compliance/ComplianceOverviewTable';
import { ComplianceStatsPanel } from '@/components/compliance/ComplianceStatsPanel';
import { filterAssignedProjects } from '@/components/dashboard/roleDashboardShared';
import {
  LIST_TABS_CONTENT,
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  listFilterIconBg,
  listFilterTriggerClass,
  listFilterUnderlay,
  listSearchInputClass,
} from '@/components/layout/list-page';
import { ListPagination } from '@/components/pagination/ListPagination';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';
import {
  listReturnState,
  useClampUrlPage,
  useResetUrlPageOnChange,
  useUrlPagination,
} from '@/hooks/useUrlPagination';
import {
  buildProjectComplianceOverview,
  countByStatus,
  getDefaultComplianceTab,
  matchesComplianceFilter,
  type ComplianceFilterTab,
} from '@/lib/codo/complianceStatus';
import { cn, getEffectiveRole } from '@/lib/utils';
import { projectService } from '@/services/projectService';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Code,
  Filter,
  Layers,
  RotateCcw,
  Search,
  Shield,
  ShieldCheck,
  TestTube,
  Timer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

type SortOption = 'name' | 'developer_date' | 'tester_date' | 'overdue';

const FILTER_TABS: ComplianceFilterTab[] = [
  'all',
  'completed',
  'pending',
  'not_started',
  'admins',
  'dev',
  'testers',
];

const TAB_LABELS: Record<ComplianceFilterTab, string> = {
  all: 'All',
  completed: 'Completed',
  pending: 'Pending',
  not_started: 'Not started',
  admins: 'Admins',
  dev: 'Dev',
  testers: 'Tester',
};

const TAB_ICONS: Record<ComplianceFilterTab, typeof Layers> = {
  all: Layers,
  completed: CheckCircle2,
  pending: Clock,
  not_started: Timer,
  admins: Shield,
  dev: Code,
  testers: TestTube,
};

const TAB_BADGE_CLASS: Record<ComplianceFilterTab, string> = {
  all: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  not_started: 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400',
  admins: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  dev: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  testers: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

const ComplianceOverview = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [searchParams, setSearchParams] = useSearchParams();

  const role = getEffectiveRole(currentUser) as 'admin' | 'developer' | 'tester' | 'user';
  const isAdmin = role === 'admin';
  const isDeveloper = role === 'developer';
  const isTester = role === 'tester';
  const showAdminColumn = isAdmin;
  const roleKey = isAdmin ? 'admin' : isDeveloper ? 'developer' : 'tester';

  const defaultTab = getDefaultComplianceTab(roleKey);
  const initialTab = (searchParams.get('tab') as ComplianceFilterTab) || defaultTab;
  const [activeTab, setActiveTab] = useState<ComplianceFilterTab>(
    FILTER_TABS.includes(initialTab) ? initialTab : defaultTab
  );

  const [filters, setFilter, clearFilters] = usePersistedFilters('compliance-overview', {
    searchTerm: '',
    sortBy: 'name' as SortOption,
  });

  const searchTerm = filters.searchTerm || '';
  const sortBy = (filters.sortBy as SortOption) || 'name';
  const [searchDraft, setSearchDraft] = useState(searchTerm);
  const setSortBy = (value: SortOption) => setFilter('sortBy', value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft !== searchTerm) {
        setFilter('searchTerm', searchDraft);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, searchTerm, setFilter]);

  const {
    page: currentPage,
    pageSize: itemsPerPage,
    setPage: setCurrentPage,
    setPageSize: setItemsPerPage,
    clampToTotalPages,
  } = useUrlPagination({ defaultPageSize: 20 });

  useEffect(() => {
    const urlTab = searchParams.get('tab') as ComplianceFilterTab | null;
    if (urlTab && FILTER_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (value: string) => {
    const tab = value as ComplianceFilterTab;
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === defaultTab) {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        next.delete('page');
        return next;
      },
      { replace: true }
    );
    setCurrentPage(1);
  };

  const handleClearFilters = useCallback(() => {
    setSearchDraft('');
    clearFilters();
  }, [clearFilters]);

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    enabled: !!currentUser,
  });

  const scopedProjects = useMemo(() => {
    const all = projectsData ?? [];
    if (isAdmin) return all;
    if (!currentUser?.id) return [];
    return filterAssignedProjects(all, currentUser.id);
  }, [projectsData, isAdmin, currentUser?.id]);

  const overviewItems = useMemo(
    () => scopedProjects.map((project) => buildProjectComplianceOverview(project)),
    [scopedProjects]
  );

  const tabCounts = useMemo(() => {
    const counts = {} as Record<ComplianceFilterTab, number>;
    for (const tab of FILTER_TABS) {
      counts[tab] = overviewItems.filter((item) =>
        matchesComplianceFilter(item, tab, roleKey, currentUser?.id)
      ).length;
    }
    return counts;
  }, [overviewItems, roleKey, currentUser?.id]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    let items = overviewItems.filter((item) =>
      matchesComplianceFilter(item, activeTab, roleKey, currentUser?.id)
    );

    if (query) {
      items = items.filter((item) => {
        const name = item.project.name?.toLowerCase() ?? '';
        const client = item.project.client_name?.toLowerCase() ?? '';
        return name.includes(query) || client.includes(query);
      });
    }

    return [...items].sort((a, b) => {
      switch (sortBy) {
        case 'developer_date': {
          const aDate = a.developerTargetDate ?? '';
          const bDate = b.developerTargetDate ?? '';
          if (!aDate && !bDate) return a.project.name.localeCompare(b.project.name);
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate.localeCompare(bDate);
        }
        case 'tester_date': {
          const aDate = a.testerTargetDate ?? '';
          const bDate = b.testerTargetDate ?? '';
          if (!aDate && !bDate) return a.project.name.localeCompare(b.project.name);
          if (!aDate) return 1;
          if (!bDate) return -1;
          return aDate.localeCompare(bDate);
        }
        case 'overdue': {
          const aScore = (a.developerOverdue ? 2 : 0) + (a.testerOverdue ? 2 : 0);
          const bScore = (b.developerOverdue ? 2 : 0) + (b.testerOverdue ? 2 : 0);
          if (bScore !== aScore) return bScore - aScore;
          return a.project.name.localeCompare(b.project.name);
        }
        case 'name':
        default:
          return a.project.name.localeCompare(b.project.name);
      }
    });
  }, [overviewItems, activeTab, roleKey, searchTerm, sortBy, currentUser?.id]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  useClampUrlPage(clampToTotalPages, totalPages, !isLoading);

  useResetUrlPageOnChange(setCurrentPage, [activeTab, searchTerm, sortBy]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const devCounts = useMemo(
    () => countByStatus(overviewItems, (item) => item.developerStatus),
    [overviewItems]
  );
  const testerCounts = useMemo(
    () => countByStatus(overviewItems, (item) => item.testerStatus),
    [overviewItems]
  );
  const adminCounts = useMemo(
    () => countByStatus(overviewItems, (item) => item.adminStatus),
    [overviewItems]
  );

  const pendingCount = tabCounts.pending;

  const headerDescription = isAdmin
    ? 'Organization-wide CODO compliance across all active projects.'
    : isDeveloper
      ? 'Developer compliance status for your assigned projects.'
      : 'Tester compliance status for your assigned projects.';

  const emptyMessage =
    scopedProjects.length === 0
      ? isAdmin
        ? 'No active projects.'
        : 'No assigned projects with compliance tracking.'
      : 'No projects match the current filters.';

  const hasActiveFilters = Boolean(searchDraft.trim()) || sortBy !== 'name';

  const filterFieldClass = 'flex items-center gap-2 min-w-0 w-full';
  const filterTriggerClass = listFilterTriggerClass('blue');

  const searchFilterBar = (
    <div className="relative w-full min-w-0">
      <div className={listFilterUnderlay('blue')} />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={listFilterIconBg('blue')}>
                <Search className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Search &amp; Filter
              </h3>
            </div>
            {hasActiveFilters ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{filteredItems.length}</span>{' '}
                matching project{filteredItems.length === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{overviewItems.length}</span>{' '}
                project{overviewItems.length === 1 ? '' : 's'} tracked
              </p>
            )}
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects or clients…"
              value={searchDraft}
              maxLength={200}
              onChange={(e) => setSearchDraft(e.target.value.slice(0, 200))}
              className={listSearchInputClass('blue')}
              autoComplete="off"
              aria-label="Search compliance projects"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
            <div className={filterFieldClass}>
              <div className="p-1.5 bg-indigo-500 rounded-lg shrink-0" aria-hidden>
                <CircleDot className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60] rounded-xl">
                    <SelectItem value="name">Sort: Project name</SelectItem>
                    <SelectItem value="developer_date">Sort: Developer date</SelectItem>
                    <SelectItem value="tester_date">Sort: Tester date</SelectItem>
                    <SelectItem value="overdue">Sort: Overdue first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-orange-500 rounded-lg shrink-0" aria-hidden>
                <Filter className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasActiveFilters}
                  onClick={handleClearFilters}
                  className="h-11 w-full min-w-0 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-300 font-medium disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4 shrink-0 mr-1.5" />
                  <span className="truncate">Clear filters</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (role !== 'admin' && role !== 'developer' && role !== 'tester') {
    return (
      <ListPageShell>
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          Compliance overview is available to admins, developers, and testers only.
        </div>
      </ListPageShell>
    );
  }

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="Compliance"
        description={headerDescription}
        accentBarClassName="from-blue-600 to-emerald-600"
        underlayClassName="from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"
        count={overviewItems.length}
        countIcon={<ShieldCheck className="h-5 w-5" />}
        countClassName="from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
        loading={isLoading}
        actions={
          !isLoading && pendingCount > 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm font-semibold shadow-sm">
              <Clock className="h-4 w-4 shrink-0" />
              {pendingCount} pending
            </div>
          ) : undefined
        }
      />

      <ComplianceStatsPanel
        isAdmin={isAdmin}
        isDeveloper={isDeveloper}
        isTester={isTester}
        devCounts={devCounts}
        testerCounts={testerCounts}
        adminCounts={adminCounts}
        loading={isLoading}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full min-w-0">
        <ListPageTabsShell
          columns={4}
          underlayClassName="from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50"
        >
          {FILTER_TABS.map((tab) => {
            const TabIcon = TAB_ICONS[tab];
            return (
              <ListPageTabTrigger key={tab} value={tab} className="min-w-[5.75rem] sm:min-w-0">
                <TabIcon className="h-4 w-4 shrink-0 opacity-80" />
                <span className="truncate">{TAB_LABELS[tab]}</span>
                <span
                  className={cn(
                    'px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0 tabular-nums',
                    TAB_BADGE_CLASS[tab]
                  )}
                >
                  {tabCounts[tab]}
                </span>
              </ListPageTabTrigger>
            );
          })}
        </ListPageTabsShell>

        <TabsContent value={activeTab} className={LIST_TABS_CONTENT}>
          {searchFilterBar}

          {filteredItems.length > 0 && !isLoading && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              itemLabel="projects"
            />
          )}

          <ComplianceOverviewTable
            items={paginatedItems}
            role={role}
            showAdminColumn={showAdminColumn}
            loading={isLoading}
            listFromState={listFromState}
            emptyMessage={emptyMessage}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />

          {filteredItems.length > 0 && !isLoading && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              itemLabel="projects"
              compact
            />
          )}
        </TabsContent>
      </Tabs>
    </ListPageShell>
  );
};

export default ComplianceOverview;
