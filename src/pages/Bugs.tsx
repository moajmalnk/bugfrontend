import {
  BugCard,
  BugCardGridSkeletonAnimated,
} from "@/components/bugs/BugCard";
import {
  BugTypeFilterSelect,
} from "@/components/bugs/BugTypeFilterSelect";
import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import {
  Bug as BugIcon,
  Filter,
  FolderOpen,
  Lock,
  Plus,
  Search,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import {
  useUrlPagination,
  useClampUrlPage,
  useResetUrlPageOnChange,
  listReturnState,
} from "@/hooks/useUrlPagination";
import { canReportBug } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sortNamedUsersActiveFirst } from "@/lib/utils/userSort";

const OPEN_BUG_STATUSES = "pending,in_progress";

const Bugs = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Use persisted filters hook
  const [filters, setFilter, clearFilters] = usePersistedFilters("bugs_list_v2", {
    searchTerm: "",
    priorityFilter: "all",
    statusFilter: "all",
    projectFilter: "all",
    bugTypeFilter: "all",
    raisedByFilter: "all",
  });
  const searchTerm = filters.searchTerm || "";
  const priorityFilter = filters.priorityFilter || "all";
  const statusFilter = filters.statusFilter || "all";
  const projectFilter = filters.projectFilter || "all";
  const bugTypeFilter = filters.bugTypeFilter || "all";
  const raisedByFilter = filters.raisedByFilter || "all";
  
  const setSearchTerm = (value: string) => setFilter("searchTerm", value);
  const setPriorityFilter = (value: string) => setFilter("priorityFilter", value);
  const setStatusFilter = (value: string) => setFilter("statusFilter", value);
  const setProjectFilter = (value: string) => setFilter("projectFilter", value);
  const setBugTypeFilter = (value: string) => setFilter("bugTypeFilter", value);
  const setRaisedByFilter = (value: string) => setFilter("raisedByFilter", value);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-bugs";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Bugs list only supports pending / in_progress — drop stale filter values
  useEffect(() => {
    if (
      statusFilter &&
      statusFilter !== "all" &&
      statusFilter !== "pending" &&
      statusFilter !== "in_progress"
    ) {
      setStatusFilter("all");
    }
  }, [statusFilter]);
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

  // Project list is already membership-scoped by the API
  const visibleProjects = useMemo(() => projects, [projects]);

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    staleTime: 60_000,
  });

  const uniqueRaisers = useMemo(
    () =>
      sortNamedUsersActiveFirst(
        directoryUsers.map((u: { id: string | number; username?: string; name?: string }) => ({
          id: String(u.id),
          name: u.username || u.name || "Unknown",
        })),
        directoryUsers
      ),
    [directoryUsers]
  );

  // All Bugs: optional Raised-by filter.
  // My Bugs: always current user (ignore Raised-by so your bugs are never hidden by it).
  const isMyBugsTab = activeTab === "my-bugs";

  const hasActiveFilters =
    !!searchTerm ||
    priorityFilter !== "all" ||
    statusFilter !== "all" ||
    projectFilter !== "all" ||
    bugTypeFilter !== "all" ||
    (!isMyBugsTab && raisedByFilter !== "all");

  // Clear Raised-by when entering My Bugs so switching back to All Bugs
  // does not keep a stale user filter that hides your own bugs.
  useEffect(() => {
    if (isMyBugsTab && raisedByFilter !== "all") {
      setRaisedByFilter("all");
    }
  }, [isMyBugsTab, raisedByFilter, setRaisedByFilter]);

  // If current selected project becomes invisible (e.g., role change or data refresh), reset it
  useEffect(() => {
    if (
      projectFilter !== "all" &&
      !visibleProjects.some((p) => String(p.id) === String(projectFilter))
    ) {
      setFilter("projectFilter", "all");
    }
  }, [visibleProjects, projectFilter, setFilter]);

  useEffect(() => {
    if (
      raisedByFilter !== "all" &&
      !uniqueRaisers.some((r) => String(r.id) === String(raisedByFilter))
    ) {
      setRaisedByFilter("all");
    }
  }, [uniqueRaisers, raisedByFilter]);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Sync activeTab with URL (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-bugs";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    debouncedSearch,
    priorityFilter,
    statusFilter,
    projectFilter,
    bugTypeFilter,
    raisedByFilter,
  ]);

  const listStatus =
    statusFilter === "all" ? OPEN_BUG_STATUSES : statusFilter;

  const reporterId = isMyBugsTab
    ? currentUser?.id != null
      ? String(currentUser.id)
      : undefined
    : raisedByFilter !== "all"
      ? String(raisedByFilter)
      : undefined;

  const bugsQueryKey = [
    "bugs",
    "open-list",
    currentPage,
    itemsPerPage,
    listStatus,
    projectFilter,
    reporterId ?? "all",
    debouncedSearch,
    priorityFilter,
    bugTypeFilter,
    activeTab,
  ] as const;

  const {
    data: bugsData,
    isLoading: loading,
    error: bugsError,
    refetch: refetchBugs,
  } = useQuery({
    queryKey: bugsQueryKey,
    queryFn: async () => {
      setAccessError(null);
      try {
        return await bugService.getBugs({
          page: currentPage,
          limit: itemsPerPage,
          status: listStatus,
          projectId: projectFilter !== "all" ? projectFilter : undefined,
          userId: reporterId,
          search: debouncedSearch || undefined,
          priority: priorityFilter !== "all" ? priorityFilter : undefined,
          bugTypeId: bugTypeFilter !== "all" ? bugTypeFilter : undefined,
        });
      } catch (error: any) {
        if (error?.message?.includes("access")) {
          setAccessError("You don't have access to any projects");
        }
        throw error;
      }
    },
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (!bugsError) return;
    const message =
      bugsError instanceof Error ? bugsError.message : String(bugsError);
    if (!message.includes("access")) {
      toast({
        title: "Error",
        description: "Failed to load bugs. Please try again.",
        variant: "destructive",
      });
    }
  }, [bugsError]);

  const bugs = bugsData?.bugs ?? [];
  const totalFiltered = bugsData?.pagination?.totalBugs ?? 0;
  const pendingBugsCount =
    bugsData?.pagination?.counts?.open ??
    bugsData?.pagination?.pendingBugsCount ??
    0;
  const allBugsTabCount = bugsData?.pagination?.counts?.open ?? pendingBugsCount;
  const myBugsTabCount = bugsData?.pagination?.counts?.myOpen ?? 0;
  const skeletonLoading = loading && !bugsData;
  const paginatedBugs = bugs;
  const totalPages = Math.max(
    1,
    bugsData?.pagination?.totalPages ||
      Math.ceil(totalFiltered / itemsPerPage) ||
      1
  );
  useClampUrlPage(clampToTotalPages, totalPages);

  const fetchProjects = async () => {
    try {
      const projectsData = await projectService.getProjects();
      if (import.meta.env.DEV) {
        console.log(
          "Fetched projects for user:",
          currentUser?.role,
          projectsData
        );
      }
      setProjects(projectsData);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    }
  };

  const refreshBugs = () => {
    queryClient.invalidateQueries({ queryKey: ["bugs"] });
    refetchBugs();
  };

  // Get tab-specific count from server facet totals
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-bugs":
        return allBugsTabCount;
      case "my-bugs":
        return myBugsTabCount;
      default:
        return 0;
    }
  };

  // Content to display when no bugs are found
  const renderEmptyState = () => {
    if (accessError) {
      return (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Projects Assigned</h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {currentUser?.role === "tester"
                ? "You're not assigned to any projects yet. Ask your project admin to add you to a project to view bugs."
                : `${accessError}. You need to be a member of a project to view its bugs.`}
            </p>
          </div>
        </div>
      );
    }
  };

  const canViewTabs =
    currentUser?.role === "admin" || currentUser?.role === "tester";

  const isDeveloper = currentUser?.role === "developer";
  const noBugs = !loading && totalFiltered === 0;
  const filteredBugs = bugs;

  const filterTriggerClass =
    "w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 focus:ring-2 focus:ring-orange-500/40 focus:ring-offset-0 data-[state=open]:ring-2 data-[state=open]:ring-orange-500/40";

  const filterFieldClass = "flex items-center gap-2 min-w-0 w-full";

  const searchFilterBar = !skeletonLoading && !loading ? (
    <div className="relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Search & Filter
            </h3>
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, description, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
            <div className={filterFieldClass}>
              <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                <BugIcon className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
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
                  <SelectContent position="popper" className="z-[60]">
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
              className={filterFieldClass}
              triggerClassName={filterTriggerClass}
            />

            <div className={filterFieldClass}>
              <div className="p-1.5 bg-cyan-500 rounded-lg shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                {isMyBugsTab ? (
                  <div
                    className={`${filterTriggerClass} flex items-center px-3 text-sm font-medium text-foreground`}
                    title="My Bugs always shows bugs you raised"
                  >
                    You ({currentUser?.username || "me"})
                  </div>
                ) : (
                  <Select value={raisedByFilter} onValueChange={setRaisedByFilter}>
                    <SelectTrigger className={filterTriggerClass}>
                      <SelectValue placeholder="Raised by" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[60]">
                      <SelectItem value="all">All Raisers</SelectItem>
                      {uniqueRaisers.map((raiser) => (
                        <SelectItem key={raiser.id} value={raiser.id}>
                          {raiser.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearFilters()}
                className="h-10 sm:h-11 w-full sm:w-auto px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
              >
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8 overflow-x-hidden">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8 min-w-0 w-full">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6 md:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 sm:gap-6 min-w-0">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg shrink-0">
                    <BugIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      Bugs
                    </h1>
                    <div className="h-1 w-16 sm:w-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base lg:text-lg font-medium max-w-2xl min-w-0 break-words">
                  Track pending bugs across your projects
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
                {canReportBug(currentUser?.role) && (
                  <Link
                    to={
                      currentUser?.role
                        ? `/${currentUser.role}/bugs/new`
                        : "/bugs/new"
                    }
                    state={listFromState}
                    className="group"
                  >
                    <Button
                      variant="default"
                      size="lg"
                      className="h-12 px-6 bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:scale-105"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Report Bug
                    </Button>
                  </Link>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <BugIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {pendingBugsCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Tabs or Regular Content - always show tabs for users who can view them */}
        {canViewTabs && !skeletonLoading && !loading ? (
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
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-orange-50/50 dark:from-gray-800/50 dark:to-orange-900/50 rounded-2xl"></div>
              <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
                <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                  <TabsTrigger
                    value="all-bugs"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <BugIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">All Bugs</span>
                    <span className="sm:hidden">All</span>
                    <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
                      {getTabCount("all-bugs")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-bugs"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">My Bugs</span>
                    <span className="sm:hidden">My</span>
                    <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                      {getTabCount("my-bugs")}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8 min-w-0">
              {searchFilterBar}

              {/* Professional Responsive Pagination Controls - Show when there are bugs */}
              {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full min-w-0 overflow-x-hidden bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  {/* Top Row - Results Info and Items Per Page */}
                  <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
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
                        bugs
                      </span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium shrink-0">
                        Per page
                      </span>
                      <ItemsPerPageSelect
                        id="items-per-page"
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                      />
                    </div>
                  </div>

                  {/* Bottom Row - Pagination Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 border-t border-border/30">
                    {/* Page Info for Mobile */}
                    <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
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
                    <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                      {/* Previous Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="h-9 sm:h-10 px-3 sm:px-4 min-w-[44px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <svg
                          className="w-4 h-4 mr-2 hidden sm:inline transition-transform duration-200 group-hover:-translate-x-0.5"
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
                          className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                        >
                          1
                        </Button>

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage > 4 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
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
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                            >
                              {page}
                            </Button>
                          ));
                        })()}

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage < totalPages - 3 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
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
                            className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                          >
                            {totalPages}
                          </Button>
                        )}

                        {/* Mobile-friendly page selector */}
                        <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                          <select
                            value={currentPage}
                            onChange={(e) =>
                              setCurrentPage(Number(e.target.value))
                            }
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
                        className="h-9 sm:h-10 px-3 sm:px-4 min-w-[44px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden text-lg">›</span>
                        <svg
                          className="w-4 h-4 ml-2 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5"
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
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
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

              {/* Simple results info when no pagination needed - show when there are bugs */}
              {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages <= 1 && (
                <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                    <span className="text-sm sm:text-base text-foreground font-semibold">
                      Showing{" "}
                      <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalFiltered}
                      </span>{" "}
                      bugs
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium shrink-0">
                      Per page
                    </span>
                    <ItemsPerPageSelect
                      id="items-per-page-simple"
                      value={itemsPerPage}
                      onChange={setItemsPerPage}
                    />
                  </div>
                </div>
              )}

              {/* Content */}
              {skeletonLoading ? (
                <BugCardGridSkeletonAnimated count={3} />
              ) : loading ? (
                <BugCardGridSkeletonAnimated count={2} />
              ) : filteredBugs.length === 0 ? (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <BugIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No Bugs Found</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      {hasActiveFilters
                        ? "No bugs match your search criteria. Try adjusting your filters."
                        : currentUser?.role === "tester"
                        ? "You're not assigned to any bugs yet. When bugs are reported, they'll appear here."
                        : "Great job! You currently have no bugs assigned to you. Check back later or ask your project admin for new assignments."}
                    </p>
                    {hasActiveFilters ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => clearFilters()}
                        className="h-11 px-5 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  className="grid gap-4 mt-4 grid-cols-1"
                  style={{ minHeight: 200 }}
                  aria-label="Bug list"
                >
                  {paginatedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} onConverted={() => refreshBugs()} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 sm:space-y-8 min-w-0">
            {searchFilterBar}
            {/* Enhanced Professional Header for Developers */}
            {(isDeveloper || currentUser?.role === "tester" || currentUser?.role === "admin") && noBugs && (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <BugIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No Bugs Found</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    {hasActiveFilters
                      ? "No bugs match your search criteria. Try adjusting your filters."
                      : currentUser?.role === "tester"
                      ? "You're not assigned to any bugs yet. When bugs are reported, they'll appear here."
                      : "Great job! You currently have no bugs assigned to you. Check back later or ask your project admin for new assignments."}
                  </p>
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => clearFilters()}
                      className="h-11 px-5 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-medium"
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
            {/* Professional Responsive Pagination for Developers - Show when there are bugs and multiple pages */}
            {!skeletonLoading &&
              !loading &&
              filteredBugs.length > 0 &&
              totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full min-w-0 overflow-x-hidden bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  {/* Top Row - Results Info and Items Per Page */}
                  <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
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
                        bugs
                      </span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-3">
                      <span className="text-xs sm:text-sm text-muted-foreground font-medium shrink-0">
                        Per page
                      </span>
                      <ItemsPerPageSelect
                        id="items-per-page-dev"
                        value={itemsPerPage}
                        onChange={setItemsPerPage}
                      />
                    </div>
                  </div>

                  {/* Bottom Row - Pagination Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 border-t border-border/30">
                    {/* Page Info for Mobile */}
                    <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
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
                    <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                      {/* Previous Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="h-9 sm:h-10 px-3 sm:px-4 min-w-[44px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <svg
                          className="w-4 h-4 mr-2 hidden sm:inline transition-transform duration-200 group-hover:-translate-x-0.5"
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
                          className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                        >
                          1
                        </Button>

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage > 4 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
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
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                            >
                              {page}
                            </Button>
                          ));
                        })()}

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage < totalPages - 3 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
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
                            className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                          >
                            {totalPages}
                          </Button>
                        )}

                        {/* Mobile-friendly page selector */}
                        <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                          <select
                            value={currentPage}
                            onChange={(e) =>
                              setCurrentPage(Number(e.target.value))
                            }
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
                        className="h-9 sm:h-10 px-3 sm:px-4 min-w-[44px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden text-lg">›</span>
                        <svg
                          className="w-4 h-4 ml-2 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5"
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
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
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

            {/* Simple results info when no pagination needed for developers - show when there are bugs */}
            {!skeletonLoading &&
              !loading &&
              filteredBugs.length > 0 &&
              totalPages <= 1 && (
                <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                    <span className="text-sm sm:text-base text-foreground font-semibold">
                      Showing{" "}
                      <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalFiltered}
                      </span>{" "}
                      bugs
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-3">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium shrink-0">
                      Per page
                    </span>
                    <ItemsPerPageSelect
                      id="items-per-page-dev-simple"
                      value={itemsPerPage}
                      onChange={setItemsPerPage}
                    />
                  </div>
                </div>
              )}

            {/* Enhanced Content for Developers */}
            <div className="space-y-6 sm:space-y-8">
              {skeletonLoading ? (
                <BugCardGridSkeletonAnimated count={3} />
              ) : loading ? (
                <BugCardGridSkeletonAnimated count={2} />
              ) : filteredBugs.length === 0 ? (
                renderEmptyState()
              ) : (
                <div
                  className="grid gap-4 grid-cols-1"
                  style={{ minHeight: 200 }}
                  aria-label="Bug list"
                >
                  {paginatedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} onConverted={() => refreshBugs()} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Bugs;
