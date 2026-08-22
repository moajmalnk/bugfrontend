import { ListPageHeader, ListPageShell, ListPageTabTrigger, ListPageTabsShell, LIST_TABS_CONTENT } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { projectService } from "@/services/projectService";
import { updateService, type Update } from "@/services/updateService";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bell, Lock, Plus, Search, User, FolderOpen, Filter, RotateCcw, Layers, CircleDot, ArrowRightLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { ListPagination } from "@/components/pagination/ListPagination";
import {
  useUrlPagination,
  useClampUrlPage,
  useResetUrlPageOnChange,
  useMergeSearchParam,
  listReturnState,
} from "@/hooks/useUrlPagination";
import { UpdateTimingInfo, UpdateReviewStatusCell } from "@/components/updates/UpdateTimingInfo";
import { ConvertUpdateDialog } from "@/components/updates/ConvertUpdateDialog";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { sortUsernamesActiveFirst } from "@/lib/utils/userSort";

/** Stable defaults — avoid new object identity every render (breaks clearFilters memo). */
const UPDATES_FILTER_DEFAULTS = {
  searchTerm: "",
  projectFilter: "all",
  createdByFilter: "all",
  statusFilter: "all",
  priorityFilter: "all",
  typeFilter: "all",
};

// Table row skeleton component for loading state
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-[180px]" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-[22px] w-16 rounded-full" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-28" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-28" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-[90px] ml-auto" />
    </TableCell>
  </TableRow>
);

// Enhanced Card skeleton for mobile and tablet view
const CardSkeleton = () => (
  <Card className="hover:shadow-md transition-all duration-200">
    <CardHeader className="p-4 sm:p-5">
      <div className="flex justify-between items-center gap-3">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
        <Skeleton className="h-6 w-16 sm:w-20 rounded-md" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3 p-4 sm:p-5 pt-0">
      <Skeleton className="h-5 w-4/5" />
      <div className="space-y-2 text-sm">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
    <CardFooter className="p-4 sm:p-5 pt-0">
      <Skeleton className="h-10 sm:h-11 w-[120px] sm:w-[140px]" />
    </CardFooter>
  </Card>
);

// Enhanced Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
    <div className="space-y-2 sm:space-y-3">
      <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 lg:w-48" />
      <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 lg:w-80" />
    </div>
    <div className="flex items-center gap-3 w-full md:w-auto">
      <Skeleton className="h-11 sm:h-12 w-full sm:w-32 lg:w-40 rounded-lg" />
      <Skeleton className="h-12 w-32 lg:w-40 rounded-lg" />
    </div>
  </div>
);

