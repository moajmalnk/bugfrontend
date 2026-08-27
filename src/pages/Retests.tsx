import { BugTypeFilterSelect } from "@/components/bugs/BugTypeFilterSelect";
import { formatRetestSummary } from "@/lib/verificationUtils";
import {
  ListPageHeader,
  ListPageShell,
  ListPageTabTrigger,
  ListPageTabsShell,
  LIST_TABS_CONTENT,
} from "@/components/layout/list-page";
import { ListPagination } from "@/components/pagination/ListPagination";
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
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import {
  listReturnState,
  useClampUrlPage,
  useResetUrlPageOnChange,
  useUrlPagination,
} from "@/hooks/useUrlPagination";
import { cn } from "@/lib/utils";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { sortNamedUsersActiveFirst } from "@/lib/utils/userSort";
import { bugService, Bug as BugType } from "@/services/bugService";
import { Project, projectService } from "@/services/projectService";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ClipboardCheck,
  Filter,
  FolderOpen,
  RotateCcw,
  Search,
  User,
  UserCheck,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

const FIXED_STATUS = "fixed";
const RETEST_PENDING = "retest_pending";

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-5 w-4/5" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-20" />
    </TableCell>
    <TableCell className="hidden sm:table-cell">
      <Skeleton className="h-5 w-28" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-28" />
    </TableCell>
    <TableCell className="hidden xl:table-cell">
      <Skeleton className="h-5 w-28" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-24 ml-auto" />
    </TableCell>
  </TableRow>
);

const CardSkeleton = () => (
  <div className="rounded-xl border bg-card text-card-foreground shadow p-4 sm:p-5 space-y-3">
    <Skeleton className="h-5 w-3/5" />
    <Skeleton className="h-4 w-4/5" />
    <Skeleton className="h-4 w-3/5" />
    <Skeleton className="h-9 w-24 ml-auto" />
  </div>
);

const formatDate = (dateString: string) => formatLocalDate(dateString, "date");

const getPriorityBadgeVariant = (
  priority: string
): "destructive" | "secondary" | "default" => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "secondary";
    default:
      return "default";
  }
};

