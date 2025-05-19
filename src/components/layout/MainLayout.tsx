import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Sidebar } from './Sidebar';
import { UserNav } from './UserNav';
import { BellIcon, MenuIcon, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';

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
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Mobile sidebar */}
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[300px]">
              <Sidebar closeSidebar={() => setSidebarOpen(false)} />
            </SheetContent>
          </Sheet>
        ) : (
          /* Desktop sidebar */
          <div className="hidden md:flex md:w-64 md:flex-col">
            <Sidebar />
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="border-b bg-card">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                {isMobile && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarOpen(true)} 
                    className="block md:hidden"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </Button>
                )}
                <h1 className="text-lg font-semibold">BugRacer</h1>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <NotificationPopover />
                <UserNav />
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </NotificationProvider>
  );
};
