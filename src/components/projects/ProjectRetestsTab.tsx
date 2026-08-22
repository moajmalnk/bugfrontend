import { BugTypeFilterSelect } from "@/components/bugs/BugTypeFilterSelect";
import { formatRetestSummary } from "@/components/bugs/details/TesterVerificationPanel";
import { ItemsPerPageSelect } from "@/components/pagination/ItemsPerPageSelect";
import { PageJumpSelect } from "@/components/pagination/PageJumpSelect";
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
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import {
  listReturnState,
  useClampUrlPage,
  useResetUrlPageOnChange,
  useUrlPagination,
} from "@/hooks/useUrlPagination";
import { cn } from "@/lib/utils";
import { sortNamedUsersActiveFirst } from "@/lib/utils/userSort";
import { bugService, Bug as BugType } from "@/services/bugService";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ClipboardCheck,
  Filter,
  RotateCcw,
  Search,
  User,
  UserCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

const FIXED_STATUS = "fixed";
const RETEST_PENDING = "retest_pending";

type ProjectRetestsTabProps = {
  projectId: string;
  initialTab?: string | null;
};

export function ProjectRetestsTab({ projectId, initialTab }: ProjectRetestsTabProps) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const listFromState = listReturnState(location.pathname, location.search);
  const [searchParams, setSearchParams] = useSearchParams();

  const resolveTab = (tab: string | null | undefined) => {
    if (tab === "my-retests" || tab === "all-retests") return tab;
    return "all-retests";
  };

  const [activeTab, setActiveTab] = useState(resolveTab(initialTab));

  const [filters, setFilter, clearFilters] = usePersistedFilters(
    `project_retests_${projectId}`,
    {
      searchTerm: "",
      priorityFilter: "all",
      bugTypeFilter: "all",
      fixedByFilter: "all",
      reporterFilter: "all",
    }
  );

  const searchTerm = filters.searchTerm || "";
  const priorityFilter = filters.priorityFilter || "all";
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
    const urlTab = searchParams.get("tab");
    let targetTab = "all-retests";
    if (urlTab === "my-retests" || urlTab === "all-retests") {
      targetTab = urlTab;
    } else if (urlTab === "retests") {
      targetTab = "all-retests";
    }
    if (targetTab !== activeTab) setActiveTab(targetTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const reporterIdForQuery =
    activeTab === "my-retests"
      ? currentUser?.id
      : reporterFilter !== "all"
        ? reporterFilter
        : undefined;

  const fixerIdForQuery = fixedByFilter !== "all" ? fixedByFilter : undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "bugs",
      "project-retests",
      projectId,
      currentPage,
      itemsPerPage,
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
        projectId,
        status: FIXED_STATUS,
        verificationFilter: RETEST_PENDING,
        search: debouncedSearch || undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        fixedBy: fixerIdForQuery,
        bugTypeId: bugTypeFilter !== "all" ? bugTypeFilter : undefined,
        userId: reporterIdForQuery,
      }),
    placeholderData: (prev) => prev,
    enabled: !!currentUser && !!projectId,
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    staleTime: 60_000,
  });

  const bugs = useMemo(() => data?.bugs ?? [], [data?.bugs]);

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
    bugTypeFilter !== "all" ||
    fixedByFilter !== "all" ||
    (activeTab === "all-retests" && reporterFilter !== "all");

  useResetUrlPageOnChange(setCurrentPage, [
    activeTab,
    debouncedSearch,
    priorityFilter,
    bugTypeFilter,
    fixedByFilter,
    reporterFilter,
  ]);

  const totalFiltered = data?.pagination?.totalBugs ?? 0;
  const listTotalPages = Math.max(
    1,
    data?.pagination?.totalPages || Math.ceil(totalFiltered / itemsPerPage) || 1
  );
  useClampUrlPage(clampToTotalPages, listTotalPages);

  const allRetestsCount = data?.pagination?.counts?.retestPending ?? totalFiltered;
  const myRetestsCount = data?.pagination?.counts?.myRetestPending ?? 0;

  const filterTriggerClass =
    "w-full min-w-0 h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300";

  const bugDetailLink = (bugId: string) =>
    currentUser?.role
      ? `/${currentUser.role}/bugs/${bugId}?from=retests`
      : `/bugs/${bugId}?from=retests`;

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", val);
      p.delete("page");
      return p;
    });
  };

  const searchFilterBar = (
    <div className="relative w-full min-w-0">
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-amber-50/30 dark:from-gray-800/30 dark:to-amber-900/30 rounded-2xl pointer-events-none" />
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 md:p-6">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500 rounded-lg shrink-0">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
              Search & Filter
            </h3>
          </div>

          <div className="relative group w-full min-w-0">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-amber-500 transition-colors pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.slice(0, 200))}
              placeholder="Search by title, description, or bug ID…"
              maxLength={200}
              className="w-full min-w-0 pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                <Filter className="h-4 w-4 text-white" />
              </div>
              <Select value={priorityFilter} onValueChange={(v) => setFilter("priorityFilter", v)}>
                <SelectTrigger className={filterTriggerClass}>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[60]">
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <BugTypeFilterSelect
              value={bugTypeFilter}
              onValueChange={(v) => setFilter("bugTypeFilter", v)}
              className="min-w-0"
              accent="violet"
            />

            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <Select value={fixedByFilter} onValueChange={(v) => setFilter("fixedByFilter", v)}>
                <SelectTrigger className={filterTriggerClass}>
                  <SelectValue placeholder="Fixed by" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[60]">
                  <SelectItem value="all">All fixers</SelectItem>
                  {uniqueFixers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTab === "all-retests" && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                  <UserCheck className="h-4 w-4 text-white" />
                </div>
                <Select
                  value={reporterFilter}
                  onValueChange={(v) => setFilter("reporterFilter", v)}
                >
                  <SelectTrigger className={filterTriggerClass}>
                    <SelectValue placeholder="Reporter" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]">
                    <SelectItem value="all">All reporters</SelectItem>
                    {uniqueReporters.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-10 sm:h-11 w-full sm:w-auto px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (listTotalPages <= 1) {
      return (
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-6 p-4 rounded-xl border border-border/50">
          <span className="text-sm font-semibold">
            Showing <span className="text-primary font-bold">{totalFiltered}</span> retest
            {totalFiltered === 1 ? "" : "s"}
          </span>
          <ItemsPerPageSelect
            id="project-retests-items-per-page"
            value={itemsPerPage}
            onChange={setItemsPerPage}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 mb-6 p-4 rounded-xl border border-border/50">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            Showing {(currentPage - 1) * itemsPerPage + 1}-
            {Math.min(currentPage * itemsPerPage, totalFiltered)} of {totalFiltered} retests
          </span>
          <ItemsPerPageSelect
            id="project-retests-items-per-page-paged"
            value={itemsPerPage}
            onChange={setItemsPerPage}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="rounded-xl"
          >
            Previous
          </Button>
          <PageJumpSelect
            className="xl:hidden"
            currentPage={currentPage}
            totalPages={listTotalPages}
            onPageChange={setCurrentPage}
          />
          <span className="hidden xl:inline text-sm text-muted-foreground">
            Page {currentPage} of {listTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= listTotalPages}
            onClick={() => setCurrentPage((p) => Math.min(listTotalPages, p + 1))}
            className="rounded-xl"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const renderListBody = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="hidden xl:block rounded-2xl border overflow-hidden">
            <Table>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-4/5" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-24 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-destructive/50">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-4 text-lg font-medium text-destructive">Failed to load retests</h3>
        </div>
      );
    }

    if (allRetestsCount === 0 && !hasActiveFilters && activeTab === "all-retests") {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 p-12 text-center">
            <ClipboardCheck className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No retests pending
            </h3>
            <p className="text-muted-foreground">
              All fixed bugs in this project have been verified or are still open.
            </p>
          </div>
        </div>
      );
    }

    if (bugs.length === 0) {
      return (
        <div className="space-y-6">
          {searchFilterBar}
          <div className="rounded-2xl border p-12 text-center">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold mb-2">No matching retests</h3>
            <Button variant="outline" onClick={clearFilters} className="rounded-xl mt-4">
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
        <div className="hidden xl:block rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-xl">
          <Table>
            <TableHeader className="bg-gradient-to-r from-gray-50 to-amber-50 dark:from-gray-800 dark:to-amber-950/40">
              <TableRow>
                <TableHead className="font-bold py-4">Issue Title</TableHead>
                <TableHead className="font-bold py-4">Priority</TableHead>
                <TableHead className="font-bold py-4">Fixed By</TableHead>
                <TableHead className="font-bold py-4">Reporter</TableHead>
                <TableHead className="font-bold py-4">Verification</TableHead>
                <TableHead className="text-right font-bold py-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bugs.map((bug, index) => {
                const retest = formatRetestSummary(bug);
                return (
                  <TableRow
                    key={bug.id}
                    className={cn(
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
                    <TableCell className="py-4 capitalize">{bug.priority}</TableCell>
                    <TableCell className="py-4">
                      {bug.fixed_by_name || bug.updated_by_name || "Unknown"}
                    </TableCell>
                    <TableCell className="py-4">{bug.reporter_name || "Unknown"}</TableCell>
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
                        <Link to={bugDetailLink(String(bug.id))} state={listFromState}>
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
        <div className="xl:hidden grid grid-cols-1 gap-4 md:grid-cols-2">
          {bugs.map((bug) => {
            const retest = formatRetestSummary(bug);
            return (
              <div
                key={bug.id}
                className="rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-5 space-y-3 bg-white/80 dark:bg-gray-900/80"
              >
                <p className="font-bold text-gray-900 dark:text-white break-words">{bug.title}</p>
                <p className="text-sm text-muted-foreground capitalize">{bug.priority} priority</p>
                <Badge variant="outline" className={cn("rounded-full text-xs", retest.className)}>
                  {retest.label}
                </Badge>
                <Button variant="outline" size="sm" asChild className="w-full rounded-xl">
                  <Link to={bugDetailLink(String(bug.id))} state={listFromState}>
                    Verify fix
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 via-transparent to-orange-50/50 dark:from-amber-950/20 dark:via-transparent dark:to-orange-950/20" />
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                  <ClipboardCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    Retests
                  </h2>
                  <div className="h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mt-2" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Fixed bugs in this project awaiting tester verification
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  {activeTab === "my-retests" ? myRetestsCount : allRetestsCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-amber-50/50 dark:from-gray-800/50 dark:to-amber-900/50 rounded-2xl" />
          <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
            <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
              <TabsTrigger
                value="all-retests"
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
              >
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">All Retests</span>
                <span className="sm:hidden">All</span>
                <span className="ml-2 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold">
                  {allRetestsCount}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="my-retests"
                className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
              >
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">My Retests</span>
                <span className="sm:hidden">My</span>
                <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
                  {myRetestsCount}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
        <TabsContent value="all-retests" className="space-y-6 sm:space-y-8">
          {renderListBody()}
        </TabsContent>
        <TabsContent value="my-retests" className="space-y-6 sm:space-y-8">
          {renderListBody()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
