import { ConvertBugDialog } from "@/components/bugs/ConvertBugDialog";
import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ClipboardCheck,
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
import {
  formatRetestSummary,
  getVerificationFilterKey,
  VERIFICATION_FILTER_OPTIONS,
} from "@/components/bugs/details/TesterVerificationPanel";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { sortNamedUsersActiveFirst } from "@/lib/utils/userSort";

const RESOLVED_BUG_STATUSES = "fixed,rejected";

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

          {(() => {
            const retest = formatRetestSummary(bug);
            return (
              <div className="flex items-center gap-3 p-3 bg-sky-50/50 dark:bg-sky-900/20 rounded-xl">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Tester verification
                  </span>
                  <div className="mt-1.5">
                    <Badge variant="outline" className={cn("rounded-full font-medium", retest.className)}>
                      {retest.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })()}
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
    verificationFilter: "all",
  });
  const searchTerm = filters.searchTerm || "";
  const priorityFilter = filters.priorityFilter || "all";
  const projectFilter = filters.projectFilter || "all";
  const bugTypeFilter = filters.bugTypeFilter || "all";
  const fixedByFilter = filters.fixedByFilter || "all";
  const verificationFilter = filters.verificationFilter || "all";
  
  const setSearchTerm = (value: string) => setFilter("searchTerm", value);
  const setPriorityFilter = (value: string) => setFilter("priorityFilter", value);
  const setProjectFilter = (value: string) => setFilter("projectFilter", value);
  const setBugTypeFilter = (value: string) => setFilter("bugTypeFilter", value);
  const setFixedByFilter = (value: string) => setFilter("fixedByFilter", value);
  const setVerificationFilter = (value: string) => setFilter("verificationFilter", value);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-fixes";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
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
      activeTab,
    ],
    queryFn: () =>
      bugService.getBugs({
        page: currentPage,
        limit: itemsPerPage,
        status: RESOLVED_BUG_STATUSES,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        search: debouncedSearch || undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        fixedBy: fixerIdForQuery,
        bugTypeId: bugTypeFilter !== "all" ? bugTypeFilter : undefined,
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
    fixedByFilter !== "all" ||
    verificationFilter !== "all";

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

  // Verification is derived client-side; keep as a page-level refine when set
  const filteredBugs = useMemo(() => {
    if (verificationFilter === "all") return bugs;
    return bugs.filter(
      (bug) => getVerificationFilterKey(bug) === verificationFilter
    );
  }, [bugs, verificationFilter]);

  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    debouncedSearch,
    priorityFilter,
    projectFilter,
    bugTypeFilter,
    fixedByFilter,
    verificationFilter,
  ]);

  const totalFiltered =
    verificationFilter === "all"
      ? data?.pagination?.totalBugs ?? 0
      : filteredBugs.length;
  const listTotalPages = Math.max(
    1,
    verificationFilter === "all"
      ? data?.pagination?.totalPages ||
          Math.ceil(totalFiltered / itemsPerPage) ||
          1
      : Math.ceil(filteredBugs.length / itemsPerPage) || 1
  );
  useClampUrlPage(clampToTotalPages, listTotalPages);

  const paginatedBugs =
    verificationFilter === "all"
      ? filteredBugs
      : filteredBugs.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );

  const showTabs =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const allFixesCount = data?.pagination?.counts?.resolved ?? totalFiltered;
  const myFixesCount = data?.pagination?.counts?.myResolved ?? 0;
  const hasAnyFixed = allFixesCount > 0;

  const filterTriggerClass =
    "w-full min-w-0 max-w-full h-11 overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/40";

  const filterFieldClass =
    "flex items-center gap-2 min-w-0 w-full";

  const searchFilterBar = (
    <div className="relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Search & Filter
            </h3>
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, description, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
            <div className={filterFieldClass}>
              <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]" searchPlaceholder="Search priorities...">
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-sky-500 rounded-lg shrink-0">
                <ClipboardCheck className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Verification" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="z-[60] min-w-[16rem] max-w-[min(100vw-2rem,22rem)]"
                    searchPlaceholder="Search verification..."
                  >
                    <SelectItem value="all">All verification</SelectItem>
                    {VERIFICATION_FILTER_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        textValue={`${opt.label} ${opt.hint}`}
                        description={opt.hint}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                <FolderOpen className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]" searchPlaceholder="Search projects...">
                    <SelectItem value="all">All Projects</SelectItem>
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

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={fixedByFilter} onValueChange={setFixedByFilter}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Fixed by" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]" searchPlaceholder="Search fixers...">
                    <SelectItem value="all">All Fixers</SelectItem>
                    {uniqueFixers.map((fixer) => (
                      <SelectItem key={fixer.id} value={fixer.id}>
                        {fixer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                  <TableHead className="hidden xl:table-cell">
                    Verification
                  </TableHead>
                  <TableHead className="hidden 2xl:table-cell">
                    Fixed Date
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">All Clear!</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                There are no fixed bugs to display. Great job on keeping your projects bug-free!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
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
                No fixes match your current filters. Try adjusting your search criteria or clearing the filters.
              </p>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                onClick={() => {
                  clearFilters();
                }}
              >
                <Link to={currentUser?.role ? `/${currentUser.role}/bugs/new` : "/bugs/new"}>
                  Fix a Bug
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const totalPages = listTotalPages;

    return (
      <div className="space-y-6 sm:space-y-8">
        {searchFilterBar}

        {/* Enhanced Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full min-w-0 overflow-x-hidden bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            {/* Top Row - Results Info and Items Per Page */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                <span className="text-sm sm:text-base text-foreground font-semibold">
                  Showing{" "}
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  -
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {Math.min(currentPage * itemsPerPage, totalFiltered)}
                  </span>{" "}
                  of{" "}
                  <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {totalFiltered}
                  </span>{" "}
                  fixes
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-3">
                <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                  Items per page:
                </span>
                <ItemsPerPageSelect
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={setItemsPerPage}
                />
              </div>
            </div>

            {/* Bottom Row - Pagination Navigation */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5 pt-0 xl:pt-0 border-t border-border/30">
              {/* Page Info for Mobile/Tablet */}
              <div className="xl:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                Page{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalPages}
                </span>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-center gap-2 w-full xl:w-auto flex-wrap">
                {/* Previous Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  <svg
                    className="w-4 h-4 mr-1 sm:mr-2 hidden sm:inline transition-transform duration-200 group-hover:-translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden text-lg">‹</span>
                </Button>

                {/* Page Numbers - Responsive Display */}
                <div className="flex items-center gap-1.5">
                  {/* Always show first page on larger screens */}
                  <Button
                    variant={currentPage === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-10 w-10 p-0 hidden xl:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                  >
                    1
                  </Button>

                  {/* Show ellipsis if needed on larger screens */}
                  {currentPage > 4 && (
                    <span className="hidden xl:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                      •••
                    </span>
                  )}

                  {/* Dynamic page numbers based on current page - show more on larger screens */}
                  {(() => {
                    const pages = [];
                    const start = Math.max(2, currentPage - 1);
                    const end = Math.min(totalPages - 1, currentPage + 1);

                    for (let i = start; i <= end; i++) {
                      if (i > 1 && i < totalPages) {
                        pages.push(i);
                      }
                    }

                    return pages.map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="h-10 w-10 p-0 hidden xl:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        {page}
                      </Button>
                    ));
                  })()}

                  {/* Show ellipsis if needed on larger screens */}
                  {currentPage < totalPages - 3 && (
                    <span className="hidden xl:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                      •••
                    </span>
                  )}

                  {/* Always show last page if more than 1 page on larger screens */}
                  {totalPages > 1 && (
                    <Button
                      variant={
                        currentPage === totalPages ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-10 w-10 p-0 hidden xl:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    >
                      {totalPages}
                    </Button>
                  )}

                  {/* Mobile-friendly page selector */}
                  <div className="xl:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                    <select
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className="border-0 bg-transparent text-sm font-semibold text-primary focus:outline-none focus:ring-0 min-w-[50px] cursor-pointer hover:text-primary/80 transition-colors duration-200"
                      aria-label="Go to page"
                    >
                      {Array.from({ length: totalPages }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-muted-foreground font-medium">
                      {" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalPages}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Next Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden text-lg">›</span>
                  <svg
                    className="w-4 h-4 ml-1 sm:ml-2 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>

              {/* Page Info for Desktop */}
              <div className="hidden xl:flex items-center gap-2 text-sm text-muted-foreground font-medium shrink-0">
                <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                Page{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {currentPage}
                </span>{" "}
                of{" "}
                <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalPages}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Simple results info when no pagination needed */}
        {totalPages <= 1 && (
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 xl:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base text-foreground font-semibold">
                Showing{" "}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalFiltered}
                </span>{" "}
                fixes
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-3">
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                Items per page:
              </span>
              <ItemsPerPageSelect
                id="items-per-page-simple"
                value={itemsPerPage}
                onChange={setItemsPerPage}
              />
            </div>
          </div>
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
                  <TableHead className="hidden xl:table-cell font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Verification
                  </TableHead>
                  <TableHead className="hidden 2xl:table-cell font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                    Fixed Date
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
                    <TableCell className="hidden xl:table-cell py-4">
                      {(() => {
                        const retest = formatRetestSummary(bug);
                        return (
                          <Badge
                            variant="outline"
                            className={cn("rounded-full text-xs font-medium whitespace-nowrap", retest.className)}
                          >
                            {retest.label}
                          </Badge>
                        );
                      })()}
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

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0 w-full">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-6">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shrink-0">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Fixes
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl break-words">
                  Overview of all resolved issues across your projects
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
                {showTabs && (
                  <Link
                    to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
                    className="group"
                  >
                    <Button
                      variant="default"
                      size="lg"
                      className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:scale-105"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Fix a Bug
                    </Button>
                  </Link>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {allFixesCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tabs - always show for users who can view them */}
        {showTabs ? (
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
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
              <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                  <TabsTrigger
                    value="all-fixes"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <Code className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">All Fixes</span>
                    <span className="sm:hidden">All</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                      {allFixesCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-fixes"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">My Fixes</span>
                    <span className="sm:hidden">My</span>
                    <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                      {myFixesCount}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            <TabsContent value="all-fixes" className="space-y-6 sm:space-y-8">
              {renderContent()}
            </TabsContent>
            <TabsContent value="my-fixes" className="space-y-6 sm:space-y-8">
              {renderContent()}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {renderContent()}
          </div>
        )}
      </section>
    </main>
  );
};

export default Fixes;
