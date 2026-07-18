import { UserActionCard } from "@/components/users/UserActionCard";
import { ActiveHours } from "@/components/users/ActiveHours";
import { ChangePasswordDialog } from "@/components/users/ChangePasswordDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { UserProjectsDialog } from "@/components/users/UserProjectsDialog";
import { UserWorkStats } from "@/components/users/UserWorkStats";
import { UserLeaveDetails } from "@/components/users/UserLeaveDetails";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { cn, getEffectiveRole } from "@/lib/utils";
import { VerifiedBlueTick, isFullFledgedUser } from "@/components/ui/VerifiedBlueTick";
import { userService } from "@/services/userService";
import type { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  AtSign,
  Bug,
  Calendar,
  Code2,
  ExternalLink,
  Key,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getReturnPathFromState } from "@/hooks/useUrlPagination";

type UserStatus = "active" | "idle" | "offline";

function getRoleIcon(role: string) {
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
}

function computeStatus(user: User): UserStatus {
  if (!user.last_active_at) return "offline";
  const last = new Date(user.last_active_at);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - last.getTime()) / 1000);
  if (diffSeconds < 120) return "active";
  if (diffSeconds < 900) return "idle";
  return "offline";
}

function statusChip(status: UserStatus) {
  if (status === "active") {
    return {
      label: "Active",
      color: "bg-green-500",
      ring: "ring-green-500/20",
      pulse: true,
    };
  }
  if (status === "idle") {
    return {
      label: "Idle",
      color: "bg-yellow-500",
      ring: "ring-yellow-500/20",
      pulse: false,
    };
  }
  return {
    label: "Offline",
    color: "bg-gray-400",
    ring: "ring-gray-400/20",
    pulse: false,
  };
}

