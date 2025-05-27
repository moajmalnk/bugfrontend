import { BugCard } from "@/components/bugs/BugCard";
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
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton component
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService } from "@/services/bugService";
import { Bug } from "@/types";
import { Bug as BugIcon, Filter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// BugCardSkeleton component for loading state
const BugCardSkeleton = () => (
  <div className="rounded-lg border shadow-sm bg-card text-card-foreground p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex-1">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div>
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-6 w-24" />
    </div>
  </div>
);

const Bugs = () => {
  const { currentUser } = useAuth();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  useEffect(() => {
    fetchBugs();
  }, []);

  const fetchBugs = async () => {
    try {
      setLoading(true);
      const data = await bugService.getBugs();
      setBugs(data);
    } catch (error) {
      console.error("Error fetching bugs:", error);
      toast({
        title: "Error",
        description: "Failed to load bugs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    fetchBugs();
  };

  const filteredBugs = bugs.filter((bug) => {
    const matchesSearch =
      bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority =
      priorityFilter === "all" || bug.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || bug.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

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
          <SelectItem value="fixed">Fixed</SelectItem>
          <SelectItem value="declined">Declined</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-2 py-4 sm:px-6">
      <section className="max-w-6xl mx-auto space-y-4">
        {/* Header: Report Bug Button and Total Bugs Count */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Report Bug Button */}
          {(currentUser?.role === "admin" || currentUser?.role === "tester") && (
            <Button
              variant="default"
              asChild
              className="w-full sm:w-auto h-10 text-sm"
              aria-label="Report a new bug"
            >
              <Link
                to="/bugs/new"
                state={{ from: "/bugs" }}
                className="flex items-center justify-center"
              >
                <Plus className="mr-2 h-4 w-4" /> Report Bug
              </Link>
            </Button>
          )}

          {/* Total Bugs Count */}
          {!loading && bugs.length > 0 && (
            <div className="flex items-center border rounded-md px-3 py-1 bg-blue-50">
              <BugIcon className="h-4 w-4 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                {bugs.length} Total Bugs
              </span>
            </div>
          )}
        </div>

        {/* Search and Filters Section */}
        <div className="space-y-3">
          <Input
            placeholder="Search bugs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background/50 h-9 text-xs sm:text-sm"
            aria-label="Search bugs"
          />

          {/* Mobile Filter Button */}
          <div className="block sm:hidden">
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs bg-background/50"
                  aria-label="Open filters"
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

        {/* Bugs List with Loading Skeletons */}
        {loading ? (
          <div
            className="grid gap-4 mt-4 grid-cols-1"
            aria-busy="true"
            aria-label="Loading bug list"
          >
            {/* Display multiple skeleton cards while loading */}
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <BugCardSkeleton key={index} />
              ))}
          </div>
        ) : filteredBugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-border/40 bg-background/50 p-6 sm:p-8 text-center mt-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <BugIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base sm:text-lg font-semibold">
              No bugs found
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-[300px]">
              No bugs match your current filter criteria.
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
        ) : (
          <div
            className="grid gap-4 mt-4 grid-cols-1"
            style={{ minHeight: 200 }}
            aria-label="Bug list"
          >
            {filteredBugs.map((bug) => (
              <BugCard key={bug.id} bug={bug} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Bugs;
