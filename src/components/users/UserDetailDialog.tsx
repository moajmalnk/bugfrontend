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
  Code2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { EditUserDialog } from "./EditUserDialog";

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
        className="w-full max-w-[95vw] sm:max-w-lg p-0 flex flex-col"
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

        {/* User Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6 px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex-shrink-0">
            <img
              src={user.avatar}
              alt={`${user.name}'s avatar`}
              className="h-24 w-24 rounded-full border-4 border-primary/20 shadow-md"
            />
          </div>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h3 className="text-2xl font-bold truncate">{user.name}</h3>
            <div className="flex items-center justify-center sm:justify-start mt-1 text-muted-foreground gap-2">
              {getRoleIcon(user.role)}
              <span className="capitalize font-medium text-lg">
                {user.role}
              </span>
            </div>
            <div className="flex flex-col items-center sm:items-start gap-1 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                {user.username}
              </span>
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {user.phone}
                </span>
              )}
              {user.created_at && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined {format(new Date(user.created_at), "PPP")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <EditUserDialog
              user={user}
              onUserUpdate={onUserUpdate}
              loggedInUserRole={loggedInUserRole}
              trigger={
                <Button variant="outline" className="w-full">
                  Edit User
                </Button>
              }
            />
            <ChangePasswordDialog
              user={user}
              onPasswordChange={handlePasswordChange}
              trigger={
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    title="Change Password"
                  >
                    Change Password
                  </Button>
                </DialogTrigger>
              }
            />
            {loggedInUserRole === "admin" && currentUser?.id !== user.id && (
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGenerateDashboardLink}
                disabled={isGeneratingLink}
                title="Open user's dashboard in a new tab"
              >
                {isGeneratingLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                User Dashboard
              </Button>
            )}
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
                    className="w-full"
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

          {/* Stats */}
          <div>
            <h4 className="text-lg font-semibold mb-3">User Statistics</h4>
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
