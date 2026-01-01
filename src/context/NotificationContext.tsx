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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  refreshNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const settings = notificationService.getSettings();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<Date>(new Date(0)); // Initialize to 0 to allow immediate first fetch
  const isFetchingRef = useRef<boolean>(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!currentUser) {
      return;
    }

    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      return;
    }

    // Check if we fetched recently (within last 500ms) - reduced from 2000ms for faster updates
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
      // Fetch notifications and unread count in parallel for better performance
      const [apiNotifications, count] = await Promise.all([
        notificationService.getUserNotifications(50, 0),
        notificationService.getUnreadCount()
      ]);
      
      // Map API notifications to our Notification type
      const mappedNotifications: Notification[] = apiNotifications.map((n: any) => ({
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
        created_by: n.created_by
      }));

      setNotifications(mappedNotifications);
      setUnreadCount(count);
      lastFetchTimeRef.current = new Date();
    } catch (error) {
      // console.error('NotificationContext: Error fetching notifications:', error);
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [currentUser]);

  // Initial fetch and setup polling - removed delay for immediate load
  useEffect(() => {
    if (currentUser) {
      // Fetch immediately without delay
      fetchNotifications(true);
      
      // Poll every 15 seconds for new notifications (reduced from 30s for faster updates)
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

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show toast and browser notification based on settings
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
  }, [settings.browserNotifications, settings.notificationSound]);

  const markAsRead = useCallback(async (id: string | number) => {
    const notificationId = typeof id === 'string' ? parseInt(id) : id;
    
    // Optimistic update
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Update on server (fire and forget for faster UX)
    notificationService.markAsRead(notificationId).catch(() => {
      // Silently handle errors, optimistic update already applied
    });
    
    // Refresh count in background without blocking
    notificationService.getUnreadCount().then(count => {
      setUnreadCount(count);
    }).catch(() => {
      // Silently handle errors
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
    
    // Update on server
    const success = await notificationService.markAllAsRead();
    
    // Refresh immediately for accurate state (no delay)
    if (success) {
      fetchNotifications();
    } else {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const clearNotifications = useCallback(async () => {
    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);
    
    // Delete on server
    await notificationService.deleteAll();
    
    // Refresh immediately for accurate state (no delay)
    fetchNotifications();
  }, [fetchNotifications]);

  // Expose refresh function for manual refresh
  const refreshNotifications = useCallback(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        refreshNotifications,
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
