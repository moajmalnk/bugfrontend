import {
  BugCard,
  BugCardGridSkeletonAnimated,
} from "@/components/bugs/BugCard";
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
import { Bug } from "@/types";
import { Bug as BugIcon, Filter, Lock, Plus, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Bugs = () => {
  const { currentUser } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all-bugs");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalBugs, setTotalBugs] = useState(0);
  const [pendingBugsCount, setPendingBugsCount] = useState(0);

  useEffect(() => {
    fetchBugs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, priorityFilter, statusFilter, bugs.length]);

  const fetchBugs = async (page = 1, limit = itemsPerPage) => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      setAccessError(null);

      // Fetch ALL bugs if you want a true count
      const data = await bugService.getBugs({
        page: 1,
        limit: 1000,
        status: "pending",
        userId: currentUser?.id,
      }); // or a higher limit if needed
      setBugs(data.bugs);
      setCurrentPage(data.pagination.currentPage);
      setTotalBugs(data.pagination.totalBugs);

      // Calculate pending bugs from all fetched bugs
      const pendingCount = data.bugs.filter(
        (bug) => bug.status === "pending" // or include "in_progress"
      ).length;
      setPendingBugsCount(pendingCount);

      setSkeletonLoading(false);
    } catch (error: any) {
      // // console.error("Error fetching bugs:", error);
      if (error.message?.includes("access")) {
        setAccessError("You don't have access to any projects");
      } else {
        toast({
          title: "Error",
          description: "Failed to load bugs. Please try again.",
          variant: "destructive",
        });
      }
      setBugs([]);
      setSkeletonLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    fetchBugs();
  };

  // Filter bugs based on active tab for admin users
  const getFilteredBugs = () => {
    let filteredByTab = bugs;

    if (currentUser?.role === "admin" || currentUser?.role === "tester") {
      switch (activeTab) {
        case "all-bugs":
          filteredByTab = bugs;
          break;
        case "my-bugs":
          filteredByTab = bugs.filter((bug) => {
            // Convert both to strings for comparison to handle type mismatches
            return String(bug.reported_by) === String(currentUser.id);
          });
          break;
        default:
          filteredByTab = bugs;
      }
    }

    // Apply additional filters
    return filteredByTab.filter((bug) => {
      const matchesSearch =
        bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority =
        priorityFilter === "all" || bug.priority === priorityFilter;
      const matchesStatus =
        statusFilter === "all" || bug.status === statusFilter;
      // Exclude fixed bugs from Bugs page (they should only appear on Fixes page)
      const isNotFixed = bug.status !== "fixed";
      return matchesSearch && matchesPriority && matchesStatus && isNotFixed;
    });
  };

  const filteredBugs = getFilteredBugs();

  const totalFiltered = filteredBugs.length;
  const paginatedBugs = filteredBugs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    const validStatuses = ["pending", "in_progress", "declined", "rejected"];
    switch (tabType) {
      case "all-bugs":
        return bugs.filter((bug) => validStatuses.includes(bug.status)).length;
      case "my-bugs":
        return bugs.filter(
          (bug) =>
            bug.reported_by === currentUser?.id &&
            validStatuses.includes(bug.status)
        ).length;
      default:
        return 0;
    }
  };

  // Content to display when no bugs are found
  const renderEmptyState = () => {
    if (accessError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-background/50 p-6 sm:p-8 text-center mt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base sm:text-lg font-semibold">No Access</h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-[300px]">
            {accessError}. You need to be a member of a project to view its
            bugs.
          </p>
        </div>
      );
    }
  };

  const canViewTabs =
    currentUser?.role === "admin" || currentUser?.role === "tester";

  const isDeveloper = currentUser?.role === "developer";
  const noBugs = !loading && filteredBugs.length === 0;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Enhanced Page Header and Description */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Bugs
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-lg">
              Fix your bugs and track pending bugs
            </p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center md:items-center gap-3 w-full md:w-auto">
            {(currentUser?.role === "admin" ||
              currentUser?.role === "tester") && (
              <Button
                variant="default"
                asChild
                className="w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base"
                aria-label="Report a new bug"
              >
                <Link
                  to={
                    currentUser?.role
                      ? `/${currentUser.role}/bugs/new`
                      : "/bugs/new"
                  }
                  state={{
                    from: currentUser?.role
                      ? `/${currentUser.role}/bugs`
                      : "/bugs",
                  }}
                  className="flex items-center justify-center"
                >
                  <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Report Bug
                </Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center border rounded-lg px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
              <BugIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 mr-2" />
              <span className="text-sm sm:text-base font-medium text-orange-700 dark:text-orange-300">
                {pendingBugsCount}{" "}
                <span className="hidden lg:inline">Bugs Pending</span>
              </span>
            </div>
          </div>
        </div>
        {/* Enhanced Professional Header for Developers */}
        {isDeveloper && noBugs && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 sm:p-8 mb-6 sm:mb-8 flex flex-col items-center text-center">
            <BugIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-blue-900 dark:text-blue-100">
              No Bugs Assigned
            </h2>
            <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200 max-w-md">
              Great job! You currently have no bugs assigned to you.
              <br />
              Check back later or ask your project admin for new assignments.
            </p>
          </div>
        )}

        {/* Admin Tabs or Regular Content */}
        {canViewTabs ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-12 sm:h-14">
              <TabsTrigger
                value="all-bugs"
                className="text-sm sm:text-base font-medium"
              >
                <BugIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">All Bugs</span>
                <span className="sm:hidden">All</span>
                <span className="ml-1 sm:ml-2">
                  ({getTabCount("all-bugs")})
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="my-bugs"
                className="text-sm sm:text-base font-medium"
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="hidden sm:inline">My Bugs</span>
                <span className="sm:hidden">My</span>
                <span className="ml-1 sm:ml-2">({getTabCount("my-bugs")})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
              {/* Enhanced Search and Filter Controls */}
              <div className="flex flex-col md:flex-row lg:flex-row gap-4 items-stretch md:items-center lg:items-center">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search bugs by title or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all duration-200"
                  />
                </div>

                {/* Enhanced Filter Controls */}
                <div className="flex flex-col sm:flex-row md:flex-row gap-3">
                  {/* Priority Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={priorityFilter}
                      onValueChange={setPriorityFilter}
                    >
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

                  {/* Enhanced Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-sm h-10 sm:h-11">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Enhanced Clear Filters Button */}
                  {(searchTerm ||
                    priorityFilter !== "all" ||
                    statusFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setPriorityFilter("all");
                        setStatusFilter("all");
                      }}
                      className="w-full sm:w-auto h-10 sm:h-11"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
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
                        bugs
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
                          onChange={(e) =>
                            setItemsPerPage(Number(e.target.value))
                          }
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
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
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
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
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
                      bugs
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
                        onChange={(e) =>
                          setItemsPerPage(Number(e.target.value))
                        }
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

              {/* Content */}
              {skeletonLoading ? (
                <BugCardGridSkeletonAnimated count={3} />
              ) : loading ? (
                <BugCardGridSkeletonAnimated count={2} />
              ) : filteredBugs.length === 0 ? (
                <div className="text-center mb-8 mt-8">
                  <div className="flex justify-center mb-2">
                    <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 h-12 w-12">
                      <BugIcon className="h-7 w-7 text-green-600 dark:text-green-400" />
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    No Bugs Assigned
                  </h2>
                  <p className="text-muted-foreground text-base">
                    You're all caught up! There are currently no bugs assigned
                    to you.
                    <br />
                    Check back later or help your team by reporting new issues.
                  </p>
                </div>
              ) : (
                <div
                  className="grid gap-4 mt-4 grid-cols-1"
                  style={{ minHeight: 200 }}
                  aria-label="Bug list"
                >
                  {paginatedBugs.map((bug) => (
                    <BugCard key={bug.id} bug={bug} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Enhanced Search and Filter Controls for Developers */}
            <div className="flex flex-col md:flex-row lg:flex-row gap-4 items-stretch md:items-center lg:items-center">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search bugs by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base transition-all duration-200"
                />
              </div>

              {/* Enhanced Filter Controls */}
              <div className="flex flex-col sm:flex-row md:flex-row gap-3">
                {/* Priority Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
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

                {/* Enhanced Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-sm h-10 sm:h-11">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                {/* Enhanced Clear Filters Button */}
                {(searchTerm ||
                  priorityFilter !== "all" ||
                  statusFilter !== "all") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setPriorityFilter("all");
                      setStatusFilter("all");
                    }}
                    className="w-full sm:w-auto h-10 sm:h-11"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Professional Responsive Pagination for Developers - Only show if there are multiple pages */}
            {!skeletonLoading &&
              !loading &&
              totalFiltered > 0 &&
              totalPages > 1 && (
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
                        bugs
                      </span>
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-3">
                      <label
                        htmlFor="items-per-page-dev"
                        className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                      >
                        Items per page:
                      </label>
                      <div className="relative group">
                        <select
                          id="items-per-page-dev"
                          value={itemsPerPage}
                          onChange={(e) =>
                            setItemsPerPage(Number(e.target.value))
                          }
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
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
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
                          {" "}
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
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
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

            {/* Simple results info when no pagination needed for developers */}
            {!skeletonLoading &&
              !loading &&
              totalFiltered > 0 &&
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
                    <label
                      htmlFor="items-per-page-dev-simple"
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                    >
                      Items per page:
                    </label>
                    <div className="relative group">
                      <select
                        id="items-per-page-dev-simple"
                        value={itemsPerPage}
                        onChange={(e) =>
                          setItemsPerPage(Number(e.target.value))
                        }
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
                    <BugCard key={bug.id} bug={bug} />
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
