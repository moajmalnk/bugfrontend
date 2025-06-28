import { BugCard, BugCardSkeleton, BugCardGridSkeletonAnimated } from "@/components/bugs/BugCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService } from "@/services/bugService";
import { Bug } from "@/types";
import { Bug as BugIcon, Filter, Lock, Plus, Code, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

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
      const data = await bugService.getBugs({ page: 1, limit: 1000, status: "pending", userId: currentUser?.id }); // or a higher limit if needed
      setBugs(data.bugs);
      setCurrentPage(data.pagination.currentPage);
      setTotalBugs(data.pagination.totalBugs);

      // Calculate pending bugs from all fetched bugs
      const pendingCount = data.bugs.filter(
        bug => bug.status === "pending" // or include "in_progress"
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
          filteredByTab = bugs.filter(bug => {
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
      const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
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

  const FilterControls = () => (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Input
        placeholder={`Search ${activeTab.replace('-', ' ')}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 min-w-0 bg-background/50 h-9 text-xs sm:text-sm"
        aria-label={`Search ${activeTab.replace('-', ' ')}`}
        disabled={(bugs.length === 0 && !loading) || skeletonLoading}
      />
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-[180px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="declined">Declined</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    const validStatuses = ["pending", "in_progress", "declined", "rejected"];
    switch (tabType) {
      case "all-bugs":
        return bugs.filter(bug => validStatuses.includes(bug.status)).length;
      case "my-bugs":
        return bugs.filter(bug => bug.reported_by === currentUser?.id && validStatuses.includes(bug.status)).length;
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
          <h3 className="mt-4 text-base sm:text-lg font-semibold">
            No Access
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-[300px]">
            {accessError}. You need to be a member of a project to view its bugs.
          </p>
        </div>
      );
    }
  };

  const canViewTabs = currentUser?.role === "admin" || currentUser?.role === "tester";

  const isDeveloper = currentUser?.role === "developer";
  const noBugs = !loading && filteredBugs.length === 0;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-2 py-4 sm:px-6">
      <section className="max-w-6xl mx-auto space-y-4">
        {/* Page Header and Description */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bugs</h1>
            <p className="text-muted-foreground">Fix your bugs and track pending bugs</p>
          </div>
          <div className="flex items-center gap-2">
            {(currentUser?.role === "admin" || currentUser?.role === "tester") && (
              <Button
                variant="default"
                asChild
                className="w-full md:w-auto"
                aria-label="Report a new bug"
              >
                <Link
                  to={currentUser?.role ? `/${currentUser.role}/bugs/new` : "/bugs/new"}
                  state={{ from: currentUser?.role ? `/${currentUser.role}/bugs` : "/bugs" }}
                  className="flex items-center justify-center"
                >
                  <Plus className="mr-2 h-4 w-4" /> Report Bug
                </Link>
              </Button>
            )}
            <div className="hidden sm:flex items-center border rounded-md px-3 py-2 bg-orange-50">
              <BugIcon className="h-4 w-4 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-orange-700">
                {pendingBugsCount} <span className="hidden lg:inline">Bugs Pending</span>
              </span>
            </div>
          </div>
        </div>
        {/* Professional Header for Developers */}
        {isDeveloper && noBugs && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 mb-4 flex flex-col items-center text-center">
            <BugIcon className="h-8 w-8 text-blue-500 mb-2" />
            <h2 className="text-xl font-bold mb-1 text-blue-900 dark:text-blue-100">No Bugs Assigned</h2>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Great job! You currently have no bugs assigned to you.<br />
              Check back later or ask your project admin for new assignments.
            </p>
          </div>
        )}

        {/* Admin Tabs or Regular Content */}
        {canViewTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all-bugs" className="text-xs sm:text-sm">
                <BugIcon className="h-4 w-4 mr-1" />
                All Bugs ({getTabCount("all-bugs")})
              </TabsTrigger>
              <TabsTrigger value="my-bugs" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1" />
                My Bugs ({getTabCount("my-bugs")})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {/* Search and Filters */}
                      <div className="space-y-3">
                        <FilterControls />
                      </div>

              {/* Pagination */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4 w-full bg-background rounded-lg shadow-sm p-3 border border-border">
                <div>
                  <span className="text-sm text-muted-foreground font-medium">
                    Showing {(currentPage - 1) * itemsPerPage + 1}
                    -
                    {Math.min(currentPage * itemsPerPage, totalFiltered)}
                    {" "}of {totalFiltered} bugs
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                  <select
                    value={itemsPerPage}
                    onChange={e => setItemsPerPage(Number(e.target.value))}
                    className="border border-border rounded-md px-3 py-2 text-sm w-full sm:w-auto bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label="Items per page"
                  >
                    {[10, 25, 50].map(n => (
                      <option key={n} value={n}>{n} / page</option>
                    ))}
                  </select>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          aria-disabled={currentPage === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>

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
                  <h2 className="text-2xl font-bold text-foreground mb-1">No Bugs Assigned</h2>
                  <p className="text-muted-foreground text-base">
                    You're all caught up! There are currently no bugs assigned to you.<br />
                    Check back later or help your team by reporting new issues.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 mt-4 grid-cols-1" style={{ minHeight: 200 }} aria-label="Bug list">
                  {paginatedBugs.map(bug => (
                    <BugCard key={bug.id} bug={bug} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div>
            {/* ...search/filter controls... */}
            <div>
              {filteredBugs.length === 0 ? renderEmptyState() : (
                <div>
                  {filteredBugs.map((bug) => (
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