const RetestCard = ({
  bug,
  projects,
  listFromState,
}: {
  bug: BugType;
  projects: Project[];
  listFromState: ReturnType<typeof listReturnState>;
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const project = projects.find((p) => p.id === bug.project_id);
  const retest = formatRetestSummary(bug);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500">
      <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full shadow-lg" />
      <div className="relative p-6 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white break-words pr-6">
            {bug.title}
          </h3>
          <Badge
            variant={getPriorityBadgeVariant(bug.priority)}
            className={cn(
              "capitalize shrink-0 text-xs font-bold px-3 py-1.5",
              bug.priority === "high"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                : bug.priority === "medium"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            )}
          >
            {bug.priority}
          </Badge>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl">
          <div className="p-2 bg-purple-500 rounded-lg">
            <FolderOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">
            {project?.name || bug.project_name || "Unknown Project"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span>
              Fixed by:{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {bug.fixed_by_name || bug.updated_by_name || "Unknown"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>
              Reported by:{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {bug.reporter_name || "Unknown"}
              </span>
            </span>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn("rounded-full text-xs font-medium", retest.className)}
        >
          {retest.label}
        </Badge>

        <Button variant="outline" size="sm" asChild className="w-full h-11 rounded-xl">
          <Link
            to={
              role
                ? `/${role}/bugs/${bug.id}?from=retests`
                : `/bugs/${bug.id}?from=retests`
            }
            state={listFromState}
          >
            Verify fix
          </Link>
        </Button>
      </div>
    </div>
  );
};

const Retests = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-retests";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [filters, setFilter, clearFilters] = usePersistedFilters("retests", {
    searchTerm: "",
    priorityFilter: "all",
    projectFilter: "all",
    bugTypeFilter: "all",
    fixedByFilter: "all",
    reporterFilter: "all",
  });

  const searchTerm = filters.searchTerm || "";
  const priorityFilter = filters.priorityFilter || "all";
  const projectFilter = filters.projectFilter || "all";
  const bugTypeFilter = filters.bugTypeFilter || "all";
  const fixedByFilter = filters.fixedByFilter || "all";
  const reporterFilter = filters.reporterFilter || "all";

  const setSearchTerm = (value: string) => setFilter("searchTerm", value);

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

  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-retests";
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const reporterIdForQuery =
    activeTab === "my-retests"
      ? currentUser?.id
      : reporterFilter !== "all"
        ? reporterFilter
        : undefined;

  const fixerIdForQuery =
    fixedByFilter !== "all" ? fixedByFilter : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "bugs",
      "retests-list",
      currentPage,
      itemsPerPage,
      projectFilter,
      fixerIdForQuery,
      reporterIdForQuery,
      debouncedSearch,
      priorityFilter,
      bugTypeFilter,
      activeTab,
    ],
    queryFn: () =>
      bugService.getBugs({
        page: currentPage,
        limit: itemsPerPage,
        status: FIXED_STATUS,
        verificationFilter: RETEST_PENDING,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        search: debouncedSearch || undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        fixedBy: fixerIdForQuery,
        bugTypeId: bugTypeFilter !== "all" ? bugTypeFilter : undefined,
        userId: reporterIdForQuery,
      }),
    placeholderData: (prev) => prev,
    enabled: !!currentUser,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.getProjects(),
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    staleTime: 60_000,
  });

  const bugs = useMemo(() => data?.bugs ?? [], [data?.bugs]);
  const visibleProjects = useMemo(() => projectsData ?? [], [projectsData]);

  const uniqueFixers = useMemo(
    () =>
      sortNamedUsersActiveFirst(
        directoryUsers
          .filter((u: { role?: string }) => {
            const role = String(u.role || "").toLowerCase();
            return !role || role === "developer" || role === "admin" || role === "tester";
          })
          .map((u: { id: string | number; username?: string; name?: string }) => ({
            id: String(u.id),
            name: u.username || u.name || "Unknown",
          })),
        directoryUsers
      ),
    [directoryUsers]
  );

  const uniqueReporters = useMemo(
    () =>
      sortNamedUsersActiveFirst(
        directoryUsers.map(
          (u: { id: string | number; username?: string; name?: string }) => ({
            id: String(u.id),
            name: u.username || u.name || "Unknown",
          })
        ),
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
    (activeTab === "all-retests" && reporterFilter !== "all");

  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    debouncedSearch,
    priorityFilter,
    projectFilter,
    bugTypeFilter,
    fixedByFilter,
    reporterFilter,
  ]);

  const totalFiltered = data?.pagination?.totalBugs ?? 0;
  const listTotalPages = Math.max(
    1,
    data?.pagination?.totalPages || Math.ceil(totalFiltered / itemsPerPage) || 1
  );
  useClampUrlPage(clampToTotalPages, listTotalPages, !isLoading);

  const allRetestsCount = data?.pagination?.counts?.retestPending ?? totalFiltered;
  const myRetestsCount = data?.pagination?.counts?.myRetestPending ?? 0;

  const filterTriggerClass =
    "w-full min-w-0 max-w-full h-11 overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300";
  const filterFieldClass = "flex items-center gap-2 min-w-0 w-full";

  const searchFilterBar = (
    <div className="relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-50/30 to-orange-50/30 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 rounded-lg shrink-0">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Search & Filter
            </h2>
          </div>

          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.slice(0, 200))}
            placeholder="Search by title, description, project, or bug ID…"
            maxLength={200}
            className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <div className={filterFieldClass}>
                <Filter className="h-4 w-4 text-blue-500 shrink-0" />
                <Select
                  value={priorityFilter}
                  onValueChange={(v) => setFilter("priorityFilter", v)}
                >
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <div className={filterFieldClass}>
                <FolderOpen className="h-4 w-4 text-yellow-500 shrink-0" />
                <Select
                  value={projectFilter}
                  onValueChange={(v) => setFilter("projectFilter", v)}
                >
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {visibleProjects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <BugTypeFilterSelect
                value={bugTypeFilter}
                onValueChange={(v) => setFilter("bugTypeFilter", v)}
                triggerClassName={filterTriggerClass}
              />
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-4">
              <div className={filterFieldClass}>
                <User className="h-4 w-4 text-emerald-500 shrink-0" />
                <Select
                  value={fixedByFilter}
                  onValueChange={(v) => setFilter("fixedByFilter", v)}
                >
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Fixed by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All fixers</SelectItem>
                    {uniqueFixers.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {activeTab === "all-retests" && (
              <div className="col-span-12 sm:col-span-6 lg:col-span-4">
                <div className={filterFieldClass}>
                  <UserCheck className="h-4 w-4 text-purple-500 shrink-0" />
                  <Select
                    value={reporterFilter}
                    onValueChange={(v) => setFilter("reporterFilter", v)}
                  >
                    <SelectTrigger className={filterTriggerClass}>
                      <SelectValue placeholder="Reporter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All reporters</SelectItem>
                      {uniqueReporters.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="col-span-12 sm:col-span-6 lg:col-span-4 flex items-end">
              <Button
                type="button"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={clearFilters}
                className="h-11 w-full rounded-xl border-gray-200 dark:border-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPagination = () =>
    totalFiltered > 0 ? (
      <ListPagination
        currentPage={currentPage}
        totalPages={listTotalPages}
        totalItems={totalFiltered}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onPageSizeChange={setItemsPerPage}
        itemLabel="retests"
      />
    ) : null;

  const renderListBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="hidden xl:block rounded-2xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Issue", "Priority", "Project", "Fixed By", "Verification", "Actions"].map(
                    (h) => (
                      <TableHead key={h}>{h}</TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          </div>
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
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-destructive/50 bg-destructive/5">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-medium text-destructive">Failed to load retests</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There was an error fetching verification-pending fixes. Please try again.
          </p>
        </div>
      );
    }

    if (allRetestsCount === 0 && !hasActiveFilters && activeTab === "all-retests") {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
              <ClipboardCheck className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Verification queue clear
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              No fixed bugs are waiting for retest. New items appear here when a developer marks a
              bug as fixed.
            </p>
            <Button asChild size="lg" className="rounded-xl">
              <Link to={currentUser?.role ? `/${currentUser.role}/fixes` : "/fixes"}>
                View all fixes
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    if (bugs.length === 0) {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No matching retests
            </h3>
            <p className="text-muted-foreground mb-6">
              Adjust your search or filters, or switch tabs.
            </p>
            <Button variant="outline" onClick={clearFilters} className="rounded-xl">
              Clear filters
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {searchFilterBar}
        {renderPagination()}

        <div className="hidden xl:block relative overflow-x-auto w-full min-w-0">
          <div className="relative min-w-[640px] bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <Table className="w-full">
              <TableHeader className="bg-gradient-to-r from-gray-50 to-amber-50 dark:from-gray-800 dark:to-amber-950/40">
                <TableRow>
                  <TableHead className="font-bold py-4">Issue Title</TableHead>
                  <TableHead className="font-bold py-4">Priority</TableHead>
                  <TableHead className="font-bold py-4">Project</TableHead>
                  <TableHead className="font-bold py-4">Fixed By</TableHead>
                  <TableHead className="font-bold py-4">Verification</TableHead>
                  <TableHead className="text-right font-bold py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bugs.map((bug, index) => {
                  const project = visibleProjects.find((p) => p.id === bug.project_id);
                  const retest = formatRetestSummary(bug);
                  return (
                    <TableRow
                      key={bug.id}
                      className={cn(
                        "border-b border-gray-100/50 dark:border-gray-800/50",
                        index % 2 === 0
                          ? "bg-white/50 dark:bg-gray-900/50"
                          : "bg-gray-50/30 dark:bg-gray-800/30"
                      )}
                    >
                      <TableCell className="font-semibold py-4">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-2" />
                          <span className="break-words">{bug.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant={getPriorityBadgeVariant(bug.priority)}
                          className={cn(
                            "capitalize text-xs font-semibold",
                            bug.priority === "high"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : bug.priority === "medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          )}
                        >
                          {bug.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-2" />
                          <span>{project?.name || bug.project_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {bug.fixed_by_name || bug.updated_by_name || "Unknown"}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge
                          variant="outline"
                          className={cn("rounded-full text-xs font-medium", retest.className)}
                        >
                          {retest.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button variant="outline" size="sm" asChild className="rounded-xl">
                          <Link
                            to={
                              currentUser?.role
                                ? `/${currentUser.role}/bugs/${bug.id}?from=retests`
                                : `/bugs/${bug.id}?from=retests`
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

        <div className="xl:hidden grid grid-cols-1 gap-6 md:grid-cols-2">
          {bugs.map((bug) => (
            <RetestCard
              key={bug.id}
              bug={bug}
              projects={visibleProjects}
              listFromState={listFromState}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <ListPageShell>
      <ListPageHeader
        icon={<ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />}
        title="Retests"
        description="Fixed bugs awaiting tester verification — confirm fixes or reopen issues"
        accentBarClassName="from-amber-500 to-orange-600"
        underlayClassName="from-amber-50/50 via-transparent to-orange-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-orange-950/20"
        count={activeTab === "my-retests" ? myRetestsCount : allRetestsCount}
        countIcon={<ClipboardCheck className="h-5 w-5" />}
        countClassName="from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
      />

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
        <ListPageTabsShell underlayClassName="from-gray-50/50 to-amber-50/50 dark:from-gray-800/50 dark:to-amber-900/50">
          <ListPageTabTrigger value="all-retests">
            <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline truncate">All Retests</span>
            <span className="sm:hidden truncate">All</span>
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">
              {allRetestsCount}
            </span>
          </ListPageTabTrigger>
          <ListPageTabTrigger value="my-retests">
            <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline truncate">My Retests</span>
            <span className="sm:hidden truncate">My</span>
            <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-[10px] sm:text-xs font-bold shrink-0">
              {myRetestsCount}
            </span>
          </ListPageTabTrigger>
        </ListPageTabsShell>

        <TabsContent value="all-retests" className={LIST_TABS_CONTENT}>
          {renderListBody()}
        </TabsContent>
        <TabsContent value="my-retests" className={LIST_TABS_CONTENT}>
          {renderListBody()}
        </TabsContent>
      </Tabs>
    </ListPageShell>
  );
};

export default Retests;
