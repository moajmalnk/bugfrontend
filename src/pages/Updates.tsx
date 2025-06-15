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
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Plus, Search, Filter, Lock, Bell, User } from "lucide-react";
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
  <div className="rounded-lg border p-4 bg-background space-y-3">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-5 w-[200px]" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-4 w-[120px]" />
    </div>
  </div>
);

// Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <h1 className="text-2xl font-bold tracking-tight break-words">
      Updates
    </h1>
    <div className="flex items-center space-x-2 sm:space-x-0 sm:ml-auto">
      <Skeleton className="h-[34px] w-36 rounded-md" />
    </div>
  </div>
);

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const Updates = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all-updates");

  // Fetch updates from backend
  const {
    data: updates = [],
    isLoading: skeletonLoading,
    error,
  } = useQuery({
    queryKey: ["updates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/getAll.php`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      throw new Error(data.message || "Failed to fetch updates");
    },
  });

  // Filter updates based on active tab
  const getFilteredUpdatesByTab = () => {
    switch (activeTab) {
      case "all-updates":
        return updates;
      case "my-updates":
        return updates.filter(update => update.created_by === currentUser?.username);
      default:
        return updates;
    }
  };

  const tabFilteredUpdates = getFilteredUpdatesByTab();

  const filteredUpdates = tabFilteredUpdates.filter(
    (update) =>
      update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (typeFilter === "all" || update.type === typeFilter)
  );

  // Get tab-specific count
  const getTabCount = (tabType: string) => {
    switch (tabType) {
      case "all-updates":
        return updates.length;
      case "my-updates":
        return updates.filter(update => update.created_by === currentUser?.username).length;
      default:
        return 0;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-blue-500";
      case "fix":
        return "text-green-500";
      case "maintenance":
        return "text-yellow-500";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const FilterControls = () => (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-full sm:min-w-[120px] sm:max-w-[160px] bg-background/50 h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="feature">Feature</SelectItem>
          <SelectItem value="fix">Fix</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  const renderEmptyState = () => {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-6 sm:p-8 text-center">
        <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold">
          {activeTab === "my-updates" ? "No updates found" : "No Updates"}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
          {activeTab === "my-updates" 
            ? "You haven't created any updates yet."
            : "No updates have been created yet."}
        </p>
      </div>
    );
  };

  // Updates Tabs Component
  const UpdatesTabs = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="all-updates" className="text-xs sm:text-sm">
          <Bell className="h-4 w-4 mr-1" />
          All Updates ({getTabCount("all-updates")})
        </TabsTrigger>
        <TabsTrigger value="my-updates" className="text-xs sm:text-sm">
          <User className="h-4 w-4 mr-1" />
          My Updates ({getTabCount("my-updates")})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="relative">
            {skeletonLoading ? (
              <Skeleton className="w-full h-9 sm:h-10 md:h-10 rounded-md" />
            ) : (
              <Input
                placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background/50 h-9 sm:h-10 text-sm pl-9 sm:pl-10"
                aria-label={`Search ${activeTab.replace('-', ' ')}`}
                disabled={getTabCount(activeTab) === 0 && !skeletonLoading}
              />
            )}
            {!skeletonLoading && (
              <Search className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            )}
          </div>

          <div className="block lg:hidden">
            {skeletonLoading ? (
              <Skeleton className="w-full h-9 sm:h-10 md:h-10 rounded-md" />
            ) : (
              <Sheet
                open={isFilterSheetOpen}
                onOpenChange={setIsFilterSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9 sm:h-10 text-sm bg-background/50"
                    aria-label="Open filters"
                    disabled={getTabCount(activeTab) === 0 && !skeletonLoading}
                  >
                    <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[50vh] px-4 py-6">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-lg">Filters</SheetTitle>
                    <SheetDescription className="text-sm">
                      Apply filters to find specific updates
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4">
                    <FilterControls />
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>

          <div className="hidden lg:flex gap-4">
            {skeletonLoading ? (
              <Skeleton className="h-9 w-full sm:w-44 md:w-40 lg:w-44 rounded-md" />
            ) : (
              <FilterControls />
            )}
          </div>
        </div>

        {/* Content */}
        {skeletonLoading ? (
          <>
            {/* Table skeleton for desktop and large tablets */}
            <div className="hidden lg:block rounded-md border overflow-x-auto">
              <Table className="min-w-[800px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Update ID</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[150px]">Created By</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array(3)
                    .fill(0)
                    .map((_, index) => (
                      <TableRowSkeleton key={index} />
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Card skeleton for mobile and tablets */}
            <div className="lg:hidden space-y-3 sm:space-y-4">
              {Array(2)
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
            <div className="hidden lg:block rounded-md border overflow-x-auto">
              <Table className="min-w-[800px] w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Update ID</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[150px]">Created By</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUpdates.map((update) => (
                    <TableRow key={update.id}>
                      <TableCell className="font-medium max-w-[120px] break-all">
                        <div className="flex items-center space-x-2">
                          <Bell className="h-4 w-4 text-muted-foreground" />
                          <span>{update.id}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[250px] break-words">
                        {update.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getTypeColor(update.type)}
                        >
                          {update.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] break-words">
                        {update.created_by}
                      </TableCell>
                      <TableCell>{formatDate(update.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/updates/${update.id}`}>View Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden space-y-3 sm:space-y-4">
              {filteredUpdates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-lg border p-3 sm:p-4 bg-background flex flex-col gap-2 sm:gap-3"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="font-semibold text-xs sm:text-sm break-all">
                      {update.id}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getTypeColor(update.type)}`}
                    >
                      {update.type}
                    </Badge>
                  </div>
                  <div className="font-bold text-sm sm:text-base break-words">
                    {update.title}
                  </div>
                  <div className="flex flex-col gap-1 text-xs sm:text-sm">
                    <div className="text-muted-foreground break-words">
                      Created by:{" "}
                      <span className="font-medium">{update.created_by}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Date: {formatDate(update.created_at)}
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <Button variant="outline" size="sm" asChild className="text-xs">
                      <Link to={`/updates/${update.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
      <section className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 md:gap-6">
          {skeletonLoading ? (
            <>
              <Skeleton className="h-9 sm:h-10 w-full sm:w-32 md:w-28 lg:w-32 rounded-md" />
              <Skeleton className="h-7 sm:h-8 w-full sm:w-40 md:w-36 lg:w-40 rounded-md" />
            </>
          ) : (
            <>
              {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
                <Button
                  variant="default"
                  asChild
                  className="w-full sm:w-auto h-9 sm:h-10 text-sm sm:text-base"
                  aria-label="Create new update"
                >
                  <Link to="/new-update" className="flex items-center justify-center">
                    <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> New Update
                  </Link>
                </Button>
              )}

              {!skeletonLoading && getTabCount(activeTab) > 0 && (
                <div className="flex items-center border rounded-md px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-50">
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 mr-2" />
                  <span className="text-xs sm:text-sm font-medium text-blue-700">
                    {getTabCount(activeTab)} Updates
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <UpdatesTabs />
      </section>
    </main>
  );
};

export default Updates;