async function handlePasswordChange(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  // Keep behavior aligned with dialog implementation
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Authentication token not found.");

  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/users/change-password.php`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  if (data?.success === false) {
    throw new Error(data?.message || "Failed to change password");
  }
}

export default function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const effectiveRole = getEffectiveRole(currentUser || {});
  const { hasPermission } = usePermissions(null);
  const usersBackPath = getReturnPathFromState(
    location.state,
    `/${effectiveRole}/users`
  );

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isAccountToggleLoading, setIsAccountToggleLoading] = useState(false);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["userDetails", userId],
    queryFn: async () => {
      const users = await userService.getUsers();
      return users.find((u) => String(u.id) === String(userId)) || null;
    },
    enabled: Boolean(userId),
  });

  const status = useMemo(() => {
    if (!user) return "offline" as const;
    return user.status || computeStatus(user);
  }, [user]);
  const statusConfig = statusChip(status);

  const canAdminManageAccount =
    effectiveRole === "admin" && currentUser?.id && user?.id && currentUser.id !== user.id;
  const canManageUserProjects =
    effectiveRole === "admin" &&
    Boolean(user?.id) &&
    (user?.role === "developer" || user?.role === "tester");
  const isAccountDeactivated = user?.account_active === 0;

  const handleUserUpdate = (updated: User) => {
    toast({ title: "Updated", description: "User updated successfully" });
    // best-effort refresh (keeps page source-of-truth in sync)
    void refetch();
  };

  const handleUserDelete = async (id: string, force?: boolean) => {
    await userService.deleteUser(id, Boolean(force));
    toast({ title: "Deleted", description: "User deleted successfully" });
    navigate(usersBackPath);
  };

  const handleGenerateDashboardLink = async () => {
    if (!user?.id) return;
    setIsGeneratingLink(true);
    try {
      const link = await userService.generateUserDashboardLink(user.id);
      window.open(link.url, "_blank", "noopener,noreferrer");
      toast({
        title: "Dashboard opened",
        description: "A secure dashboard link was generated.",
      });
    } catch (err) {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Could not generate link",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const toggleAccountActive = async (nextActive: boolean) => {
    if (!user?.id) return;
    setIsAccountToggleLoading(true);
    try {
      await userService.updateUser(user.id, { account_active: nextActive ? 1 : 0 });
      toast({
        title: nextActive ? "Account activated" : "Account deactivated",
        description: `${user.name} ${nextActive ? "can sign in again" : "has been signed out and blocked from signing in"}.`,
      });
      await refetch();
    } catch (err) {
      toast({
        title: "Failed",
        description: err instanceof Error ? err.message : "Could not update account status",
        variant: "destructive",
      });
    } finally {
      setIsAccountToggleLoading(false);
    }
  };

  const breadcrumb = useMemo(() => {
    const name = user?.name || user?.username || "User";
    return [
      { label: "Users", to: `/${effectiveRole}/users` },
      { label: name, to: `/${effectiveRole}/users/${userId}` },
    ];
  }, [effectiveRole, user?.name, user?.username, userId]);

  return (
    <div className="min-h-[calc(100vh-1rem)] px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header (matches Users page style) */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl shadow-lg">
                    <UserRound className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight truncate">
                      User Details
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2" />
                  </div>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Professional profile view with actions, permissions, and work analytics.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {canManageUserProjects && user ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0 border border-gray-200/60 dark:border-gray-700/60"
                      onClick={() => navigate(usersBackPath)}
                      aria-label="Back to Users"
                      title="Back to Users"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <UserProjectsDialog
                      user={user}
                      onChanged={() => void refetch()}
                      trigger={
                        <Button className="h-11 rounded-xl inline-flex items-center justify-center gap-2 w-full sm:w-auto">
                          <UserPlus className="h-4 w-4 shrink-0" />
                          Assign Projects
                        </Button>
                      }
                    />
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-900/40 backdrop-blur hover:bg-white/80 dark:hover:bg-gray-900/60"
                    onClick={() => navigate(usersBackPath)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Users
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
        ) : !user ? (
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-10 text-center space-y-3">
              <p className="text-lg font-semibold">User not found</p>
              <p className="text-sm text-muted-foreground">
                The requested user doesn’t exist or you don’t have access.
              </p>
              <Button onClick={() => navigate(usersBackPath)}>
                Go back
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <Card className="overflow-hidden border-border/60 bg-card/60 backdrop-blur shadow-sm">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 via-muted/20 to-transparent" />
                <CardContent className="relative p-5 sm:p-6">
                  <div className="space-y-5">
                    {/* Avatar + identity */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="relative shrink-0 self-start">
                        <img
                          src={user.avatar}
                          alt={`${user.name}'s avatar`}
                          className={cn(
                            "h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-background shadow-xl",
                            statusConfig.pulse && "ring-4 ring-primary/10"
                          )}
                        />
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 border-background shadow-lg flex items-center justify-center",
                            statusConfig.color,
                            statusConfig.pulse && "animate-pulse"
                          )}
                        >
                          <span className="sr-only">{statusConfig.label}</span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl sm:text-2xl font-bold break-words">
                            {user.name || user.username}
                          </h2>
                          {isFullFledgedUser(user) ? <VerifiedBlueTick size="md" /> : null}
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white shrink-0",
                              statusConfig.color
                            )}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted/50 border border-border/40 shrink-0">
                            {getRoleIcon(user.role)}
                            <span className="capitalize font-semibold">
                              {user.role}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shrink-0",
                              isAccountDeactivated
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                                : "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                            )}
                          >
                            {isAccountDeactivated
                              ? "Account deactivated"
                              : "Account active"}
                          </span>
                          {user.last_active_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(user.last_active_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact grid — full width so items never overlap */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <AtSign className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Username
                          </div>
                          <div className="font-semibold truncate">
                            {user.username}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Phone
                          </div>
                          <div className="font-semibold truncate">
                            {user.phone || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Email
                          </div>
                          <div className="font-semibold truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      {effectiveRole === "admin" ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-muted-foreground">
                              Joining date
                            </div>
                            <div className="font-semibold truncate">
                              {user.joining_date
                                ? new Date(user.joining_date).toLocaleDateString()
                                : user.created_at
                                  ? new Date(user.created_at).toLocaleDateString()
                                  : "—"}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions — drawer-style cards on mobile/tablet; compact grid on desktop */}
                  <div className="mt-5 lg:hidden space-y-3">
                    <EditUserDialog
                      user={user}
                      onUserUpdate={handleUserUpdate}
                      loggedInUserRole={effectiveRole}
                      trigger={<UserActionCard icon={Pencil} label="Edit User" />}
                    />

                    <ChangePasswordDialog
                      user={user}
                      onPasswordChange={handlePasswordChange}
                      trigger={<UserActionCard icon={Lock} label="Password" />}
                    />

                    {hasPermission("USERS_MANAGE_PERMISSIONS") && (
                      <UserActionCard
                        icon={Key}
                        label="Permissions"
                        onClick={() =>
                          navigate(`/${effectiveRole}/users/${user.id}/permissions`)
                        }
                      />
                    )}

                    {effectiveRole === "admin" && currentUser?.id !== user.id && (
                      <UserActionCard
                        icon={ExternalLink}
                        label="Dashboard"
                        onClick={handleGenerateDashboardLink}
                        disabled={isGeneratingLink}
                      />
                    )}

                    {canAdminManageAccount && !isAccountDeactivated && user.role !== "admin" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <UserActionCard
                            icon={UserX}
                            label="Deactivate"
                            tone="warning"
                            disabled={isAccountToggleLoading}
                          />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate this account?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                {user.name} will be signed out immediately and won’t be able to sign in.
                                Their data will remain intact.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isAccountToggleLoading}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={isAccountToggleLoading}
                              onClick={() => void toggleAccountActive(false)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {canAdminManageAccount && isAccountDeactivated && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <UserActionCard
                            icon={UserCheck}
                            label="Activate"
                            tone="success"
                            disabled={isAccountToggleLoading}
                          />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Activate this account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {user.name} will be able to sign in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isAccountToggleLoading}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={isAccountToggleLoading}
                              onClick={() => void toggleAccountActive(true)}
                            >
                              Activate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {effectiveRole === "admin" && currentUser?.id !== user.id && (
                      <DeleteUserDialog
                        user={user}
                        onUserDelete={handleUserDelete}
                        trigger={<UserActionCard icon={Trash2} label="Delete User" tone="danger" />}
                      />
                    )}
                  </div>

                  <div className="mt-5 hidden lg:grid grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2 sm:gap-3">
                    <div>
                      <EditUserDialog
                        user={user}
                        onUserUpdate={handleUserUpdate}
                        loggedInUserRole={effectiveRole}
                        trigger={
                          <Button
                            variant="outline"
                            className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center"
                          >
                            Edit User
                          </Button>
                        }
                      />
                    </div>

                    <div>
                      <ChangePasswordDialog
                        user={user}
                        onPasswordChange={handlePasswordChange}
                        trigger={
                          <Button
                            variant="outline"
                            className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center"
                          >
                            Password
                          </Button>
                        }
                      />
                    </div>

                    {hasPermission("USERS_MANAGE_PERMISSIONS") && (
                      <div>
                        <Button
                          variant="outline"
                          className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center gap-2"
                          onClick={() =>
                            navigate(`/${effectiveRole}/users/${user.id}/permissions`)
                          }
                        >
                          <Key className="h-4 w-4 shrink-0" />
                          Permissions
                        </Button>
                      </div>
                    )}

                    {effectiveRole === "admin" && currentUser?.id !== user.id && (
                      <div>
                        <Button
                          variant="outline"
                          className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center gap-2"
                          onClick={handleGenerateDashboardLink}
                          disabled={isGeneratingLink}
                          title="Open user's dashboard in a new tab"
                        >
                          {isGeneratingLink ? (
                            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4 shrink-0" />
                          )}
                          Dashboard
                        </Button>
                      </div>
                    )}

                    {canAdminManageAccount && !isAccountDeactivated && user.role !== "admin" && (
                      <div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="secondary"
                              className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center gap-2"
                              disabled={isAccountToggleLoading}
                            >
                              {isAccountToggleLoading ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : (
                                <UserX className="h-4 w-4 shrink-0" />
                              )}
                              Deactivate
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate this account?</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                              <span className="block">
                                {user.name} will be signed out immediately and won’t be able to sign in.
                                Their data will remain intact.
                              </span>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isAccountToggleLoading}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={isAccountToggleLoading}
                              onClick={() => void toggleAccountActive(false)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    )}

                    {canAdminManageAccount && isAccountDeactivated && (
                      <div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="secondary"
                              className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center gap-2"
                              disabled={isAccountToggleLoading}
                            >
                              {isAccountToggleLoading ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : (
                                <UserCheck className="h-4 w-4 shrink-0" />
                              )}
                              Activate
                            </Button>
                          </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Activate this account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {user.name} will be able to sign in again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isAccountToggleLoading}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={isAccountToggleLoading}
                              onClick={() => void toggleAccountActive(true)}
                            >
                              Activate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    )}

                    {effectiveRole === "admin" && currentUser?.id !== user.id && (
                      <div>
                        <DeleteUserDialog
                          user={user}
                          onUserDelete={handleUserDelete}
                          trigger={
                            <Button
                              variant="destructive"
                              className="h-11 lg:h-10 rounded-xl w-full inline-flex items-center justify-center"
                            >
                              Delete User
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <Card className="xl:col-span-12 border-border/60 bg-card/60 backdrop-blur">
                <CardContent className="p-5 sm:p-6 space-y-6">
                  <UserLeaveDetails
                    userId={user.id}
                    username={user.username || undefined}
                  />
                </CardContent>
              </Card>
              <Card className="xl:col-span-12 border-border/60 bg-card/60 backdrop-blur">
                <CardContent className="p-5 sm:p-6 space-y-6">
                  <h3 className="text-lg font-semibold">Work Statistics</h3>
                  <UserWorkStats userId={user.id} />
                </CardContent>
              </Card>
              <Card className="xl:col-span-12 border-border/60 bg-card/60 backdrop-blur">
                <CardContent className="p-5 sm:p-6 space-y-6">
                  <h3 className="text-lg font-semibold">Active Hours</h3>
                  <ActiveHours userId={user.id} userName={user.username || user.name || ""} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

