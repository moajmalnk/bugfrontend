import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { useTheme } from "@/context/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, Bug } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FirebaseListener from "../messaging/FirebaseListener";
import AnnouncementPopup from "../ui/AnnouncementPopup";
import { Sidebar } from "./Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { currentUser, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(
    () => localStorage.getItem("privacyMode") === "true"
  );

  useEffect(() => {
    if (!isLoading && !currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, isLoading, navigate]);

  useEffect(() => {
    const handleStorage = () => {
      setPrivacyMode(localStorage.getItem("privacyMode") === "true");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 mx-auto"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-primary absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Loading BugRicer</p>
            <p className="text-sm text-muted-foreground">Please wait while we prepare your workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <NotificationProvider>
      <div className="flex h-screen min-w-0 bg-background">
        {/* Sidebar for desktop */}
        <div className="hidden lg:block w-72 min-w-0">
          <Sidebar />
        </div>

        {/* Sidebar drawer for mobile/tablet */}
        <div
          className={`fixed inset-0 z-50 transition-all duration-300 ease-in-out lg:hidden ${
            sidebarOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-label="Sidebar overlay"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Sidebar */}
          <div
            className={`absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar with menu button on mobile/tablet */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
                className="h-9 w-9 hover:bg-accent/80"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bug className="h-5 w-5 text-primary" />
                </div>
                <span className="font-bold text-lg text-foreground">BugRicer</span>
              </div>
            </div>
            
            {/* Close button when sidebar is open */}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="h-9 w-9 hover:bg-accent/80"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          
          {/* Main content area */}
          <main className="flex-1 overflow-y-auto min-w-0 bg-background">
            <div className="h-full p-4 md:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
              <footer className="max-w-7xl mx-auto mt-8 mb-8 border-t pt-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 text-xs text-muted-foreground">
                  <p className="order-2 sm:order-none justify-self-center sm:justify-self-start text-center sm:text-left">© {new Date().getFullYear()} BugRicer. All rights reserved.</p>
                  <div className="order-3 sm:order-none justify-self-center flex items-center gap-3">
                    <a href="mailto:support@bugricer.com" className="hover:text-foreground transition-colors" aria-label="Contact support">support@bugricer.com</a>
                    <span className="hidden sm:inline text-border">|</span>
                    <a href="https://bugricer.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors" aria-label="Visit website">bugricer.com</a>
                  </div>
                  <p className="order-1 sm:order-none justify-self-center sm:justify-self-end text-center sm:text-right text-[11px] text-muted-foreground/80">Built with care for testers & developers</p>
                </div>
              </footer>
            </div>
          </main>
        </div>
      </div>
      <AnnouncementPopup />
      <FirebaseListener />
    </NotificationProvider>
  );
};
