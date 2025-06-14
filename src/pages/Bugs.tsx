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

  useEffect(() => {
    fetchBugs();
  }, []);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      setAccessError(null);
      
      const data = await bugService.getBugs();
      setBugs(data);
      
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

  const FilterControls = () => (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-full min-w-[120px] max-w-[160px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full min-w-[120px] max-w-[160px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Status" />
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
    // Filter out fixed bugs from all counts since they belong on Fixes page
    const nonFixedBugs = bugs.filter(bug => bug.status !== "fixed");
    
    switch (tabType) {
      case "all-bugs":
        return nonFixedBugs.length;
      case "my-bugs":
        return nonFixedBugs.filter(bug => bug.reported_by === currentUser?.id).length;
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

    const getEmptyMessage = () => {
      if (currentUser?.role === "admin") {
        switch (activeTab) {
          case "my-bugs":
            return "You haven't reported any bugs yet.";
          default:
            return "No bugs found.";
        }
      }
      return "No bugs match your current filter criteria.";
    };

    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-background/50 p-6 sm:p-8 text-center mt-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
          <BugIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base sm:text-lg font-semibold">
          No bugs found
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-[300px]">
          {getEmptyMessage()}
        </p>
        {(currentUser?.role === "admin" ||
          currentUser?.role === "tester") && (
          <Button
            className="mt-5 h-9 text-xs sm:text-sm"
            asChild
            aria-label="Report a new bug"
          >
            <Link to="/bugs/new" state={{ from: "/bugs" }}>
              Report Bug
            </Link>
          </Button>
        )}
      </div>
    );
  };

  const canViewTabs = currentUser?.role === "admin" || currentUser?.role === "tester";

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-2 py-4 sm:px-6">
      <section className="max-w-6xl mx-auto space-y-4">
        {/* Header: Report Bug Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
          {skeletonLoading ? (
            <>
              <Skeleton className="h-9 sm:h-10 w-full sm:w-32 rounded-md" />
              <Skeleton className="h-7 sm:h-8 w-full sm:w-36 rounded-md" />
            </>
          ) : (
            <>
              {(currentUser?.role === "admin" || currentUser?.role === "tester") && (
                <Button
                  variant="default"
                  asChild
                  className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
                  aria-label="Report a new bug"
                >
                  <Link
                    to="/bugs/new"
                    state={{ from: "/bugs" }}
                    className="flex items-center justify-center"
                  >
                    <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Report Bug
                  </Link>
                </Button>
              )}
              
              {!loading && bugs.length > 0 && (() => {
                const pendingBugs = bugs.filter(bug => bug.status === "pending" || bug.status === "in_progress");
                return pendingBugs.length > 0 && (
                  <div className="flex items-center border rounded-md px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-50">
                    <BugIcon className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 mr-2" />
                    <span className="text-xs sm:text-sm font-medium text-orange-700">
                      {pendingBugs.length} Bugs Pending
                    </span>
                  </div>
                );
              })()}
            </>
          )}
        </div>

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
                <Input
                  placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background/50 h-9 text-xs sm:text-sm"
                  aria-label={`Search ${activeTab.replace('-', ' ')}`}
                  disabled={(bugs.length === 0 && !loading) || skeletonLoading}
                />

                {/* Mobile Filter Button */}
                <div className="block sm:hidden">
                  <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-9 text-xs bg-background/50"
                        aria-label="Open filters"
                        disabled={(bugs.length === 0 && !loading) || skeletonLoading}
                      >
                        <Filter className="h-3.5 w-3.5 mr-2" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[45vh] px-4 py-6">
                      <SheetHeader className="mb-4">
                        <SheetTitle className="text-base">Filters</SheetTitle>
                        <SheetDescription className="text-xs">
                          Apply filters to find specific bugs
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-3">
                        <FilterControls />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop Filters */}
                <div className="hidden sm:flex gap-3">
                  <FilterControls />
                </div>
              </div>

              {/* Content */}
              {skeletonLoading ? (
                <BugCardGridSkeletonAnimated count={3} />
              ) : loading ? (
                <BugCardGridSkeletonAnimated count={2} />
              ) : filteredBugs.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="grid gap-4 mt-4 grid-cols-1" style={{ minHeight: 200 }} aria-label="Bug list">
                  {filteredBugs.map((bug) => (
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
