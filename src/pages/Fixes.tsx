import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService, Bug as BugType } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bug, CheckCircle, Search, Plus, Filter, Lock, Code, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
    <TableCell className="text-right">
      <Skeleton className="h-9 w-[90px] ml-auto" />
    </TableCell>
  </TableRow>
);

// Card skeleton for mobile view
const CardSkeleton = () => (
  <div className="rounded-lg border p-3 sm:p-4 bg-background flex flex-col gap-2 sm:gap-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full" />
      <Skeleton className="h-4 w-12 sm:w-16" />
      <Skeleton className="h-[20px] sm:h-[22px] w-12 sm:w-16 rounded-full" />
    </div>
    <Skeleton className="h-4 sm:h-5 w-4/5" />
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3 w-28 sm:w-32" />
      <Skeleton className="h-3 w-24 sm:w-28" />
    </div>
    <div className="flex justify-end">
      <Skeleton className="h-7 sm:h-8 w-[80px] sm:w-[90px]" />
    </div>
  </div>
);

// Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <h1 className="text-2xl font-bold tracking-tight break-words">
      Fixed Bugs
    </h1>
    <div className="flex items-center space-x-2 sm:space-x-0 sm:ml-auto">
      <Skeleton className="h-[34px] w-36 rounded-md" />
    </div>
  </div>
);

