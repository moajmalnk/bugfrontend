import { ConvertBugDialog } from "@/components/bugs/ConvertBugDialog";
import {
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  LIST_TABS_CONTENT,
} from "@/components/layout/list-page";
import { ListPagination } from "@/components/pagination/ListPagination";
import {
  BugTypeFilterSelect,
} from "@/components/bugs/BugTypeFilterSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { bugService, Bug as BugType } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRightLeft,
  Bug,
  Calendar,
  CheckCircle,
  ShieldCheck,
  Code,
  Filter,
  FolderOpen,
  Plus,
  RotateCcw,
  Search,
  User,
  UserCheck,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import {
  useUrlPagination,
  useClampUrlPage,
  useResetUrlPageOnChange,
  listReturnState,
} from "@/hooks/useUrlPagination";
import { userService } from "@/services/userService";
import { sortNamedUsersActiveFirst } from "@/lib/utils/userSort";

const FIXES_STATUS = "fixed";
/** Why: Fixes catalog is only bugs testers confirmed as resolved — pending retests live on Retests. */
const FIXES_VERIFICATION = "verified_fixed";

function formatFixCount(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, count) : 0;
  return n === 1 ? "1 verified fix" : `${n.toLocaleString()} verified fixes`;
}

// Enhanced table row skeleton component for loading state
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell className="w-[250px] lg:w-[300px]">
      <Skeleton className="h-5 w-4/5" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-20 lg:w-24" />
    </TableCell>
    <TableCell className="hidden sm:table-cell">
      <Skeleton className="h-5 w-28 lg:w-32" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-28 lg:w-32" />
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <Skeleton className="h-5 w-28 lg:w-32" />
    </TableCell>
    <TableCell className="hidden 2xl:table-cell">
      <Skeleton className="h-5 w-28 lg:w-32" />
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <Skeleton className="h-5 w-28 lg:w-32" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-24 ml-auto" />
    </TableCell>
  </TableRow>
);

// Enhanced card skeleton for mobile and tablet view
const CardSkeleton = () => (
  <div className="rounded-xl border bg-card text-card-foreground shadow p-4 sm:p-5 space-y-3">
    <div className="flex justify-between items-start gap-3">
      <Skeleton className="h-5 w-3/5 flex-1" />
      <Skeleton className="h-6 w-20 rounded-full shrink-0" />
    </div>
    <div className="space-y-2 text-sm text-muted-foreground">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex justify-end pt-2">
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

// Enhanced header skeleton
const PageHeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div className="space-y-2">
      <Skeleton className="h-8 sm:h-10 w-48 lg:w-56" />
      <Skeleton className="h-4 w-64 lg:w-80" />
    </div>
    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Skeleton className="h-10 w-full sm:w-52 lg:w-60" />
      <Skeleton className="h-10 w-24 hidden md:block" />
    </div>
  </div>
);

const formatDate = (dateString: string) => {
  return formatLocalDate(dateString, "date");
};

const getPriorityBadgeVariant = (
  priority: string
): "destructive" | "secondary" | "default" => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    case "low":
      return "default";
    default:
      return "default";
  }
};

