import { Bell, BellRing, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'bug_fixed':
      case 'status_change':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'bug_created':
      case 'new_bug':
        return '🐛';
      case 'update_created':
      case 'new_update':
        return '📝';
      case 'task_created':
      case 'task_assigned':
      case 'task_completed':
        return '📋';
      case 'meet_created':
      case 'meeting_reminder':
        return '📹';
      case 'doc_created':
        return '📄';
      case 'project_created':
        return '📁';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
      case 'bug_fixed':
      case 'status_change':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'bug_created':
      case 'new_bug':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'update_created':
      case 'new_update':
      case 'task_created':
      case 'task_assigned':
      case 'task_completed':
      case 'meet_created':
      case 'meeting_reminder':
      case 'doc_created':
      case 'project_created':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on entity type
    if (notification.entity_type && notification.entity_id && role) {
      let path = '';
      if (notification.entity_type === 'bug') {
        path = `/${role}/bugs/${notification.entity_id}`;
      } else if (notification.entity_type === 'update') {
        path = `/${role}/updates/${notification.entity_id}`;
      } else if (notification.entity_type === 'task') {
        path = `/${role}/my-tasks`;
      } else if (notification.entity_type === 'project') {
        path = `/${role}/projects/${notification.entity_id}`;
      }
      
      if (path) {
        window.location.href = path;
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-6 mb-4">
          <div className="absolute inset-0 bg-black/10 rounded-xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <BellRing className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Notifications</h1>
                <p className="text-blue-100 text-sm">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 text-lg px-3 py-1">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-4 bg-card rounded-lg border mb-4">
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="h-9 px-4 text-sm font-medium hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-900/20 dark:hover:text-green-400"
              >
                <Check className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearNotifications}
                disabled={notifications.length === 0}
                className="h-9 px-4 text-sm font-medium hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications list */}
      <div className="bg-card rounded-lg border shadow-sm">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
              You're all caught up! New notifications will appear here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer",
                    !notification.read && "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    {/* Notification icon */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-medium",
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    {/* Notification content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "font-semibold text-base leading-tight",
                            !notification.read ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {notification.message}
                          </p>
                        </div>
                        
                        {/* Unread indicator */}
                        {!notification.read && (
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

