import { ActivityList } from "@/components/activities/ActivityList";
import { BugCard } from "@/components/bugs/BugCard";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import Bugs from "@/pages/Bugs";
import Fixes from "@/pages/Fixes";
import MyTasks from "@/pages/MyTasks";
import Updates from "@/pages/Updates";
import { sharedTaskService, SharedTask } from "@/services/sharedTaskService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { ENV } from "@/lib/env";
import { bugService, Bug as BugType } from "@/services/bugService";
import {
  Project,
  projectService,
  UpdateProjectData,
} from "@/services/projectService";
import { updateService } from "@/services/updateService";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  Bug,
  BugIcon,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Code,
  Filter,
  ListChecks,
  Lock,
  Loader2,
  Plus,
  Search,
  Shield,
  TestTube,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

// Skeleton components for loading state
const ProjectHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
    <div className="w-full md:w-auto">
      <Skeleton className="h-8 w-64 md:w-80 mb-2" />
      <Skeleton className="h-5 w-full md:w-96 max-w-xl" />
    </div>
    <Skeleton className="h-10 w-full md:w-32 mt-4 md:mt-0" />
  </div>
);

const StatsCardSkeleton = () => (
  <Card className="flex-1 min-w-[150px]">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-12" />
    </CardContent>
  </Card>
);

const RecentActivitySkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40 mb-2" />
      <Skeleton className="h-4 w-60" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
      </div>
    </CardContent>
  </Card>
);

const BugCardSkeleton = () => (
  <div className="border border-border rounded-lg p-4">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40 sm:w-60" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
    <Skeleton className="h-16 w-full mb-3" />
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);

interface ProjectUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  project_id: string;
  created_at: string;
}

function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    uuid
  );
}

// Member card component for cleaner JSX
const MemberCard = ({
  member,
  isAdmin = false,
  onRemove,
}: {
  member: ProjectUser;
  isAdmin?: boolean;
  onRemove?: (id: string) => void;
}) => {
  const { currentUser } = useAuth();
  const canRemove = currentUser?.role === "admin" && !isAdmin;

  // Determine icon based on role
  const RoleIcon = isAdmin
    ? Shield
    : member.role === "developer"
    ? Code
    : TestTube;

  // Determine color scheme based on role
  const colorScheme = isAdmin
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : member.role === "developer"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-sm hover:shadow transition-shadow duration-200 border h-full">
        <CardContent className="p-3 sm:p-4 h-full">
          <div className="flex justify-between items-start h-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className={`p-1.5 sm:p-2 rounded-full ${colorScheme} flex-shrink-0`}
              >
                <RoleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-sm sm:text-base truncate">
                  {member.username}
                </h4>
                <p className="text-xs text-muted-foreground truncate">
                  {member.email}
                </p>
                <span
                  className={`inline-block mt-1 sm:mt-1.5 px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${colorScheme} border`}
                >
                  {isAdmin ? "Admin" : member.role}
                </span>
              </div>
            </div>

            {canRemove && onRemove && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-destructive rounded-full flex-shrink-0 ml-2"
                onClick={() => onRemove(member.id)}
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Remove</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Wrapper component to handle Bugs component with URL parameters
const BugsWrapper = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const status = searchParams.get("status");
  
  // Map main tab to internal tab if needed
  let internalTab = urlTab;
  if (urlTab === "bugs") {
    internalTab = "all-bugs"; // Default to all-bugs when main bugs tab is selected
  }
  
  // Create a custom Bugs component that accepts initial parameters
  return <BugsWithInitialParams projectId={projectId} initialTab={internalTab} initialStatus={status} />;
};

// Wrapper component to handle Fixes component with URL parameters
const FixesWrapper = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const status = searchParams.get("status");
  
  // Map main tab to internal tab if needed
  let internalTab = urlTab;
  if (urlTab === "fixes") {
    internalTab = "all-fixes"; // Default to all-fixes when main fixes tab is selected
  }
  
  // Create a custom Fixes component that accepts initial parameters
  return <FixesWithInitialParams projectId={projectId} initialTab={internalTab} initialStatus={status} />;
};

// Wrapper component to handle Updates component with URL parameters
const UpdatesWrapper = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const status = searchParams.get("status");
  
  // Map main tab to internal tab if needed
  let internalTab = urlTab;
  if (urlTab === "updates") {
    internalTab = "all-updates"; // Default to all-updates when main updates tab is selected
  }
  
  // Create a custom Updates component that accepts initial parameters
  return <UpdatesWithInitialParams projectId={projectId} initialTab={internalTab} initialStatus={status} />;
};

