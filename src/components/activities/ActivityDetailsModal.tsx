import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  ExternalLink, 
  Bug, 
  CheckSquare, 
  FileText, 
  MessageSquare,
  Settings,
  Users,
  AlertCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { activityService } from '@/services/activityService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ActivityDetailsModalProps {
  activity: any;
  isOpen: boolean;
  onClose: () => void;
}

const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ 
  activity, 
  isOpen, 
  onClose 
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  if (!activity) return null;

  const typeInfo = activityService.getActivityTypeInfo(activity.type);
  const formattedDescription = activityService.formatActivityDescription(activity);

  const getNavigationInfo = () => {
    const userRole = currentUser?.role || 'guest';
    
    // Role-based navigation paths
    const getRoleBasedPath = (basePath: string, itemId?: string) => {
      const baseRoute = basePath.replace('/', '');
      const itemPath = itemId ? `/${itemId}` : '';
      
      // For authenticated users, use role-based paths
      if (userRole && userRole !== 'guest') {
        return `/${userRole}/${baseRoute}${itemPath}`;
      }
      
      // For guests or unauthenticated users, use default paths
      return `${basePath}${itemPath}`;
    };

    const baseNavigation = {
      bug: { 
        path: getRoleBasedPath('/bugs'), 
        label: 'View Bug', 
        icon: Bug, 
        description: 'Go to bug details' 
      },
      task: { 
        path: getRoleBasedPath('/tasks'), 
        label: 'View Task', 
        icon: CheckSquare, 
        description: 'Go to task details' 
      },
      project: { 
        path: getRoleBasedPath('/projects'), 
        label: 'View Project', 
        icon: FileText, 
        description: 'Go to project details' 
      },
      meeting: { 
        path: getRoleBasedPath('/meetings'), 
        label: 'View Meeting', 
        icon: MessageSquare, 
        description: 'Go to meeting details' 
      },
      user: { 
        path: getRoleBasedPath('/users'), 
        label: 'View User', 
        icon: User, 
        description: 'Go to user profile' 
      },
      announcement: { 
        path: getRoleBasedPath('/announcements'), 
        label: 'View Announcement', 
        icon: AlertCircle, 
        description: 'Go to announcement details' 
      },
      update: { 
        path: getRoleBasedPath('/updates'), 
        label: 'View Update', 
        icon: Settings, 
        description: 'Go to update details' 
      }
    };

    // Determine navigation based on activity type and metadata
    if (activity.type.includes('bug')) {
      const bugId = activity.metadata?.bug_id || activity.metadata?.id;
      return {
        ...baseNavigation.bug,
        path: getRoleBasedPath('/bugs', bugId),
        description: bugId ? `Go to bug #${bugId} details` : 'Go to bugs list'
      };
    } else if (activity.type.includes('task')) {
      const taskId = activity.metadata?.task_id || activity.metadata?.id;
      return {
        ...baseNavigation.task,
        path: getRoleBasedPath('/tasks', taskId),
        description: taskId ? `Go to task #${taskId} details` : 'Go to tasks list'
      };
    } else if (activity.type.includes('project')) {
      const projectId = activity.metadata?.project_id || activity.metadata?.id;
      return {
        ...baseNavigation.project,
        path: getRoleBasedPath('/projects', projectId),
        description: projectId ? `Go to project #${projectId} details` : 'Go to projects list'
      };
    } else if (activity.type.includes('meeting')) {
      const meetingId = activity.metadata?.meeting_id || activity.metadata?.id;
      return {
        ...baseNavigation.meeting,
        path: getRoleBasedPath('/meetings', meetingId),
        description: meetingId ? `Go to meeting #${meetingId} details` : 'Go to meetings list'
      };
    } else if (activity.type.includes('user')) {
      const userId = activity.metadata?.user_id || activity.metadata?.id;
      return {
        ...baseNavigation.user,
        path: getRoleBasedPath('/users', userId),
        description: userId ? `Go to user #${userId} profile` : 'Go to users list'
      };
    } else if (activity.type.includes('announcement')) {
      const announcementId = activity.metadata?.announcement_id || activity.metadata?.id;
      return {
        ...baseNavigation.announcement,
        path: getRoleBasedPath('/announcements', announcementId),
        description: announcementId ? `Go to announcement #${announcementId} details` : 'Go to announcements list'
      };
    } else if (activity.type.includes('update')) {
      const updateId = activity.metadata?.update_id || activity.metadata?.id;
      return {
        ...baseNavigation.update,
        path: getRoleBasedPath('/updates', updateId),
        description: updateId ? `Go to update #${updateId} details` : 'Go to updates list'
      };
    }

    return null;
  };

  const navigationInfo = getNavigationInfo();

  const handleNavigate = () => {
    if (navigationInfo) {
      navigate(navigationInfo.path);
      onClose();
    }
  };

  const getRoleSpecificActions = () => {
    const userRole = currentUser?.role;
    const actions = [];

    if (userRole === 'admin') {
      // Admin can access all sections
      actions.push(
        { label: 'All Projects', path: '/admin/projects', icon: FileText },
        { label: 'All Users', path: '/admin/users', icon: Users },
        { label: 'System Settings', path: '/admin/settings', icon: Settings }
      );
    } else if (userRole === 'developer') {
      // Developer specific actions
      actions.push(
        { label: 'My Fixes', path: '/developer/fixes', icon: CheckSquare },
        { label: 'Bug Reports', path: '/developer/bugs', icon: Bug }
      );
    } else if (userRole === 'tester') {
      // Tester specific actions
      actions.push(
        { label: 'My Bugs', path: '/tester/bugs', icon: Bug },
        { label: 'Report New Bug', path: '/tester/bugs/new', icon: Bug }
      );
    }

    return actions;
  };

  const formatMetadata = (metadata: any) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;

    return Object.entries(metadata).map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return (
        <div key={key} className="flex justify-between py-2">
          <span className="text-sm font-medium text-muted-foreground">{formattedKey}:</span>
          <span className="text-sm text-foreground">{String(value)}</span>
        </div>
      );
    });
  };

  const getActivityIcon = () => {
    const iconClass = "h-6 w-6";
    
    if (activity.type.includes('bug')) return <Bug className={iconClass} />;
    if (activity.type.includes('task')) return <CheckSquare className={iconClass} />;
    if (activity.type.includes('project')) return <FileText className={iconClass} />;
    if (activity.type.includes('meeting')) return <MessageSquare className={iconClass} />;
    if (activity.type.includes('user')) return <User className={iconClass} />;
    if (activity.type.includes('announcement')) return <AlertCircle className={iconClass} />;
    if (activity.type.includes('update')) return <Settings className={iconClass} />;
    
    return <Clock className={iconClass} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {getActivityIcon()}
            </div>
            <div>
              <div className="text-lg font-semibold">{typeInfo.label}</div>
              <div className="text-sm text-muted-foreground">{activity.time_ago}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Activity Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Activity Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {formattedDescription}
              </p>
            </CardContent>
          </Card>

          {/* Project Information */}
          {activity.project && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{activity.project.name}</p>
                    {activity.project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.project.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {activity.project.status || 'Active'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Information */}
          {activity.user && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{activity.user.name || activity.user.email}</p>
                    <p className="text-sm text-muted-foreground">{activity.user.role || 'User'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata Information */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Additional Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {formatMetadata(activity.metadata)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamp Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Timestamp Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Created:</span>
                  <span className="text-sm text-foreground">
                    {new Date(activity.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Time Ago:</span>
                  <span className="text-sm text-foreground">{activity.time_ago}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Actions */}
          <div className="space-y-4 pt-4 border-t">
            {navigationInfo ? (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <navigationInfo.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Navigate to Related Item
                      </h4>
                      {currentUser?.role && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {currentUser.role}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {navigationInfo.description}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleNavigate} 
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <navigationInfo.icon className="h-4 w-4" />
                        {navigationInfo.label}
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      Navigation Not Available
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      This activity doesn't have a specific related item to navigate to.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Role-specific Quick Actions */}
            {getRoleSpecificActions().length > 0 && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Quick Actions ({currentUser?.role})
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {getRoleSpecificActions().map((action, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigate(action.path);
                            onClose();
                          }}
                          className="flex items-center gap-2 justify-start text-left h-auto p-2 bg-white dark:bg-gray-800 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <action.icon className="h-4 w-4" />
                          {action.label}
                          <ExternalLink className="h-3 w-3 ml-auto" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailsModal;
