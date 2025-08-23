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
import { bugService, Bug as BugType } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bug,
  Calendar,
  CheckCircle,
  Code,
  Filter,
  Plus,
  Search,
  User,
  UserCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

// Enhanced bug card component with better responsive design
const BugCard = ({ bug }: { bug: BugType }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/20">
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-start mb-3 gap-3">
          <h3 className="font-semibold text-base lg:text-lg break-words pr-2 flex-1 leading-tight">
            {bug.title}
          </h3>
          <Badge
            variant={getPriorityBadgeVariant(bug.priority)}
            className="capitalize shrink-0 text-xs sm:text-sm px-2 py-1"
          >
            {bug.priority}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Bug ID:{" "}
          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
            {bug.id}
          </span>
        </p>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="flex-1">
              Reported by:{" "}
              <span className="font-medium text-foreground">
                {bug.reporter_name || "BugRicer"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-green-600" />
            <span className="flex-1">
              Fixed by:{" "}
              <span className="font-medium text-foreground">
                {bug.updated_by_name || "BugRicer"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="flex-1">
              Fixed on:{" "}
              <span className="font-medium text-foreground">
                {formatDate(bug.updated_at)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="secondary"
            size="sm"
            asChild
            className="w-full sm:w-auto"
          >
            <Link to={role ? `/${role}/bugs/${bug.id}` : `/bugs/${bug.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

const Fixes = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all-fixes");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data, isLoading, error } = useQuery<{
    bugs: BugType[];
    pagination: any;
  }>({
    queryKey: ["bugs"],
    queryFn: () =>
      bugService.getBugs({
        page: 1,
        limit: 1000,
        status: "fixed",
        userId: currentUser?.id,
      }),
  });

  const bugs = data?.bugs ?? [];
  const pagination = data?.pagination;

  const filteredBugs = useMemo(() => {
    const fixedBugs = bugs.filter((bug) => bug.status === "fixed");

    let tabFilteredBugs = fixedBugs;
    if (currentUser?.role === "admin" || currentUser?.role === "developer") {
      if (activeTab === "my-fixes") {
        tabFilteredBugs = fixedBugs.filter(
          (bug) => String(bug.updated_by) === String(currentUser?.id)
        );
      }
    }

    return tabFilteredBugs.filter(
      (bug) =>
        (bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bug.id.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (priorityFilter === "all" || bug.priority === priorityFilter)
    );
  }, [bugs, activeTab, currentUser?.id, searchTerm, priorityFilter]);

  const showTabs =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          {/* Desktop & Tablet Table Skeleton */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] sm:w-[280px] lg:w-[300px]">
                    Title
                  </TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Reported By
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Fixed By
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">
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
          <div className="grid sm:hidden grid-cols-1 gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </>
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

    if (bugs.filter((bug) => bug.status === "fixed").length === 0) {
      return (
        <div className="text-center py-10 px-4 rounded-lg border border-dashed">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">All Clear!</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no fixed bugs to display.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Button asChild className="w-full sm:w-auto">
              <Link
                to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
              >
                <Bug className="mr-2 h-4 w-4" />
                View All Bugs
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    if (filteredBugs.length === 0) {
      return (
        <div className="text-center py-10 px-4 rounded-lg border border-dashed">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No Results Found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No fixes match your current filters.
          </p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              setSearchTerm("");
              setPriorityFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      );
    }

    const totalFiltered = filteredBugs.length;
    const paginatedBugs = filteredBugs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(totalFiltered / itemsPerPage);

    return (
      <>
        {/* Enhanced Search and Filter Controls */}
        <div className="flex flex-col md:flex-row lg:flex-row gap-4 items-stretch md:items-center lg:items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fixes by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all duration-200"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row md:flex-row gap-3">
            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-sm h-10 sm:h-11">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || priorityFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setPriorityFilter("all");
                }}
                className="w-full sm:w-auto h-10 sm:h-11"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
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
                  fixes
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-3">
                <label
                  htmlFor="items-per-page"
                  className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                >
                  Items per page:
                </label>
                <div className="relative group">
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                    aria-label="Items per page"
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                    <svg
                      className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Pagination Navigation */}
            <div className="flex flex-col sm:flex-row md:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 md:pt-0 border-t border-border/30">
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
              <div className="flex items-center justify-center gap-2 w-full sm:w-auto md:w-auto">
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
                        variant={currentPage === page ? "default" : "outline"}
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

        {/* Simple results info when no pagination needed */}
        {totalPages <= 1 && (
          <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
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
              <label
                htmlFor="items-per-page-simple"
                className="text-sm text-muted-foreground font-medium whitespace-nowrap"
              >
                Items per page:
              </label>
              <div className="relative group">
                <select
                  id="items-per-page-simple"
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                  aria-label="Items per page"
                >
                  {[10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                  <svg
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Desktop & Tablet View */}
        <div className="hidden sm:block rounded-lg border overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="bg-muted/30">
                <TableHead className="w-[250px] sm:w-[280px] lg:w-[300px] xl:w-[350px] font-semibold text-sm sm:text-base">
                  Title
                </TableHead>
                <TableHead className="font-semibold text-sm sm:text-base">
                  Priority
                </TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-sm sm:text-base">
                  Reported By
                </TableHead>
                <TableHead className="hidden lg:table-cell font-semibold text-sm sm:text-base">
                  Fixed By
                </TableHead>
                <TableHead className="hidden xl:table-cell font-semibold text-sm sm:text-base">
                  Fixed Date
                </TableHead>
                <TableHead className="text-right font-semibold text-sm sm:text-base">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBugs.map((bug) => (
                <TableRow
                  key={bug.id}
                  className="hover:bg-muted/20 transition-colors duration-200"
                >
                  <TableCell className="font-medium max-w-[250px] sm:max-w-[280px] lg:max-w-[300px] xl:max-w-[350px] truncate text-sm sm:text-base">
                    {bug.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getPriorityBadgeVariant(bug.priority)}
                      className="capitalize text-xs sm:text-sm px-2 py-1"
                    >
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm sm:text-base">
                    {bug.reporter_name || "BugRicer"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm sm:text-base">
                    {bug.updated_by_name || "BugRicer"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm sm:text-base">
                    {formatDate(bug.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-9 sm:h-10"
                    >
                      <Link
                        to={
                          currentUser?.role
                            ? `/${currentUser.role}/bugs/${bug.id}`
                            : `/bugs/${bug.id}`
                        }
                      >
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Enhanced Mobile & Tablet Card View */}
        <div className="grid sm:hidden grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {paginatedBugs.map((bug) => (
            <BugCard key={bug.id} bug={bug} />
          ))}
        </div>
      </>
    );
  };

  const myFixesCount = useMemo(
    () =>
      bugs.filter(
        (b) =>
          b.status === "fixed" &&
          String(b.updated_by) === String(currentUser?.id)
      ).length,
    [bugs, currentUser?.id]
  );
  const allFixesCount = useMemo(
    () => bugs.filter((b) => b.status === "fixed").length,
    [bugs]
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 sm:gap-6 md:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Fixed Bugs
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Review all completed and resolved issues.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center md:items-center gap-3 w-full md:w-auto">
            {showTabs && (
              <Link
                to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
                className="w-full sm:w-auto"
              >
                <Button
                  variant="default"
                  className="w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base"
                >
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Fix a Bug
                </Button>
              </Link>
            )}
            <div className="hidden sm:flex items-center border rounded-lg px-4 py-3 bg-background">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mr-2" />
              <span className="text-sm sm:text-base font-medium text-muted-foreground">
                {filteredBugs.length}{" "}
                <span className="hidden lg:inline">Issues Fixed</span>
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        {showTabs ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-12 sm:h-14 md:h-14">
              <TabsTrigger
                value="all-fixes"
                className="text-sm sm:text-base font-medium"
              >
                <Code className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">All Fixes</span>
                <span className="sm:hidden">All</span>
                <span className="ml-1 sm:ml-2">({allFixesCount})</span>
              </TabsTrigger>
              <TabsTrigger
                value="my-fixes"
                className="text-sm sm:text-base font-medium"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">My Fixes</span>
                <span className="sm:hidden">My</span>
                <span className="ml-1 sm:ml-2">({myFixesCount})</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all-fixes" className="mt-0">
              <div className="space-y-6 sm:space-y-8 md:space-y-8">
                {renderContent()}
              </div>
            </TabsContent>
            <TabsContent value="my-fixes" className="mt-0">
              <div className="space-y-6 sm:space-y-8 md:space-y-8">
                {renderContent()}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 sm:space-y-8 md:space-y-8">
            {renderContent()}
          </div>
        )}
      </section>
    </main>
  );
};

export default Fixes;