// Custom Bugs component that accepts initial parameters
const BugsWithInitialParams = ({ projectId, initialTab, initialStatus }: { projectId: string | undefined; initialTab: string | null; initialStatus: string | null }) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState(initialTab || "all-bugs");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalBugs, setTotalBugs] = useState(0);
  const [pendingBugsCount, setPendingBugsCount] = useState(0);
  
  // Update activeTab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync activeTab with URL (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    let targetTab = "all-bugs";
    
    if (urlTab === "my-bugs" || urlTab === "all-bugs") {
      targetTab = urlTab;
    } else if (urlTab === "bugs") {
      targetTab = "all-bugs";
    }
    
    if (targetTab !== activeTab) setActiveTab(targetTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Fetch bugs data
  useEffect(() => {
    fetchBugs();
  }, []);
  
  const fetchBugs = async () => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      
      const data = await bugService.getBugs({
        projectId: projectId,
        page: 1,
        limit: 1000,
        status: "pending",
        userId: currentUser?.id,
      });
      setBugs(data.bugs);
      setCurrentPage(data.pagination.currentPage);
      setTotalBugs(data.pagination.totalBugs);
      
      // Calculate pending bugs from all fetched bugs
      const pendingCount = data.bugs.filter(
        (bug) => bug.status === "pending"
      ).length;
      setPendingBugsCount(pendingCount);
      
      setSkeletonLoading(false);
    } catch (error) {
      console.error("Error fetching bugs:", error);
      setBugs([]);
      setSkeletonLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter bugs based on active tab
  const getFilteredBugs = () => {
    let filteredByTab = bugs;
    
    if (currentUser?.role === "admin" || currentUser?.role === "tester") {
      switch (activeTab) {
        case "all-bugs":
          filteredByTab = bugs;
          break;
        case "my-bugs":
          filteredByTab = bugs.filter((bug) => {
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
      const matchesProject =
        projectFilter === "all" || bug.project_id === projectFilter;
      // Exclude fixed bugs from Bugs page
      const isNotFixed = bug.status !== "fixed";
      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesProject &&
        isNotFixed
      );
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
  
  const canViewTabs = currentUser?.role === "admin" || currentUser?.role === "tester";
  const isDeveloper = currentUser?.role === "developer";
  const noBugs = !loading && filteredBugs.length === 0;
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-32 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Professional Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                  <BugIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    Bugs
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mt-2"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Track and manage pending bugs across your projects
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-orange-500 rounded-lg">
                    <BugIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {pendingBugsCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs or Regular Content */}
      {canViewTabs && !skeletonLoading && !loading ? (
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              // Update the main tab parameter to reflect the internal tab
              p.set("tab", val);
              return p as any;
            });
          }} 
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-orange-50/50 dark:from-gray-800/50 dark:to-orange-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="all-bugs"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <BugIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">All Bugs</span>
                  <span className="sm:hidden">All</span>
                  <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-bold">
                    {getTabCount("all-bugs")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-bugs"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Bugs</span>
                  <span className="sm:hidden">My</span>
                  <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
                    {getTabCount("my-bugs")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
            {/* Search and Filter */}
            {!skeletonLoading && !loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-orange-500 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Search Bar */}
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search bugs by title, description, or bug ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                      </div>

                      {/* Filter Controls */}
                      <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                            <BugIcon className="h-4 w-4 text-white" />
                          </div>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[60]">
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Clear Filters Button */}
                        {(searchTerm || priorityFilter !== "all" || statusFilter !== "all" || projectFilter !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setPriorityFilter("all");
                              setStatusFilter("all");
                              setProjectFilter("all");
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
              </div>
            )}

            {/* Professional Responsive Pagination Controls - Show when there are bugs */}
            {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages > 1 && (
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

            {/* Simple results info when no pagination needed - show when there are bugs */}
            {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages <= 1 && (
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
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <BugIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Bugs Found</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    No bugs match your current filters. Try adjusting your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1">
                {paginatedBugs.map((bug) => (
                  <BugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Search & Filter for Developers */}
          {!skeletonLoading && !loading && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-orange-50/30 dark:from-gray-800/30 dark:to-orange-900/30 rounded-2xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-orange-500 rounded-lg">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search bugs by title, description, or bug ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                      {/* Status Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                          <BugIcon className="h-4 w-4 text-white" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters Button */}
                      {(searchTerm || priorityFilter !== "all" || statusFilter !== "all" || projectFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setPriorityFilter("all");
                            setStatusFilter("all");
                            setProjectFilter("all");
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
            </div>
          )}

          {/* Professional Responsive Pagination for Developers - Show when there are bugs and multiple pages */}
          {!skeletonLoading &&
            !loading &&
            filteredBugs.length > 0 &&
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

          {/* Simple results info when no pagination needed for developers - show when there are bugs */}
          {!skeletonLoading &&
            !loading &&
            filteredBugs.length > 0 &&
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

          {/* Content for Developers */}
          <div className="space-y-6 sm:space-y-8">
            {skeletonLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <BugIcon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Bugs Assigned</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Great job! You currently have no bugs assigned to you. Check back later or ask your project admin for new assignments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1">
                {paginatedBugs.map((bug) => (
                  <BugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Fixes component that accepts initial parameters
const FixesWithInitialParams = ({ projectId, initialTab, initialStatus }: { projectId: string | undefined; initialTab: string | null; initialStatus: string | null }) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState(initialTab || "all-fixes");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalBugs, setTotalBugs] = useState(0);
  const [fixedBugsCount, setFixedBugsCount] = useState(0);
  
  // Update activeTab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync activeTab with URL (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    let targetTab = "all-fixes";
    
    if (urlTab === "my-fixes" || urlTab === "all-fixes") {
      targetTab = urlTab;
    } else if (urlTab === "fixes") {
      targetTab = "all-fixes";
    }
    
    if (targetTab !== activeTab) setActiveTab(targetTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Fetch bugs data
  useEffect(() => {
    fetchBugs();
  }, []);
  
  const fetchBugs = async () => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      
      const data = await bugService.getBugs({
        projectId: projectId,
        page: 1,
        limit: 1000,
        status: "fixed",
        userId: currentUser?.id,
      });
      setBugs(data.bugs);
      setCurrentPage(data.pagination.currentPage);
      setTotalBugs(data.pagination.totalBugs);
      
      // Calculate fixed bugs from all fetched bugs
      const fixedCount = data.bugs.filter(
        (bug) => bug.status === "fixed"
      ).length;
      setFixedBugsCount(fixedCount);
      
      setSkeletonLoading(false);
    } catch (error) {
      console.error("Error fetching fixed bugs:", error);
      setBugs([]);
      setSkeletonLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter bugs based on active tab
  const getFilteredBugs = () => {
    let filteredByTab = bugs;
    
    if (currentUser?.role === "admin" || currentUser?.role === "tester") {
      switch (activeTab) {
        case "all-fixes":
          filteredByTab = bugs;
          break;
        case "my-fixes":
          filteredByTab = bugs.filter((bug) => {
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
      const matchesProject =
        projectFilter === "all" || bug.project_id === projectFilter;
      // Only show fixed bugs in Fixes page
      const isFixed = bug.status === "fixed";
      return (
        matchesSearch &&
        matchesPriority &&
        matchesStatus &&
        matchesProject &&
        isFixed
      );
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
    const validStatuses = ["fixed"];
    switch (tabType) {
      case "all-fixes":
        return bugs.filter((bug) => validStatuses.includes(bug.status)).length;
      case "my-fixes":
        return bugs.filter(
          (bug) =>
            bug.reported_by === currentUser?.id &&
            validStatuses.includes(bug.status)
        ).length;
      default:
        return 0;
    }
  };
  
  const canViewTabs = currentUser?.role === "admin" || currentUser?.role === "tester";
  const isDeveloper = currentUser?.role === "developer";
  const noBugs = !loading && filteredBugs.length === 0;
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-32 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Professional Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    Fixes
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mt-2"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Track and manage fixed bugs across your projects
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-green-500 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {fixedBugsCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs or Regular Content */}
      {canViewTabs && !skeletonLoading && !loading ? (
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              // Update the main tab parameter to reflect the internal tab
              p.set("tab", val);
              return p as any;
            });
          }} 
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-green-50/50 dark:from-gray-800/50 dark:to-green-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="all-fixes"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">All Fixes</span>
                  <span className="sm:hidden">All</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                    {getTabCount("all-fixes")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-fixes"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Fixes</span>
                  <span className="sm:hidden">My</span>
                  <span className="ml-2 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold">
                    {getTabCount("my-fixes")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
            {/* Search and Filter */}
            {!skeletonLoading && !loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-green-50/30 dark:from-gray-800/30 dark:to-green-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Search Bar */}
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search fixes by title, description, or bug ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                      </div>

                      {/* Filter Controls */}
                      <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          </div>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[60]">
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Clear Filters Button */}
                        {(searchTerm || priorityFilter !== "all" || statusFilter !== "all" || projectFilter !== "all") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchTerm("");
                              setPriorityFilter("all");
                              setStatusFilter("all");
                              setProjectFilter("all");
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
              </div>
            )}

            {/* Professional Responsive Pagination Controls - Show when there are fixes */}
            {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages > 1 && (
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
                      fixes
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-3">
                    <label
                      htmlFor="items-per-page-fixes"
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                    >
                      Items per page:
                    </label>
                    <div className="relative group">
                      <select
                        id="items-per-page-fixes"
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

            {/* Simple results info when no pagination needed - show when there are fixes */}
            {!skeletonLoading && !loading && filteredBugs.length > 0 && totalPages <= 1 && (
              <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                  <span className="text-sm sm:text-base text-foreground font-semibold">
                    Showing{" "}
                    <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {totalFiltered}
                    </span>{" "}
                    fixes
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-3">
                  <label
                    htmlFor="items-per-page-fixes-simple"
                    className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                  >
                    Items per page:
                  </label>
                  <div className="relative group">
                    <select
                      id="items-per-page-fixes-simple"
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
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-green-950/20 dark:via-emerald-950/10 dark:to-teal-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Fixes Found</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    No fixes match your current filters. Try adjusting your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1">
                {paginatedBugs.map((bug) => (
                  <BugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Search & Filter for Developers */}
          {!skeletonLoading && !loading && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-green-50/30 dark:from-gray-800/30 dark:to-green-900/30 rounded-2xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search fixes by title, description, or bug ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                      {/* Status Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters Button */}
                      {(searchTerm || priorityFilter !== "all" || statusFilter !== "all" || projectFilter !== "all") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setPriorityFilter("all");
                            setStatusFilter("all");
                            setProjectFilter("all");
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
            </div>
          )}

          {/* Professional Responsive Pagination for Developers - Show when there are fixes and multiple pages */}
          {!skeletonLoading &&
            !loading &&
            filteredBugs.length > 0 &&
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
                      fixes
                    </span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-3">
                    <label
                      htmlFor="items-per-page-dev-fixes"
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                    >
                      Items per page:
                    </label>
                    <div className="relative group">
                      <select
                        id="items-per-page-dev-fixes"
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

          {/* Simple results info when no pagination needed for developers - show when there are fixes */}
          {!skeletonLoading &&
            !loading &&
            filteredBugs.length > 0 &&
            totalPages <= 1 && (
              <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                  <span className="text-sm sm:text-base text-foreground font-semibold">
                    Showing{" "}
                    <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                      {totalFiltered}
                    </span>{" "}
                    fixes
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-3">
                  <label
                    htmlFor="items-per-page-dev-fixes-simple"
                    className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                  >
                    Items per page:
                  </label>
                  <div className="relative group">
                    <select
                      id="items-per-page-dev-fixes-simple"
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

          {/* Content for Developers */}
          <div className="space-y-6 sm:space-y-8">
            {skeletonLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-green-950/20 dark:via-emerald-950/10 dark:to-teal-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Fixes Assigned</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Great job! You currently have no fixes assigned to you. Check back later or ask your project admin for new assignments.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1">
                {paginatedBugs.map((bug) => (
                  <BugCard key={bug.id} bug={bug} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Updates component that accepts initial parameters
const UpdatesWithInitialParams = ({ projectId, initialTab, initialStatus }: { projectId: string | undefined; initialTab: string | null; initialStatus: string | null }) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState(initialTab || "all-updates");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [allUpdatesCount, setAllUpdatesCount] = useState(0);
  const [typeOpen, setTypeOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  
  // Update activeTab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync activeTab with URL (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    let targetTab = "all-updates";
    
    if (urlTab === "my-updates" || urlTab === "all-updates") {
      targetTab = urlTab;
    } else if (urlTab === "updates") {
      targetTab = "all-updates";
    }
    
    if (targetTab !== activeTab) setActiveTab(targetTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Fetch updates data
  useEffect(() => {
    fetchUpdates();
  }, []);
  
  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setSkeletonLoading(true);
      
      // Use actual API call to get project-specific updates
      console.log("Fetching updates for project:", projectId);
      const updatesData = await updateService.getUpdatesByProject(projectId || "");
      console.log("Updates data received:", updatesData);
      
      setUpdates(updatesData);
      setCurrentPage(1);
      setTotalUpdates(updatesData.length);
      setAllUpdatesCount(updatesData.length);
      
      setSkeletonLoading(false);
    } catch (error) {
      console.error("Error fetching updates:", error);
      setUpdates([]);
      setSkeletonLoading(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Filter updates based on active tab
  const getFilteredUpdates = () => {
    let filteredByTab = updates;
    
    if (currentUser?.role === "admin" || currentUser?.role === "tester") {
      switch (activeTab) {
        case "all-updates":
          filteredByTab = updates;
          break;
        case "my-updates":
          filteredByTab = updates.filter((update) => {
            return String(update.created_by_id) === String(currentUser.id);
          });
          break;
        default:
          filteredByTab = updates;
      }
    }
    
    // Apply additional filters
    return filteredByTab.filter((update) => {
      const matchesSearch =
        update.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || update.type === typeFilter;
      const matchesCreatedBy = createdByFilter === "all" || update.created_by === createdByFilter;
      const matchesProject = projectId === undefined || update.project_id === projectId; // Filter by project_id
      return (
        matchesSearch &&
        matchesType &&
        matchesCreatedBy &&
        matchesProject
      );
    });
  };
  
  const filteredUpdates = getFilteredUpdates();
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
          (update) => update.created_by_id === currentUser?.id
        ).length;
      default:
        return 0;
    }
  };
  
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
        return "text-blue-500 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/30";
      case "updation":
        return "text-green-500 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-800 dark:bg-green-950/30";
      case "maintenance":
        return "text-yellow-500 border-yellow-200 bg-yellow-50 dark:text-yellow-300 dark:border-yellow-800 dark:bg-yellow-950/30";
      default:
        return "";
    }
  };

  const canViewTabs = currentUser?.role === "admin" || currentUser?.role === "tester";
  const isDeveloper = currentUser?.role === "developer";
  const noUpdates = !loading && filteredUpdates.length === 0;
  
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-32 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Professional Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                    Updates
                  </h1>
                  <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2"></div>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                Track and manage project updates and announcements
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {allUpdatesCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Tabs or Regular Content */}
      {canViewTabs && !skeletonLoading && !loading ? (
        <Tabs 
          value={activeTab} 
          onValueChange={(val) => {
            setActiveTab(val);
            setSearchParams((prev) => {
              const p = new URLSearchParams(prev);
              // Update the main tab parameter to reflect the internal tab
              p.set("tab", val);
              return p as any;
            });
          }} 
          className="w-full"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
            <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
              <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                <TabsTrigger
                  value="all-updates"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">All Updates</span>
                  <span className="sm:hidden">All</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                    {getTabCount("all-updates")}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="my-updates"
                  className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  <span className="hidden sm:inline">My Updates</span>
                  <span className="sm:hidden">My</span>
                  <span className="ml-2 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                    {getTabCount("my-updates")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
            {/* Search and Filter */}
            {!skeletonLoading && !loading && (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-blue-500 rounded-lg">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Search Bar */}
                      <div className="flex-1 relative group">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search updates by title, description, or update ID..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                        />
                      </div>

                      {/* Filter Controls */}
                      <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                        {/* Type Filter */}
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                            <Filter className="h-4 w-4 text-white" />
                          </div>
                          <Select
                            open={typeOpen}
                            onOpenChange={setTypeOpen}
                            value={typeFilter}
                            onValueChange={(v) => {
                              setTypeFilter(v);
                              setTypeOpen(false);
                            }}
                          >
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
                          <Select
                            open={creatorOpen}
                            onOpenChange={setCreatorOpen}
                            value={createdByFilter}
                            onValueChange={(v) => {
                              setCreatedByFilter(v);
                              setCreatorOpen(false);
                            }}
                          >
                            <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
              </div>
            )}

            {/* Professional Responsive Pagination Controls - Show when there are updates */}
            {!skeletonLoading && !loading && filteredUpdates.length > 0 && totalPages > 1 && (
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
                      htmlFor="items-per-page-updates"
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                    >
                      Items per page:
                    </label>
                    <div className="relative group">
                      <select
                        id="items-per-page-updates"
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

            {/* Simple results info when no pagination needed - show when there are updates */}
            {!skeletonLoading && !loading && filteredUpdates.length > 0 && totalPages <= 1 && (
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
                    htmlFor="items-per-page-updates-simple"
                    className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                  >
                    Items per page:
                  </label>
                  <div className="relative group">
                    <select
                      id="items-per-page-updates-simple"
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
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredUpdates.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Bell className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Updates Found</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    No updates match your current filters. Try adjusting your search criteria.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Table for larger screens */}
                <div className="hidden lg:block relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                    <Table className="w-full table-fixed">
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                        <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                          <TableHead className="w-[40%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Title
                          </TableHead>
                          <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Type
                          </TableHead>
                          <TableHead className="w-[30%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Project
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
                            className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                              index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                            }`}
                          >
                            <TableCell className="w-[40%] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {update.title}
                              </div>
                            </TableCell>
                            <TableCell className="w-[20%] px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`font-medium text-xs sm:text-sm px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                                  update.type
                                )}`}
                              >
                                {update.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-[30%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                              {update.project_name}
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
                                      ? `/${currentUser.role}/updates/${update.id}?from=project`
                                      : `/updates/${update.id}?from=project`
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

                {/* Card layout for mobile and tablets */}
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
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />{" "}
                        Project:{" "}
                        <span className="font-medium text-foreground ml-1">
                          {update.project_name}
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
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Search & Filter for Developers */}
          {!skeletonLoading && !loading && (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
              <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search updates by title, description, or update ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row lg:flex-row gap-3">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                          <Filter className="h-4 w-4 text-white" />
                        </div>
                        <Select
                          open={typeOpen}
                          onOpenChange={setTypeOpen}
                          value={typeFilter}
                          onValueChange={(v) => {
                            setTypeFilter(v);
                            setTypeOpen(false);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
                        <Select
                          open={creatorOpen}
                          onOpenChange={setCreatorOpen}
                          value={createdByFilter}
                          onValueChange={(v) => {
                            setCreatedByFilter(v);
                            setCreatorOpen(false);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
            </div>
          )}

          {/* Content for Developers */}
          <div className="space-y-6 sm:space-y-8">
            {skeletonLoading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded animate-pulse"></div>
                <div className="h-32 bg-muted rounded animate-pulse"></div>
              </div>
            ) : filteredUpdates.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Bell className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Updates Available</h3>
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    There are currently no updates available. Check back later for new announcements.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Table for larger screens */}
                <div className="hidden lg:block relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                    <Table className="w-full table-fixed">
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                        <TableRow className="border-b border-gray-200/50 dark:border-gray-700/50">
                          <TableHead className="w-[40%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Title
                          </TableHead>
                          <TableHead className="w-[20%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Type
                          </TableHead>
                          <TableHead className="w-[30%] px-4 font-bold text-sm sm:text-base text-gray-900 dark:text-white py-4">
                            Project
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
                            className={`group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-300 border-b border-gray-100/50 dark:border-gray-800/50 ${
                              index % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/30'
                            }`}
                          >
                            <TableCell className="w-[40%] px-4 font-semibold text-sm sm:text-base text-gray-900 dark:text-white py-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                {update.title}
                              </div>
                            </TableCell>
                            <TableCell className="w-[20%] px-4 py-4">
                              <Badge
                                variant="outline"
                                className={`font-medium text-xs sm:text-sm px-2 py-1 rounded-full shadow-sm ${getTypeColor(
                                  update.type
                                )}`}
                              >
                                {update.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="w-[30%] px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300 py-4 font-medium">
                              {update.project_name}
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
                                      ? `/${currentUser.role}/updates/${update.id}?from=project`
                                      : `/updates/${update.id}?from=project`
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

                {/* Card layout for mobile and tablets */}
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
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary/70" />{" "}
                        Project:{" "}
                        <span className="font-medium text-foreground ml-1">
                          {update.project_name}
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwner, setProjectOwner] = useState<ProjectUser | null>(null);
  const [bugs, setBugs] = useState<BugType[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const getDefaultTab = () => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      // Handle Bugs component internal tabs - keep them as is
      if (urlTab === "my-bugs" || urlTab === "all-bugs") {
        return "bugs";
      }
      // Handle Fixes component internal tabs - keep them as is
      if (urlTab === "my-fixes" || urlTab === "all-fixes") {
        return "fixes";
      }
      // Handle Updates component internal tabs - keep them as is
      if (urlTab === "my-updates" || urlTab === "all-updates") {
        return "updates";
      }
      return urlTab;
    }
    
    // Set default tab based on user role
    if (currentUser?.role === "tester") return "fixes";
    if (currentUser?.role === "developer") return "bugs";
    return "overview"; // default for admins
  };
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const { logMemberActivity, logProjectActivity } = useActivityLogger();
  const [availableMembers, setAvailableMembers] = useState<ProjectUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [members, setMembers] = useState<ProjectUser[]>([]);
  const [admins, setAdmins] = useState<ProjectUser[]>([]);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "developer" | "tester">(
    "all"
  );
  const [isAdding, setIsAdding] = useState(false);
  // Bugs tab filters and pagination (sync with URL)
  const [bugSearch, setBugSearch] = useState(searchParams.get("q") || "");
  const [bugStatus, setBugStatus] = useState<string>(searchParams.get("status") || "pending");
  const [bugPriority, setBugPriority] = useState<string>(searchParams.get("priority") || "all");
  const [bugSort, setBugSort] = useState<string>(searchParams.get("sort") || "newest");
  const [bugPage, setBugPage] = useState(Number(searchParams.get("page") || 1));
  const [bugPageSize, setBugPageSize] = useState(Number(searchParams.get("pageSize") || 10));

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectBugs();
      fetchMembers();
      fetchProjectSharedTasks();
    }
  }, [projectId]);

  // Keep tab in sync with URL changes (back/forward navigation)
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    
    // Handle Bugs component internal tabs
    if (urlTab === "my-bugs" || urlTab === "all-bugs") {
      // These are internal tabs for the Bugs component, set main tab to "bugs"
      if (activeTab !== "bugs") setActiveTab("bugs");
    } else if (urlTab === "my-fixes" || urlTab === "all-fixes") {
      // These are internal tabs for the Fixes component, set main tab to "fixes"
      if (activeTab !== "fixes") setActiveTab("fixes");
    } else if (urlTab === "my-updates" || urlTab === "all-updates") {
      // These are internal tabs for the Updates component, set main tab to "updates"
      if (activeTab !== "updates") setActiveTab("updates");
    } else if (urlTab) {
      // Regular main tabs
    if (urlTab !== activeTab) setActiveTab(urlTab);
    } else {
      // No tab in URL, use default
      const defaultTab = getDefaultTab();
      if (defaultTab !== activeTab) setActiveTab(defaultTab);
    }
    
    // Remove status parameter from URL if it exists
    if (searchParams.get("status")) {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev);
        newParams.delete("status");
        return newParams;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reset bug page when bug filters change or tab changes to bugs
  useEffect(() => {
    setBugPage(1);
  }, [bugSearch, bugStatus, bugPriority, activeTab]);

  // Sync bug filters to URL whenever they change (only when on bugs tab)
  useEffect(() => {
    if (activeTab !== "bugs") return;
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", "bugs");
      if (bugSearch) p.set("q", bugSearch); else p.delete("q");
      if (bugStatus && bugStatus !== "all") p.set("status", bugStatus); else p.delete("status");
      if (bugPriority && bugPriority !== "all") p.set("priority", bugPriority); else p.delete("priority");
      if (bugSort && bugSort !== "newest") p.set("sort", bugSort); else p.delete("sort");
      if (bugPage > 1) p.set("page", String(bugPage)); else p.delete("page");
      if (bugPageSize !== 10) p.set("pageSize", String(bugPageSize)); else p.delete("pageSize");
      return p as any;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugSearch, bugStatus, bugPriority, bugSort, bugPage, bugPageSize, activeTab]);

  const fetchProjectDetails = async () => {
    try {
      const projectData = await projectService.getProject(projectId!);
      setProject(projectData);

      // Only fetch project owner if created_by is present and valid
      if (projectData.created_by && isValidUUID(projectData.created_by)) {
        const token = localStorage.getItem("token");
        try {
          const response = await fetch(
            `${ENV.API_URL}/users/get.php?id=${projectData.created_by}`,
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const userData = await response.json();
            setProjectOwner(userData.data);
          } else {
            // Ignore user fetch errors, just don't set owner
            setProjectOwner(null);
          }
        } catch {
          setProjectOwner(null);
        }
      } else {
        setProjectOwner(null);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectBugs = async () => {
    try {
      const { bugs } = await bugService.getBugs({
        projectId,
        page: 1,
        limit: 1000,
      });
      setBugs(bugs);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project bugs. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchProjectSharedTasks = async () => {
    try {
      setTasksLoading(true);
      const allTasks = await sharedTaskService.getSharedTasks();
      // Filter tasks that belong to this project
      const projectTasks = allTasks.filter(task => 
        task.project_ids?.includes(projectId!) || task.project_id === projectId
      );
      setSharedTasks(projectTasks);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load project shared tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchAvailableMembers = async () => {
    try {
      const res = await fetch(
        `${ENV.API_URL}/projects/get_available_members.php?project_id=${projectId}`
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setAvailableMembers(data.data?.users || []);
      } else {
        //.error("Failed to fetch available members:", data.message);
        setAvailableMembers([]);
      }
    } catch (error) {
      //.error("Error fetching available members:", error);
      setAvailableMembers([]);
      toast({
        title: "Error",
        description: "Failed to load available members. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(
        `${ENV.API_URL}/projects/get_members.php?project_id=${projectId}`
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        // Handle both old and new API response formats
        const responseData = data.data || data;
        setMembers(responseData.members || []);
        setAdmins(responseData.admins || []);
      } else {
        //.error("Failed to fetch members:", data.message);
        setMembers([]);
        setAdmins([]);
        toast({
          title: "Error",
          description: data.message || "Failed to load project members",
          variant: "destructive",
        });
      }
    } catch (error) {
      //.error("Error fetching members:", error);
      setMembers([]);
      setAdmins([]);
      toast({
        title: "Error",
        description: "Failed to load project members. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!Array.isArray(availableMembers) || selectedUsers.length === 0) return;

    try {
      setIsAdding(true);
      const token = localStorage.getItem("token");
      const addRequests = selectedUsers.map(async (userId) => {
        const selectedMember = availableMembers.find((u) => u.id === userId);
        const role = selectedMember?.role;
        if (!role) {
          return {
            userId,
            ok: false,
            username: selectedMember?.username,
            message: "Missing role",
          };
        }
        const response = await fetch(`${ENV.API_URL}/projects/add_member.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            user_id: userId,
            role,
          }),
        });
        const data = await response.json();
        if (data.success) {
          if (selectedMember && projectId) {
            await logMemberActivity(
              projectId,
              selectedMember.username,
              "added",
              role
            );
          }
          return { userId, ok: true, username: selectedMember?.username };
        }
        return {
          userId,
          ok: false,
          username: selectedMember?.username,
          message: data.message,
        };
      });

      const results = await Promise.all(addRequests);
      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      setSelectedUsers([]);
      await Promise.all([fetchAvailableMembers(), fetchMembers()]);

      if (successes.length > 0) {
        toast({
          title: "Members added",
          description: `${successes.length} member${
            successes.length > 1 ? "s" : ""
          } added successfully`,
        });
      }
      if (failures.length > 0) {
        toast({
          title: "Some adds failed",
          description: `${failures.length} failed. ${
            failures[0]?.message || "Please try again."
          }`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred while adding members",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // Open confirmation dialog by setting memberToRemove
    setMemberToRemove(userId);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const token = localStorage.getItem("token");

      // Find the member to get their username for activity logging
      const memberToLog = [...members, ...admins].find(
        (m) => m.id === memberToRemove
      );

      const response = await fetch(
        `${ENV.API_URL}/projects/remove_member.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: projectId,
            user_id: memberToRemove,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        fetchMembers();

        // Log the activity
        if (memberToLog && projectId) {
          await logMemberActivity(
            projectId,
            memberToLog.username,
            "removed",
            memberToLog.role
          );
        }

        toast({ title: "Success", description: "Member removed successfully" });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to remove member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      // Close the dialog
      setMemberToRemove(null);
    }
  };

  const handleUpdateProject = async (
    updateData: UpdateProjectData
  ): Promise<boolean> => {
    try {
      await projectService.updateProject(projectId!, updateData);

      // Update the local project state with the new data
      if (project) {
        setProject({
          ...project,
          ...updateData,
          updated_at: new Date().toISOString(),
        });
      }

      // Log the project update activity
      if (projectId) {
        await logProjectActivity(
          "project_updated",
          projectId,
          "updated project details",
          {
            updated_fields: Object.keys(updateData),
          }
        );
      }

      toast({
        title: "Success",
        description: "Project updated successfully",
      });

      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Filter members based on search query - with safe array handling
  const filteredMembers = Array.isArray(members)
    ? members
        .filter(
          (member) =>
            member?.username
              ?.toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            member?.email?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((member) =>
          roleFilter === "all" ? true : member?.role === roleFilter
        )
    : [];

  const filteredAdmins = Array.isArray(admins)
    ? admins.filter(
        (admin) =>
          admin?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Render skeleton loading UI
  if (isLoading) {
    return (
      <div
        className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto"
        aria-busy="true"
        aria-label="Loading project details"
      >
        <ProjectHeaderSkeleton />

        <div className="flex flex-nowrap overflow-x-auto gap-2 md:gap-4 pb-1 mb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <Skeleton className="h-10 w-28 flex-shrink-0" />
          <Skeleton className="h-10 w-28 flex-shrink-0" />
          <Skeleton className="h-10 w-28 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>

        <div className="mt-6">
          <RecentActivitySkeleton />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-lg font-semibold text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <Link
        to={`/${currentUser?.role || "tester"}/projects`}
        className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
        Back to Projects
      </Link>
      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member? They will lose access
              to this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveMember}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Header - Gradient/Glass style */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
        <div className="relative p-5 sm:p-6 md:p-7">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                {project.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base max-w-2xl break-words">
                {project.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                {projectOwner && (
                  <span>Owner: <span className="text-foreground">{projectOwner.username}</span></span>
                )}
                <span>Created: <span className="text-foreground">{new Date(project.created_at).toLocaleDateString()}</span></span>
                <span>Status: <span className="capitalize inline-flex items-center px-1.5 py-0.5 rounded-full border bg-muted/40">{project.status}</span></span>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full"></div>
            </div>
            {currentUser?.role === "admin" && (
              <EditProjectDialog project={project} onSubmit={handleUpdateProject} />
            )}
          </div>
        </div>
      </div>

      <Tabs
        defaultValue={getDefaultTab()}
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          setSearchParams((prev) => {
            const p = new URLSearchParams(prev);
            // Update main tab parameter for all tabs
            p.set("tab", val);
            return p as any;
          });
        }}
        className="w-full"
      >
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
          <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-1 sm:p-2">
            <TabsList className="flex w-full gap-1 sm:gap-2 md:gap-3 p-1 bg-transparent">
              <TabsTrigger value="overview" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm cursor-pointer pointer-events-auto">
                Overview
              </TabsTrigger>
              {/* Show Bugs tab for Admins and Developers */}
              {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
                <TabsTrigger value="bugs" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm cursor-pointer pointer-events-auto">
                Bugs
              </TabsTrigger>
              )}
              
              {/* Show Fixes tab for Testers and Admins */}
              {(currentUser?.role === "tester" || currentUser?.role === "admin") && (
                <TabsTrigger value="fixes" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm cursor-pointer pointer-events-auto">
                  Fixes
              </TabsTrigger>
              )}
              <TabsTrigger value="updates" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm flex items-center justify-center cursor-pointer pointer-events-auto">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Updates</span>
              </TabsTrigger>
              {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
                <TabsTrigger value="tasks" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm flex items-center justify-center cursor-pointer pointer-events-auto">
                  <ListChecks className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">Tasks</span>
                  <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold flex-shrink-0">
                  {sharedTasks.length}
                </span>
              </TabsTrigger>
              )}
              <TabsTrigger value="members" className="font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 whitespace-nowrap flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm cursor-pointer pointer-events-auto">
                Members
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview">
          {/* Stats Cards - Responsive grid that works on all screen sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="flex-1 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bugs
                </CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bugs.length}</div>
              </CardContent>
            </Card>

            <Card className="flex-1 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Bugs</CardTitle>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    bugs.filter(
                      (bug) =>
                        bug.status === "pending" || bug.status === "in_progress"
                    ).length
                  }
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 min-w-0">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Fixed Bugs
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bugs.filter((bug) => bug.status === "fixed").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {currentUser?.role === "admin" && (
          <div className="mt-6">
            <ActivityList
              projectId={projectId}
              limit={8}
              showPagination={false}
              autoRefresh={true}
              refreshInterval={30000}
            />
          </div>
          )}
        </TabsContent>

        {/* Bugs Tab */}
        <TabsContent value="bugs">
          <div className="w-full [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:p-0 [&>main]:px-0 [&>main]:py-0 [&>main>section]:max-w-none [&>main>section]:mx-0 [&>main>section]:space-y-4 [&_.TabsList]:pointer-events-auto [&_.TabsTrigger]:pointer-events-auto [&_.TabsTrigger]:cursor-pointer">
            <BugsWrapper />
                </div>
        </TabsContent>

        {/* Fixes Tab - for Testers and Admins */}
        {(currentUser?.role === "tester" || currentUser?.role === "admin") && (
          <TabsContent value="fixes">
            <div className="w-full [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:p-0 [&>main]:px-0 [&>main]:py-0 [&>main>section]:max-w-none [&>main>section]:mx-0 [&>main>section]:space-y-4 [&_.TabsList]:pointer-events-auto [&_.TabsTrigger]:pointer-events-auto [&_.TabsTrigger]:cursor-pointer">
              <FixesWrapper />
                      </div>
          </TabsContent>
        )}

        <TabsContent value="updates">
          <div className="w-full [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:p-0 [&>main]:px-0 [&>main]:py-0 [&>main>section]:max-w-none [&>main>section]:mx-0 [&>main>section]:space-y-4 [&_.TabsList]:pointer-events-auto [&_.TabsTrigger]:pointer-events-auto [&_.TabsTrigger]:cursor-pointer">
            <UpdatesWrapper />
                        </div>
        </TabsContent>

        {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
        <TabsContent value="tasks">
            <div className="w-full [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:p-0 [&>main]:px-0 [&>main]:py-0 [&>main>section]:max-w-none [&>main>section]:mx-0 [&>main>section]:space-y-4 [&_.TabsList]:pointer-events-auto [&_.TabsTrigger]:pointer-events-auto [&_.TabsTrigger]:cursor-pointer">
              <MyTasks />
                </div>
          </TabsContent>
        )}

        <TabsContent value="members">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-4">
              {currentUser?.role === "admin" && (
                <div className="flex flex-col gap-3 w-full">
                  <div className="w-full border border-border/60 rounded-lg p-3 bg-muted/10">
                    {/* Selected users as chips */}
                    <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-auto">
                      {selectedUsers.map((id) => {
                        const u = availableMembers.find((m) => m.id === id);
                        if (!u) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border bg-background text-sm shadow-sm"
                          >
                            <span
                              aria-hidden
                              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                            >
                              {u.username?.[0]?.toUpperCase() || "U"}
                            </span>
                            {u.username} ({u.role})
                            <button
                              type="button"
                              className="ml-1 rounded-full h-5 w-5 grid place-items-center hover:bg-muted"
                              onClick={() =>
                                setSelectedUsers((prev) =>
                                  prev.filter((x) => x !== id)
                                )
                              }
                              aria-label={`Remove ${u.username}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {selectedUsers.length === 0 && (
                        <span className="text-xs text-muted-foreground">
                          No members selected yet
                        </span>
                      )}
                    </div>

                    {/* Single-select to add more users */}
                    <div className="relative">
                      <select
                        className="appearance-none w-full border rounded-lg px-3 py-2 pr-10 bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition-all duration-200 text-sm"
                        value=""
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            setSelectedUsers((prev) =>
                              prev.includes(value) ? prev : [...prev, value]
                            );
                          }
                        }}
                        onClick={fetchAvailableMembers}
                        aria-label="Select member to add"
                      >
                        <option value="" disabled>
                          Select member to add...
                        </option>
                        {availableMembers
                          ?.slice()
                          .sort((a, b) =>
                            (a.username || "").localeCompare(b.username || "")
                          )
                          .filter(
                            (user) =>
                              user.id && !selectedUsers.includes(user.id)
                          )
                          .map((user) => (
                            <option
                              key={user.id}
                              value={user.id}
                              className="py-1"
                            >
                              {user.username} ({user.role})
                            </option>
                          ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Pick a user to add; they appear above. Remove with the
                        ×.
                      </p>
                    </div>
                  </div>

                  {/* Actions row under the selector */}
                  <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 sm:justify-between">
                    {/* Badges on the left */}
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm flex-1">
                      <span className="px-2 py-1 rounded-md border bg-muted/40">
                        Admins: <strong>{filteredAdmins.length}</strong>
                      </span>
                      <span className="px-2 py-1 rounded-md border bg-muted/40">
                        Members: <strong>{filteredMembers.length}</strong>
                      </span>
                      {selectedUsers.length > 0 && (
                        <span className="px-2 py-1 rounded-md border bg-blue-500/10 text-blue-600 dark:text-blue-300">
                          Selected: <strong>{selectedUsers.length}</strong>
                        </span>
                      )}
                    </div>

                    {/* Buttons on the right */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:justify-end">
                      <Button
                        size="default"
                        disabled={selectedUsers.length === 0 || isAdding}
                        onClick={handleAddMember}
                        className="shrink-0 shadow-sm hover:shadow transition-all duration-200 bg-primary font-medium w-full sm:w-auto inline-flex items-center justify-center gap-2"
                        aria-label="Add selected members"
                      >
                        {isAdding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            <span>
                              {selectedUsers.length > 0
                                ? `Add ${selectedUsers.length} Member${
                                    selectedUsers.length > 1 ? "s" : ""
                                  }`
                                : "Add Members"}
                            </span>
                          </>
                        )}
                      </Button>

                      {selectedUsers.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setSelectedUsers([])}
                          className="w-full sm:w-auto"
                          aria-label="Clear selected members"
                        >
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 border border-border rounded-md pl-10 pr-10 py-2 
                    focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none 
                    shadow-sm hover:border-primary/50 transition-all duration-200 
                    bg-background/50 backdrop-blur-sm text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                  {searchQuery && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 rounded-full opacity-70 hover:opacity-100"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Clear search</span>
                      </Button>
                    </div>
                  )}
                </div>
                <div className="relative w-full sm:w-[220px]">
                  <select
                    aria-label="Filter by role"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className="appearance-none w-full h-10 border rounded-md px-3 pr-8 bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                  >
                    <option value="all">All roles</option>
                    <option value="developer">Developers</option>
                    <option value="tester">Testers</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 flex items-center">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600" />
                  Administrators
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                    {filteredAdmins.length}
                  </span>
                </h3>

                {filteredAdmins.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery
                      ? "No administrators match your search."
                      : "No administrators assigned."}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3">
                  {filteredAdmins.map((admin) => (
                    <MemberCard key={admin.id} member={admin} isAdmin={true} />
                  ))}
                </div>
              </div>

              <div>
                {filteredMembers.length === 0 && (
                  <p className="text-muted-foreground text-xs sm:text-sm italic">
                    {searchQuery
                      ? "No members match your search."
                      : "No members assigned to this project yet."}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-3">
                  {filteredMembers.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      onRemove={handleRemoveMember}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetails;
