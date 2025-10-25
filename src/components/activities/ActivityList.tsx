import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { activityService, Activity, ActivityResponse } from '@/services/activityService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Clock, RefreshCw, ChevronLeft, ChevronRight, Activity as ActivityIcon, Eye, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ActivityDetailsModal from './ActivityDetailsModal';
import { useUndoDelete } from '@/hooks/useUndoDelete';

interface ActivityListProps {
  projectId?: string;
  limit?: number;
  showPagination?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const ActivityItemSkeleton = () => (
  <div className="flex items-start space-x-3 p-3 sm:p-4 border-b border-gray-200/60 dark:border-gray-800/60 last:border-b-0">
    <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex-shrink-0" />
    <div className="flex-1 space-y-2 sm:space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
        <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
        <Skeleton className="h-3 w-12 sm:w-16" />
      </div>
      <Skeleton className="h-3 w-full max-w-md" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 sm:h-6 w-12 sm:w-16 rounded-full" />
        <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
      </div>
    </div>
  </div>
);

const ActivityItem: React.FC<{ 
  activity: Activity; 
  index: number; 
  onShowDetails: (activity: Activity) => void;
  onDeleteClick: (activity: Activity) => void;
  isAdmin: boolean;
}> = ({ activity, index, onShowDetails, onDeleteClick, isAdmin }) => {
  const typeInfo = activityService.getActivityTypeInfo(activity.type);
  const formattedDescription = activityService.formatActivityDescription(activity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 m-1 sm:m-2"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-indigo-950/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative flex items-start space-x-3 sm:space-x-4 p-3 sm:p-4">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <span className="text-sm sm:text-lg text-white" role="img" aria-label={typeInfo.label}>
              {typeInfo.icon}
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-1 sm:gap-0">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
              {formattedDescription}
            </p>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
              {activity.time_ago}
            </span>
          </div>
          
          {activity.project && (
            <div className="flex items-center gap-1 mb-2 sm:mb-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">in</span>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full">
                {activity.project.name}
              </span>
            </div>
          )}
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
            <div className="flex items-center space-x-2">
              <Badge 
                variant="outline" 
                className={`text-xs font-medium ${typeInfo.color} border-current/20 bg-current/10`}
              >
                {typeInfo.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Mobile: Full-width View button at bottom */}
              <div className="block sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShowDetails(activity)}
                  className="w-full h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
              </div>
              
              {/* Desktop: Compact buttons */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowDetails(activity)}
                  className="h-7 px-3 text-xs border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 text-blue-600 dark:text-blue-400 transition-all duration-200"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(activity)}
                    className="h-7 px-3 text-xs border border-red-200 dark:border-red-700 bg-white/50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-red-600 dark:text-red-400 transition-all duration-200"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ActivityList: React.FC<ActivityListProps> = ({
  projectId,
  limit = 10,
  showPagination = true,
  autoRefresh = false,
  refreshInterval = 30000,
  className = ''
}) => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const { toast } = useToast();

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  // Undo delete hook
  const {
    isCountingDown,
    timeLeft,
    startCountdown,
    cancelCountdown,
    confirmDelete: confirmDeleteActivity,
  } = useUndoDelete({
    duration: 10,
    onConfirm: async () => {
      if (activityToDelete) {
        try {
          await activityService.deleteActivity(activityToDelete.id);
          toast({
            title: 'Activity Deleted',
            description: 'The activity has been permanently deleted.',
            variant: 'default',
          });
          // Refresh activities list
          fetchActivities(currentPage, true);
        } catch (error) {
          console.error('Error deleting activity:', error);
          toast({
            title: 'Delete Failed',
            description: 'Failed to delete the activity. Please try again.',
            variant: 'destructive',
          });
        }
        setActivityToDelete(null);
      }
    },
    onUndo: () => {
      toast({
        title: 'Delete Cancelled',
        description: 'The activity deletion has been cancelled.',
        variant: 'default',
      });
      setActivityToDelete(null);
    },
  });

  const fetchActivities = useCallback(async (page: number = 0, showRefresh: boolean = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else if (page === 0) {
        setIsLoading(true);
      }

      const offset = page * limit;
      const response: ActivityResponse = projectId
        ? await activityService.getProjectActivities(projectId, limit, offset)
        : await activityService.getUserActivities(limit, offset);

      setActivities(response.activities);
      setTotalActivities(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      
    } catch (error) {
      //.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, limit, toast]);

  // Initial load
  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (currentPage === 0) {
        fetchActivities(0, true);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, currentPage, fetchActivities]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchActivities(newPage);
  };

  const handleRefresh = () => {
    fetchActivities(currentPage, true);
  };

  const handleShowDetails = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedActivity(null);
  };

  const handleDeleteClick = (activity: Activity) => {
    setActivityToDelete(activity);
    startCountdown();
    toast({
      title: 'Activity Deletion Started',
      description: `Activity will be deleted in ${timeLeft} seconds. Click "Undo" to cancel.`,
      variant: 'default',
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={cancelCountdown}
          className="text-xs"
        >
          Undo ({timeLeft}s)
        </Button>
      ),
    });
  };

  const totalPages = Math.ceil(totalActivities / limit);

  if (isLoading) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${className}`}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/30 to-indigo-50/30 dark:from-gray-800/30 dark:to-indigo-900/30"></div>
        <div className="relative p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ActivityIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading activities...</p>
            </div>
          </div>
          <div className="space-y-1 sm:space-y-2">
            {Array(5).fill(0).map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/30 to-indigo-50/30 dark:from-gray-800/30 dark:to-indigo-900/30"></div>
      
      <div className="relative p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ActivityIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {totalActivities > 0 
                  ? `Showing ${activities.length} of ${totalActivities} activities`
                  : 'No recent activity'
                }
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 self-end sm:self-auto"
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh activities</span>
          </Button>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {activities.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <EmptyState
                  title="No activities yet"
                  description={
                    projectId 
                      ? "This project doesn't have any recent activity."
                      : "You don't have any recent activity to show."
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {activities.map((activity, index) => (
                  <ActivityItem 
                    key={activity.id} 
                    activity={activity} 
                    index={index} 
                    onShowDetails={handleShowDetails}
                    onDeleteClick={handleDeleteClick}
                    isAdmin={isAdmin}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-200/60 dark:border-gray-800/60 gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Page {currentPage + 1} of {totalPages}
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasMore}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        activity={selectedActivity}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default ActivityList; 