const Updates = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [searchParams] = useSearchParams();
  const mergeSearchParam = useMergeSearchParam();
  const initialTab = searchParams.get("tab") || "all-updates";
  const [activeTab, setActiveTab] = useState(initialTab);
  const {
    page: currentPage,
    pageSize: itemsPerPage,
    setPage: setCurrentPage,
    setPageSize: setItemsPerPage,
    clampToTotalPages,
  } = useUrlPagination({ defaultPageSize: 10 });

  const [filters, setFilter, clearFilters] = usePersistedFilters(
    "updates",
    UPDATES_FILTER_DEFAULTS
  );
  const searchTerm = filters.searchTerm || "";
  const projectFilter = filters.projectFilter || "all";
  const createdByFilter = filters.createdByFilter || "all";
  const statusFilter = filters.statusFilter || "all";
  const priorityFilter = filters.priorityFilter || "all";
  const typeFilter = filters.typeFilter || "all";

  // Draft for the input only — avoids remount/focus loss and URL churn on every keystroke
  const [searchDraft, setSearchDraft] = useState(searchTerm);
  const [convertTarget, setConvertTarget] = useState<Update | null>(null);

  const canConvertUpdate =
    currentUser?.role === "admin" ||
    currentUser?.role === "developer" ||
    currentUser?.role === "tester";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft !== searchTerm) {
        setFilter("searchTerm", searchDraft);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, searchTerm, setFilter]);

  const setProjectFilter = useCallback(
    (value: string) => setFilter("projectFilter", value),
    [setFilter]
  );
  const setCreatedByFilter = useCallback(
    (value: string) => setFilter("createdByFilter", value),
    [setFilter]
  );
  const setStatusFilter = useCallback(
    (value: string) => setFilter("statusFilter", value),
    [setFilter]
  );
  const setPriorityFilter = useCallback(
    (value: string) => setFilter("priorityFilter", value),
    [setFilter]
  );
  const setTypeFilter = useCallback(
    (value: string) => setFilter("typeFilter", value),
    [setFilter]
  );

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    clearFilters();
  }, [clearFilters]);

  const hasActiveFilters =
    Boolean(searchDraft.trim()) ||
    projectFilter !== "all" ||
    createdByFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all";

  const filterFieldClass = "flex items-center gap-2 min-w-0 w-full";
  const filterTriggerClass =
    "h-11 w-full min-w-0 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm";

  // Fetch updates from backend
  const {
    data: updates = [],
    isLoading: skeletonLoading,
    error: updatesError,
  } = useQuery({
    queryKey: ["updates"],
    queryFn: () => updateService.getUpdates(),
  });

  // Reset page on committed search (debounced), not every draft keystroke
  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    searchTerm,
    projectFilter,
    createdByFilter,
    statusFilter,
    priorityFilter,
    typeFilter,
  ]);

  // Fetch projects to determine if user can create new update
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentUser?.id],
    queryFn: () => projectService.getProjects(),
    enabled: !!currentUser,
  });

  // Used to order creator filter: active accounts / online first
  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    staleTime: 60_000,
  });

  const isLoading = skeletonLoading || projectsLoading;

  // Filter updates based on active tab
  const filteredUpdates = useMemo(() => {
    let filtered = updates;

    // First filter by tab
    switch (activeTab) {
      case "all-updates":
        filtered = updates;
        break;
      case "my-updates":
        filtered = updates.filter((update: any) => {
          const byIdMatch =
            update.created_by_id !== undefined &&
            String(update.created_by_id) === String(currentUser?.id);
          const byNameMatch = update.created_by === currentUser?.username;
          return byIdMatch || byNameMatch;
        });
        break;
      default:
        filtered = updates;
    }

    // Filter with draft so results update while typing without waiting for debounce
    const q = searchDraft.trim().toLowerCase();
    return filtered.filter((update) => {
      const matchesSearch =
        !q ||
        (update.title || "").toLowerCase().includes(q) ||
        (update.description || "").toLowerCase().includes(q) ||
        (update.project_name || "").toLowerCase().includes(q) ||
        (update.created_by || "").toLowerCase().includes(q) ||
        (update.created_by_name || "").toLowerCase().includes(q);

      let matchesProject = true;
      if (projectFilter !== "all") {
        const updateProjectId =
          update.project_id ||
          (update.project_name
            ? projects.find((p) => p.name === update.project_name)?.id
            : null);
        matchesProject = updateProjectId
          ? String(updateProjectId) === String(projectFilter)
          : false;
      }

      const creatorName = update.created_by || update.created_by_name || "";
      const matchesCreatedBy =
        createdByFilter === "all" || creatorName === createdByFilter;

      const matchesStatus =
        statusFilter === "all" ||
        String(update.status || "").toLowerCase() === statusFilter;

      const updatePriority = String(update.update_priority || "")
        .toLowerCase()
        .trim();
      const matchesPriority =
        priorityFilter === "all" || updatePriority === priorityFilter;

      const matchesType =
        typeFilter === "all" ||
        String(update.type || "").toLowerCase() === typeFilter;

      return (
        matchesSearch &&
        matchesProject &&
        matchesCreatedBy &&
        matchesStatus &&
        matchesPriority &&
        matchesType
      );
    });
  }, [
    updates,
    activeTab,
    currentUser?.username,
    currentUser?.id,
    searchDraft,
    projectFilter,
    createdByFilter,
    statusFilter,
    priorityFilter,
    typeFilter,
    projects,
  ]);

  // Pagination calculations
  const totalFiltered = filteredUpdates.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage) || 1);
  useClampUrlPage(clampToTotalPages, totalPages);

  const paginatedUpdates = filteredUpdates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-updates":
        return updates.length;
      case "my-updates":
        return updates.filter((update: any) => {
          const byIdMatch =
            update.created_by_id !== undefined &&
            String(update.created_by_id) === String(currentUser?.id);
          const byNameMatch = update.created_by === currentUser?.username;
          return byIdMatch || byNameMatch;
        }).length;
      default:
        return 0;
    }
  };

  const uniqueCreators = useMemo(() => {
    const creators = updates
      .map((update) => update.created_by || update.created_by_name)
      .filter(Boolean)
      .filter((creator, index, arr) => arr.indexOf(creator) === index) as string[];
    return sortUsernamesActiveFirst(creators, directoryUsers);
  }, [updates, directoryUsers]);

  const visibleProjects = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string }>();

    updates.forEach((update) => {
      const projectId =
        update.project_id ||
        (update.project_name
          ? projects.find((p) => p.name === update.project_name)?.id
          : null);
      const projectName = update.project_name;

      if (!projectId || !projectName) return;

      const id = String(projectId);
      if (currentUser?.role !== "admin") {
        const assigned = projects.some((p) => String(p.id) === id);
        if (!assigned) return;
      }

      if (!projectMap.has(id)) {
        projectMap.set(id, { id, name: projectName });
      }
    });

    return Array.from(projectMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [updates, projects, currentUser?.role]);

  useEffect(() => {
    if (
      projectFilter !== "all" &&
      !visibleProjects.some((p) => p.id === String(projectFilter))
    ) {
      setProjectFilter("all");
    }
  }, [visibleProjects, projectFilter, setProjectFilter]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-updates";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-blue-500 border-blue-200 bg-blue-50";
      case "updation":
        return "text-green-500 border-green-200 bg-green-50";
      case "maintenance":
        return "text-yellow-500 border-yellow-200 bg-yellow-50";
      default:
        return "";
    }
  };

  const renderEmptyState = () => {
    const noMatches = hasActiveFilters && updates.length > 0;
    return (
      <div className="relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {noMatches
              ? "No matching updates"
              : activeTab === "my-updates"
                ? "No updates found"
                : "No Updates"}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {noMatches
              ? "Try adjusting your search or filters to find what you're looking for."
              : activeTab === "my-updates"
                ? "You haven't created any updates yet. Click 'New Update' to get started."
                : "There are no updates to display right now. Check back later or create a new one."}
          </p>
          {noMatches && (
            <Button variant="outline" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>
    );
  };

  // IMPORTANT: This must be JSX, not a nested component.
  // Declaring `const UpdatesTabs = () => (...)` remounts the tree on every
  // keystroke and steals focus from the search input.
  const updatesTabs = (
    <Tabs
      value={activeTab}
      onValueChange={(val) => {
        setActiveTab(val);
        mergeSearchParam("tab", val === "all-updates" ? null : val, {
          replace: true,
        });
        setCurrentPage(1);
      }}
      className="w-full"
    >
      <ListPageTabsShell underlayClassName="from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50">
        <ListPageTabTrigger value="all-updates">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline truncate">All Updates</span>
          <span className="sm:hidden truncate">All</span>
          <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">{getTabCount("all-updates")}</span>
        </ListPageTabTrigger>
        <ListPageTabTrigger value="my-updates">
          <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
          <span className="hidden sm:inline truncate">My Updates</span>
          <span className="sm:hidden truncate">My</span>
          <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">{getTabCount("my-updates")}</span>
        </ListPageTabTrigger>
      </ListPageTabsShell>

      <TabsContent value={activeTab} className={LIST_TABS_CONTENT}>
        {/* Enhanced Search and Filter Controls - Always show when tabs are visible */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-green-500 rounded-lg">
                    <Search className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Search & Filter
                  </h3>
                </div>
                {hasActiveFilters && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">{totalFiltered}</span>{" "}
                    matching update{totalFiltered === 1 ? "" : "s"}
                  </p>
                )}
              </div>

              <div className="relative group w-full min-w-0">
                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, description, project, or creator..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                  autoComplete="off"
                  aria-label="Search updates"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
                <div className={filterFieldClass}>
                  <div className="p-1.5 bg-blue-500 rounded-lg shrink-0" aria-hidden>
                    <CircleDot className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className={filterTriggerClass}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]" searchPlaceholder="Search status...">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={filterFieldClass}>
                  <div className="p-1.5 bg-orange-500 rounded-lg shrink-0" aria-hidden>
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className={filterTriggerClass}>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]" searchPlaceholder="Search priorities...">
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="low">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className={filterFieldClass}>
                  <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0" aria-hidden>
                    <Layers className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className={filterTriggerClass}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]" searchPlaceholder="Search types...">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                        <SelectItem value="updation">Updation</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
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
                      <SelectTrigger className={filterTriggerClass}>
                        <SelectValue placeholder="Project" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]" searchPlaceholder="Search projects...">
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

                <div className={filterFieldClass}>
                  <div className="p-1.5 bg-purple-500 rounded-lg shrink-0" aria-hidden>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                      <SelectTrigger className={filterTriggerClass}>
                        <SelectValue placeholder="Created by" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100]" searchPlaceholder="Search creators...">
                        <SelectItem value="all">All Creators</SelectItem>
                        {uniqueCreators.map((creator) => (
                          <SelectItem key={creator} value={creator}>
                            {creator}
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

        {filteredUpdates.length > 0 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            itemLabel="updates"
          />
        )}

        {/* Content */}
        {isLoading ? (
          <>
            {/* Table skeleton for desktop and large tablets */}
            <div className="hidden xl:block relative overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[250px] lg:w-[300px] font-semibold text-sm sm:text-base">
                      Title
                    </TableHead>
                    <TableHead className="w-[100px] lg:w-[120px] font-semibold text-sm sm:text-base">
                      Type
                    </TableHead>
                    <TableHead className="w-[150px] lg:w-[180px] font-semibold text-sm sm:text-base">
                      Project
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-semibold text-sm sm:text-base">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRowSkeleton key={index} />
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Card skeleton for mobile and tablets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
              {Array(4)
                .fill(0)
                .map((_, index) => (
                  <CardSkeleton key={index} />
                ))}
            </div>
          </>
        ) : filteredUpdates.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="hidden xl:block relative overflow-x-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl pointer-events-none"></div>
              <div className="relative min-w-[980px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                <Table className="w-full">
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                    <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                      <TableHead className="min-w-[180px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Title
                      </TableHead>
                      <TableHead className="w-[120px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Type
                      </TableHead>
                      <TableHead className="min-w-[120px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Project
                      </TableHead>
                      <TableHead className="min-w-[170px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Created
                      </TableHead>
                      <TableHead className="min-w-[180px] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Approved / Declined
                      </TableHead>
                      <TableHead className="w-[180px] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUpdates.map((update, index) => (
                      <TableRow
                        key={update.id}
                        className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-emerald-50/50 dark:hover:from-blue-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                          index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                        }`}
                      >
                        <TableCell className="min-w-[180px] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                          <div className="flex items-start gap-2 min-w-0">
                            <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2"></div>
                            <span className="break-words">{update.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px] px-4 py-4">
                          <Badge
                            variant="outline"
                            className={`font-medium text-xs sm:text-sm px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                              update.type
                            )}`}
                          >
                            {update.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[120px] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium break-words">
                          {update.project_name}
                        </TableCell>
                        <TableCell className="min-w-[170px] px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 py-4 whitespace-nowrap">
                          {update.created_at
                            ? formatLocalDate(update.created_at, 'datetime')
                            : '—'}
                        </TableCell>
                        <TableCell className="min-w-[180px] px-4 text-xs sm:text-sm py-4">
                          <UpdateReviewStatusCell update={update} />
                        </TableCell>
                        <TableCell className="w-[180px] pr-4 text-right py-4">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {canConvertUpdate && update.status !== "declined" && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setConvertTarget(update)}
                                className="text-xs sm:text-sm h-9 px-3 bg-white dark:bg-gray-800 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:border-sky-400 dark:hover:border-sky-600 text-sky-700 dark:text-sky-300 font-semibold shadow-sm transition-all duration-300"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                                Convert
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-9 sm:h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                            >
                              <Link
                                to={
                                  currentUser?.role
                                    ? `/${currentUser.role}/updates/${update.id}`
                                    : `/updates/${update.id}`
                                }
                                state={listFromState}
                              >
                                View
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:hidden">
              {paginatedUpdates.map((update) => (
                <Card
                  key={update.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col justify-between hover:shadow-2xl transition-all duration-300"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <CardHeader className="relative p-4 sm:p-5">
                    <div className="flex justify-between items-start gap-3">
                      <CardTitle className="text-base sm:text-lg font-bold leading-tight break-words flex-1 min-w-0">
                        <Link
                          to={
                            currentUser?.role
                              ? `/${currentUser.role}/updates/${update.id}`
                              : `/updates/${update.id}`
                          }
                          state={listFromState}
                          className="hover:underline"
                        >
                          {update.title}
                        </Link>
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs sm:text-sm h-fit shrink-0 px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                          update.type
                        )}`}
                      >
                        {update.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-3 text-sm sm:text-base p-4 sm:p-5 pt-0">
                    <div className="flex items-center text-muted-foreground">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />{" "}
                      Project:{" "}
                      <span className="font-medium text-foreground ml-1">
                        {update.project_name}
                      </span>
                    </div>
                    <UpdateTimingInfo update={update} />
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-3 p-4 sm:p-5 pt-0">
                    <div className="flex justify-end w-full gap-2 flex-wrap">
                      {canConvertUpdate && update.status !== "declined" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setConvertTarget(update)}
                          className="h-11 px-3 shrink-0 bg-white dark:bg-gray-800 border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:border-sky-400 dark:hover:border-sky-600 text-sky-700 dark:text-sky-300 font-semibold shadow-sm transition-all duration-300"
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                          Convert
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 min-w-[7rem] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <Link
                          to={
                            currentUser?.role
                              ? `/${currentUser.role}/updates/${update.id}`
                              : `/updates/${update.id}`
                          }
                          state={listFromState}
                        >
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}

        {filteredUpdates.length > 0 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalFiltered}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            itemLabel="updates"
            className="mt-2"
          />
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <ListPageShell>
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <ListPageHeader
            icon={<Bell className="h-5 w-5 sm:h-6 sm:w-6" />}
            title="Updates"
            description="A log of all features and updations."
            accentBarClassName="from-blue-600 to-emerald-600"
            count={updates.length}
            countIcon={<Bell className="h-5 w-5" />}
            actions={
              projects.length > 0 ? (
                <Link
                  to={
                    currentUser?.role
                      ? `/${currentUser.role}/new-update`
                      : "/new-update"
                  }
                  className="w-full sm:w-auto"
                >
                  <Button className="h-11 sm:h-12 w-full sm:w-auto px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg">
                    <Plus className="mr-2 h-5 w-5" /> New Update
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {!isLoading ? (
          updatesTabs
        ) : (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-green-50/30 to-emerald-50/50 dark:from-blue-950/20 dark:via-green-950/10 dark:to-emerald-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Bell className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">All Clear!</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                There are no updates to display. Great job on keeping everything tidy!
              </p>
              {projects.length > 0 && (
                <Button asChild size="lg" className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                  <Link to={currentUser?.role ? `/${currentUser.role}/new-update` : "/new-update"}>
                    <Plus className="mr-2 h-5 w-5" /> New Update
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      {convertTarget && (
        <ConvertUpdateDialog
          update={convertTarget}
          open={!!convertTarget}
          onOpenChange={(open) => {
            if (!open) setConvertTarget(null);
          }}
        />
      )}
    </ListPageShell>
  );
};

export default Updates;
