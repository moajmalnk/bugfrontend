import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ENV } from "@/lib/env";
import { User } from "@/types";
import { format, formatDistanceToNow } from "date-fns";
import { AtSign, Bug, Calendar, Code2, Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { EditUserDialog } from "./EditUserDialog";

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
}

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onUserUpdate,
  onUserDelete,
  onPasswordChange,
}: UserDetailDialogProps & {
  onUserUpdate: (user: User) => void;
  onUserDelete: (userId: string) => Promise<void>;
  onPasswordChange: (userId: string, newPassword: string) => Promise<void>;
}) {
  const [stats, setStats] = useState<UserStats>({
    total_projects: 0,
    total_bugs: 0,
    recent_activity: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (!open) return;

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
          // Do not throw, just set default stats and return
          setStats({
            total_projects: 0,
            total_bugs: 0,
            recent_activity: [],
          });
          return;
        }

        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          // Do not throw, just set default stats
          setStats({
            total_projects: 0,
            total_bugs: 0,
            recent_activity: [],
          });
        }
      } catch (error) {
        // Do not toast, do not log, just set default stats
        setStats({
          total_projects: 0,
          total_bugs: 0,
          recent_activity: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserStats();
  }, [user.id, open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Detailed information about {user.name}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-6">
          {/* Update Message */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-medium mb-2">
              🚀 Profile Updates Coming Soon!
            </h4>
            <p className="text-sm text-muted-foreground">
              We're working on exciting new features to enhance your profile
              experience.
            </p>
          </div>

          {/* User Header */}
          <div className="flex items-start gap-4">
            <img
              src={user.avatar}
              alt={`${user.name}'s avatar`}
              className="h-16 w-16 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{user.name}</h3>
              <div className="flex items-center mt-1 text-muted-foreground">
                {getRoleIcon(user.role)}
                <span className="ml-1 capitalize">{user.role}</span>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AtSign className="h-4 w-4" />
              <span>{user.username}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{user.email}</span>
            </div>
            {user.created_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(user.created_at), "PPP")}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <EditUserDialog
              user={user}
              onUserUpdate={onUserUpdate}
              trigger={
                <Button variant="outline" className="flex-1">
                  Edit User
                </Button>
              }
            />
            <ChangePasswordDialog
              user={user}
              onPasswordChange={onPasswordChange}
            />
            <DeleteUserDialog user={user} onUserDelete={onUserDelete} />
          </div>

          {/* Stats and Recent Activity */}
          <div className="space-y-6">
            {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="bg-primary/10 rounded-lg p-3 space-y-1">
                <p className="text-sm text-muted-foreground">Total Projects</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats.total_projects
                  )}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 space-y-1">
                <p className="text-sm text-muted-foreground">Total Bugs</p>
                <p className="text-2xl font-semibold">
                  {isLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    stats.total_bugs
                  )}
                </p>
              </div>
            </div> */}

            {/* Recent Activity */}
            {!isLoading && stats.recent_activity.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  Recent Activity
                  <span className="text-xs text-muted-foreground">
                    (Coming Soon)
                  </span>
                </h4>
                <div className="space-y-2 opacity-75">
                  {stats.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      {activity.type === "bug" ? (
                        <Bug className="h-4 w-4 mt-0.5 text-yellow-500" />
                      ) : (
                        <Code2 className="h-4 w-4 mt-0.5 text-green-500" />
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
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
