import { UserActionCard } from "@/components/users/UserActionCard";
import { ActiveHours } from "@/components/users/ActiveHours";
import { ChangePasswordDialog } from "@/components/users/ChangePasswordDialog";
import { DeleteUserDialog } from "@/components/users/DeleteUserDialog";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { UserProjectsDialog } from "@/components/users/UserProjectsDialog";
import { UserWorkStats } from "@/components/users/UserWorkStats";
import { UserLeaveDetails } from "@/components/users/UserLeaveDetails";
import { UserOfficeWfhCalendar } from "@/components/users/UserOfficeWfhCalendar";
import { UserAttendanceExceptions } from "@/components/users/UserAttendanceExceptions";
import { UserProjectPortfolio } from "@/components/users/UserProjectPortfolio";
import { UserAvatar } from "@/components/users/UserAvatar";
import { OnboardingProfileSection } from "@/components/onboarding/OnboardingProfileSection";
import { OnboardingVerificationBadge } from "@/components/onboarding/OnboardingVerificationBanner";
import { ADMIN_ONBOARDING_URL_PARAM } from "@/lib/onboardingPersistence";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { BottomSheetTabs } from "@/components/ui/BottomSheetTabs";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { getStandardsMode, userHasEmployeeRecords } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { cn, getEffectiveRole } from "@/lib/utils";
import { getRoleIcon as roleIcon, StandardsModeBadge, TesterTypeBadge } from "@/lib/roleBadge";
import { VerifiedBlueTick, isFullFledgedUser } from "@/components/ui/VerifiedBlueTick";
import { userService } from "@/services/userService";
import { onboardingService } from "@/services/onboardingService";
import type { User } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AtSign,
  BarChart3,
  Briefcase,
  Calendar,
  CalendarCheck,
  ClipboardList,
  CalendarOff,
  ExternalLink,
  FolderKanban,
  Key,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Send,
  Timer,
  Trash2,
  Wallet,
  UserPlus,
  UserRound,
  UserCheck,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { getReturnPathFromState } from "@/hooks/useUrlPagination";
import { buildAdminAddHoursPath } from "@/pages/adminOvertimeShared";

type UserStatus = "active" | "idle" | "offline";

type UserDetailsTab =
  | "personal"
  | "professional"
  | "payments"
  | "attendance"
  | "leaves"
  | "projects"
  | "work-statistics"
  | "active-hours";

const USER_DETAILS_TABS: {
  value: UserDetailsTab;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}[] = [
  { value: "personal", label: "Personal", icon: UserRound },
  { value: "professional", label: "Professional", shortLabel: "Pro", icon: Briefcase },
  { value: "payments", label: "Payments", icon: Wallet },
  { value: "attendance", label: "Attendance", shortLabel: "Attend.", icon: CalendarCheck, adminOnly: true },
  { value: "leaves", label: "Leaves", icon: CalendarOff },
  { value: "projects", label: "Projects", icon: FolderKanban },
  { value: "work-statistics", label: "Work Statistics", shortLabel: "Stats", icon: BarChart3 },
  { value: "active-hours", label: "Active Hours", shortLabel: "Hours", icon: Activity },
];

function parseUserDetailsTab(
  raw: string | null,
  isAdmin: boolean
): UserDetailsTab {
  const match = USER_DETAILS_TABS.find((t) => t.value === raw);
  if (!match) return "personal";
  if (match.adminOnly && !isAdmin) return "personal";
  return match.value;
}

