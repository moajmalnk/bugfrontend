import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, AlertCircle, Bug, CheckCircle, User, FolderPlus, Edit, Trash, Eye, Archive, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { activityService, Activity as ActivityType } from '@/services/activityService';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

const getActivityIcon = (type: string, action: string) => {
  switch (type) {
    case 'bug':
      return action === 'reported' ? <Bug className="h-4 w-4 text-red-500" /> :
             action === 'fixed' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
             <Edit className="h-4 w-4 text-blue-500" />;
    case 'task':
      return action === 'created' ? <FolderPlus className="h-4 w-4 text-blue-500" /> :
             action === 'completed' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
             action === 'deleted' ? <Trash className="h-4 w-4 text-red-500" /> :
             <Edit className="h-4 w-4 text-blue-500" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4 text-gray-500" />;
    default:
      return <User className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityDescription = (activity: ActivityType) => {
  const details = activity.details ? JSON.parse(activity.details) : {};
  
  switch (activity.type) {
    case 'bug':
      if (activity.action === 'reported') return `Reported a new bug: ${details.summary || ''}`;
      if (activity.action === 'fixed') return `Fixed bug: ${details.fix_note || ''}`;
      if (activity.action === 'updated') return `Updated bug status: ${details.field === 'status' ? `${details.old} → ${details.new}` : ''}`;
      return `Modified bug details`;
    
    case 'task':
      if (activity.action === 'created') return `Created a new task: ${details.note || ''}`;
      if (activity.action === 'completed') return `Completed task: ${details.note || ''}`;
      if (activity.action === 'deleted') return `Deleted task: ${details.reason || ''}`;
      return `Updated task details`;
    
    case 'comment':
      if (activity.action === 'added') return `Added comment: ${details.comment || ''}`;
      if (activity.action === 'deleted') return `Removed comment: ${details.comment || ''}`;
      if (activity.action === 'edited') return `Edited comment: ${details.old_comment || ''} → ${details.new_comment || ''}`;
      return `Modified comment`;
    
    default:
      return `${activity.action} ${activity.type}`;
  }
};

const Activity = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activities'],
    queryFn: () => activityService.getActivities(20, 0), // Load 20 most recent activities
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load activities. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Track all actions across your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load activities. Please try again later.
              </AlertDescription>
            </Alert>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-medium">No Activities Yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Activities will appear here as they occur.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.data.map((activity: ActivityType) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {getActivityIcon(activity.type, activity.action)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Activity;
