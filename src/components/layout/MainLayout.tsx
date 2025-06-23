import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Sidebar } from './Sidebar';
import { UserNav } from './UserNav';
import { BellIcon, MenuIcon, Sun, Moon, Eye, EyeOff, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import AnnouncementPopup from '../ui/AnnouncementPopup';
import FirebaseListener from '../messaging/FirebaseListener';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { currentUser, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true');

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    const handleStorage = () => {
      setPrivacyMode(localStorage.getItem('privacyMode') === 'true');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen">
        {/* Sidebar for desktop */}
        <div className="hidden md:block w-64">
          <Sidebar />
        </div>

        {/* Sidebar drawer for mobile */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className={`absolute left-0 top-0 h-full w-64 bg-card shadow-lg transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            onClick={e => e.stopPropagation()}
          >
            <Sidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Top bar with menu button on mobile */}
          <div className="md:hidden flex items-center p-2 border-b bg-background">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <span className="ml-2 font-bold text-lg">BugRacer</span>
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">{children}</main>
        </div>
      </div>
      <AnnouncementPopup />
      <FirebaseListener />
    </NotificationProvider>
  );
};