function getRoleIcon(role: string) {
  return roleIcon(role, "h-5 w-5");
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
    `${ENV.API_URL}/users/change-password.php`,
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

type InviteChannel = "email" | "whatsapp" | "both";

const ONBOARDING_NOTE_MAX = 300;
const ONBOARDING_NOTE_SUGGESTIONS = [
  "Please re-upload a clear Aadhaar scan.",
  "Please add your PAN card.",
  "Please correct your bank details.",
  "Please update your address.",
] as const;

export default function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const effectiveRole = getEffectiveRole(currentUser || {});
  const isAdmin = effectiveRole === "admin";
  const { hasPermission } = usePermissions(null);
  const usersBackPath = getReturnPathFromState(
    location.state,
    `/${effectiveRole}/users`
  );

  const activeTab = parseUserDetailsTab(searchParams.get("tab"), isAdmin);
  const visibleTabs = USER_DETAILS_TABS.filter((t) => !t.adminOnly || isAdmin);

  const setActiveTab = (tab: string) => {
    const next = parseUserDetailsTab(tab, isAdmin);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === "personal") {
          params.delete("tab");
        } else {
          params.set("tab", next);
        }
        return params;
      },
      { replace: true }
    );
  };

  // Why: Review / admin fill wizard live on Professional — deep-links must land there.
  useEffect(() => {
    if (!isAdmin) return;
    const needsProfessional =
      searchParams.get("review") === "onboarding" ||
      Boolean(searchParams.get(ADMIN_ONBOARDING_URL_PARAM));
    if (!needsProfessional || activeTab === "professional") return;
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", "professional");
        return params;
      },
      { replace: true }
    );
  }, [activeTab, isAdmin, searchParams, setSearchParams]);

  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isResendingWelcome, setIsResendingWelcome] = useState(false);
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);
  const [resendChannel, setResendChannel] = useState<InviteChannel>("email");
  const [onboardingRequestOpen, setOnboardingRequestOpen] = useState(false);
  const [onboardingChannel, setOnboardingChannel] = useState<InviteChannel>("email");
  const [onboardingNote, setOnboardingNote] = useState("");
  const [isRequestingOnboarding, setIsRequestingOnboarding] = useState(false);
  const [isAccountToggleLoading, setIsAccountToggleLoading] = useState(false);

  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["userDetails", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        return await userService.getUser(userId);
      } catch {
        // Fallback for older APIs that only list users
        const users = await userService.getUsers();
        return users.find((u) => String(u.id) === String(userId)) || null;
      }
    },
    enabled: Boolean(userId),
  });

  const { data: onboardingData } = useQuery({
    queryKey: ["onboarding-details", userId],
    queryFn: () => onboardingService.get(String(userId)),
    enabled: Boolean(userId),
  });

  const employeeCodeDisplay =
    (user?.employee_code || onboardingData?.user?.employee_code || "").trim() ||
    null;

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
  const canResendWelcome =
    Boolean(user?.id && (user?.email || user?.phone)) &&
    currentUser?.id !== user?.id &&
    !isAccountDeactivated &&
    (effectiveRole === "admin" || hasPermission("USERS_CREATE"));

  const canRequestOnboarding =
    Boolean(user?.id && (user?.email || user?.phone)) &&
    userHasEmployeeRecords(user) &&
    currentUser?.id !== user?.id &&
    !isAccountDeactivated &&
    (effectiveRole === "admin" || hasPermission("USERS_EDIT"));
  const onboardingRequestIsUpdate = Number(user?.onboarding_completed ?? 0) === 1;

  const openOnboardingRequest = () => {
    if (!user) return;
    setOnboardingChannel(user.email && user.phone ? "both" : user.email ? "email" : "whatsapp");
    setOnboardingNote("");
    setOnboardingRequestOpen(true);
  };

  const closeOnboardingRequest = () => {
    setOnboardingRequestOpen(false);
    setOnboardingNote("");
  };

  const handleRequestOnboarding = async () => {
    if (!user?.id || isRequestingOnboarding) return;
    setIsRequestingOnboarding(true);
    try {
      const channels: Array<"email" | "whatsapp"> =
        onboardingChannel === "both" ? ["email", "whatsapp"] : [onboardingChannel];
      const { message, partial, mode } = await userService.requestOnboarding(
        user.id,
        channels,
        onboardingNote
      );
      closeOnboardingRequest();
      toast({
        title: partial
          ? "Request partly sent"
          : mode === "update"
            ? "Profile update requested"
            : "Onboarding requested",
        description: message,
        variant: partial ? "destructive" : "default",
      });
    } catch (err) {
      toast({
        title: "Request not sent",
        description: err instanceof Error ? err.message : "Could not send the onboarding request.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingOnboarding(false);
    }
  };

  const handleUserUpdate = (updated: User) => {
    toast({ title: "Updated", description: "User updated successfully" });
    // best-effort refresh (keeps page source-of-truth in sync)
    void refetch();
  };

  const handleUserDelete = async (id: string, force?: boolean) => {
    try {
      await userService.deleteUser(id, Boolean(force));
      toast({
        title: force ? "Permanently deleted" : "Moved to recycle bin",
        description: force
          ? "The user account was permanently removed."
          : "The user was moved to the recycle bin. You can restore them within 30 days.",
      });
      navigate(usersBackPath);
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Could not delete user",
        variant: "destructive",
      });
      throw err;
    }
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

  const handleResendWelcome = async () => {
    if (!user?.id || isResendingWelcome) return;
    setIsResendingWelcome(true);
    try {
      const channels: Array<"email" | "whatsapp"> =
        resendChannel === "both" ? ["email", "whatsapp"] : [resendChannel];
      const { message, partial } = await userService.resendWelcomeInvite(user.id, channels);
      setResendConfirmOpen(false);
      toast({
        title: partial ? "Invitation partly sent" : "Invitation sent",
        description: message,
        variant: partial ? "destructive" : "default",
      });
    } catch (err) {
      toast({
        title: "Invitation not sent",
        description: err instanceof Error ? err.message : "Could not send the welcome email.",
        variant: "destructive",
      });
    } finally {
      setIsResendingWelcome(false);
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
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
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
                {effectiveRole === "admin" && userId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full sm:w-auto rounded-xl border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-gray-900/50"
                    asChild
                  >
                    <Link
                      to={buildAdminAddHoursPath(effectiveRole, String(userId), {
                        returnTo: `/${effectiveRole}/users/${userId}`,
                      })}
                    >
                      <Timer className="h-4 w-4 shrink-0 mr-2" />
                      Add / Fix Hours
                    </Link>
                  </Button>
                ) : null}
                {canManageUserProjects && user ? (
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
                ) : null}
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
                        <UserAvatar
                          name={user.name || user.username || "User"}
                          avatar={user.avatar}
                          size="xl"
                          previewable
                          alt={`${user.name || user.username}'s profile photo`}
                          className={cn(
                            statusConfig.pulse && "ring-4 ring-primary/10 rounded-full"
                          )}
                        />
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-4 border-background shadow-lg flex items-center justify-center z-10",
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
                            <TesterTypeBadge role={user.role} testerType={user.tester_type} />
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
                          {userHasEmployeeRecords(user) &&
                          Number(user.onboarding_completed ?? 0) === 1 ? (
                            <OnboardingVerificationBadge
                              status={user.onboarding_verification_status}
                            />
                          ) : null}
                          <StandardsModeBadge
                            role={user.role}
                            testerType={user.tester_type}
                            label="CODO Rules"
                            mode={getStandardsMode(user, "codo")}
                          />
                          <StandardsModeBadge
                            role={user.role}
                            testerType={user.tester_type}
                            label="Cursor Tips"
                            mode={getStandardsMode(user, "cursor_tips")}
                          />
                          {user.last_active_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(user.last_active_at), {
                                addSuffix: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {(canResendWelcome || canRequestOnboarding) && (
                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:self-start">
                          {canRequestOnboarding ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={openOnboardingRequest}
                              disabled={isRequestingOnboarding}
                              className="h-10 w-full rounded-xl gap-2 sm:w-auto"
                              title={
                                onboardingRequestIsUpdate
                                  ? "Ask them to review and resubmit their employee profile"
                                  : "Ask them to complete their onboarding profile"
                              }
                            >
                              {isRequestingOnboarding ? (
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                              ) : (
                                <ClipboardList className="h-4 w-4 shrink-0" />
                              )}
                              {isRequestingOnboarding
                                ? "Sending…"
                                : onboardingRequestIsUpdate
                                  ? "Request profile update"
                                  : "Request onboarding"}
                            </Button>
                          ) : null}
                          {canResendWelcome ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setResendChannel(
                                user.email && user.phone ? "both" : user.email ? "email" : "whatsapp"
                              );
                              setResendConfirmOpen(true);
                            }}
                            disabled={isResendingWelcome}
                            className="h-10 w-full rounded-xl gap-2 sm:w-auto"
                            title="Send a fresh one-click sign-in link by email or WhatsApp"
                          >
                            {isResendingWelcome ? (
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 shrink-0" />
                            )}
                            {isResendingWelcome ? "Sending…" : "Resend invitation"}
                          </Button>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <AlertDialog
                      open={resendConfirmOpen}
                      onOpenChange={(open) => {
                        if (!isResendingWelcome) setResendConfirmOpen(open);
                      }}
                    >
                      <AlertDialogContent className="max-w-[400px] rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Resend invitation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Send a fresh one-click sign-in link. Their password is not changed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div role="radiogroup" aria-label="Send invitation via" className="grid grid-cols-12 gap-2">
                          {(
                            [
                              { key: "email", label: "Email", icon: Mail, detail: user.email, available: Boolean(user.email) },
                              { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, detail: user.phone, available: Boolean(user.phone) },
                              { key: "both", label: "Both", icon: Send, detail: "Email + WhatsApp", available: Boolean(user.email && user.phone) },
                            ] as const
                          ).map((opt) => {
                            const selected = resendChannel === opt.key;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                disabled={!opt.available || isResendingWelcome}
                                onClick={() => setResendChannel(opt.key)}
                                className={cn(
                                  "col-span-4 flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                                  selected
                                    ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                                    : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                )}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="text-sm font-medium">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="min-h-[1.25rem] text-xs text-muted-foreground break-all">
                          {resendChannel === "email" && <>To {user.email}</>}
                          {resendChannel === "whatsapp" && <>To {user.phone}</>}
                          {resendChannel === "both" && <>To {user.email} and {user.phone}</>}
                          {!user.phone ? " · Add a phone number to enable WhatsApp." : null}
                          {!user.email ? " · Add an email to enable email." : null}
                        </p>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl" disabled={isResendingWelcome}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-xl"
                            disabled={isResendingWelcome}
                            onClick={(e) => {
                              e.preventDefault();
                              void handleResendWelcome();
                            }}
                          >
                            {isResendingWelcome ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending…
                              </>
                            ) : (
                              resendChannel === "both"
                                ? "Send both"
                                : resendChannel === "whatsapp"
                                  ? "Send WhatsApp"
                                  : "Send email"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog
                      open={onboardingRequestOpen}
                      onOpenChange={(open) => {
                        if (isRequestingOnboarding) return;
                        if (open) setOnboardingRequestOpen(true);
                        else closeOnboardingRequest();
                      }}
                    >
                      <AlertDialogContent className="max-w-[600px] rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {onboardingRequestIsUpdate ? "Request profile update?" : "Request onboarding?"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {onboardingRequestIsUpdate
                              ? `${user.name || user.username} gets a secure link that opens their employee profile with saved details filled in, so they can correct and resubmit it for HR verification.`
                              : `${user.name || user.username} gets a secure link that signs them in and opens the onboarding wizard to complete their employee profile.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="flex flex-col gap-4">
                          <div role="radiogroup" aria-label="Send request via" className="grid grid-cols-12 gap-2">
                            {(
                              [
                                { key: "email", label: "Email", icon: Mail, available: Boolean(user.email) },
                                { key: "whatsapp", label: "WhatsApp", icon: MessageCircle, available: Boolean(user.phone) },
                                { key: "both", label: "Both", icon: Send, available: Boolean(user.email && user.phone) },
                              ] as const
                            ).map((opt) => {
                              const selected = onboardingChannel === opt.key;
                              const Icon = opt.icon;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  disabled={!opt.available || isRequestingOnboarding}
                                  onClick={() => setOnboardingChannel(opt.key)}
                                  className={cn(
                                    "col-span-4 flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                                    selected
                                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                                      : "border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                                  )}
                                >
                                  <Icon className="h-5 w-5" />
                                  <span className="text-sm font-medium">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground break-all">
                            {onboardingChannel === "email" && <>To {user.email}</>}
                            {onboardingChannel === "whatsapp" && <>To {user.phone}</>}
                            {onboardingChannel === "both" && <>To {user.email} and {user.phone}</>}
                            {" · An in-app notification is always sent."}
                          </p>

                          <div className="flex flex-col gap-2">
                            <label htmlFor="onboarding-request-note" className="text-sm font-medium">
                              Note for the employee <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {ONBOARDING_NOTE_SUGGESTIONS.map((hint) => (
                                <button
                                  key={hint}
                                  type="button"
                                  disabled={isRequestingOnboarding}
                                  onClick={() =>
                                    setOnboardingNote((prev) =>
                                      (prev.trim() ? `${prev.trim()} ${hint}` : hint).slice(0, ONBOARDING_NOTE_MAX)
                                    )
                                  }
                                  className="rounded-xl border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                                >
                                  {hint}
                                </button>
                              ))}
                            </div>
                            <Textarea
                              id="onboarding-request-note"
                              value={onboardingNote}
                              onChange={(e) => setOnboardingNote(e.target.value.slice(0, ONBOARDING_NOTE_MAX))}
                              maxLength={ONBOARDING_NOTE_MAX}
                              rows={3}
                              disabled={isRequestingOnboarding}
                              placeholder="e.g. Your PAN scan is blurry — please upload a clearer copy."
                              className="resize-none rounded-xl"
                            />
                            <p className="text-end text-[11px] text-muted-foreground">
                              {onboardingNote.length}/{ONBOARDING_NOTE_MAX}
                            </p>
                          </div>
                        </div>

                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl" disabled={isRequestingOnboarding}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="rounded-xl"
                            disabled={isRequestingOnboarding}
                            onClick={(e) => {
                              e.preventDefault();
                              void handleRequestOnboarding();
                            }}
                          >
                            {isRequestingOnboarding ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending…
                              </>
                            ) : (
                              "Send request"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

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
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Employee ID
                          </div>
                          <div
                            className={cn(
                              "font-semibold font-mono text-sm truncate",
                              employeeCodeDisplay
                                ? "text-foreground tracking-wide"
                                : "text-muted-foreground"
                            )}
                            title={employeeCodeDisplay || "Not assigned"}
                          >
                            {employeeCodeDisplay || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Job title
                          </div>
                          <div className="font-semibold truncate">
                            {user.job_title || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Job level
                          </div>
                          <div className="font-semibold truncate">
                            {user.job_level || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground">
                            Department
                          </div>
                          <div className="font-semibold truncate">
                            {user.department || "—"}
                          </div>
                        </div>
                      </div>
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

            {/* Detail tabs — under action buttons */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4 sm:space-y-6"
            >
              <BottomSheetTabs
                items={visibleTabs.map((tab) => ({
                  value: tab.value,
                  label: tab.label,
                  shortLabel: tab.shortLabel,
                  icon: tab.icon,
                }))}
                value={activeTab}
                onValueChange={setActiveTab}
                title="Select Section"
                description={`Navigate ${user.name || user.username || "user"}'s details`}
                desktopBreakpoint="xl"
              />

              <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
                {activeTab === "personal" ? (
                  userHasEmployeeRecords(user) ? (
                    <OnboardingProfileSection
                      userId={user.id}
                      onboardingCompleted={user.onboarding_completed}
                      canVerify={isAdmin}
                      visibleSections={[
                        "address",
                        "developer",
                        "statutory",
                        "agreements",
                      ]}
                      employeeName={user.name || user.username}
                      employeeUsername={user.username}
                      employeeEmail={user.email}
                      employeePhone={user.phone}
                      employeeRole={user.role}
                      employeeAvatar={user.avatar}
                      employeeJoiningDate={user.joining_date}
                      employeeCode={employeeCodeDisplay}
                      employeeJobTitle={user.job_title}
                      employeeJobLevel={user.job_level}
                      employeeDepartment={user.department}
                      employeeReportsTo={user.reports_to_username}
                      employeeContractType={user.contract_type}
                      employeeOfferLetterIssued={user.offer_letter_issued}
                      employeeOfferLetterSharedDate={user.offer_letter_shared_date}
                      employeeProbationEndDate={user.probation_end_date}
                    />
                  ) : (
                    <Card className="rounded-2xl shadow-sm border-border/60">
                      <CardContent className="p-5 sm:p-6">
                        <p className="text-sm text-muted-foreground">
                          Personal records apply to employee accounts — developers, CODO testers and creators.
                          Contact basics are shown in the profile card above.
                        </p>
                      </CardContent>
                    </Card>
                  )
                ) : null}
              </TabsContent>

              <TabsContent
                value="professional"
                className="mt-0 focus-visible:outline-none"
              >
                {activeTab === "professional" ? (
                  userHasEmployeeRecords(user) ? (
                    <OnboardingProfileSection
                      userId={user.id}
                      onboardingCompleted={user.onboarding_completed}
                      canVerify={isAdmin}
                      visibleSections={["verification", "employment"]}
                      employeeName={user.name || user.username}
                      employeeUsername={user.username}
                      employeeEmail={user.email}
                      employeePhone={user.phone}
                      employeeRole={user.role}
                      employeeAvatar={user.avatar}
                      employeeJoiningDate={user.joining_date}
                      employeeCode={employeeCodeDisplay}
                      employeeJobTitle={user.job_title}
                      employeeJobLevel={user.job_level}
                      employeeDepartment={user.department}
                      employeeReportsTo={user.reports_to_username}
                      employeeContractType={user.contract_type}
                      employeeOfferLetterIssued={user.offer_letter_issued}
                      employeeOfferLetterSharedDate={user.offer_letter_shared_date}
                      employeeProbationEndDate={user.probation_end_date}
                    />
                  ) : (
                    <Card className="rounded-2xl shadow-sm border-border/60">
                      <CardContent className="p-5 sm:p-6">
                        <p className="text-sm text-muted-foreground">
                          Employment and document records apply to employee accounts.
                          Job summary fields remain in the profile card above.
                        </p>
                      </CardContent>
                    </Card>
                  )
                ) : null}
              </TabsContent>

              <TabsContent value="payments" className="mt-0 focus-visible:outline-none">
                {activeTab === "payments" ? (
                  userHasEmployeeRecords(user) ? (
                    <OnboardingProfileSection
                      userId={user.id}
                      onboardingCompleted={user.onboarding_completed}
                      canVerify={isAdmin}
                      visibleSections={["banking"]}
                      employeeName={user.name || user.username}
                      employeeUsername={user.username}
                      employeeEmail={user.email}
                      employeePhone={user.phone}
                      employeeRole={user.role}
                      employeeAvatar={user.avatar}
                      employeeJoiningDate={user.joining_date}
                      employeeCode={employeeCodeDisplay}
                      employeeJobTitle={user.job_title}
                      employeeJobLevel={user.job_level}
                      employeeDepartment={user.department}
                      employeeReportsTo={user.reports_to_username}
                      employeeContractType={user.contract_type}
                      employeeOfferLetterIssued={user.offer_letter_issued}
                      employeeOfferLetterSharedDate={user.offer_letter_shared_date}
                      employeeProbationEndDate={user.probation_end_date}
                    />
                  ) : (
                    <Card className="rounded-2xl shadow-sm border-border/60">
                      <CardContent className="p-5 sm:p-6">
                        <p className="text-sm text-muted-foreground">
                          Banking details apply to employee accounts — developers, CODO testers and creators.
                        </p>
                      </CardContent>
                    </Card>
                  )
                ) : null}
              </TabsContent>

              {isAdmin ? (
                <TabsContent
                  value="attendance"
                  className="mt-0 focus-visible:outline-none"
                >
                  {activeTab === "attendance" ? (
                    <div className="grid grid-cols-12 gap-4 sm:gap-6">
                      <Card className="col-span-12 border-border/60 bg-card/60 backdrop-blur rounded-2xl">
                        <CardContent className="p-5 sm:p-6">
                          <UserOfficeWfhCalendar userId={user.id} />
                        </CardContent>
                      </Card>
                      <Card className="col-span-12 border-border/60 bg-card/60 backdrop-blur rounded-2xl">
                        <CardContent className="p-5 sm:p-6 space-y-6">
                          <UserAttendanceExceptions
                            userId={user.id}
                            username={user.username || undefined}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}
                </TabsContent>
              ) : null}

              <TabsContent value="leaves" className="mt-0 focus-visible:outline-none">
                {activeTab === "leaves" ? (
                  <Card className="border-border/60 bg-card/60 backdrop-blur rounded-2xl">
                    <CardContent className="p-5 sm:p-6 space-y-6">
                      <UserLeaveDetails
                        userId={user.id}
                        username={user.username || undefined}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="projects" className="mt-0 focus-visible:outline-none">
                {activeTab === "projects" ? (
                  <UserProjectPortfolio userId={user.id} />
                ) : null}
              </TabsContent>

              <TabsContent
                value="work-statistics"
                className="mt-0 focus-visible:outline-none"
              >
                {activeTab === "work-statistics" ? (
                  <Card className="border-border/60 bg-card/60 backdrop-blur rounded-2xl">
                    <CardContent className="p-5 sm:p-6 space-y-6">
                      <h2 className="text-lg font-semibold">Work Statistics</h2>
                      <UserWorkStats userId={user.id} />
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent
                value="active-hours"
                className="mt-0 focus-visible:outline-none"
              >
                {activeTab === "active-hours" ? (
                  <Card className="border-border/60 bg-card/60 backdrop-blur rounded-2xl">
                    <CardContent className="p-5 sm:p-6 space-y-6">
                      <h2 className="text-lg font-semibold">Active Hours</h2>
                      <ActiveHours
                        userId={user.id}
                        userName={user.username || user.name || ""}
                      />
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        )}
    </div>
  );
}

