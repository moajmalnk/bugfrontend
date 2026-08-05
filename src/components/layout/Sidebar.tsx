import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { cn, getEffectiveRole, showBugMessageInMainNav } from "@/lib/utils";
import { VerifiedBlueTick, isFullFledgedUser } from "@/components/ui/VerifiedBlueTick";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Bell,
  Building2,
  Bug,
  CheckCircle,
  FolderKanban,
  MessageCircle,
  MessageSquare,
  Video,
  Settings,
  Users,
  FileText,
  FileSpreadsheet,
  ListTodo,
  BarChart3,
  Activity,
  Mic,
  Calendar,
  Database,
  Timer,
  Repeat,
  Search,
  LifeBuoy,
  Signal,
  PlaneTakeoff,
  ClipboardCheck,
  LayoutDashboard,
  Clapperboard,
  CalendarClock,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { useGlobalSearchModal } from "@/context/GlobalSearchContext";

interface SidebarProps {
  className?: string;
  closeSidebar?: () => void;
}

const defaultAvatar = "/logo.png";

export const Sidebar = ({ className, closeSidebar }: SidebarProps) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const { hasPermission } = usePermissions(null);
  const { setOpen: setSearchOpen } = useGlobalSearchModal();
  const role = getEffectiveRole(currentUser || {});
  // Why: Bridge legacy ENUM admin until all new permission keys are seeded/granted.
  const can = (key: string) => role === "admin" || hasPermission(key);

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
    
    // Production-safe navigation handler
    const handleClick = (e: React.MouseEvent) => {
      closeSidebar?.();
      
      // In production, use window.location for reliable navigation from BugDetails
      if (import.meta.env.PROD && window.location.pathname.includes('/bugs/')) {
        e.preventDefault();
        window.location.href = destination;
        return;
      }
      
      // In development, let React Router handle it
    };
    
    return (
      <Link to={destination} onClick={handleClick} className="block">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-10 min-h-10 px-3 py-0 transition-all duration-200 text-sm font-medium group relative",
            "inline-flex items-center",
            "hover:bg-accent/80 hover:text-accent-foreground",
            "focus:bg-accent focus:text-accent-foreground focus:ring-2 focus:ring-accent/20",
            active && "bg-accent text-accent-foreground shadow-sm"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:shrink-0 transition-colors duration-200",
              active
                ? "text-accent-foreground"
                : "text-muted-foreground group-hover:text-accent-foreground"
            )}
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1 truncate text-left leading-none pl-3">{label}</span>
          {badge && (
            <span
              className={cn(
                "ml-1 shrink-0 px-2 py-0.5 text-xs font-medium leading-none rounded-full",
                active
                  ? "bg-accent-foreground/20 text-accent-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-accent-foreground/20 group-hover:text-accent-foreground"
              )}
            >
              {badge}
            </span>
          )}
        </Button>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "h-full flex flex-col bg-card/95 backdrop-blur-sm border-r border-border/50 min-w-0",
        "shadow-sm relative z-20",
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Bug className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground truncate">BugRicer</h2>
            <p className="text-xs text-muted-foreground">Bug Tracking System</p>
            </div>
          </div>
          {/* Notification Icon - Desktop sidebar only */}
          <div className="flex-shrink-0">
            <NotificationPopover />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6">
          {/* Main Navigation — permission-driven (custom roles use RBAC, not ENUM) */}
          <div className="space-y-1">
            {can("DASHBOARD_VIEW") && (
              <NavLink
                to="/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                label="Dashboard"
              />
            )}
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
            {(can("DOCS_VIEW") || can("DOCS_CREATE")) && (
              <NavLink
                to="/bugdocs"
                icon={<FileText className="h-5 w-5" />}
                label="BugDocs"
              />
            )}
            {(can("SHEETS_VIEW") || can("SHEETS_MANAGE") || can("DOCS_VIEW")) && (
              <NavLink
                to="/bugsheets"
                icon={<FileSpreadsheet className="h-5 w-5" />}
                label="BugSheets"
              />
            )}
            {(can("MEETINGS_JOIN") || can("MEETINGS_CREATE") || can("MEETINGS_MANAGE") || role === "developer") && (
              <NavLink
                to="/meet?tab=shared-meets"
                icon={<Video className="h-5 w-5" />}
                label="BugMeet"
              />
            )}

            {(can("TASKS_VIEW_ALL") || can("TASKS_VIEW_ASSIGNED") || can("TASKS_CREATE")) && (
              <NavLink
                to="/my-tasks?tab=shared-tasks"
                icon={<ListTodo className="h-5 w-5" />}
                label="BugToDo"
              />
            )}

            {(can("DAILY_UPDATE_CREATE") || can("DAILY_UPDATE_VIEW") || can("UPDATES_VIEW") || can("UPDATES_CREATE")) && (
              <NavLink
                to="/daily-update"
                icon={<Calendar className="h-5 w-5" />}
                label="BugUpdate"
              />
            )}

            {(can("LEAVE_VIEW") || role === "developer" || role === "user") && (
              <NavLink
                to="/leave"
                icon={<PlaneTakeoff className="h-5 w-5" />}
                label="My Leave"
              />
            )}

            {(showBugMessageInMainNav(role) || can("MESSAGING_VIEW")) && (
              <NavLink
                to="/messages"
                icon={<MessageSquare className="h-5 w-5" />}
                label="BugMessage"
              />
            )}

            {can("COMMON_BUGS_VIEW") && (
              <NavLink
                to="/common-bugs"
                icon={<Repeat className="h-5 w-5" />}
                label="Common Bugs"
              />
            )}

            {can("CODO_VIEW") && (
              <NavLink
                to="/common-codo"
                icon={<ClipboardCheck className="h-5 w-5" />}
                label="CODO Rules"
              />
            )}

            <NavLink
              to="/help"
              icon={<LifeBuoy className="h-5 w-5" />}
              label="Help & Support"
            />
            
          </div>

          {/* Administration Section — any admin-level permission */}
          {(() => {
            const hasUsersView = can("USERS_VIEW");
            const hasClientsView = can("CLIENTS_VIEW");
            const hasOvertimeManage = can("OVERTIME_MANAGE");
            const hasLeaveManage = can("LEAVE_MANAGE");
            const hasAttendanceManage = can("ATTENDANCE_MANAGE");
            const hasMessagingView = can("MESSAGING_VIEW");
            const hasMessagingCreate = can("MESSAGING_CREATE");
            // Why: WhatsApp bulk tools are admin-only — hide from developer portal.
            const showWhatsApp = hasMessagingCreate && role === "admin";
            const hasFeedbackView = can("FEEDBACK_VIEW");
            const hasActivityView = can("ACTIVITY_VIEW");
            const hasSettingsEdit = can("SETTINGS_EDIT");
            const hasBackupManage = can("BACKUP_MANAGE") || hasSettingsEdit;
            const hasPushCoverage = can("PUSH_COVERAGE_VIEW");
            const hasShortsManage = can("SHORTS_MANAGE");
            const messagesInMain =
              showBugMessageInMainNav(role) || can("MESSAGING_VIEW");

            const hasAnyAdminLinks =
              hasUsersView ||
              hasClientsView ||
              hasOvertimeManage ||
              hasLeaveManage ||
              hasAttendanceManage ||
              (hasMessagingView && !messagesInMain) ||
              showWhatsApp ||
              hasFeedbackView ||
              hasActivityView ||
              hasSettingsEdit ||
              hasBackupManage ||
              hasPushCoverage ||
              hasShortsManage;

            if (!hasAnyAdminLinks) {
              return null;
            }

            return (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2 min-h-10">
                    <span className="h-5 w-5 shrink-0" aria-hidden />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-none">
                      Administration
                    </h3>
                  </div>

                  {hasUsersView && (
                    <NavLink
                      to="/users"
                      icon={<Users className="h-5 w-5" />}
                      label="Users"
                    />
                  )}

                  {hasClientsView && (
                    <NavLink
                      to="/clients"
                      icon={<Building2 className="h-5 w-5" />}
                      label="Clients"
                    />
                  )}

                  {hasOvertimeManage && (
                    <NavLink
                      to="/overtime-requests"
                      icon={<Timer className="h-5 w-5" />}
                      label="OT requests"
                    />
                  )}

                  {hasLeaveManage && (
                    <NavLink
                      to="/leave-requests"
                      icon={<PlaneTakeoff className="h-5 w-5" />}
                      label="Leave requests"
                    />
                  )}

                  {hasAttendanceManage && (
                    <NavLink
                      to="/attendance-exceptions"
                      icon={<CalendarClock className="h-5 w-5" />}
                      label="Attendance exceptions"
                    />
                  )}

                  {hasMessagingView && !messagesInMain && (
                    <NavLink
                      to="/messages"
                      icon={<MessageSquare className="h-5 w-5" />}
                      label="BugMessage"
                    />
                  )}

                  {showWhatsApp && (
                    <NavLink
                      to="/whatsapp-messages"
                      icon={<MessageCircle className="h-5 w-5" />}
                      label="WhatsApp"
                    />
                  )}

                  {hasFeedbackView && (
                    <NavLink
                      to="/feedback-stats"
                      icon={<BarChart3 className="h-5 w-5" />}
                      label="Feedbacks"
                    />
                  )}

                  {hasActivityView && (
                    <NavLink
                      to="/activity"
                      icon={<Activity className="h-5 w-5" />}
                      label="Activities"
                    />
                  )}

                  {hasPushCoverage && (
                    <NavLink
                      to="/push-coverage"
                      icon={<Signal className="h-5 w-5" />}
                      label="Push Coverage"
                    />
                  )}

                  {hasShortsManage && (
                    <NavLink
                      to="/shorts"
                      icon={<Clapperboard className="h-5 w-5" />}
                      label="Shorts"
                    />
                  )}

                  {hasSettingsEdit && (
                    <NavLink
                      to="/settings"
                      icon={<Settings className="h-5 w-5" />}
                      label="Settings"
                    />
                  )}

                  {hasBackupManage && (
                    <NavLink
                      to="/bugbackup"
                      icon={<Database className="h-5 w-5" />}
                      label="BugBackup"
                    />
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </ScrollArea>

      {/* User Profile + Search */}
      <div className="flex-shrink-0 p-3 border-t border-border/50 bg-muted/30 relative z-10">
        <div className="flex items-center gap-1">
          <Link
            to={role ? `/${role}/profile` : "/profile"}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all duration-200 group relative z-10 pointer-events-auto flex-1 min-w-0"
            onClick={() => {
              closeSidebar?.();
            }}
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              <img
                src={currentUser?.avatar || defaultAvatar}
                alt="User avatar"
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-border/50 group-hover:ring-accent/50 transition-all duration-200"
              />
              {isFullFledgedUser(currentUser) ? (
                <VerifiedBlueTick
                  size="sm"
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ring-2 ring-background shadow-sm"
                />
              ) : (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 py-0.5">
              <p className="text-sm font-semibold text-foreground truncate leading-tight">
                {currentUser?.username || "BugRicer"}
              </p>
              <p className="text-xs text-muted-foreground capitalize truncate leading-tight">
                {role || "BugRicer"}
              </p>
            </div>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent/50"
            onClick={() => {
              setSearchOpen(true);
              closeSidebar?.();
            }}
            aria-label="Search"
            title="Search (⌘K)"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};

