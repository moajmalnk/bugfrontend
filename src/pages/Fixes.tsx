import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

// Table row skeleton component for loading state
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell className="w-[250px]">
      <Skeleton className="h-5 w-4/5" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-24" />
    </TableCell>
    <TableCell className="hidden md:table-cell">
      <Skeleton className="h-5 w-32" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-32" />
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <Skeleton className="h-5 w-28" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-24 ml-auto" />
    </TableCell>
  </TableRow>
);

// Card skeleton for mobile view
const CardSkeleton = () => (
  <div className="rounded-xl border bg-card text-card-foreground shadow p-4 space-y-3">
    <div className="flex justify-between items-start">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-6 w-20 rounded-full" />
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

// Header skeleton
const PageHeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
    <Skeleton className="h-10 w-48" />
    <div className="flex items-center gap-4 w-full sm:w-auto">
      <Skeleton className="h-10 w-full sm:w-52" />
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

const BugCard = ({ bug }: { bug: BugType }) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <p className="font-bold text-base break-words pr-2">{bug.title}</p>
          <Badge
            variant={getPriorityBadgeVariant(bug.priority)}
            className="capitalize shrink-0"
          >
            {bug.priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          Bug ID: <span className="font-mono text-xs">{bug.id}</span>
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0" />
            <span>
              Reported by:{" "}
              <span className="font-medium text-foreground">
                {bug.reporter_name || "BugRicer"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>
              Fixed by:{" "}
              <span className="font-medium text-foreground">
                {bug.updated_by_name || "BugRicer"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              Fixed on:{" "}
              <span className="font-medium text-foreground">
                {formatDate(bug.updated_at)}
              </span>
            </span>
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="secondary" size="sm" asChild>
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
          {/* Desktop Table Skeleton */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Reported By
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Fixed By
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
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
          {/* Mobile Card Skeleton */}
          <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
              <Link
                to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
                className="w-full md:w-auto"
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
          <h3 className="mt-4 text-lg font-medium">All Clear!</h3>
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
        {/* Search and Filter Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fixes by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] text-sm">
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
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Pagination Controls at the top */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 w-full bg-background rounded-lg shadow-sm p-3 border border-border">
          <div>
            <span className="text-sm text-muted-foreground font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalFiltered)} of{" "}
              {totalFiltered} fixes
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-border rounded-md px-3 py-2 text-sm w-full sm:w-auto bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Items per page"
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      isActive={currentPage === i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>

        {/* Desktop & Tablet View */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="hidden md:table-cell">
                  Reported By
                </TableHead>
                <TableHead className="hidden lg:table-cell">Fixed By</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fixed Date
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBugs.map((bug) => (
                <TableRow key={bug.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {bug.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getPriorityBadgeVariant(bug.priority)}
                      className="capitalize"
                    >
                      {bug.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {bug.reporter_name || "BugRicer"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {bug.updated_by_name || "BugRicer"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatDate(bug.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
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

        {/* Mobile View */}
        <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
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
    <main className="min-h-[calc(100vh-4rem)] bg-background px-2 py-4 sm:px-6">
      <section className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Fixed Bugs
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Review all completed and resolved issues.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {showTabs && (
              <Link
                to={currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs"}
                className="w-full md:w-auto"
              >
                <Button variant="default" className="w-full md:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Fix a Bug
                </Button>
              </Link>
            )}
            <div className="hidden sm:flex items-center border rounded-md px-3 py-2 bg-background">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm font-medium text-muted-foreground">
                {filteredBugs.length}{" "}
                <span className="hidden lg:inline">Issues Fixed</span>
              </span>
            </div>
          </div>
        </div>

        {showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all-fixes">
                <Code className="h-4 w-4 mr-2" />
                All Fixes ({allFixesCount})
              </TabsTrigger>
              <TabsTrigger value="my-fixes">
                <User className="h-4 w-4 mr-2" />
                My Fixes ({myFixesCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all-fixes" className="mt-4">
              <div className="space-y-4">{renderContent()}</div>
            </TabsContent>
            <TabsContent value="my-fixes" className="mt-4">
              <div className="space-y-4">{renderContent()}</div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">{renderContent()}</div>
        )}
      </section>
    </main>
  );
};

export default Fixes;
