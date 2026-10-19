import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useContext } from 'react';
import { NotificationContext } from '@/context/NotificationContext';

export function NotificationPopover() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  
  // Safely access the notification context - if not available, use default value
  const notificationContext = useContext(NotificationContext);
  const unreadCount = notificationContext?.unreadCount ?? 0;

  const handleClick = () => {
    if (role) {
      navigate(`/${role}/notifications`);
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleClick}
      className="relative h-9 w-9 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      aria-label="View notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 h-4 min-w-4 px-0.5 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg animate-pulse leading-none">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
}
