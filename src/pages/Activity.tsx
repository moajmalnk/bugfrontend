import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { activityService, type Activity, type ActivityResponse } from '@/services/activityService';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'react-router-dom';
import {
  Activity as ActivityIcon,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  FolderOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ActivityDetailsModal from '@/components/activities/ActivityDetailsModal';

// Enhanced Activity Item Skeleton
const ActivityItemSkeleton = () => (
  <div className="flex items-start space-x-4 p-6 border-b border-gray-100/50 dark:border-gray-800/50 last:border-b-0">
    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-4 w-full max-w-lg" />
      <div className="flex items-center space-x-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  </div>
);

// Enhanced Activity Item Component
const ActivityItem: React.FC<{ activity: Activity; index: number; onDetailsClick: (activity: Activity) => void }> = ({ activity, index, onDetailsClick }) => {
  const typeInfo = activityService.getActivityTypeInfo(activity.type);
  const formattedDescription = activityService.formatActivityDescription(activity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group flex items-start space-x-4 p-6 border-b border-gray-100/50 dark:border-gray-800/50 last:border-b-0 hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-emerald-50/30 dark:hover:from-blue-900/10 dark:hover:to-emerald-900/10 transition-all duration-300"
    >
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
          <span className="text-white text-lg" role="img" aria-label={typeInfo.label}>
            {typeInfo.icon}
          </span>
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
            {formattedDescription}
          </p>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
              {activity.time_ago}
            </span>
          </div>
        </div>
        
        {activity.project && (
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1 bg-purple-500 rounded-lg">
              <FolderOpen className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              in <span className="font-semibold text-gray-700 dark:text-gray-300">{activity.project.name}</span>
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant="secondary" 
              className={`text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm ${typeInfo.color}`}
            >
              {typeInfo.label}
            </Badge>
            
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs font-medium px-3 py-1.5 rounded-full border-gray-200 dark:border-gray-700"
              >
                {Object.keys(activity.metadata).length} detail{Object.keys(activity.metadata).length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDetailsClick(activity)}
            className="h-8 px-3 text-xs font-medium bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 hover:shadow-md"
          >
            View Details
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Header Skeleton
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

const Activity = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "all-activities";
  const [activeTab, setActiveTab] = useState(initialTab);
  const { toast } = useToast();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userOwnActivityCount, setUserOwnActivityCount] = useState(0);

  const fetchActivities = useCallback(async (page: number = 0, showRefresh: boolean = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else if (page === 0) {
        setIsLoading(true);
      }

      const offset = page * itemsPerPage;
      const response: ActivityResponse = await activityService.getUserActivities(itemsPerPage, offset);

      setActivities(response.activities);
      setTotalActivities(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      
      // Fetch user's own activity count when loading first page
      if (page === 0) {
        try {
          const ownCount = await activityService.getUserOwnActivityCount();
          setUserOwnActivityCount(ownCount);
        } catch (error) {
          console.error('Error fetching user own activity count:', error);
          // Don't show error toast for this as it's not critical
        }
      }
      
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [itemsPerPage, toast]);

  // Initial load
  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPage === 0) {
        fetchActivities(0, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPage, fetchActivities]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchActivities(newPage);
  };

  const handleRefresh = () => {
    fetchActivities(currentPage, true);
  };

  const handleDetailsClick = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [activeTab, searchTerm, typeFilter, createdByFilter]);

  // Filter activities based on active tab and search/filter criteria
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // First filter by tab
    switch (activeTab) {
      case "all-activities":
        filtered = activities;
        break;
      case "my-activities":
        filtered = activities.filter((activity) => {
          return activity.user.id === currentUser?.id;
        });
        break;
      default:
        filtered = activities;
    }

    // Then apply search and other filters
    return filtered.filter((activity) => {
      const matchesSearch = searchTerm === "" || 
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.project?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.user?.username || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || activity.type === typeFilter;
      const matchesCreatedBy = createdByFilter === "all" || activity.user.username === createdByFilter;
      return matchesSearch && matchesType && matchesCreatedBy;
    });
  }, [activities, activeTab, currentUser?.id, searchTerm, typeFilter, createdByFilter]);

  // Get unique activity types for filter
  const uniqueTypes = useMemo(() => {
    const types = activities
      .map((activity) => activity.type)
      .filter((type, index, arr) => arr.indexOf(type) === index);
    return types.sort();
  }, [activities]);

  // Get tab-specific count (total filtered count, not pagination count)
  const getTabCount = (tabType: string) => {
    // For "all-activities", show the total activities from API
    if (tabType === "all-activities") {
      return totalActivities;
    }
    
    // For "my-activities", use the fetched user own activity count
    if (tabType === "my-activities") {
      return userOwnActivityCount;
    }

    return 0;
  };

  // Keep tab in sync with URL changes
  useEffect(() => {
    const urlTab = searchParams.get("tab") || "all-activities";
    if (urlTab !== activeTab) setActiveTab(urlTab);
  }, [searchParams]);

  const totalFiltered = filteredActivities.length;
  const paginatedActivities = filteredActivities.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  const renderEmptyState = () => {
    return (
      <div className="relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
            <ActivityIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {activeTab === "my-activities" ? "No activities found" : "No Activities"}
          </h3>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-2 max-w-md mx-auto">
            {activeTab === "my-activities"
              ? "You haven't performed any activities yet. Start working on your projects to see activity here."
              : "There are no activities to display right now. Check back later or start working on your projects."}
          </p>
        </div>
      </div>
    );
  };

  const hasAnyActivities = useMemo(() => activities.length > 0, [activities]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                      <ActivityIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                        Activity
                      </h1>
                      <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                    Track all activities and updates across your projects
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <RefreshCw className={`mr-2 h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                      <div className="p-1.5 bg-blue-600 rounded-lg">
                        <ActivityIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {totalActivities}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Tabs */}
        {hasAnyActivities ? (
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val);
              setSearchParams((prev) => {
                const p = new URLSearchParams(prev);
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
                    value="all-activities"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <ActivityIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">All Activities</span>
                    <span className="sm:hidden">All</span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                      {getTabCount("all-activities")}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="my-activities"
                    className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                  >
                    <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    <span className="hidden sm:inline">My Activities</span>
                    <span className="sm:hidden">My</span>
                    <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
                      {getTabCount("my-activities")}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
              {/* Enhanced Search and Filter Controls */}
              {!isLoading && filteredActivities.length > 0 && (
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
                      
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative group">
                          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <input
                            type="text"
                            placeholder="Search activities, projects, or descriptions..."
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
                                {uniqueTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {activityService.getActivityTypeInfo(type).label}
                                  </SelectItem>
                                ))}
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
                                <SelectItem value="all">All Users</SelectItem>
                                {activities
                                  .map((activity) => activity.user.username)
                                  .filter((creator, index, arr) => arr.indexOf(creator) === index)
                                  .sort()
                                  .map((creator) => (
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

              {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
              {!isLoading && filteredActivities.length > 0 && totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  {/* Top Row - Results Info and Items Per Page */}
                  <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                      <span className="text-sm sm:text-base text-foreground font-semibold">
                        Showing{" "}
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {currentPage * itemsPerPage + 1}
                        </span>
                        -
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {Math.min((currentPage + 1) * itemsPerPage, totalFiltered)}
                        </span>{" "}
                        of{" "}
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {totalFiltered}
                        </span>{" "}
                        activities
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
                          {[10, 20, 50].map((n) => (
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
                        {currentPage + 1}
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
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 0}
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
                          variant={currentPage === 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(0)}
                          className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                        >
                          1
                        </Button>

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage > 3 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                            •••
                          </span>
                        )}

                        {/* Dynamic page numbers based on current page - show more on larger screens */}
                        {(() => {
                          const pages = [];
                          const start = Math.max(1, currentPage - 1);
                          const end = Math.min(totalPages - 2, currentPage + 1);

                          for (let i = start; i <= end; i++) {
                            if (i > 0 && i < totalPages - 1) {
                              pages.push(i);
                            }
                          }

                          return pages.map((page) => (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                            >
                              {page + 1}
                            </Button>
                          ));
                        })()}

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage < totalPages - 4 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                            •••
                          </span>
                        )}

                        {/* Always show last page if more than 1 page on larger screens */}
                        {totalPages > 1 && (
                          <Button
                            variant={currentPage === totalPages - 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(totalPages - 1)}
                            className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                          >
                            {totalPages}
                          </Button>
                        )}

                        {/* Mobile-friendly page selector */}
                        <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                          <select
                            value={currentPage + 1}
                            onChange={(e) => handlePageChange(Number(e.target.value) - 1)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages - 1}
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
                        {currentPage + 1}
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
              {!isLoading && filteredActivities.length > 0 && totalPages <= 1 && (
                <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                    <span className="text-sm sm:text-base text-foreground font-semibold">
                      Showing{" "}
                      <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalFiltered}
                      </span>{" "}
                      activities
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
                        {[10, 20, 50].map((n) => (
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
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                    {Array(5).fill(0).map((_, i) => (
                      <ActivityItemSkeleton key={i} />
                    ))}
                  </div>
                </div>
              ) : filteredActivities.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                    <AnimatePresence mode="wait">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {paginatedActivities.map((activity, index) => (
                          <ActivityItem 
                            key={activity.id} 
                            activity={activity} 
                            index={index} 
                            onDetailsClick={handleDetailsClick}
                          />
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {isLoading ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                  {Array(5).fill(0).map((_, i) => (
                    <ActivityItemSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : (
              renderEmptyState()
            )}
          </div>
        )}

        {/* Activity Details Modal */}
        <ActivityDetailsModal
          activity={selectedActivity}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </section>
    </main>
  );
};

export default Activity;
