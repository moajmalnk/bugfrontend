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
  Settings,
  Users,
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

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({
    to,
    icon,
    label,
  }: {
    to: string;
    icon: JSX.Element;
    label: string;
  }) => (
    <Link to={to} onClick={closeSidebar}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start mb-1 rounded-lg px-3 py-2 transition-colors text-base sm:text-sm",
          isActive(to) && "bg-accent text-accent-foreground font-semibold"
        )}
      >
        {icon}
        <span className="ml-2 truncate">{label}</span>
      </Button>
    </Link>
  );

  return (
    <nav
      className={cn("h-full flex flex-col border-r bg-card min-w-0", className)}
    >
      <div className="p-4 pb-2">
        <div className="flex items-center mb-8 px-2">
          <Bug className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-bold truncate">BugRacer</h2>
        </div>
        <ScrollArea className="flex-1 min-w-0">
          <div className="space-y-4 px-1">
            <div>
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
            </div>
            <NavLink
                to="/updates"
                icon={<Bell className="h-5 w-5" />}
                label="Updates"
              />
            {currentUser?.role === "admin" && (
              <>
                <Separator />
                <div>
                  <h3 className="text-xs font-medium px-2 mb-2 text-muted-foreground">
                    ADMIN
                  </h3>
                  <NavLink
                    to="/users"
                    icon={<Users className="h-5 w-5" />}
                    label="Users"
                  />
                  {/* <NavLink 
                    to="/reports" 
                    icon={<FileBarChart className="h-5 w-5" />} 
                    label="Reports" 
                  /> */}
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
      </div>
      <div className="mt-auto p-4 border-t">
        <Link
          to="/profile"
          className="flex items-center hover:bg-accent rounded-lg p-2 transition-colors"
          onClick={closeSidebar}
        >
          <img
            src={currentUser?.avatar || defaultAvatar}
            alt="User avatar"
            className="h-8 w-8 rounded-full mr-2 object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-muted-foreground capitalize truncate">
              {currentUser?.role} {currentUser?.email && `(${currentUser.email})`}
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
    <div className="flex h-screen min-w-0">
      {/* Sidebar for desktop */}
      <div className="hidden md:block w-64 min-w-0">
        <Sidebar />
      </div>

      {/* Sidebar drawer for mobile */}
      <div
        className={`fixed inset-0 z-60 bg-black/40 transition-opacity duration-200 md:hidden ${
          sidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-label="Sidebar overlay"
      >
        <div
          className={`absolute left-0 top-0 h-full w-64 bg-card shadow-lg transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <Sidebar closeSidebar={() => setSidebarOpen(false)} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with menu button on mobile */}
        <div className="md:hidden flex items-center p-2 border-b bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <span className="ml-2 font-bold text-lg truncate">BugRacer</span>
        </div>
        <main className="flex-1 overflow-y-auto min-w-0">{children}</main>
      </div>
    </div>
  );
}
