import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { projectService } from "@/services/projectService";
import { updateService } from "@/services/updateService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, Bell, Lock, Plus, Search, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

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
    <TableCell>
      <Skeleton className="h-4 w-28" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-[90px] ml-auto" />
    </TableCell>
  </TableRow>
);

// Enhanced Card skeleton for mobile and tablet view
const CardSkeleton = () => (
  <Card className="hover:shadow-md transition-all duration-200">
    <CardHeader className="p-4 sm:p-5">
      <div className="flex justify-between items-center gap-3">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
        <Skeleton className="h-6 w-16 sm:w-20 rounded-md" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3 p-4 sm:p-5 pt-0">
      <Skeleton className="h-5 w-4/5" />
      <div className="space-y-2 text-sm">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
    <CardFooter className="p-4 sm:p-5 pt-0">
      <Skeleton className="h-10 sm:h-11 w-[120px] sm:w-[140px]" />
    </CardFooter>
  </Card>
);

// Enhanced Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 sm:gap-6">
    <div className="space-y-2 sm:space-y-3">
      <Skeleton className="h-8 sm:h-10 w-32 sm:w-40 lg:w-48" />
      <Skeleton className="h-4 sm:h-5 w-48 sm:w-64 lg:w-80" />
    </div>
    <div className="flex items-center gap-3 w-full md:w-auto">
      <Skeleton className="h-11 sm:h-12 w-full sm:w-32 lg:w-40 rounded-lg" />
      <Skeleton className="h-12 w-32 lg:w-40 rounded-lg" />
    </div>
  </div>
);

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const Updates = () => {
  const { currentUser } = useAuth();
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all-updates");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");

  // Fetch updates from backend
  const {
    data: updates = [],
    isLoading: skeletonLoading,
    error: updatesError,
  } = useQuery({
    queryKey: ["updates"],
    queryFn: () => updateService.getUpdates(),
  });

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, updates.length, searchTerm, typeFilter, createdByFilter]);

  // Fetch projects to determine if user can create new update
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentUser?.id],
    queryFn: () => projectService.getProjects(),
    enabled: !!currentUser,
  });

  const isLoading = skeletonLoading || projectsLoading;

  // Filter updates based on active tab
  const filteredUpdates = useMemo(() => {
    let filtered = updates;

    // First filter by tab
    switch (activeTab) {
      case "all-updates":
        filtered = updates;
        break;
      case "my-updates":
        filtered = updates.filter(
          (update) => update.created_by === currentUser?.username
        );
        break;
      default:
        filtered = updates;
    }

    // Then apply search and other filters
    return filtered.filter((update) => {
      const matchesSearch =
        update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (update.created_by &&
          update.created_by.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || update.type === typeFilter;
      const matchesCreatedBy =
        createdByFilter === "all" || update.created_by === createdByFilter;

      return matchesSearch && matchesType && matchesCreatedBy;
    });
  }, [
    updates,
    activeTab,
    currentUser?.username,
    searchTerm,
    typeFilter,
    createdByFilter,
  ]);

  // Pagination calculations
  const totalFiltered = filteredUpdates.length;
  const paginatedUpdates = filteredUpdates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-updates":
        return updates.length;
      case "my-updates":
        return updates.filter(
          (update) => update.created_by === currentUser?.username
        ).length;
      default:
        return 0;
    }
  };

  // Get unique creators for filter
  const uniqueCreators = useMemo(() => {
    const creators = updates
      .map((update) => update.created_by)
      .filter(Boolean)
      .filter((creator, index, arr) => arr.indexOf(creator) === index);
    return creators.sort();
  }, [updates]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-blue-500 border-blue-200 bg-blue-50";
      case "fix":
        return "text-green-500 border-green-200 bg-green-50";
      case "maintenance":
        return "text-yellow-500 border-yellow-200 bg-yellow-50";
      default:
        return "";
    }
  };

  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 sm:p-8 text-center min-h-[400px]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {activeTab === "my-updates" ? "No updates found" : "No Updates"}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          {activeTab === "my-updates"
            ? "You haven't created any updates yet. Click 'New Update' to get started."
            : "There are no updates to display right now. Check back later or create a new one."}
        </p>
      </div>
    );
  };

  // Updates Tabs Component
  const UpdatesTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 h-12 sm:h-14">
        <TabsTrigger
          value="all-updates"
          className="text-sm sm:text-base font-medium"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">All Updates</span>
          <span className="sm:hidden">All</span>
          <span className="ml-1 sm:ml-2">({getTabCount("all-updates")})</span>
        </TabsTrigger>
        <TabsTrigger
          value="my-updates"
          className="text-sm sm:text-base font-medium"
        >
          <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          <span className="hidden sm:inline">My Updates</span>
          <span className="sm:hidden">My</span>
          <span className="ml-1 sm:ml-2">({getTabCount("my-updates")})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
        {/* Enhanced Search and Filter Controls */}
        <div className="flex flex-col gap-4 p-4 sm:p-5 bg-muted/30 rounded-lg border">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search updates, projects, or creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            {/* Enhanced Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-sm h-10 sm:h-11">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="feature">Feature</SelectItem>
                <SelectItem value="fix">Fix</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>

            {/* Enhanced Created By Filter */}
            <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
              <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px] text-sm h-10 sm:h-11">
                <SelectValue placeholder="Created By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Creators</SelectItem>
                {uniqueCreators.map((creator) => (
                  <SelectItem key={creator} value={creator}>
                    {creator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Enhanced Clear Filters Button */}
          {(searchTerm ||
            typeFilter !== "all" ||
            createdByFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setCreatedByFilter("all");
              }}
              className="w-full sm:w-auto h-10 sm:h-11"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
        {filteredUpdates.length > 0 && totalPages > 1 && (
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
                  updates
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

              {/* Enhanced Pagination Controls */}
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
                    <span className="text-sm text-muted-foreground font-medium">
                      Go to:
                    </span>
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
                      of{" "}
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
        {filteredUpdates.length > 0 && totalPages <= 1 && (
          <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
              <span className="text-sm sm:text-base text-foreground font-semibold">
                Showing{" "}
                <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  {totalFiltered}
                </span>{" "}
                updates
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

        {/* Content */}
        {isLoading ? (
          <>
            {/* Table skeleton for desktop and large tablets */}
            <div className="hidden lg:block rounded-lg border overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[250px] lg:w-[300px] font-semibold text-sm sm:text-base">
                      Title
                    </TableHead>
                    <TableHead className="w-[100px] lg:w-[120px] font-semibold text-sm sm:text-base">
                      Type
                    </TableHead>
                    <TableHead className="w-[150px] lg:w-[180px] font-semibold text-sm sm:text-base">
                      Project
                    </TableHead>
                    <TableHead className="w-[150px] lg:w-[180px] font-semibold text-sm sm:text-base">
                      Created By
                    </TableHead>
                    <TableHead className="w-[120px] lg:w-[140px] font-semibold text-sm sm:text-base">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-semibold text-sm sm:text-base">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRowSkeleton key={index} />
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Card skeleton for mobile and tablets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 lg:hidden">
              {Array(4)
                .fill(0)
                .map((_, index) => (
                  <CardSkeleton key={index} />
                ))}
            </div>
          </>
        ) : filteredUpdates.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <div className="hidden lg:block rounded-lg border overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[250px] lg:w-[300px] font-semibold text-sm sm:text-base">
                      Title
                    </TableHead>
                    <TableHead className="w-[100px] lg:w-[120px] font-semibold text-sm sm:text-base">
                      Type
                    </TableHead>
                    <TableHead className="w-[150px] lg:w-[180px] font-semibold text-sm sm:text-base">
                      Project
                    </TableHead>
                    <TableHead className="w-[150px] lg:w-[180px] font-semibold text-sm sm:text-base">
                      Created By
                    </TableHead>
                    <TableHead className="w-[120px] lg:w-[140px] font-semibold text-sm sm:text-base">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-semibold text-sm sm:text-base">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUpdates.map((update) => (
                    <TableRow
                      key={update.id}
                      className="hover:bg-muted/20 transition-colors duration-200"
                    >
                      <TableCell className="max-w-[250px] lg:max-w-[300px] break-words text-sm sm:text-base">
                        {update.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`font-medium text-xs sm:text-sm px-2 py-1 ${getTypeColor(
                            update.type
                          )}`}
                        >
                          {update.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] lg:max-w-[180px] break-words text-sm sm:text-base">
                        {update.project_name}
                      </TableCell>
                      <TableCell className="max-w-[150px] lg:max-w-[180px] break-words text-sm sm:text-base">
                        <span className="font-medium">
                          {update.created_by || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm sm:text-base">
                        {format(new Date(update.created_at), "PPPp")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-9 sm:h-10"
                          >
                            <Link
                              to={
                                currentUser?.role
                                  ? `/${currentUser.role}/updates/${update.id}`
                                  : `/updates/${update.id}`
                              }
                            >
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 lg:hidden">
              {paginatedUpdates.map((update) => (
                <Card
                  key={update.id}
                  className="flex flex-col justify-between hover:shadow-md transition-all duration-200"
                >
                  <CardHeader className="p-4 sm:p-5">
                    <div className="flex justify-between items-start gap-3">
                      <CardTitle className="text-base sm:text-lg font-bold leading-tight break-all flex-1">
                        <Link
                          to={
                            currentUser?.role
                              ? `/${currentUser.role}/updates/${update.id}`
                              : `/updates/${update.id}`
                          }
                          className="hover:underline"
                        >
                          {update.title}
                        </Link>
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs sm:text-sm h-fit shrink-0 px-2 py-1 ${getTypeColor(
                          update.type
                        )}`}
                      >
                        {update.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm sm:text-base p-4 sm:p-5 pt-0">
                    <div className="flex items-center text-muted-foreground">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />{" "}
                      Project:{" "}
                      <span className="font-medium text-foreground ml-1">
                        {update.project_name}
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />{" "}
                      By:{" "}
                      <span className="font-medium text-foreground ml-1">
                        {update.created_by || "BugRicer"}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-3 p-4 sm:p-5 pt-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {format(new Date(update.created_at), "PPPp")}
                    </div>
                    <div className="flex justify-end w-full gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full h-10 sm:h-11"
                      >
                        <Link
                          to={
                            currentUser?.role
                              ? `/${currentUser.role}/updates/${update.id}`
                              : `/updates/${update.id}`
                          }
                        >
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 sm:gap-6">
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                Updates
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base lg:text-lg mt-1 sm:mt-2">
                A log of all features, fixes, and maintenance updates.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 mt-2 sm:mt-0">
              {projects.length > 0 && (
                <>
                  <Link
                    to={
                      currentUser?.role
                        ? `/${currentUser.role}/new-update`
                        : "/new-update"
                    }
                  >
                    <Button className="w-full sm:w-auto h-11 sm:h-12 text-sm sm:text-base">
                      <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      New Update
                    </Button>
                  </Link>
                  <div className="inline-flex items-center border rounded-lg px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mr-2" />
                    <span className="text-sm sm:text-base font-medium text-blue-700 dark:text-blue-300">
                      {updates.length}{" "}
                      <span className="hidden lg:inline">Updates</span>
                    </span>
                  </div>
                </>
              )}
              {projects.length === 0 && !isLoading && (
                <p className="text-xs text-muted-foreground mt-2 text-center sm:text-left">
                  You must be in a project to create an update.
                </p>
              )}
            </div>
          </div>
        )}

        <UpdatesTabs />
      </section>
    </main>
  );
};

export default Updates;