const Fixes = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all-fixes");

  // Fetch all bugs
  const {
    data: bugs = [],
    isLoading,
    error,
  } = useQuery<BugType[]>({
    queryKey: ["bugs"],
    queryFn: () => bugService.getBugs(),
    retry: (failureCount, error: any) => {
      if (error?.message?.includes('access') || error?.message?.includes('permission')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const fixedBugs = bugs.filter((bug) => bug.status === "fixed");

  // Only show tabs for admin/developer
  const showTabs = currentUser?.role === "admin" || currentUser?.role === "developer";

  // Tab logic
  const getFilteredBugsByTab = () => {
    if (!showTabs) return fixedBugs;
    if (activeTab === "my-fixes") {
      return fixedBugs.filter(bug => String(bug.updated_by) === String(currentUser?.id));
    }
    return fixedBugs;
  };

  const tabFilteredBugs = getFilteredBugsByTab();

  // Search and filter
  const filteredBugs = tabFilteredBugs.filter(
    (bug) =>
      (bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (priorityFilter === "all" || bug.priority === priorityFilter)
  );

  // Priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500";
      case "medium": return "text-yellow-500";
      case "low": return "text-green-500";
      default: return "";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter controls
  const FilterControls = () => (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
        <SelectTrigger className="w-full sm:min-w-[120px] sm:max-w-[160px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  // Responsive rendering (table for desktop, cards for mobile)
  const renderBugsTable = () => (
    <div className="hidden lg:block rounded-md border overflow-x-auto">
      <Table className="min-w-[800px] w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Bug ID</TableHead>
            <TableHead className="w-[250px]">Title</TableHead>
            <TableHead className="w-[100px]">Priority</TableHead>
            <TableHead className="w-[150px]">Reported By</TableHead>
            <TableHead className="w-[120px]">Fixed Date</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBugs.map((bug) => (
            <TableRow key={bug.id}>
              <TableCell className="font-medium max-w-[120px] break-all">
                <div className="flex items-center space-x-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <span>{bug.id.substring(0, 8)}</span>
                </div>
              </TableCell>
              <TableCell className="max-w-[250px] break-words">{bug.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getPriorityColor(bug.priority)}>
                  {bug.priority}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[150px] break-words">{bug.reported_by}</TableCell>
              <TableCell>{formatDate(bug.updated_at)}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/bugs/${bug.id}`}>View Details</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderBugsCards = () => (
    <div className="lg:hidden space-y-3 sm:space-y-4">
      {filteredBugs.map((bug) => (
        <div
          key={bug.id}
          className="rounded-lg border p-3 sm:p-4 bg-background flex flex-col gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Bug className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="font-semibold text-xs sm:text-sm break-all">
              {bug.id.substring(0, 8)}
            </span>
            <Badge variant="outline" className={`text-xs ${getPriorityColor(bug.priority)}`}>{bug.priority}</Badge>
          </div>
          <div className="font-bold text-sm sm:text-base break-words">{bug.title}</div>
          <div className="flex flex-col gap-1 text-xs sm:text-sm">
            <div className="text-muted-foreground break-words">
              Reported by: <span className="font-medium">{bug.reported_by}</span>
            </div>
            <div className="text-muted-foreground">Fixed: {formatDate(bug.updated_at)}</div>
          </div>
          <div className="flex justify-end mt-1">
            <Button variant="outline" size="sm" asChild className="text-xs">
              <Link to={`/bugs/${bug.id}`}>View Details</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 sm:p-8 text-center">
      <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold">
        {showTabs && activeTab === "my-fixes" ? "No fixes found" : "No Fixed Bugs"}
      </h3>
      <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
        {showTabs && activeTab === "my-fixes" ? "You haven't fixed any bugs yet." : "No bugs have been fixed yet."}
      </p>
    </div>
  );

  // Main render
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
      <section className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 md:gap-6">
          {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
            <Button
              variant="default"
              asChild
              className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
              aria-label="Fix a bug"
            >
              <Link to="/bugs/" className="flex items-center justify-center">
                <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Fix Bugs
              </Link>
            </Button>
          )}
          {!isLoading && filteredBugs.length > 0 && (
            <div className="flex items-center border rounded-md px-3 sm:px-4 py-1.5 sm:py-2 bg-green-50">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-2" />
              <span className="text-xs sm:text-sm font-medium text-green-700">
                {filteredBugs.length} Issues Fixed
              </span>
            </div>
          )}
        </div>

        {/* Tabs for admin/developer, else just show all fixes */}
        {showTabs ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="all-fixes" className="text-xs sm:text-sm">
                <Code className="h-4 w-4 mr-1" />
                All Fixes ({fixedBugs.length})
              </TabsTrigger>
              <TabsTrigger value="my-fixes" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1" />
                My Fixes ({fixedBugs.filter(bug => String(bug.updated_by) === String(currentUser?.id)).length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="space-y-4">
              {/* Search and Filters */}
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <div className="relative">
                  <Input
                    placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background/50 h-9 sm:h-10 text-sm pl-9 sm:pl-10"
                    aria-label={`Search ${activeTab.replace('-', ' ')}`}
                  />
                  <Search className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </div>
                <div className="block lg:hidden">
                  <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-9 sm:h-10 text-sm bg-background/50"
                        aria-label="Open filters"
                      >
                        <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[50vh] px-4 py-6">
                      <SheetHeader className="mb-6">
                        <SheetTitle className="text-lg">Filters</SheetTitle>
                        <SheetDescription className="text-sm">
                          Apply filters to find specific fixed bugs
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-4">
                        <FilterControls />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="hidden lg:flex gap-4">
                  <FilterControls />
                </div>
              </div>
              {/* Content */}
              {isLoading ? (
                <HeaderSkeleton />
              ) : filteredBugs.length === 0 ? (
                renderEmptyState()
              ) : (
                <>
                  {renderBugsTable()}
                  {renderBugsCards()}
                </>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          // For testers: just show all fixes, no tabs
          <div className="space-y-4">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="relative">
                <Input
                  placeholder="Search all fixes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background/50 h-9 sm:h-10 text-sm pl-9 sm:pl-10"
                  aria-label="Search all fixes"
                />
                <Search className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </div>
              <div className="block lg:hidden">
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-9 sm:h-10 text-sm bg-background/50"
                      aria-label="Open filters"
                    >
                      <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh] px-4 py-6">
                    <SheetHeader className="mb-6">
                      <SheetTitle className="text-lg">Filters</SheetTitle>
                      <SheetDescription className="text-sm">
                        Apply filters to find specific fixed bugs
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4">
                      <FilterControls />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="hidden lg:flex gap-4">
                <FilterControls />
              </div>
            </div>
            {/* Content */}
            {isLoading ? (
              <HeaderSkeleton />
            ) : filteredBugs.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                {renderBugsTable()}
                {renderBugsCards()}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
};

export default Fixes;
