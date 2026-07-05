import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';
import { notificationService } from '@/services/notificationService';

export interface Notification {
  id: number | string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'bug_created' | 'bug_fixed' | 'update_created' | 'task_created' | 'meet_created' | 'doc_created' | 'project_created';
  read: boolean;
  createdAt: string;
  entity_type?: string;
  entity_id?: string;
  project_id?: string;
  project_name?: string;
  bug_id?: string;
  bug_title?: string;
  status?: string;
  created_by?: string;
}

const PAGE_SIZE = 100;

function mapApiNotifications(apiNotifications: any[]): Notification[] {
  return apiNotifications.map((n: any) => ({
    id: n.id,
    title: n.title || 'Notification',
    message: n.message || '',
    type: n.type || 'info',
    read: n.read === true || n.read === 1 || n.read === '1',
    createdAt: n.createdAt || n.created_at || new Date().toISOString(),
    entity_type: n.entity_type,
    entity_id: n.entity_id,
    project_id: n.project_id,
    project_name: n.project_name,
    bug_id: n.bug_id,
    bug_title: n.bug_title,
    status: n.status,
    created_by: n.created_by,
  }));
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  readCount: number;
  totalCount: number;
  hasMoreNotifications: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshNotifications: () => void;
  loadMoreNotifications: () => Promise<void>;
  loadAllNotifications: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readCount, setReadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { currentUser } = useAuth();
  const settings = notificationService.getSettings();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<Date>(new Date(0));
  const isFetchingRef = useRef<boolean>(false);

  const applyFetchResult = useCallback(
    (result: Awaited<ReturnType<typeof notificationService.getUserNotifications>>, append = false) => {
      const mapped = mapApiNotifications(result.notifications);
      setNotifications((prev) => (append ? [...prev, ...mapped] : mapped));
      setUnreadCount(result.unreadCount);
      setReadCount(result.readCount);
      setTotalCount(result.total);
      setHasMoreNotifications(result.hasMore);
    },
    []
  );

  const fetchNotifications = useCallback(
    async (showLoading = false) => {
      if (!currentUser) {
        return;
      }

      if (isFetchingRef.current) {
        return;
      }

      const now = new Date();
      const timeSinceLastFetch = now.getTime() - lastFetchTimeRef.current.getTime();
      if (timeSinceLastFetch < 500) {
        return;
      }

      isFetchingRef.current = true;
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const result = await notificationService.getUserNotifications(PAGE_SIZE, 0);
        applyFetchResult(result, false);
        lastFetchTimeRef.current = new Date();
      } catch {
        // keep existing state on failure
      } finally {
        isFetchingRef.current = false;
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [currentUser, applyFetchResult]
  );

  const loadMoreNotifications = useCallback(async () => {
    if (!currentUser || !hasMoreNotifications || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const result = await notificationService.getUserNotifications(
        PAGE_SIZE,
        notifications.length
      );
      applyFetchResult(result, true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentUser, hasMoreNotifications, isLoadingMore, notifications.length, applyFetchResult]);

  const loadAllNotifications = useCallback(async () => {
    if (!currentUser) {
      return;
    }

    setIsLoading(true);
    try {
      let offset = 0;
      let allNotifications: Notification[] = [];
      let hasMore = true;
      let latestStats = {
        total: 0,
        unreadCount: 0,
        readCount: 0,
      };

      while (hasMore) {
        const result = await notificationService.getUserNotifications(PAGE_SIZE, offset);
        allNotifications = [...allNotifications, ...mapApiNotifications(result.notifications)];
        latestStats = {
          total: result.total,
          unreadCount: result.unreadCount,
          readCount: result.readCount,
        };
        hasMore = result.hasMore;
        offset += result.notifications.length;

        if (result.notifications.length === 0) {
          break;
        }

        // Safety cap to avoid runaway loops
        if (offset >= 5000) {
          break;
        }
      }

      setNotifications(allNotifications);
      setUnreadCount(latestStats.unreadCount);
      setReadCount(latestStats.readCount);
      setTotalCount(latestStats.total);
      setHasMoreNotifications(false);
      lastFetchTimeRef.current = new Date();
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications(true);

      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications();
      }, 15000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [currentUser?.id, fetchNotifications]);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setTotalCount((prev) => prev + 1);

      if (settings.browserNotifications) {
        notificationService.sendTestNotification();
        if (settings.notificationSound) {
          notificationService.playNotificationSound();
        }
      }

      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    },
    [settings.browserNotifications, settings.notificationSound]
  );

  const markAsRead = useCallback(async (id: string | number) => {
    const notificationId = typeof id === 'string' ? parseInt(id) : id;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setReadCount((prev) => prev + 1);

    notificationService.markAsRead(notificationId).catch(() => {});

    notificationService.getUnreadCount().then((count) => {
      setUnreadCount(count);
    }).catch(() => {});
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    setUnreadCount(0);
    setReadCount(totalCount);

    const success = await notificationService.markAllAsRead();
    if (success) {
      await loadAllNotifications();
    } else {
      await fetchNotifications();
    }
  }, [totalCount, loadAllNotifications, fetchNotifications]);

  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    setReadCount(0);
    setTotalCount(0);
    setHasMoreNotifications(false);

    await notificationService.deleteAll();
    await fetchNotifications();
  }, [fetchNotifications]);

  const refreshNotifications = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        readCount,
        totalCount,
        hasMoreNotifications,
        isLoading,
        isLoadingMore,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
        loadMoreNotifications,
        loadAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