// Professional bug card component with enhanced design
const BugCard = ({ bug, projects }: { bug: BugType; projects: Project[] }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const role = currentUser?.role;
  const project = projects.find(p => p.id === bug.project_id);
  const [convertOpen, setConvertOpen] = useState(false);
  const canConvert =
    role === "admin" || role === "developer" || role === "tester";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-1">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white break-words leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {bug.title}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Bug ID:</span>
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg font-semibold">
                {bug.id}
              </span>
            </div>
          </div>
          <Badge
            variant={getPriorityBadgeVariant(bug.priority)}
            className={`capitalize shrink-0 text-xs font-bold px-3 py-1.5 shadow-sm ${
              bug.priority === 'high' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                : bug.priority === 'medium'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            }`}
          >
            {bug.priority}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
            <div className="p-2 bg-purple-500 rounded-lg">
              <FolderOpen className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Project</span>
              <div className="font-semibold text-gray-900 dark:text-white truncate">
                {project?.name || "Unknown Project"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reported by</span>
                <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {bug.reporter_name || "BugRicer"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50/50 dark:bg-green-900/20 rounded-xl">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <UserCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fixed by</span>
                <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                  {bug.fixed_by_name || bug.updated_by_name || "Unknown"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
            <div className="p-1.5 bg-gray-500 rounded-lg">
              <Calendar className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Fixed on</span>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatDate(bug.updated_at)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-xl">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Verification
              </span>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="rounded-full font-medium border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  Verified fixed
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-col sm:flex-row gap-2">
          {canConvert && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConvertOpen(true)}
              className="w-full sm:w-auto h-11 border-sky-200 text-sky-700 hover:bg-sky-50 hover:border-sky-300 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/20 font-semibold"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Convert
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
          >
            <Link
              to={role ? `/${role}/bugs/${bug.id}?from=fixes` : `/bugs/${bug.id}?from=fixes`}
              state={listReturnState(location.pathname, location.search)}
            >
              View
            </Link>
          </Button>
        </div>
      </div>

      {canConvert && (
        <ConvertBugDialog
          bug={{
            id: bug.id,
            title: bug.title,
            project_id: bug.project_id,
            project_name: project?.name || bug.project_name,
            status: bug.status,
            priority: bug.priority,
          }}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onConverted={() => {
            queryClient.invalidateQueries({ queryKey: ["bugs"] });
          }}
        />
      )}
    </div>
  );
};

const Fixes = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  
  // Use persisted filters hook
  const [filters, setFilter, clearFilters] = usePersistedFilters("fixes", {
    searchTerm: "",
    priorityFilter: "all",
    projectFilter: "all",
    bugTypeFilter: "all",
    fixedByFilter: "all",
  });
  const searchTerm = filters.searchTerm || "";
  const priorityFilter = filters.priorityFilter || "all";
  const projectFilter = filters.projectFilter || "all";
  const bugTypeFilter = filters.bugTypeFilter || "all";
  const fixedByFilter = filters.fixedByFilter || "all";
  
  const setSearchTerm = (value: string) => setFilter("searchTerm", value);
  const setPriorityFilter = (value: string) => setFilter("priorityFilter", value);
  const setProjectFilter = (value: string) => setFilter("projectFilter", value);
  const setBugTypeFilter = (value: string) => setFilter("bugTypeFilter", value);
  const setFixedByFilter = (value: string) => setFilter("fixedByFilter", value);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-fixes";
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    page: currentPage,
    pageSize: itemsPerPage,
    setPage: setCurrentPage,
    setPageSize: setItemsPerPage,
    clampToTotalPages,
  } = useUrlPagination({ defaultPageSize: 10 });

  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Sync activeTab with URL
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-fixes";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fixerIdForQuery =
    activeTab === "my-fixes"
      ? currentUser?.id
      : fixedByFilter !== "all"
        ? fixedByFilter
        : undefined;

  const { data, isLoading, error } = useQuery<{
    bugs: BugType[];
    pagination: {
      currentPage?: number;
      totalPages?: number;
      totalBugs?: number;
      limit?: number;
      counts?: {
        open?: number;
        resolved?: number;
        myOpen?: number;
        myResolved?: number;
      };
    };
  }>({
    queryKey: [
      "bugs",
      "resolved-list",
      currentPage,
      itemsPerPage,
      projectFilter,
      fixerIdForQuery,
      debouncedSearch,
      priorityFilter,
      bugTypeFilter,
      FIXES_VERIFICATION,
      activeTab,
    ],
    queryFn: () =>
      bugService.getBugs({
        page: currentPage,
        limit: itemsPerPage,
        status: FIXES_STATUS,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        search: debouncedSearch || undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        fixedBy: fixerIdForQuery,
        bugTypeId: bugTypeFilter !== "all" ? bugTypeFilter : undefined,
        verificationFilter: FIXES_VERIFICATION,
      }),
    placeholderData: (prev) => prev,
  });

  // Fetch projects
  const { data: projectsData } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectService.getProjects(),
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    staleTime: 60_000,
  });

  const bugs = useMemo(() => data?.bugs ?? [], [data?.bugs]);
  const visibleProjects = useMemo(
    () => projectsData ?? [],
    [projectsData]
  );

  const uniqueFixers = useMemo(
    () =>
      sortNamedUsersActiveFirst(
        directoryUsers
          .filter((u: { role?: string }) => {
            const role = String(u.role || "").toLowerCase();
            return (
              !role ||
              role === "developer" ||
              role === "admin" ||
              role === "tester"
            );
          })
          .map((u: { id: string | number; username?: string; name?: string }) => ({
            id: String(u.id),
            name: u.username || u.name || "Unknown",
          })),
        directoryUsers
      ),
    [directoryUsers]
  );

  const hasActiveFilters =
    !!searchTerm ||
    priorityFilter !== "all" ||
    projectFilter !== "all" ||
    bugTypeFilter !== "all" ||
    (activeTab === "all-fixes" && fixedByFilter !== "all");

  // If current selected project becomes invisible (e.g., role change or data refresh), reset it
  React.useEffect(() => {
    if (
      projectFilter !== "all" &&
      !visibleProjects.some((p) => String(p.id) === String(projectFilter))
    ) {
      setFilter("projectFilter", "all");
    }
  }, [visibleProjects, projectFilter, setFilter]);

  React.useEffect(() => {
    if (
      fixedByFilter !== "all" &&
      !uniqueFixers.some((f) => String(f.id) === String(fixedByFilter))
    ) {
      setFilter("fixedByFilter", "all");
    }
  }, [uniqueFixers, fixedByFilter, setFilter]);

  // Verification is filtered server-side for accurate totals and pagination.
  const filteredBugs = bugs;

  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    debouncedSearch,
    priorityFilter,
    projectFilter,
    bugTypeFilter,
    fixedByFilter,
  ]);

  const totalFiltered = data?.pagination?.totalBugs ?? filteredBugs.length;
  const listTotalPages = Math.max(
    1,
    data?.pagination?.totalPages ||
      Math.ceil(totalFiltered / itemsPerPage) ||
      1
  );
  useClampUrlPage(clampToTotalPages, listTotalPages);

  const paginatedBugs = filteredBugs;

  const showTabs =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const allFixesCount = data?.pagination?.counts?.resolved ?? totalFiltered;
  const myFixesCount = data?.pagination?.counts?.myResolved ?? 0;
  const hasAnyFixed = allFixesCount > 0;

  const filterTriggerClass =
    "w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-emerald-500/40";

  const filterFieldClass = "flex items-center gap-2 min-w-0 w-full";

  const searchFilterBar = (
    <div className="relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-emerald-50/30 dark:from-gray-800/30 dark:to-emerald-900/30 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                <Search className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Search &amp; Filter
              </h3>
            </div>
            {hasActiveFilters ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-primary">{totalFiltered}</span>{" "}
                matching verified fix{totalFiltered === 1 ? "" : "es"}
              </p>
            ) : null}
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, description, or bug ID…"
              value={searchTerm}
              maxLength={200}
              onChange={(e) => setSearchTerm(e.target.value.slice(0, 200))}
              className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              aria-label="Search verified fixes"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
            <div className={filterFieldClass}>
              <div className="p-1.5 bg-orange-500 rounded-lg shrink-0" aria-hidden>
                <Filter className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger id="fixes-priority-filter" className={filterTriggerClass}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]">
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High priority</SelectItem>
                    <SelectItem value="medium">Medium priority</SelectItem>
                    <SelectItem value="low">Low priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-amber-500 rounded-lg shrink-0" aria-hidden>
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger id="fixes-project-filter" className={filterTriggerClass}>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]" searchPlaceholder="Search projects…">
                    <SelectItem value="all">All projects</SelectItem>
                    {visibleProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <BugTypeFilterSelect
              value={bugTypeFilter}
              onValueChange={setBugTypeFilter}
              accent="emerald"
              className={filterFieldClass}
              triggerClassName={filterTriggerClass}
            />

            {activeTab === "all-fixes" ? (
              <div className={filterFieldClass}>
                <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0" aria-hidden>
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <Select value={fixedByFilter} onValueChange={setFixedByFilter}>
                    <SelectTrigger id="fixes-fixer-filter" className={filterTriggerClass}>
                      <SelectValue placeholder="Fixed by" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]" searchPlaceholder="Search fixers…">
                      <SelectItem value="all">All fixers</SelectItem>
                      {uniqueFixers.map((fixer) => (
                        <SelectItem key={fixer.id} value={fixer.id}>
                          {fixer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className={filterFieldClass}>
                <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0" aria-hidden>
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`${filterTriggerClass} flex items-center px-3 text-sm font-medium text-foreground`}
                    title="My verified fixes only"
                  >
                    You ({currentUser?.username || "you"})
                  </div>
                </div>
              </div>
            )}

            <div className={filterFieldClass}>
              <Button
                type="button"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={() => clearFilters()}
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
  );

  const renderContent = () => {
    if (isLoading && !data) {
      return (
        <div className="space-y-6">
          {/* Desktop & Tablet Table Skeleton */}
          <div className="hidden xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] sm:w-[280px] lg:w-[300px]">
                    Title
                  </TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Project
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Fixed By
                  </TableHead>
                  <TableHead className="hidden 2xl:table-cell">
                    Verified on
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile & Tablet Card Skeleton */}
          <div className="grid xl:hidden grid-cols-1 gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 px-4 rounded-lg border border-dashed border-destructive/50 bg-destructive/5">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-medium text-destructive">
            Failed to load fixes
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There was an error fetching the data. Please try again later.
          </p>
        </div>
      );
    }

    if (allFixesCount === 0 && !hasActiveFilters) {
      return (
        <div className="space-y-6 sm:space-y-8">
          {searchFilterBar}

          {/* Empty state */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-blue-50/30 to-emerald-50/50 dark:from-green-950/20 dark:via-blue-950/10 dark:to-emerald-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No verified fixes yet</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Fixes appear here after a tester confirms the issue is resolved. Check Retests for items awaiting verification.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link
                    to={currentUser?.role ? `/${currentUser.role}/retests` : "/retests"}
                  >
                    <ShieldCheck className="mr-2 h-5 w-5" />
                    View Retests
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 px-6 rounded-xl font-semibold">
                  <Link
                    to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
                  >
                    <Bug className="mr-2 h-5 w-5" />
                    View All Bugs
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (filteredBugs.length === 0) {
      return (
        <div className="space-y-6 sm:space-y-8">
          {searchFilterBar}

          {/* No results state */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-yellow-50/30 to-red-50/50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-red-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Results Found</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                No verified fixes match your search or filters. Try different keywords or clear filters to reset.
              </p>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => clearFilters()}
                className="h-12 px-6 rounded-xl font-semibold"
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Clear filters
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 sm:space-y-8">
        {searchFilterBar}

        {totalFiltered > 0 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={listTotalPages}
            totalItems={totalFiltered}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            itemLabel="verified fixes"
          />
        )}

        {/* Professional Desktop & Tablet View */}
        <div className="hidden xl:block relative overflow-x-auto w-full min-w-0">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl pointer-events-none"></div>
          <div className="relative min-w-[640px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            
            <Table className="w-full">
              <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                  <TableHead className="min-w-[180px] font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Issue Title
                  </TableHead>
                  <TableHead className="w-[100px] font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Priority
                  </TableHead>
                  <TableHead className="min-w-[120px] font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Project
                  </TableHead>
                  <TableHead className="hidden xl:table-cell font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Fixed By
                  </TableHead>
                  <TableHead className="hidden 2xl:table-cell font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Verified on
                  </TableHead>
                  <TableHead className="w-[100px] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {paginatedBugs.map((bug, index) => {
                const project = visibleProjects.find(p => p.id === bug.project_id);
                return (
                  <TableRow
                    key={bug.id}
                    className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-green-50/50 dark:hover:from-blue-900/20 dark:hover:to-green-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                      index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                    }`}
                  >
                    <TableCell className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 mt-2"></div>
                        <span className="break-words">{bug.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px] py-4">
                      <Badge
                        variant={getPriorityBadgeVariant(bug.priority)}
                        className={`capitalize text-xs sm:text-sm px-3 py-1.5 font-semibold shadow-sm ${
                          bug.priority === 'high' 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                            : bug.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {bug.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[120px] text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium break-words">
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-2"></div>
                        <span>{project?.name || "Unknown Project"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                      {bug.fixed_by_name || bug.updated_by_name || "Unknown"}
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell text-sm sm:text-base text-gray-600 dark:text-gray-400 py-4 font-medium">
                      {formatDate(bug.updated_at)}
                    </TableCell>
                    <TableCell className="w-[100px] pr-4 text-right py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-9 sm:h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <Link
                          to={
                            currentUser?.role
                              ? `/${currentUser.role}/bugs/${bug.id}?from=fixes`
                              : `/bugs/${bug.id}?from=fixes`
                          }
                          state={listFromState}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Professional Mobile & Tablet Card View */}
        <div className="xl:hidden w-full min-w-0">
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {paginatedBugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} projects={visibleProjects} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Keep tab in sync with URL changes (back/forward navigation)
  React.useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-fixes";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fixHeader = (
    <ListPageHeader
      icon={<CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />}
      title="Fixes"
      description="Tester-confirmed fixes across your projects — only issues verified after retest"
      accentBarClassName="from-green-500 to-emerald-600"
      underlayClassName="from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20"
      count={allFixesCount}
      countIcon={<CheckCircle className="h-5 w-5" />}
      countClassName="from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
      actions={
        showTabs ? (
          <Link
            to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
            className="group w-full sm:w-auto"
          >
            <Button
              variant="default"
              size="lg"
              className="h-11 sm:h-12 w-full sm:w-auto px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Fix a Bug
            </Button>
          </Link>
        ) : undefined
      }
    />
  );

  const tabControls = showTabs ? (
    <Tabs
      value={activeTab}
      onValueChange={(val) => {
        setActiveTab(val);
        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", val);
          p.delete("page");
          return p;
        });
      }}
      className="w-full"
    >
      <ListPageTabsShell underlayClassName="from-gray-50/50 to-emerald-50/50 dark:from-gray-800/50 dark:to-emerald-900/50">
        <ListPageTabTrigger value="all-fixes">
          <Code className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline truncate">All verified</span>
          <span className="sm:hidden truncate">All</span>
          <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">
            {allFixesCount}
          </span>
        </ListPageTabTrigger>
        <ListPageTabTrigger value="my-fixes">
          <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline truncate">My verified</span>
          <span className="sm:hidden truncate">My</span>
          <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">
            {myFixesCount}
          </span>
        </ListPageTabTrigger>
      </ListPageTabsShell>
      <TabsContent value="all-fixes" className={LIST_TABS_CONTENT}>
        {renderContent()}
      </TabsContent>
      <TabsContent value="my-fixes" className={LIST_TABS_CONTENT}>
        {renderContent()}
      </TabsContent>
    </Tabs>
  ) : (
    renderContent()
  );

  return (
    <ListPageShell>
      {fixHeader}
      {tabControls}
    </ListPageShell>
  );
};

export default Fixes;
