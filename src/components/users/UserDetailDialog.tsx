import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ENV } from "@/lib/env";
import { userService } from "@/services/userService";
import { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format, formatDistanceToNow } from "date-fns";
import {
  AtSign,
  Bug,
  Calendar,
  Clock,
  Code2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Shield,
  X,
  Key,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { EditUserDialog } from "./EditUserDialog";
import { UserWorkStats } from "./UserWorkStats";
import { ActiveHours } from "./ActiveHours";
import { usePermissions } from "@/hooks/usePermissions";

export interface DeleteUserDialogProps {
  user: User;
  onUserDelete: (userId: string) => Promise<void>;
  trigger?: React.ReactElement;
}

interface UserStats {
  total_projects: number;
  total_bugs: number;
  recent_activity: Array<{
    type: "bug" | "project";
    title: string;
    created_at: string;
  }>;
}

interface UserDetailDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loggedInUserRole: string;
}

async function handlePasswordChange(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found.");
    }

    await axios.post(
      `${ENV.API_URL}/users/change-password.php`,
      {
        userId,
        currentPassword,
        newPassword,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  } catch (error: any) {
    // console.error("Password change error:", error);
    throw error;
  }
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onUserUpdate,
  onUserDelete,
  onPasswordChange,
  loggedInUserRole,
}: UserDetailDialogProps & {
  onUserUpdate: (user: User) => void;
  onUserDelete: (userId: string, force?: boolean) => Promise<void>;
  onPasswordChange: (userId: string, newPassword: string) => Promise<void>;
}) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions(null);
  const [stats, setStats] = useState<UserStats>({
    total_projects: 0,
    total_bugs: 0,
    recent_activity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  useQuery({
    queryKey: ["userStats", user.id],
    queryFn: async () => {
      if (!open) return null;

      setIsLoading(true);
      try {
        const response = await fetch(
          `${ENV.API_URL}/users/stats.php?id=${user.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) {
          setStats({
            total_projects: 0,
            total_bugs: 0,
            recent_activity: [],
          });
          return null;
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
          return data.data;
        } else {
          setStats({
            total_projects: 0,
            total_bugs: 0,
            recent_activity: [],
          });
          return null;
        }
      } catch (error) {
        setStats({
          total_projects: 0,
          total_bugs: 0,
          recent_activity: [],
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    enabled: !!user.id,
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-5 w-5 text-blue-500" />;
      case "developer":
        return <Code2 className="h-5 w-5 text-green-500" />;
      case "tester":
        return <Bug className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  // Calculate user status based on last_active_at
  const getUserStatus = (): 'active' | 'idle' | 'offline' => {
    if (!user.last_active_at) return 'offline';
    
    const lastActive = new Date(user.last_active_at);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - lastActive.getTime()) / 1000);
    
    if (diffSeconds < 120) return 'active';
    if (diffSeconds < 900) return 'idle'; // 15 minutes
    return 'offline';
  };

  const userStatus = user.status || getUserStatus();

  const getStatusConfig = (status: 'active' | 'idle' | 'offline') => {
    switch (status) {
      case 'active':
        return {
          label: 'Active',
          color: 'bg-green-500',
          ring: 'ring-green-500/50',
          textColor: 'text-green-500',
          pulse: true,
        };
      case 'idle':
        return {
          label: 'Idle',
          color: 'bg-yellow-500',
          ring: 'ring-yellow-500/50',
          textColor: 'text-yellow-500',
          pulse: false,
        };
      case 'offline':
        return {
          label: 'Offline',
          color: 'bg-gray-500',
          ring: 'ring-gray-500/50',
          textColor: 'text-gray-500',
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusConfig(userStatus);

  const handleGenerateDashboardLink = async () => {
    if (loggedInUserRole !== "admin") {
      toast({
        title: "Access Denied",
        description: "Only administrators can generate dashboard links.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLink(true);
    try {
      const linkData = await userService.generateUserDashboardLink(user.id);

      // Open the dashboard link in a new tab
      window.open(linkData.url, "_blank", "noopener,noreferrer");

      toast({
        title: "Dashboard Link Generated",
        description: `Link will expire in 7 days.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate dashboard link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        <DialogHeader className="bg-muted/30 px-6 py-4 border-b flex-shrink-0 text-left">
          <DialogTitle className="text-xl font-bold">User Details</DialogTitle>
          <DialogDescription>
            Detailed information about{" "}
            <span className="font-semibold text-foreground">{user.name}</span>
          </DialogDescription>
        </DialogHeader>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-4"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>

        {/* User Header - Enhanced Professional Design (Mobile Optimized) */}
        <div className="relative bg-gradient-to-br from-muted/50 via-muted/30 to-background px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 flex-shrink-0 border-b">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar with Status Indicator */}
            <div className="relative flex-shrink-0">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={`${user.name}'s avatar`}
                  className="h-20 w-20 sm:h-28 sm:w-28 rounded-full border-2 sm:border-4 border-background shadow-xl ring-2 sm:ring-4 ring-primary/10"
                />
                {/* Status Badge */}
                <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-5 h-5 sm:w-7 sm:h-7 ${statusConfig.color} rounded-full border-2 sm:border-4 border-background shadow-lg flex items-center justify-center ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                  <div className={`w-2 h-2 sm:w-3 sm:h-3 ${statusConfig.color} rounded-full ${statusConfig.ring} ring-1 sm:ring-2 ${statusConfig.pulse ? 'animate-ping' : ''}`}></div>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2 sm:space-y-3 w-full">
              {/* Name and Role Row */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h3 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {user.name}
                  </h3>
                  {/* Status Badge - Hidden on mobile, visible on desktop */}
                  <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color} text-white shadow-md ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                    <span className={`w-2 h-2 rounded-full ${statusConfig.pulse ? 'animate-pulse' : ''}`}></span>
                    {statusConfig.label}
                  </div>
                </div>
                
                {/* Role Badge */}
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-muted/60 rounded-lg border border-border/50">
                    {getRoleIcon(user.role)}
                    <span className="capitalize font-semibold text-sm sm:text-base text-foreground">
                      {user.role}
                    </span>
                  </div>
                  {user.last_active_at && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Information Grid - Two Rows (Fully Responsive) */}
              <div className="flex flex-col gap-2 sm:gap-3 pt-1.5 sm:pt-2">
                {/* First Row: Username and Phone */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/40 rounded-lg border border-border/30 hover:bg-muted/60 transition-colors min-w-0">
                    <div className="p-1 sm:p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                      <AtSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[9px] sm:text-xs text-muted-foreground mb-0.5 truncate">Username</p>
                      <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{user.username}</p>
                    </div>
                  </div>

                  {user.phone ? (
                    <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/40 rounded-lg border border-border/30 hover:bg-muted/60 transition-colors min-w-0">
                      <div className="p-1 sm:p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[9px] sm:text-xs text-muted-foreground mb-0.5 truncate">Phone</p>
                        <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{user.phone}</p>
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>

                {/* Second Row: Email and Join Date */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/40 rounded-lg border border-border/30 hover:bg-muted/60 transition-colors min-w-0">
                    <div className="p-1 sm:p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                      <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[9px] sm:text-xs text-muted-foreground mb-0.5 truncate">Email</p>
                      <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.created_at ? (
                    <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/40 rounded-lg border border-border/30 hover:bg-muted/60 transition-colors min-w-0">
                      <div className="p-1 sm:p-1.5 bg-primary/10 rounded-md flex-shrink-0">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-[9px] sm:text-xs text-muted-foreground mb-0.5 truncate">Joined</p>
                        <p className="text-[10px] sm:text-sm font-medium text-foreground truncate">{format(new Date(user.created_at), "PPP")}</p>
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Action Buttons - Single Professional Row */}
          <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Edit User */}
              <EditUserDialog
                user={user}
                onUserUpdate={onUserUpdate}
                loggedInUserRole={loggedInUserRole}
                trigger={
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center justify-center gap-2 h-10 transition-all hover:scale-[1.02] min-w-0"
                  >
                    Edit User
                  </Button>
                }
              />
              
              {/* Change Password */}
              <ChangePasswordDialog
                user={user}
                onPasswordChange={handlePasswordChange}
                trigger={
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2 h-10 transition-all hover:scale-[1.02] min-w-0"
                      title="Change Password"
                    >
                      Password
                    </Button>
                  </DialogTrigger>
                }
              />
              
              {/* Manage Permissions */}
              {hasPermission('USERS_MANAGE_PERMISSIONS') && (
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2 h-10 transition-all hover:scale-[1.02] min-w-0"
                  onClick={() => {
                    onOpenChange(false);
                    navigate(`/${loggedInUserRole}/users/${user.id}/permissions`);
                  }}
                >
                  <Key className="h-4 w-4" />
                  Permissions
                </Button>
              )}
              
              {/* Dashboard (Admin only) */}
              {loggedInUserRole === "admin" && currentUser?.id !== user.id && (
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2 h-10 transition-all hover:scale-[1.02] min-w-0"
                  onClick={handleGenerateDashboardLink}
                  disabled={isGeneratingLink}
                  title="Open user's dashboard in a new tab"
                >
                  {isGeneratingLink ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Dashboard
                </Button>
              )}
              
              {/* Delete User (Admin only) */}
              {loggedInUserRole === "admin" && currentUser?.id !== user.id && (
                <DeleteUserDialog
                  user={user}
                  onUserDelete={async (userId, force) => {
                    await onUserDelete(userId, force);
                    onOpenChange(false);
                  }}
                  trigger={
                    <Button
                      variant="destructive"
                      className="flex-1 flex items-center justify-center gap-2 h-10 transition-all hover:scale-[1.02] min-w-0"
                      title={
                        user.role === "admin"
                          ? "Administrators cannot be deleted"
                          : "Delete User"
                      }
                      disabled={user.role === "admin"}
                    >
                      Delete User
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          {/* Work Statistics */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Work Statistics
            </h4>
            <UserWorkStats userId={user.id} showTrend={true} />
          </div>

          {/* Active Hours Tracking */}
          <div>
            <ActiveHours userId={user.id} userName={user.username} />
          </div>

          {/* Project & Bug Stats */}
          <div>
            <h4 className="text-lg font-semibold mb-3">Project & Bug Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Projects
                </p>
                <p className="text-3xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats.total_projects
                  )}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 flex flex-col items-center justify-center shadow-sm">
                <p className="text-sm text-muted-foreground mb-1">Total Bugs</p>
                <p className="text-3xl font-bold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats.total_bugs
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
              Recent Activity
              <span className="text-sm font-normal text-muted-foreground">
                (Coming Soon)
              </span>
            </h4>
            <div className="bg-muted/30 rounded-lg p-4 shadow-sm min-h-[80px] overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading...
                </div>
              ) : stats.recent_activity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      {activity.type === "bug" ? (
                        <Bug className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <Code2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground italic">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
