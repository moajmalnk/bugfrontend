import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { activityService, Activity, ActivityResponse } from '@/services/activityService';
import { useToast } from '@/components/ui/use-toast';
import { Clock, RefreshCw, ChevronLeft, ChevronRight, Activity as ActivityIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityListProps {
  projectId?: string;
  limit?: number;
  showPagination?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

const ActivityItemSkeleton = () => (
  <div className="flex items-start space-x-3 p-4 border-b border-border last:border-b-0">
    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-full max-w-md" />
      <div className="flex items-center space-x-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  </div>
);

const ActivityItem: React.FC<{ activity: Activity; index: number }> = ({ activity, index }) => {
  const typeInfo = activityService.getActivityTypeInfo(activity.type);
  const formattedDescription = activityService.formatActivityDescription(activity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="flex items-start space-x-3 p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors duration-200"
    >
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg" role="img" aria-label={typeInfo.label}>
            {typeInfo.icon}
          </span>
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {formattedDescription}
          </p>
          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {activity.time_ago}
          </span>
        </div>
        
        {activity.project && (
          <p className="text-xs text-muted-foreground mb-2">
            in <span className="font-medium">{activity.project.name}</span>
          </p>
        )}
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
            {typeInfo.label}
          </Badge>
          
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <Badge variant="outline" className="text-xs">
              {Object.keys(activity.metadata).length} detail{Object.keys(activity.metadata).length !== 1 ? 's' : ''}
            </Badge>
          )}
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

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

  const totalPages = Math.ceil(totalActivities / limit);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground">Loading activities...</p>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent className="p-0">
          {Array(5).fill(0).map((_, i) => (
            <ActivityItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalActivities > 0 
              ? `Showing ${activities.length} of ${totalActivities} activities`
              : 'No recent activity'
            }
          </p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Refresh activities</span>
        </Button>
      </CardHeader>
      
      <CardContent className="p-0">
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
            >
              {activities.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
      
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasMore}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ActivityList; 