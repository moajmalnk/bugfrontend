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
import { useState } from "react";
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
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateService } from "@/services/updateService";
import { projectService } from "@/services/projectService";

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

// Card skeleton for mobile view
const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-5 w-4/5" />
      <div className="space-y-2 text-sm">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </CardContent>
    <CardFooter>
      <Skeleton className="h-9 w-[120px]" />
    </CardFooter>
  </Card>
);

// Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <div className="space-y-1">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-4 w-48" />
    </div>
    <Skeleton className="h-10 w-full sm:w-32 rounded-lg" />
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
    error: updatesError,
  } = useQuery({
    queryKey: ["updates"],
    queryFn: () => updateService.getUpdates(),
  });

  // Fetch projects to determine if user can create new update
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", currentUser?.id],
    queryFn: () => projectService.getProjects(),
    enabled: !!currentUser,
  });
  
  const isLoading = skeletonLoading || projectsLoading;

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
      (update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      update.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
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
        return "text-blue-500 border-blue-200 bg-blue-50";
      case "fix":
        return "text-green-500 border-green-200 bg-green-50";
      case "maintenance":
        return "text-yellow-500 border-yellow-200 bg-yellow-50";
      default:
        return "";
    }
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
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="all-updates" className="text-xs sm:text-sm">
          <Bell className="h-4 w-4 mr-2" />
          All Updates ({getTabCount("all-updates")})
        </TabsTrigger>
        <TabsTrigger value="my-updates" className="text-xs sm:text-sm">
          <User className="h-4 w-4 mr-2" />
          My Updates ({getTabCount("my-updates")})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            {isLoading ? (
              <Skeleton className="w-full h-10 rounded-md" />
            ) : (
              <Input
                placeholder={`Search in ${activeTab.replace('-', ' ')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background/50 h-10 text-sm pl-10"
                aria-label={`Search ${activeTab.replace('-', ' ')}`}
                disabled={getTabCount(activeTab) === 0 && !isLoading}
              />
            )}
            {!isLoading && (
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="block lg:hidden">
            {isLoading ? (
              <Skeleton className="w-full h-9 rounded-md" />
            ) : (
              <Sheet
                open={isFilterSheetOpen}
                onOpenChange={setIsFilterSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-9"
                    aria-label="Open filters"
                    disabled={getTabCount(activeTab) === 0 && !isLoading}
                  >
                    <Filter className="h-4 w-4 mr-2" />
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
            {isLoading ? (
              <Skeleton className="h-9 w-44 rounded-md" />
            ) : (
              <FilterControls />
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <>
            {/* Table skeleton for desktop and large tablets */}
            <div className="hidden lg:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Update ID</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[150px]">Project</TableHead>
                    <TableHead className="w-[150px]">Created By</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
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

            {/* Card skeleton for mobile and tablets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
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
            <div className="hidden lg:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Update ID</TableHead>
                    <TableHead className="w-[250px]">Title</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[150px]">Project</TableHead>
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
                          className={`font-medium ${getTypeColor(update.type)}`}
                        >
                          {update.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] break-words">
                        {update.project_name}
                      </TableCell>
                      <TableCell className="max-w-[150px] break-words">
                        <span className="font-medium">{update.created_by || "Unknown"}</span>
                      </TableCell>
                      <TableCell>{format(new Date(update.created_at), "PPPp")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={currentUser?.role ? `/${currentUser.role}/updates/${update.id}` : `/updates/${update.id}`}>View Details</Link>
                          </Button>
                          {(currentUser?.role === "admin" || update.created_by === currentUser?.username) && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={currentUser?.role ? `/${currentUser.role}/updates/${update.id}/edit` : `/updates/${update.id}/edit`}>Edit</Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
              {filteredUpdates.map((update) => (
                <Card
                  key={update.id}
                  className="flex flex-col justify-between"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-base font-bold leading-tight break-all">
                        <Link to={currentUser?.role ? `/${currentUser.role}/updates/${update.id}`: `/updates/${update.id}`} className="hover:underline">
                          {update.title}
                        </Link>
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className={`text-xs h-fit shrink-0 ${getTypeColor(update.type)}`}
                      >
                        {update.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                     <div className="flex items-center text-muted-foreground">
                        <Bell className="h-4 w-4 mr-2" /> ID: {update.id}
                     </div>
                     <div className="flex items-center text-muted-foreground">
                        <Lock className="h-4 w-4 mr-2" /> Project: {update.project_name}
                     </div>
                     <div className="flex items-center text-muted-foreground">
                        <User className="h-4 w-4 mr-2" /> By:{" "}
                        <span className="font-medium text-foreground">{update.created_by || "BugRicer"}</span>
                     </div>
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-2">
                     <div className="text-xs text-muted-foreground">
                        {format(new Date(update.created_at), "PPPp")}
                     </div>
                     <div className="flex justify-end w-full gap-2">
                       <Button variant="outline" size="sm" asChild className="w-full">
                         <Link to={currentUser?.role ? `/${currentUser.role}/updates/${update.id}` : `/updates/${update.id}`}>View Details</Link>
                       </Button>
                       {(currentUser?.role === "admin" || update.created_by === currentUser?.username) && (
                         <Button variant="outline" size="sm" asChild className="w-full">
                           <Link to={currentUser?.role ? `/${currentUser.role}/updates/${update.id}/edit` : `/updates/${update.id}/edit`}>Edit</Link>
                         </Button>
                       )}
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
    <main className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-6 lg:p-8">
      <section className="max-w-7xl mx-auto space-y-6">
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Updates</h1>
              <p className="text-muted-foreground text-sm mt-1">
                A log of all features, fixes, and maintenance updates.
              </p>
            </div>
            <div className="flex-shrink-0 w-full sm:w-auto">
              {projects.length > 0 && (
                <Link to={currentUser?.role ? `/${currentUser.role}/new-update` : "/new-update"}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Update
                  </Button>
                </Link>
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
