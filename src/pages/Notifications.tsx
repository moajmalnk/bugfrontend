import { Bell, BellRing, Check, Trash2, Loader2, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useNotifications, type Notification } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';

const NOTIFICATION_TABS = ['unread', 'read'] as const;
type NotificationTab = (typeof NOTIFICATION_TABS)[number];

function parseNotificationTab(value: string | null): NotificationTab {
  return NOTIFICATION_TABS.includes(value as NotificationTab)
    ? (value as NotificationTab)
    : 'unread';
}

function getNotificationCategory(notification: Notification): string {
  const type = (notification.type || '').toLowerCase();
  const entityType = (notification.entity_type || '').toLowerCase();

  if (type === 'bug_fixed' || type === 'status_change') return 'bug_fixed';
  if (type === 'bug_created' || type === 'new_bug') return 'bug_created';
  if (
    ['work_check_in', 'work_break', 'work_update', 'overtime'].includes(entityType) ||
    ['work_check_in', 'work_break', 'work_update', 'overtime'].includes(type)
  ) {
    return 'work';
  }
  if (type.includes('task') || entityType === 'task') return 'task';
  if (type.includes('update') || entityType === 'update') return 'update';
  if (type.includes('meet') || entityType === 'meet') return 'meet';
  if (type.includes('project') || entityType === 'project') return 'project';
  if (type.includes('doc') || entityType === 'doc') return 'doc';
  return 'other';
}

function matchesDateFilter(createdAt: string, dateFilter: string): boolean {
  if (dateFilter === 'all') return true;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return true;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdDateOnly = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate()
  );

  switch (dateFilter) {
    case 'today':
      return createdDateOnly.getTime() === today.getTime();
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return createdDateOnly.getTime() === yesterday.getTime();
    }
    case 'this_week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return createdDateOnly >= weekStart;
    }
    case 'this_month':
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    case 'last_month': {
      const lastMonth = new Date(now);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return (
        created.getMonth() === lastMonth.getMonth() &&
        created.getFullYear() === lastMonth.getFullYear()
      );
    }
    case 'this_year':
      return created.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

