import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Bell,
  Bug,
  CheckCircle,
  FolderKanban,
  Menu,
  MessageCircle,
  Video,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface SidebarProps {
  className?: string;
  closeSidebar?: () => void;
}

const defaultAvatar =
  "https://codoacademy.com/uploads/system/e7c3fb5390c74909db1bb3559b24007a.png";

export const Sidebar = ({ className, closeSidebar }: SidebarProps) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const role = currentUser?.role;

  const isActive = (path: string) => {
    if (!role) return false;
    const fullPath = `/${role}${path}`;
    // Highlight "Projects" for both /projects and /projects/ID
    if (path === "/projects") {
      return location.pathname.startsWith(fullPath);
    }
    // For other links, do a more specific match to avoid highlighting multiple items
    return (
      location.pathname.startsWith(fullPath) &&
      (location.pathname === fullPath ||
        location.pathname.charAt(fullPath.length) === "/")
    );
  };

  const NavLink = ({
    to,
    icon,
    label,
    badge,
  }: {
    to: string;
    icon: JSX.Element;
    label: string;
    badge?: string | number;
  }) => {
    const destination = role ? `/${role}${to}` : to;
    const active = isActive(to);
    return (
      <Link to={destination} onClick={closeSidebar} className="block">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-11 px-3 py-2.5 transition-all duration-200 text-sm font-medium group relative",
            "hover:bg-accent/80 hover:text-accent-foreground",
            "focus:bg-accent focus:text-accent-foreground focus:ring-2 focus:ring-accent/20",
            active && "bg-accent text-accent-foreground shadow-sm"
          )}
        >
          <div className="flex items-center w-full min-w-0">
            <div className={cn(
              "flex-shrink-0 transition-colors duration-200",
              active ? "text-accent-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
            )}>
              {icon}
            </div>
            <span className="ml-3 truncate flex-1 text-left">{label}</span>
            {badge && (
              <span className={cn(
                "ml-auto px-2 py-0.5 text-xs font-medium rounded-full",
                active 
                  ? "bg-accent-foreground/20 text-accent-foreground" 
                  : "bg-muted text-muted-foreground group-hover:bg-accent-foreground/20 group-hover:text-accent-foreground"
              )}>
                {badge}
              </span>
            )}
          </div>
        </Button>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "h-full flex flex-col bg-card/95 backdrop-blur-sm border-r border-border/50 min-w-0",
        "shadow-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Bug className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground truncate">BugRicer</h2>
            <p className="text-xs text-muted-foreground">Bug Tracking System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <NavLink
              to="/projects"
              icon={<FolderKanban className="h-5 w-5" />}
              label="Projects"
            />
            <NavLink
              to="/bugs"
              icon={<Bug className="h-5 w-5" />}
              label="Bugs"
            />
            <NavLink
              to="/fixes"
              icon={<CheckCircle className="h-5 w-5" />}
              label="Fixes"
            />
            <NavLink
              to="/updates"
              icon={<Bell className="h-5 w-5" />}
              label="Updates"
            />
          </div>

          {/* Admin Section */}
          {currentUser?.role === "admin" && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                <div className="px-3 py-1">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administration
                  </h3>
                </div>
                <NavLink
                  to="/users"
                  icon={<Users className="h-5 w-5" />}
                  label="Users"
                />
                <NavLink
                  to="/whatsapp-messages"
                  icon={<MessageCircle className="h-5 w-5" />}
                  label="WhatsApp"
                />
                <NavLink
                  to="/meet"
                  icon={<Video className="h-5 w-5" />}
                  label="BugMeet"
                />
                <NavLink
                  to="/settings"
                  icon={<Settings className="h-5 w-5" />}
                  label="Settings"
                />
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* User Profile */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-muted/30">
        <Link
          to={role ? `/${role}/profile` : "/profile"}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group"
          onClick={closeSidebar}
        >
          <div className="relative flex-shrink-0">
            <img
              src={currentUser?.avatar || defaultAvatar}
              alt="User avatar"
              className="h-10 w-10 rounded-xl object-cover ring-2 ring-border/50 group-hover:ring-accent/50 transition-all duration-200"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentUser?.username || "BugRicer"}
            </p>
            <p className="text-xs text-muted-foreground capitalize truncate">
              {currentUser?.role || "BugRicer"}
            </p>
          </div>
        </Link>
      </div>
    </nav>
  );
};

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
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
          <div className="h-full">
            {children}
          </div>
          <div className="px-4 md:px-6 lg:px-8">
            <footer className="max-w-7xl mx-auto mt-4 mb-6 border-t pt-4 pb-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <p className="order-2 sm:order-1">© {new Date().getFullYear()} BugRicer. All rights reserved.</p>
                <div className="order-3 sm:order-2 flex items-center gap-3">
                  <a href="mailto:support@bugricer.com" className="hover:text-foreground transition-colors" aria-label="Contact support">
                    support@bugricer.com
                  </a>
                  <span className="hidden sm:inline text-border">|</span>
                  <a href="https://bugricer.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors" aria-label="Visit website">
                    bugricer.com
                  </a>
                </div>
                <p className="order-1 sm:order-3 text-[11px] text-muted-foreground/80">
                  Built with care for testers & developers
                </p>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
