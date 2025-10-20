import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAuth } from "@/context/AuthContext";
import { updateService, Update } from "@/services/updateService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, Bell, Filter, Plus, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
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

interface ProjectUpdatesProps {
  projectId: string;
  projectName: string;
  showCreateButton?: boolean;
}

const ProjectUpdates = ({ projectId, projectName, showCreateButton = true }: ProjectUpdatesProps) => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");

  // Fetch updates for this specific project
  const {
    data: updates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["project-updates", projectId],
    queryFn: () => updateService.getUpdatesByProject(projectId),
    enabled: !!projectId,
  });

  // Filter updates based on search and filters
  const filteredUpdates = useMemo(() => {
    return updates.filter((update) => {
      const matchesSearch =
        (update.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (update.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (update.created_by || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || update.type === typeFilter;
      const matchesCreatedBy =
        createdByFilter === "all" || update.created_by === createdByFilter;

      return matchesSearch && matchesType && matchesCreatedBy;
    });
  }, [updates, searchTerm, typeFilter, createdByFilter]);

  // Pagination calculations
  const totalFiltered = filteredUpdates.length;
  const paginatedUpdates = filteredUpdates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

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
        return "text-blue-500 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30";
      case "updation":
        return "text-green-500 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950/30";
      case "maintenance":
        return "text-yellow-500 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-950/30";
      default:
        return "text-gray-500 border-gray-200 bg-gray-50 dark:text-gray-400 dark:border-gray-800 dark:bg-gray-950/30";
    }
  };

  const renderEmptyState = () => {
    return (
      <div className="relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No Updates Yet
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 max-w-md mx-auto">
            This project doesn't have any updates yet. Create the first update to get started.
          </p>
          {showCreateButton && (
            <div className="mt-6">
              <Button asChild size="lg" className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                <Link to={currentUser?.role ? `/${currentUser.role}/new-update?project_id=${projectId}` : `/new-update?project_id=${projectId}`}>
                  <Plus className="mr-2 h-5 w-5" /> Create First Update
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Search and Filter Controls Skeleton */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-green-500 rounded-lg">
                <Search className="h-4 w-4 text-white" />
              </div>
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <Skeleton className="h-11 flex-1" />
              <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-11 w-[160px]" />
                <Skeleton className="h-11 w-[160px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Table skeleton for desktop */}
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
                <TableHead className="w-[100px] lg:w-[120px] font-semibold text-sm sm:text-base">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Error Loading Updates
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 max-w-md mx-auto">
            There was an error loading the updates for this project. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      {showCreateButton && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                Project Updates
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                Updates and changes for {projectName}
              </p>
            </div>
          </div>
          <Button asChild className="h-12 px-6 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <Link to={currentUser?.role ? `/${currentUser.role}/new-update?project_id=${projectId}` : `/new-update?project_id=${projectId}`}>
              <Plus className="mr-2 h-5 w-5" /> New Update
            </Link>
          </Button>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
        <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-green-500 rounded-lg">
              <Search className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Search updates, descriptions, or creators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="updation">Updation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Created By Filter */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                    <SelectValue placeholder="Created By" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[60]">
                    <SelectItem value="all">All Creators</SelectItem>
                    {uniqueCreators.map((creator) => (
                      <SelectItem key={creator} value={creator}>
                        {creator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button */}
              {(searchTerm || typeFilter !== "all" || createdByFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setCreatedByFilter("all");
                    setCurrentPage(1);
                  }}
                  className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {filteredUpdates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
            <span className="text-sm sm:text-base text-foreground font-semibold">
              Showing{" "}
              <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {totalFiltered}
              </span>{" "}
              update{totalFiltered !== 1 ? "s" : ""}
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
      )}

      {/* Content */}
      {filteredUpdates.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
              <Table className="w-full table-fixed">
                <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                  <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                    <TableHead className="w-[35%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Title
                    </TableHead>
                    <TableHead className="w-[15%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Type
                    </TableHead>
                    <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Created By
                    </TableHead>
                    <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Date
                    </TableHead>
                    <TableHead className="w-[10%] pr-4 text-right font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUpdates.map((update, index) => (
                    <TableRow
                      key={update.id}
                      className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-emerald-50/50 dark:hover:from-blue-900/20 dark:hover:to-emerald-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                        index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                      }`}
                    >
                      <TableCell className="w-[35%] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {update.title}
                        </div>
                      </TableCell>
                      <TableCell className="w-[15%] px-4 py-4">
                        <Badge
                          variant="outline"
                          className={`font-medium text-xs sm:text-sm px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                            update.type
                          )}`}
                        >
                          {update.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[20%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                        {update.created_by}
                      </TableCell>
                      <TableCell className="w-[20%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                        {format(new Date(update.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="w-[10%] pr-4 text-right py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-9 sm:h-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                        >
                          <Link
                            to={
                              currentUser?.role
                                ? `/${currentUser.role}/updates/${update.id}`
                                : `/updates/${update.id}`
                            }
                          >
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 lg:hidden">
            {paginatedUpdates.map((update) => (
              <Card
                key={update.id}
                className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex flex-col justify-between hover:shadow-2xl transition-all duration-300"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-emerald-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-emerald-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative p-4 sm:p-5">
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
                      className={`text-xs sm:text-sm h-fit shrink-0 px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                        update.type
                      )}`}
                    >
                      {update.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-3 text-sm sm:text-base p-4 sm:p-5 pt-0">
                  <div className="flex items-center text-muted-foreground">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />
                    Created by:{" "}
                    <span className="font-medium text-foreground ml-1">
                      {update.created_by}
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />
                    Date:{" "}
                    <span className="font-medium text-foreground ml-1">
                      {format(new Date(update.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-3 p-4 sm:p-5 pt-0">
                  <div className="flex justify-end w-full gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <Link
                        to={
                          currentUser?.role
                            ? `/${currentUser.role}/updates/${update.id}`
                            : `/updates/${update.id}`
                        }
                      >
                        View
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
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

              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="h-10 w-10 p-0 font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-10 px-3 sm:px-4 min-w-[80px] sm:min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectUpdates;
