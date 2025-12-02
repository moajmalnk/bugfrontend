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
  MapPin,
  X
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
        <div key={key} className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{formattedKey}:</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{String(value)}</span>
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
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 sm:max-w-3xl sm:w-full sm:max-h-[85vh] rounded-xl hide-scrollbar fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !ml-0">
        <DialogHeader className="relative">
          <DialogTitle className="flex items-center gap-3 pr-12">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              {getActivityIcon()}
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{typeInfo.label}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{activity.time_ago}</div>
            </div>
          </DialogTitle>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Activity Description */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-indigo-950/15 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Details</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {formattedDescription}
              </p>
            </div>
          </div>

          {/* Project Information */}
          {activity.project && (
            <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-teal-50/40 dark:from-emerald-950/15 dark:via-transparent dark:to-teal-950/15 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Information</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{activity.project.name}</p>
                    {activity.project.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.project.description}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  >
                    {activity.project.status || 'Active'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* User Information */}
          {activity.user && (
            <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-pink-50/40 dark:from-purple-950/15 dark:via-transparent dark:to-pink-950/15 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Information</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{activity.user.name || activity.user.email}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{activity.user.role || 'User'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Metadata Information */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-yellow-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-yellow-950/15 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-lg flex items-center justify-center">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Details</h3>
                </div>
                <div className="space-y-3">
                  {formatMetadata(activity.metadata)}
                </div>
              </div>
            </div>
          )}

          {/* Timestamp Information */}
          <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-purple-50/40 dark:from-indigo-950/15 dark:via-transparent dark:to-purple-950/15 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Timestamp Information</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(activity.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Ago:</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{activity.time_ago}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="space-y-4 pt-4 border-t border-gray-200/60 dark:border-gray-800/60">
            {navigationInfo ? (
              <div className="relative overflow-hidden rounded-xl border border-blue-200/60 dark:border-blue-800/60 bg-blue-50/80 dark:bg-blue-950/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/40 dark:from-blue-950/15 dark:via-transparent dark:to-indigo-950/15"></div>
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <navigationInfo.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                          Navigate to Related Item
                        </h4>
                        {currentUser?.role && (
                          <Badge 
                            variant="outline" 
                            className="text-xs border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          >
                            {currentUser.role}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        {navigationInfo.description}
                      </p>
                      <Button 
                        onClick={handleNavigate} 
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
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
              <div className="relative overflow-hidden rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-50/40 via-transparent to-gray-50/40 dark:from-gray-950/15 dark:via-transparent dark:to-gray-950/15"></div>
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Navigation Not Available
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        This activity doesn't have a specific related item to navigate to.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role-specific Quick Actions */}
            {getRoleSpecificActions().length > 0 && (
              <div className="relative overflow-hidden rounded-xl border border-green-200/60 dark:border-green-800/60 bg-green-50/80 dark:bg-green-950/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-50/40 via-transparent to-emerald-50/40 dark:from-green-950/15 dark:via-transparent dark:to-emerald-950/15"></div>
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
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
                            className="flex items-center gap-3 justify-start text-left h-auto p-3 bg-white/50 dark:bg-gray-800/50 border-green-200 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                          >
                            <action.icon className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-300">{action.label}</span>
                            <ExternalLink className="h-3 w-3 ml-auto text-green-500 dark:text-green-400" />
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityDetailsModal;