function filterNotifications(
  list: Notification[],
  searchQuery: string,
  typeFilter: string,
  projectFilter: string,
  dateFilter: string
): Notification[] {
  let filtered = [...list];
  const query = searchQuery.trim().toLowerCase();

  if (query) {
    filtered = filtered.filter((n) => {
      const haystack = [
        n.title,
        n.message,
        n.project_name,
        n.bug_title,
        n.created_by,
        n.status,
        n.type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  if (typeFilter !== 'all') {
    filtered = filtered.filter((n) => getNotificationCategory(n) === typeFilter);
  }

  if (projectFilter !== 'all') {
    filtered = filtered.filter((n) => n.project_name === projectFilter);
  }

  if (dateFilter !== 'all') {
    filtered = filtered.filter((n) => matchesDateFilter(n.createdAt, dateFilter));
  }

  return filtered;
}

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    readCount,
    totalCount,
    hasMoreNotifications,
    isLoading,
    isLoadingMore,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    loadAllNotifications,
    loadMoreNotifications,
  } = useNotifications();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showMarkAllDialog, setShowMarkAllDialog] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = parseNotificationTab(searchParams.get('tab'));
  const [activeTab, setActiveTab] = useState<NotificationTab>(tabFromUrl);
  const [filters, setFilter, clearFilters] = usePersistedFilters('notifications', {
    searchQuery: '',
    typeFilter: 'all',
    projectFilter: 'all',
    dateFilter: 'all',
  });
  const searchQuery = filters.searchQuery || '';
  const typeFilter = filters.typeFilter || 'all';
  const projectFilter = filters.projectFilter || 'all';
  const dateFilter = filters.dateFilter || 'all';

  const setSearchQuery = (value: string) => setFilter('searchQuery', value);
  const setTypeFilter = (value: string) => setFilter('typeFilter', value);
  const setProjectFilter = (value: string) => setFilter('projectFilter', value);
  const setDateFilter = (value: string) => setFilter('dateFilter', value);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    typeFilter !== 'all' ||
    projectFilter !== 'all' ||
    dateFilter !== 'all';

  useEffect(() => {
    void loadAllNotifications();
  }, [loadAllNotifications]);

  useEffect(() => {
    const urlTab = parseNotificationTab(searchParams.get('tab'));
    if (urlTab !== activeTab) setActiveTab(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const nextTab = parseNotificationTab(tab);
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('tab', nextTab);
      return params;
    });
  };

  const projectOptions = useMemo(() => {
    const names = new Set<string>();
    notifications.forEach((n) => {
      if (n.project_name?.trim()) names.add(n.project_name.trim());
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [notifications]);

  const filteredNotifications = useMemo(
    () =>
      filterNotifications(
        notifications,
        searchQuery,
        typeFilter,
        projectFilter,
        dateFilter
      ),
    [notifications, searchQuery, typeFilter, projectFilter, dateFilter]
  );

  const unreadNotifications = filteredNotifications.filter((n) => !n.read);
  const readNotifications = filteredNotifications.filter((n) => n.read);
  const filteredUnreadCount = unreadNotifications.length;
  const filteredReadCount = readNotifications.length;
  const showLoadMore =
    hasMoreNotifications && (activeTab !== 'unread' || unreadCount > 0);

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
      const workActivityTypes = ['work_check_in', 'work_break', 'work_update', 'overtime'];
      if (workActivityTypes.includes(notification.entity_type)) {
        const userId = String(notification.entity_id).split(':')[0];
        if (userId) {
          path = `/${role}/users/${userId}`;
        }
      } else if (notification.entity_type === 'bug') {
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
        "group relative flex items-start gap-3 sm:gap-4 p-4 sm:p-5 pl-3 sm:pl-4 border-l-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-top-2 min-w-0",
        isUnread
          ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-blue-500"
          : "border-l-transparent"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => handleNotificationClick(notification)}
    >
      {/* Notification icon */}
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-base font-medium",
          !isUnread && "opacity-75",
          getNotificationColor(notification.type)
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Notification content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-semibold text-sm sm:text-base leading-tight break-words",
            isUnread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
          )}
        >
          {notification.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed break-words">
          {notification.message}
        </p>

        {/* Additional Information */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {notification.project_name && (
            <Badge
              variant="outline"
              className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
            >
              📁 {notification.project_name}
            </Badge>
          )}

          {notification.bug_title && (
            <Badge
              variant="outline"
              className="text-xs font-medium bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
            >
              🐛{" "}
              {notification.bug_title.length > 30
                ? `${notification.bug_title.substring(0, 30)}...`
                : notification.bug_title}
            </Badge>
          )}

          {notification.status && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium",
                notification.status.toLowerCase() === "fixed" ||
                  notification.status.toLowerCase() === "resolved" ||
                  notification.status.toLowerCase() === "completed"
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  : notification.status.toLowerCase() === "open" ||
                      notification.status.toLowerCase() === "pending"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                    : notification.status.toLowerCase() === "closed" ||
                        notification.status.toLowerCase() === "cancelled"
                      ? "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
              )}
            >
              {notification.status}
            </Badge>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator — vertically centered with the row */}
      <div className="flex-shrink-0 self-center w-2.5 h-2.5">
        {isUnread && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
      </div>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 pointer-events-none" />
          <div className="relative p-4 sm:p-6 md:p-8 min-w-0 overflow-hidden">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between min-w-0">
              <div className="space-y-3 min-w-0 flex-1">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 p-2 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-lg">
                    <BellRing className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl sm:text-3xl xl:text-4xl font-bold text-gray-900 dark:text-white tracking-tight break-words">
                      Notifications
                    </h1>
                    <div className="h-1 w-20 max-w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full mt-2" />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base xl:text-lg font-medium max-w-2xl leading-relaxed break-words">
                  {hasActiveFilters ? (
                    <>
                      Showing {filteredNotifications.length} of {notifications.length} notification
                      {notifications.length !== 1 ? 's' : ''}
                      {filteredUnreadCount > 0 && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {' '}
                          · {filteredUnreadCount} unread
                        </span>
                      )}
                    </>
                  ) : unreadCount > 0 ? (
                    `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                  ) : (
                    'All caught up! No new notifications.'
                  )}
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:shrink-0 xl:justify-end">
                {notifications.length > 0 && (
                  <Button
                    onClick={() => (unreadCount > 0 ? setShowMarkAllDialog(true) : null)}
                    disabled={unreadCount === 0 || isMarkingAll}
                    className="h-11 sm:h-12 w-full sm:w-auto px-4 sm:px-6 text-sm sm:text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isMarkingAll ? (
                      <>
                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                        Marking...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Mark all
                      </>
                    )}
                  </Button>
                )}

                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm w-full sm:w-auto shrink-0">
                  <div className="flex-shrink-0 p-1.5 bg-blue-600 rounded-lg">
                    <BellRing className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-[1.5rem] text-center text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300 leading-none">
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    ) : (
                      unreadCount
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter — same pattern as Projects */}
        {(notifications.length > 0 || hasActiveFilters) && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl pointer-events-none" />
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                      <Filter className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Search & Filter
                    </h3>
                  </div>
                  {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                        {[
                          searchQuery.trim() && 'Search',
                          typeFilter !== 'all' && 'Type',
                          projectFilter !== 'all' && 'Project',
                          dateFilter !== 'all' && 'Date',
                        ]
                          .filter(Boolean)
                          .length}{' '}
                        filter
                        {[
                          searchQuery.trim() && 'Search',
                          typeFilter !== 'all' && 'Type',
                          projectFilter !== 'all' && 'Project',
                          dateFilter !== 'all' && 'Date',
                        ].filter(Boolean).length !== 1
                          ? 's'
                          : ''}{' '}
                        active
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {filteredNotifications.length} of {notifications.length} shown
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col xl:flex-row gap-4 min-w-0">
                  <div className="w-full xl:flex-1 min-w-0 relative group">
                    <Bell className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full min-w-0 pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-wrap gap-3 w-full xl:w-auto xl:shrink-0 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 w-full xl:w-auto">
                      <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                        <Filter className="h-4 w-4 text-white" />
                      </div>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full min-w-0 xl:w-[11rem] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[60]">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="bug_fixed">Bug Fixed</SelectItem>
                          <SelectItem value="bug_created">New Bug</SelectItem>
                          <SelectItem value="work">Work Activity</SelectItem>
                          <SelectItem value="task">Tasks</SelectItem>
                          <SelectItem value="update">Updates</SelectItem>
                          <SelectItem value="meet">Meetings</SelectItem>
                          <SelectItem value="project">Projects</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {projectOptions.length > 0 && (
                      <div className="flex items-center gap-2 min-w-0 w-full xl:w-auto">
                        <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                          <BellRing className="h-4 w-4 text-white" />
                        </div>
                        <Select value={projectFilter} onValueChange={setProjectFilter}>
                          <SelectTrigger className="w-full min-w-0 xl:w-[11rem] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                            <SelectValue placeholder="Project" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60] max-h-[280px]">
                            <SelectItem value="all">All Projects</SelectItem>
                            {projectOptions.map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="h-11 w-full sm:col-span-2 xl:col-span-1 xl:w-auto px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm font-medium"
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

        {/* Notifications list with Tabs */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/50 pointer-events-none" />
          <div className="relative">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading notifications...</h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Please wait while we fetch your notifications.
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 sm:p-12 text-center">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                  <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">No notifications</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  You're all caught up! New notifications will appear here.
                </p>
              </div>
            ) : filteredNotifications.length === 0 && hasActiveFilters ? (
              <div className="p-10 sm:p-12 text-center">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                  <Filter className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  No matching notifications
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Try adjusting your search or filters to find what you need.
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800">
                  <TabsList className="grid w-full grid-cols-2 h-11 sm:h-12 bg-gray-100/80 dark:bg-gray-800/80 p-1 rounded-xl">
                    <TabsTrigger
                      value="unread"
                      className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold min-w-0 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-lg transition-all duration-200 h-full"
                    >
                      <BellRing className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Unread</span>
                      <Badge className="min-w-[1.5rem] justify-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border-0">
                        {hasActiveFilters ? unreadNotifications.length : unreadCount}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="read"
                      className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold min-w-0 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-lg transition-all duration-200 h-full"
                    >
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Read</span>
                      <Badge className="min-w-[1.5rem] justify-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-full text-xs font-bold border-0">
                        {hasActiveFilters ? readNotifications.length : readCount}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="unread" className="mt-0 focus-visible:ring-0">
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {unreadNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg mb-5">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {hasActiveFilters
                            ? 'No matching unread notifications'
                            : 'No unread notifications'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                          {hasActiveFilters
                            ? 'Try adjusting your search or filters.'
                            : "You're all caught up! All notifications have been read."}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="outline" className="mt-4" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
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

                <TabsContent value="read" className="mt-0 focus-visible:ring-0">
                  <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {readNotifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-lg mb-5">
                          <Bell className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {hasActiveFilters
                            ? 'No matching read notifications'
                            : 'No read notifications'}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                          {hasActiveFilters
                            ? 'Try adjusting your search or filters.'
                            : "You haven't read any notifications yet."}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="outline" className="mt-4" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
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

                {showLoadMore && (
                  <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void loadMoreNotifications()}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load more (${notifications.length} of ${totalCount})`
                      )}
                    </Button>
                  </div>
                )}
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
                'Mark all'
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

