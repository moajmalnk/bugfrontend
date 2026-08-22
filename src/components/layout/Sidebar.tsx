import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
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
  ClipboardList,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { useGlobalSearchModal } from "@/context/GlobalSearchContext";
import { useAdminNavCounts } from "@/hooks/useAdminNavCounts";
import {
  getArticleCountForRole,
  getHelpRoleFilterForUser,
} from "@/lib/help";

/** Why: Every sidebar row shows a count, matching Users/Clients. 99+ keeps long labels readable. */
function formatNavCount(count: number | undefined): string | number {
  const n = Number(count) || 0;
  return n > 99 ? "99+" : n;
}

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

  const wantsNavCounts = Boolean(currentUser);
  const navCounts = useAdminNavCounts(wantsNavCounts);
  const helpCount = getArticleCountForRole(getHelpRoleFilterForUser(role || "admin"));

  const NavLink = ({
    to,
    icon,
    label,
    badge,
    badgeTone = "default",
    badgeTitle,
  }: {
    to: string;
    icon: JSX.Element;
    label: string;
    badge?: string | number;
    badgeTone?: "default" | "alert";
    badgeTitle?: string;
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
      <Link
        to={destination}
        onClick={handleClick}
        className="block"
        aria-label={badge != null && badge !== "" ? `${label}, ${badge}` : label}
      >
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
          {badge != null && badge !== "" && (
            <span
              title={badgeTitle}
              className={cn(
                "ml-1 shrink-0 min-w-5 h-5 px-1.5 text-[11px] font-semibold leading-none rounded-full tabular-nums inline-flex items-center justify-center",
                badgeTone === "alert"
                  ? active
                    ? "bg-amber-500/25 text-amber-950 dark:text-amber-100"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-200 group-hover:bg-amber-500/25"
                  : active
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
            {(can("DASHBOARD_VIEW") ||
              role === "developer" ||
              role === "tester" ||
              role === "user") && (
              <NavLink
                to="/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                label="Dashboard"
                badge={formatNavCount(navCounts.dashboard)}
                badgeTitle={`${navCounts.dashboard} open bug${navCounts.dashboard === 1 ? "" : "s"}`}
              />
            )}
            <NavLink
              to="/projects"
              icon={<FolderKanban className="h-5 w-5" />}
              label="Projects"
              badge={formatNavCount(navCounts.projects)}
              badgeTitle={
                role === "admin"
                  ? `${navCounts.projects} project${navCounts.projects === 1 ? "" : "s"}`
                  : `${navCounts.projects} assigned project${navCounts.projects === 1 ? "" : "s"}`
              }
            />
            <NavLink
              to="/bugs"
              icon={<Bug className="h-5 w-5" />}
              label="Bugs"
              badge={formatNavCount(navCounts.bugs)}
              badgeTitle={`${navCounts.bugs} open bug${navCounts.bugs === 1 ? "" : "s"}`}
            />
            <NavLink
              to="/fixes"
              icon={<CheckCircle className="h-5 w-5" />}
              label="Fixes"
              badge={formatNavCount(navCounts.fixes)}
              badgeTitle={`${navCounts.fixes} fix${navCounts.fixes === 1 ? "" : "es"}`}
            />
            <NavLink
              to="/updates"
              icon={<Bell className="h-5 w-5" />}
              label="Updates"
              badge={formatNavCount(navCounts.updates)}
              badgeTitle={`${navCounts.updates} update${navCounts.updates === 1 ? "" : "s"}`}
            />
            {/* Why: Testers focus on bugs/fixes — hide docs/sheets/meet/daily-update/leave from their nav. */}
            {role !== "tester" && (can("DOCS_VIEW") || can("DOCS_CREATE")) && (
              <NavLink
                to="/bugdocs"
                icon={<FileText className="h-5 w-5" />}
                label="BugDocs"
                badge={formatNavCount(navCounts.docs)}
                badgeTitle={
                  role === "admin"
                    ? `${navCounts.docs} document${navCounts.docs === 1 ? "" : "s"}`
                    : `${navCounts.docs} shared document${navCounts.docs === 1 ? "" : "s"}`
                }
              />
            )}
            {role !== "tester" &&
              (can("SHEETS_VIEW") || can("SHEETS_MANAGE") || can("DOCS_VIEW")) && (
              <NavLink
                to="/bugsheets"
                icon={<FileSpreadsheet className="h-5 w-5" />}
                label="BugSheets"
                badge={formatNavCount(navCounts.sheets)}
                badgeTitle={
                  role === "admin"
                    ? `${navCounts.sheets} sheet${navCounts.sheets === 1 ? "" : "s"}`
                    : `${navCounts.sheets} shared sheet${navCounts.sheets === 1 ? "" : "s"}`
                }
              />
            )}
            {role !== "tester" &&
              (can("MEETINGS_JOIN") ||
                can("MEETINGS_CREATE") ||
                can("MEETINGS_MANAGE") ||
                role === "developer") && (
              <NavLink
                to="/meet?tab=shared-meets"
                icon={<Video className="h-5 w-5" />}
                label="BugMeet"
                badge={formatNavCount(navCounts.meetings)}
                badgeTitle={`${navCounts.meetings} meeting${navCounts.meetings === 1 ? "" : "s"}`}
              />
            )}

            {(can("TASKS_VIEW_ALL") || can("TASKS_VIEW_ASSIGNED") || can("TASKS_CREATE")) && (
              <NavLink
                to="/my-tasks?tab=shared-tasks"
                icon={<ListTodo className="h-5 w-5" />}
                label="BugToDo"
                badge={formatNavCount(navCounts.tasks)}
                badgeTitle={
                  role === "admin"
                    ? `${navCounts.tasks} task${navCounts.tasks === 1 ? "" : "s"}`
                    : `${navCounts.tasks} shared task${navCounts.tasks === 1 ? "" : "s"}`
                }
              />
            )}

            {role !== "tester" &&
              (can("DAILY_UPDATE_CREATE") ||
                can("DAILY_UPDATE_VIEW") ||
                can("UPDATES_VIEW") ||
                can("UPDATES_CREATE")) && (
              <NavLink
                to="/daily-update"
                icon={<Calendar className="h-5 w-5" />}
                label="BugUpdate"
                badge={formatNavCount(navCounts.bugupdate)}
                badgeTitle={`${navCounts.bugupdate} work update${navCounts.bugupdate === 1 ? "" : "s"}`}
              />
            )}

            {role !== "tester" &&
              (can("LEAVE_VIEW") || role === "developer" || role === "user") && (
              <NavLink
                to="/leave"
                icon={<PlaneTakeoff className="h-5 w-5" />}
                label="My Leave"
                badge={formatNavCount(navCounts.myleave)}
                badgeTitle={`${navCounts.myleave} leave request${navCounts.myleave === 1 ? "" : "s"}`}
              />
            )}

            {(showBugMessageInMainNav(role) || can("MESSAGING_VIEW")) && (
              <NavLink
                to="/messages"
                icon={<MessageSquare className="h-5 w-5" />}
                label="BugMessage"
                badge={formatNavCount(navCounts.messages)}
                badgeTitle={`${navCounts.messages} chat${navCounts.messages === 1 ? "" : "s"}`}
              />
            )}

            {can("COMMON_BUGS_VIEW") && (
              <NavLink
                to="/common-bugs"
                icon={<Repeat className="h-5 w-5" />}
                label="Common Bugs"
                badge={formatNavCount(navCounts.commonBugs)}
                badgeTitle={`${navCounts.commonBugs} common bug${navCounts.commonBugs === 1 ? "" : "s"}`}
              />
            )}

            {can("CODO_VIEW") && (
              <NavLink
                to="/common-codo"
                icon={<ClipboardCheck className="h-5 w-5" />}
                label="CODO Rules"
                badge={formatNavCount(navCounts.codo)}
                badgeTitle={`${navCounts.codo} rule${navCounts.codo === 1 ? "" : "s"}`}
              />
            )}

            <NavLink
              to="/help"
              icon={<LifeBuoy className="h-5 w-5" />}
              label="Help & Support"
              badge={formatNavCount(helpCount)}
              badgeTitle={`${helpCount} article${helpCount === 1 ? "" : "s"}`}
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
            const hasPerformanceReviews = can("PERFORMANCE_REVIEWS_MANAGE");
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
              hasPerformanceReviews ||
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
                      badge={formatNavCount(navCounts.users)}
                      badgeTitle={`${navCounts.users} user${navCounts.users === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasClientsView && (
                    <NavLink
                      to="/clients"
                      icon={<Building2 className="h-5 w-5" />}
                      label="Clients"
                      badge={formatNavCount(navCounts.clients)}
                      badgeTitle={`${navCounts.clients} client${navCounts.clients === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasOvertimeManage && (
                    <NavLink
                      to="/overtime-requests"
                      icon={<Timer className="h-5 w-5" />}
                      label="OT requests"
                      badge={formatNavCount(navCounts.ot)}
                      badgeTitle={`${navCounts.ot} pending OT request${navCounts.ot === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasLeaveManage && (
                    <NavLink
                      to="/leave-requests"
                      icon={<PlaneTakeoff className="h-5 w-5" />}
                      label="Leave requests"
                      badge={formatNavCount(navCounts.leave)}
                      badgeTitle={`${navCounts.leave} pending leave request${navCounts.leave === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasAttendanceManage && (
                    <NavLink
                      to="/attendance-exceptions"
                      icon={<CalendarClock className="h-5 w-5" />}
                      label="Attendance exceptions"
                      badge={formatNavCount(navCounts.attendance)}
                      badgeTitle={`${navCounts.attendance} pending WFH request${navCounts.attendance === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasMessagingView && !messagesInMain && (
                    <NavLink
                      to="/messages"
                      icon={<MessageSquare className="h-5 w-5" />}
                      label="BugMessage"
                      badge={formatNavCount(navCounts.messages)}
                      badgeTitle={`${navCounts.messages} chat${navCounts.messages === 1 ? "" : "s"}`}
                    />
                  )}

                  {showWhatsApp && (
                    <NavLink
                      to="/whatsapp-messages"
                      icon={<MessageCircle className="h-5 w-5" />}
                      label="WhatsApp"
                      badge={formatNavCount(navCounts.whatsapp)}
                      badgeTitle={`${navCounts.whatsapp} user${navCounts.whatsapp === 1 ? "" : "s"} with a phone number`}
                    />
                  )}

                  {hasFeedbackView && (
                    <NavLink
                      to="/feedback-stats"
                      icon={<BarChart3 className="h-5 w-5" />}
                      label="Feedbacks"
                      badge={formatNavCount(navCounts.feedbacks)}
                      badgeTitle={`${navCounts.feedbacks} feedback${navCounts.feedbacks === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasPerformanceReviews && (
                    <NavLink
                      to="/performance-reviews"
                      icon={<ClipboardList className="h-5 w-5" />}
                      label="Performance Reviews"
                      badge={formatNavCount(navCounts.reviews)}
                      badgeTitle={`${navCounts.reviews} review${navCounts.reviews === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasActivityView && (
                    <NavLink
                      to="/activity"
                      icon={<Activity className="h-5 w-5" />}
                      label="Activities"
                      badge={formatNavCount(navCounts.activities)}
                      badgeTitle={`${navCounts.activities} activit${navCounts.activities === 1 ? "y" : "ies"}`}
                    />
                  )}

                  {hasPushCoverage && (
                    <NavLink
                      to="/push-coverage"
                      icon={<Signal className="h-5 w-5" />}
                      label="Push Coverage"
                      badge={formatNavCount(navCounts.push)}
                      badgeTitle={`${navCounts.push} user${navCounts.push === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasShortsManage && (
                    <NavLink
                      to="/shorts"
                      icon={<Clapperboard className="h-5 w-5" />}
                      label="Shorts"
                      badge={formatNavCount(navCounts.shorts)}
                      badgeTitle={`${navCounts.shorts} short${navCounts.shorts === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasSettingsEdit && (
                    <NavLink
                      to="/settings"
                      icon={<Settings className="h-5 w-5" />}
                      label="Settings"
                      badge={formatNavCount(navCounts.settings)}
                      badgeTitle={`${navCounts.settings} setting${navCounts.settings === 1 ? "" : "s"}`}
                    />
                  )}

                  {hasBackupManage && (
                    <NavLink
                      to="/bugbackup"
                      icon={<Database className="h-5 w-5" />}
                      label="BugBackup"
                      badge={formatNavCount(navCounts.backup)}
                      badgeTitle={`${navCounts.backup} backup${navCounts.backup === 1 ? "" : "s"}`}
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
                src={
                  currentUser?.avatar
                    ? resolveAvatarUrl(
                        currentUser.avatar,
                        currentUser.name || currentUser.username || "User"
                      )
                    : defaultAvatar
                }
                alt="User avatar"
                className="h-10 w-10 rounded-xl object-cover ring-2 ring-border/50 group-hover:ring-accent/50 transition-all duration-200"
                onError={(e) => {
                  e.currentTarget.src = defaultAvatar;
                }}
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

