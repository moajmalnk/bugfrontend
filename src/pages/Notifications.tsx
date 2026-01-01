import { Bell, BellRing, Check, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useNotifications } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { toast } from '@/components/ui/use-toast';

export default function Notifications() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [activeTab, setActiveTab] = useState('unread');

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

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
    } else if (notification.bug_id && role) {
      // Fallback to bug_id if entity_type is not set
      window.location.href = `/${role}/bugs/${notification.bug_id}`;
    }
  };

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await markAllAsRead();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
        variant: 'default',
      });
      setShowMarkAllDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearNotifications();
      toast({
        title: 'Success',
        description: 'All notifications cleared successfully',
        variant: 'default',
      });
      setShowClearDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    } finally {
      setIsClearing(false);
    }
  };


  // Render notification item component
  const renderNotificationItem = (notification: any, index: number, isUnread: boolean) => (
    <div
      key={notification.id}
      className={cn(
        "group relative p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-top-2",
        isUnread && "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-4">
        {/* Notification icon */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-medium",
          !isUnread && "opacity-75",
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
                isUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
              )}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {notification.message}
              </p>
              
              {/* Additional Information */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Project Name */}
                {notification.project_name && (
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                  >
                    📁 {notification.project_name}
                  </Badge>
                )}
                
                {/* Bug Title */}
                {notification.bug_title && (
                  <Badge 
                    variant="outline" 
                    className="text-xs font-medium bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    🐛 {notification.bug_title.length > 30 
                      ? `${notification.bug_title.substring(0, 30)}...` 
                      : notification.bug_title}
                  </Badge>
                )}
                
                {/* Status */}
                {notification.status && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs font-medium",
                      notification.status.toLowerCase() === 'fixed' || notification.status.toLowerCase() === 'resolved' || notification.status.toLowerCase() === 'completed'
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        : notification.status.toLowerCase() === 'open' || notification.status.toLowerCase() === 'pending'
                        ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                        : notification.status.toLowerCase() === 'closed' || notification.status.toLowerCase() === 'cancelled'
                        ? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    )}
                  >
                    {notification.status}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Unread indicator */}
            {isUnread && (
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
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-lg">
                    <BellRing className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Notifications
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up! No new notifications.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                {notifications.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => unreadCount > 0 ? setShowMarkAllDialog(true) : null}
                      disabled={unreadCount === 0 || isMarkingAll}
                      className="h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isMarkingAll ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                          Marking...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Mark all read
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowClearDialog(true)}
                      disabled={notifications.length === 0 || isClearing}
                      className="h-11 sm:h-12 px-4 sm:px-6 text-sm sm:text-base font-semibold bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClearing ? (
                        <>
                          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          Clear all
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <BellRing className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : (
                          unreadCount
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications list with Tabs */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 rounded-2xl"></div>
          <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading notifications...</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Please wait while we fetch your notifications.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                  <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                    <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No notifications</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    You're all caught up! New notifications will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="p-2">
                  <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                    <TabsTrigger 
                      value="unread" 
                      className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300 relative"
                    >
                      <BellRing className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="hidden sm:inline">Unread</span>
                      <span className="sm:hidden">Unread</span>
                      {unreadNotifications.length > 0 && (
                        <Badge className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                          {unreadNotifications.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="read"
                      className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                    >
                      <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="hidden sm:inline">Read</span>
                      <span className="sm:hidden">Read</span>
                      {readNotifications.length > 0 && (
                        <Badge className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold">
                          {readNotifications.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="unread" className="mt-0">
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {unreadNotifications.length === 0 ? (
                      <div className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                            <Check className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No unread notifications</h3>
                          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            You're all caught up! All notifications have been read.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {unreadNotifications.map((notification, index) => 
                          renderNotificationItem(notification, index, true)
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="read" className="mt-0">
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {readNotifications.length === 0 ? (
                      <div className="relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                        <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-10 sm:p-12 text-center">
                          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-2xl mb-6">
                            <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                          </div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No read notifications</h3>
                          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                            You haven't read any notifications yet.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {readNotifications.map((notification, index) => 
                          renderNotificationItem(notification, index, false)
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </section>

      {/* Mark All Read Confirmation Dialog */}
      <AlertDialog open={showMarkAllDialog} onOpenChange={setShowMarkAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark All as Read?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark all {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''} as read? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMarkingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isMarkingAll ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                'Mark All Read'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}? 
              This action cannot be undone and will permanently remove all your notifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                'Clear All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

