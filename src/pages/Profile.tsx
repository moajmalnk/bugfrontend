import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { PageJumpSelect } from "@/components/pagination/PageJumpSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { VerifiedBlueTick, isFullFledgedUser } from "@/components/ui/VerifiedBlueTick";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserProjectPortfolio } from "@/components/users/UserProjectPortfolio";
import { UserWorkStats } from "@/components/users/UserWorkStats";
import { ActiveHours } from "@/components/users/ActiveHours";
import { UserLeaveDetails } from "@/components/users/UserLeaveDetails";
import { EditOwnProfileDialog } from "@/components/profile/EditOwnProfileDialog";
import { TeamBirthdayBanner } from "@/components/dashboard/TeamBirthdayBanner";
import { OnboardingProfileSection } from "@/components/onboarding/OnboardingProfileSection";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { OnboardingVerificationBadge } from "@/components/onboarding/OnboardingVerificationBanner";
import { useAuth } from "@/context/AuthContext";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { cn, userRequiresOnboarding } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/env";
import { resolveAvatarUrl } from "@/lib/avatarUrl";
import { onboardingService } from "@/services/onboardingService";
import { userService } from "@/services/userService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { googleDocsService } from "@/services/googleDocsService";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  Building2,
  Bug,
  Briefcase,
  CalendarDays,
  Code2,
  Rows3,
  Search,
  Github,
  Hash,
  IdCard,
  Instagram,
  Landmark,
  Linkedin,
  Link as LinkIcon,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ONBOARDING_STEP_SLUGS } from "@/lib/onboardingPersistence";

const CONTRACT_LABELS: Record<string, string> = {
  full_time: "Full-Time",
  remote: "Remote",
  part_time: "Part-Time",
  contract: "Contract",
  intern: "Intern",
  probation: "Probation",
  other: "Other",
};

function formatContractType(value?: string | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  return CONTRACT_LABELS[raw] || raw.replace(/_/g, " ");
}

/** Why: Mask account for at-a-glance profile without exposing full number. */
function maskAccountNumber(value?: string | null): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••• ${digits.slice(-4)}`;
}

function formatShortDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Why: Group profile content into scannable professional sections. */
function ProfileSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="space-y-1 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

// Profile skeleton components
const ProfileHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
    <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full" />
    <div className="flex-1 text-center md:text-left">
      <Skeleton className="h-8 sm:h-9 w-48 sm:w-64 mb-2 mx-auto md:mx-0" />
      <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-3 sm:mb-4 mx-auto md:mx-0" />
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center md:justify-start">
        <Skeleton className="h-9 w-full sm:w-44" />
        <Skeleton className="h-9 w-full sm:w-44" />
      </div>
    </div>
  </div>
);

const AboutCardSkeleton = () => (
  <Card className="md:col-span-2 shadow-sm">
    <CardHeader className="p-4 sm:p-5 lg:p-6">
      <Skeleton className="h-7 w-24 sm:w-28" />
    </CardHeader>
    <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
      <Skeleton className="h-20 w-full" />
    </CardContent>
  </Card>
);

const LinksCardSkeleton = () => (
  <Card className="shadow-sm">
    <CardHeader className="p-4 sm:p-5 lg:p-6">
      <Skeleton className="h-7 w-24 sm:w-28" />
    </CardHeader>
    <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
      <Skeleton className="h-6 w-32 sm:w-36" />
      <Skeleton className="h-6 w-32 sm:w-36" />
      <Skeleton className="h-6 w-32 sm:w-36" />
    </CardContent>
  </Card>
);

const ActivityCardSkeleton = () => (
  <Card className="md:col-span-3 shadow-sm">
    <CardHeader className="p-4 sm:p-5 lg:p-6">
      <Skeleton className="h-7 w-40 sm:w-44" />
    </CardHeader>
    <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="flex items-start gap-3 sm:gap-4">
            <Skeleton className="w-2 h-2 sm:w-3 sm:h-3 mt-2 rounded-full" />
            <div className="w-full">
              <Skeleton className="h-5 w-44 sm:w-48 mb-2" />
              <Skeleton className="h-4 w-56 sm:w-60" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Stats skeleton component
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
    <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm">
      <Skeleton className="h-4 w-24 sm:w-28 mb-1 sm:mb-2" />
      <Skeleton className="h-8 w-12 sm:w-14" />
    </div>
    <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm">
      <Skeleton className="h-4 w-24 sm:w-28 mb-1 sm:mb-2" />
      <Skeleton className="h-8 w-12 sm:w-14" />
    </div>
  </div>
);

// Recent Activity skeleton component
const RecentActivitySkeleton = () => (
  <div className="space-y-3 sm:space-y-4">
    {[1, 2, 3].map((_, i) => (
      <div
        key={i}
        className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-muted/20"
      >
        <Skeleton className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
            <Skeleton className="h-4 w-48 sm:w-56 md:w-64 lg:w-72" />
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
              <Skeleton className="h-3 w-16 sm:w-20" />
              <Skeleton className="h-3 w-12 sm:w-16" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 sm:w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16 sm:w-20" />
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function Profile() {
  const { currentUser, isLoading, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState<"all" | "bug" | "fix" | "project">("all");
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);
  
  // Google connection state
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isCheckingGoogleConnection, setIsCheckingGoogleConnection] = useState(true);
  const [connectedGoogleEmail, setConnectedGoogleEmail] = useState<string | null>(null);
  const [showDisconnectGoogleDialog, setShowDisconnectGoogleDialog] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [editBasicOpen, setEditBasicOpen] = useState(false);

  /**
   * Why: Edit-onboarding is URL-driven (`?onboarding=address|…|legal`) so refresh
   * and browser Back restore/close the wizard instead of stranding a stale query.
   */
  const onboardingSlug = searchParams.get("onboarding");
  const canUseOnboarding = userRequiresOnboarding(currentUser);
  const canEditViaOnboarding =
    canUseOnboarding && Number(currentUser?.onboarding_completed ?? 0) === 1;
  const canEditBasicProfile = !canUseOnboarding;
  const editOnboardingOpen =
    canUseOnboarding &&
    Number(currentUser?.onboarding_completed ?? 0) === 1 &&
    !!onboardingSlug &&
    (ONBOARDING_STEP_SLUGS as readonly string[]).includes(onboardingSlug);

  const setEditOnboardingOpen = useCallback(
    (open: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (open) {
            if (!next.get("onboarding")) {
              next.set("onboarding", "address");
            }
          } else {
            next.delete("onboarding");
          }
          return next;
        },
        { replace: !open }
      );
    },
    [setSearchParams]
  );

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["userStats", currentUser?.id],
    queryFn: () =>
      currentUser?.id
        ? userService.getUserStats(currentUser.id)
        : Promise.reject("User not logged in"),
    enabled: !!currentUser?.id,
  });

  // Why: Surface HR + onboarding highlights in the hero metrics row (not only deep below).
  const { data: onboardingHighlight } = useQuery({
    queryKey: ["onboarding-details", currentUser?.id],
    queryFn: () => onboardingService.get(currentUser!.id),
    enabled:
      !!currentUser?.id &&
      canUseOnboarding &&
      Number(currentUser?.onboarding_completed ?? 0) === 1,
  });

  // Check Google connection status
  const checkGoogleConnection = useCallback(async () => {
    setIsCheckingGoogleConnection(true);
    try {
      const result = await googleDocsService.checkConnection();
      setIsGoogleConnected(result.connected);
      setConnectedGoogleEmail(result.email || null);
    } catch (error) {
      console.error('Failed to check Google connection:', error);
      setIsGoogleConnected(false);
      setConnectedGoogleEmail(null);
    } finally {
      setIsCheckingGoogleConnection(false);
    }
  }, []);

  // Check connection on mount
  useEffect(() => {
    if (currentUser?.id) {
      checkGoogleConnection();
    }
  }, [currentUser?.id, checkGoogleConnection]);

  // Check for OAuth success/error parameters (do not wipe unrelated query like onboarding=)
  useEffect(() => {
    const googleConnected = searchParams.get("google_connected");
    const googleError = searchParams.get("google_error");

    if (!googleConnected && !googleError) return;

    if (googleConnected === "true") {
      toast({
        title: "Success",
        description: "Google account connected successfully!",
      });
      checkGoogleConnection();
    } else if (googleError) {
      toast({
        title: "Error",
        description: `Google connection failed: ${decodeURIComponent(googleError)}`,
        variant: "destructive",
      });
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("google_connected");
        next.delete("google_error");
        next.delete("email");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams, checkGoogleConnection]);

  const handleConnectGoogle = useCallback(() => {
    try {
      // Get current user ID from JWT token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        toast({
          title: "Error",
          description: "Please log in first",
          variant: "destructive",
        });
        return;
      }
      
      // Decode JWT to get user ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.user_id;
      
      // Build return URL based on current environment
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const returnUrl = isLocal 
        ? `http://localhost:8080${window.location.pathname}`
        : `https://bugs.bugricer.com${window.location.pathname}`;
      
      // Check if we're in production or local
      const isProduction = !isLocal;
      const reauthUrl = isProduction 
        ? `https://bugbackend.bugricer.com/api/oauth/production-reauth.php?user_id=${userId}&token=${encodeURIComponent(token)}&return_url=${encodeURIComponent(returnUrl)}`
        : `http://localhost/BugRicer/backend/api/oauth/admin-reauth.php?user_id=${userId}&token=${encodeURIComponent(token)}&return_url=${encodeURIComponent(returnUrl)}`;
      
      // Navigate to reauth endpoint
      window.location.href = reauthUrl;
    } catch (error: any) {
      console.error('Error connecting Google:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate Google connection",
        variant: "destructive",
      });
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setIsDisconnectingGoogle(true);
    try {
      await googleDocsService.disconnect();
      setIsGoogleConnected(false);
      setConnectedGoogleEmail(null);
      setShowDisconnectGoogleDialog(false);
      toast({
        title: "Disconnected",
        description: "Google account has been disconnected successfully.",
      });
      // Refresh connection status
      await checkGoogleConnection();
    } catch (error: any) {
      console.error('Failed to disconnect:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Google account",
        variant: "destructive",
      });
    } finally {
      setIsDisconnectingGoogle(false);
    }
  }, [checkGoogleConnection]);

  // Remove the problematic useEffect that was causing infinite requests
  // The user data is already available from AuthContext and doesn't need to be refetched

  const handleLogoutOpen = useCallback((open: boolean) => {
    setShowConfirm(open);
  }, []);

  const handleOnboardingEditCompleted = useCallback(
    (result?: { avatar?: string | null; updated?: boolean }) => {
      if (!currentUser) return;
      updateCurrentUser({
        ...currentUser,
        ...(result?.avatar
          ? {
              avatar: resolveAvatarUrl(
                result.avatar,
                currentUser.name || currentUser.username || "User"
              ),
            }
          : {}),
        onboarding_verification_status: "pending",
      });
      void queryClient.invalidateQueries({
        queryKey: ["onboarding-details", currentUser.id],
      });
      toast({
        title: "Profile updated",
        description: "Your onboarding details were saved and sent for HR verification.",
      });
      setEditOnboardingOpen(false);
    },
    [currentUser, updateCurrentUser, queryClient]
  );

  const handleBasicProfileUpdated = useCallback(
    (updated: NonNullable<typeof currentUser>) => {
      updateCurrentUser(updated);
      void queryClient.invalidateQueries({ queryKey: ["userStats", updated.id] });
    },
    [updateCurrentUser, queryClient]
  );

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordReset = useCallback(async () => {
    if (!currentUser?.email) {
      toast({
        title: "Error",
        description: "Email address not found. Cannot reset password.",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(currentUser.email)) {
      toast({
        title: "Invalid Email",
        description: "Please ensure your email address is valid",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot_password.php`, { 
        email: currentUser.email.trim().toLowerCase() 
      });
      
      const data = response.data as any;
      if (data.success) {
        toast({
          title: "Reset Link Sent",
          description: "A password reset link has been sent to your email address. Please check your inbox.",
          variant: "default",
        });
        setShowPasswordResetConfirm(false);
      } else {
        throw new Error(data.message || "Failed to send reset link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || error.message || "Failed to send reset link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  }, [currentUser?.email]);

  // Filter and paginate recent activity
  const filteredActivity = useMemo(() => {
    if (!userStats?.recent_activity) return [];
    
    return userStats.recent_activity
      .filter((activity) => {
        // Filter activities based on user role
        if (currentUser?.role === "admin") {
          return true; // Admin sees all activities (bug, fix, project)
        } else if (currentUser?.role === "tester") {
          return (
            activity.type === "bug" || activity.type === "project"
          ); // Testers see bugs and projects
        } else {
          return (
            activity.type === "fix" || activity.type === "project"
          ); // Developers see fixes and projects
        }
      })
      // Apply UI filters
      .filter((activity) => {
        const matchesType = activityType === "all" || activity.type === activityType;
        const matchesSearch = activity.title
          ?.toLowerCase()
          .includes(activitySearch.toLowerCase());
        return matchesType && matchesSearch;
      })
      // Sort by date
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.created_at).getTime();
        const bTime = new Date(b.created_at).getTime();
        return activitySort === "newest" ? bTime - aTime : aTime - bTime;
      });
  }, [userStats?.recent_activity, currentUser?.role, activityType, activitySearch, activitySort]);

  // Pagination calculations
  const totalFiltered = filteredActivity.length;
  const paginatedActivity = filteredActivity.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage) || 1);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activitySearch, activityType, activitySort]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [itemsPerPage, totalPages]);

  if (isLoading) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
          <Card className="overflow-hidden border-border/60 bg-card/70">
            <CardContent className="p-5 sm:p-6 lg:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
                <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-2xl shrink-0 mx-auto lg:mx-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-9 w-56 mx-auto lg:mx-0" />
                  <Skeleton className="h-5 w-40 mx-auto lg:mx-0" />
                  <div className="grid grid-cols-12 gap-3 pt-2">
                    <Skeleton className="col-span-12 sm:col-span-6 h-14 rounded-xl" />
                    <Skeleton className="col-span-12 sm:col-span-6 h-14 rounded-xl" />
                    <Skeleton className="col-span-12 sm:col-span-6 h-14 rounded-xl" />
                    <Skeleton className="col-span-12 sm:col-span-6 h-14 rounded-xl" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-3 border-t border-border/50 pt-4">
                <Skeleton className="col-span-4 h-20 rounded-xl" />
                <Skeleton className="col-span-4 h-20 rounded-xl" />
                <Skeleton className="col-span-4 h-20 rounded-xl" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <RecentActivitySkeleton />
            </CardContent>
          </Card>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const displayName = currentUser.name || currentUser.username || "Member";
  const avatarSrc = resolveAvatarUrl(currentUser.avatar, displayName);
  const hasRealPhoto =
    !!currentUser.avatar &&
    String(currentUser.avatar).trim() !== "" &&
    !/^https?:\/\/ui-avatars\.com\//i.test(String(currentUser.avatar).trim());
  const roleLabel = (currentUser.role || "member").replace(/_/g, " ");
  const joiningLabel = currentUser.joining_date
    ? new Date(currentUser.joining_date).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : currentUser.created_at
      ? new Date(currentUser.created_at).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : null;

  const details = onboardingHighlight?.details ?? null;
  const hrUser = onboardingHighlight?.user ?? null;

  const employeeCode =
    (currentUser.employee_code || hrUser?.employee_code || "").trim() || null;
  const jobTitle =
    (currentUser.job_title || hrUser?.job_title || "").trim() || null;
  const department =
    (currentUser.department || hrUser?.department || "").trim() || null;
  const contractLabel = formatContractType(
    currentUser.contract_type || hrUser?.contract_type
  );
  const reportsTo =
    (currentUser.reports_to_username || hrUser?.reports_to_username || "").trim() ||
    null;
  const dobLabel = formatShortDate(details?.date_of_birth);
  const locationLabel = [details?.city, details?.district, details?.state]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join(", ") || null;
  const bankLabel = details?.bank_name
    ? [details.bank_name, maskAccountNumber(details.account_number)]
        .filter(Boolean)
        .join(" · ")
    : null;
  const aadhaarStatus = details
    ? details.has_aadhaar_file || details.aadhaar_file_path
      ? details.aadhaar_number
        ? `•••• ${String(details.aadhaar_number).slice(-4)}`
        : "On file"
      : "Missing"
    : null;
  const panStatus = details
    ? details.has_pan_file || details.pan_file_path
      ? details.pan_number || "On file"
      : details.pan_number || "Missing"
    : null;
  const githubHref = (details?.github_url || "").trim() || null;
  const linkedinHref = (details?.linkedin_url || "").trim() || null;

  type ProfileMetric = {
    label: string;
    value: string | number;
    empty?: string;
    icon: typeof Briefcase;
    kind: "number" | "text";
    href?: string | null;
  };

  const statItems: ProfileMetric[] = [
    {
      label: "Projects",
      value: userStats?.total_projects ?? 0,
      empty: "—",
      icon: Briefcase,
      kind: "number",
    },
    ...(currentUser.role === "admin" || currentUser.role === "tester"
      ? [
          {
            label: "Bugs",
            value: userStats?.total_bugs ?? 0,
            empty: "—",
            icon: Bug,
            kind: "number" as const,
          },
        ]
      : []),
    ...(currentUser.role === "admin" || currentUser.role === "developer"
      ? [
          {
            label: "Fixes",
            value: userStats?.total_fixes ?? 0,
            empty: "—",
            icon: Code2,
            kind: "number" as const,
          },
        ]
      : []),
  ];

  const highlightItems: ProfileMetric[] = [
    ...(employeeCode
      ? [
          {
            label: "Employee ID",
            value: employeeCode,
            icon: Hash,
            kind: "text" as const,
          },
        ]
      : []),
    ...(jobTitle
      ? [
          {
            label: "Job title",
            value: jobTitle,
            icon: Briefcase,
            kind: "text" as const,
          },
        ]
      : []),
    ...(department
      ? [
          {
            label: "Department",
            value: department,
            icon: Building2,
            kind: "text" as const,
          },
        ]
      : []),
    ...(contractLabel
      ? [
          {
            label: "Contract",
            value: contractLabel,
            icon: BadgeCheck,
            kind: "text" as const,
          },
        ]
      : []),
    ...(reportsTo
      ? [
          {
            label: "Reports to",
            value: reportsTo,
            icon: User,
            kind: "text" as const,
          },
        ]
      : []),
    ...(dobLabel
      ? [
          {
            label: "Date of birth",
            value: dobLabel,
            icon: CalendarDays,
            kind: "text" as const,
          },
        ]
      : []),
    ...(locationLabel
      ? [
          {
            label: "Location",
            value: locationLabel,
            icon: MapPin,
            kind: "text" as const,
          },
        ]
      : []),
    ...(bankLabel
      ? [
          {
            label: "Salary bank",
            value: bankLabel,
            icon: Landmark,
            kind: "text" as const,
          },
        ]
      : []),
    ...(aadhaarStatus
      ? [
          {
            label: "Aadhaar",
            value: aadhaarStatus,
            icon: IdCard,
            kind: "text" as const,
          },
        ]
      : []),
    ...(panStatus
      ? [
          {
            label: "PAN",
            value: panStatus,
            icon: IdCard,
            kind: "text" as const,
          },
        ]
      : []),
    ...(githubHref
      ? [
          {
            label: "GitHub",
            value: "Profile",
            icon: Github,
            kind: "text" as const,
            href: githubHref,
          },
        ]
      : []),
    ...(linkedinHref
      ? [
          {
            label: "LinkedIn",
            value: "Profile",
            icon: Linkedin,
            kind: "text" as const,
            href: linkedinHref,
          },
        ]
      : []),
  ];

  const metricItems = [...statItems, ...highlightItems];
  const metricColSpan =
    metricItems.length >= 6
      ? "col-span-6 sm:col-span-4 lg:col-span-3"
      : metricItems.length >= 4
        ? "col-span-6 sm:col-span-3"
        : "col-span-6 sm:col-span-4";

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <TeamBirthdayBanner />
        {/* Identity */}
        <Card className="overflow-hidden border-border/60 bg-card/70 backdrop-blur shadow-sm">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-br from-muted/80 via-muted/40 to-transparent" />
            <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_55%)]" />
            <CardContent className="relative p-5 sm:p-6 lg:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-end gap-5 lg:gap-8">
                <div className="relative shrink-0 self-center lg:self-end -mt-1 sm:mt-2">
                  {hasRealPhoto ? (
                    <button
                      type="button"
                      className="h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-2xl overflow-hidden border-[3px] border-background shadow-xl bg-muted ring-1 ring-border/40 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
                      aria-label={`View ${displayName}'s profile photo`}
                      onClick={() => setPhotoPreviewOpen(true)}
                    >
                      <img
                        src={avatarSrc}
                        alt={`${displayName}'s profile photo`}
                        className="h-full w-full object-cover transition-opacity hover:opacity-90"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = resolveAvatarUrl(null, displayName);
                        }}
                      />
                    </button>
                  ) : (
                    <div className="h-28 w-28 sm:h-32 sm:w-32 lg:h-36 lg:w-36 rounded-2xl overflow-hidden border-[3px] border-background shadow-xl bg-muted ring-1 ring-border/40">
                      <img
                        src={avatarSrc}
                        alt={`${displayName}'s profile photo`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = resolveAvatarUrl(null, displayName);
                        }}
                      />
                    </div>
                  )}
                  {isFullFledgedUser(currentUser) ? (
                    <VerifiedBlueTick
                      size="lg"
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full ring-[3px] ring-background shadow-md"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-3 text-center lg:text-left">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                        {displayName}
                      </h1>
                      {isFullFledgedUser(currentUser) ? (
                        <VerifiedBlueTick size="md" className="lg:hidden" />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium capitalize text-foreground/90">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        {roleLabel}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        BugRicer Team
                      </span>
                      {canUseOnboarding &&
                      Number(currentUser.onboarding_completed ?? 0) === 1 ? (
                        <OnboardingVerificationBadge
                          status={currentUser.onboarding_verification_status}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 max-w-3xl mx-auto lg:mx-0">
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Username
                        </p>
                        <p className="text-sm font-medium truncate">
                          {currentUser.username}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Email
                        </p>
                        <p className="text-sm font-medium truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Phone
                        </p>
                        <p className="text-sm font-medium truncate">
                          {currentUser.phone || "Not provided"}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-12 sm:col-span-6 flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {currentUser.joining_date ? "Joined" : "Member since"}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {joiningLabel || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto lg:min-w-[160px]">
                  {canEditViaOnboarding || canEditBasicProfile ? (
                    <Button
                      className="h-11 rounded-xl px-5 font-medium shadow-sm"
                      onClick={() =>
                        canEditViaOnboarding
                          ? setEditOnboardingOpen(true)
                          : setEditBasicOpen(true)
                      }
                    >
                      <User className="w-4 h-4 mr-2" />
                      Edit profile
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => setShowPasswordResetConfirm(true)}
                    disabled={isResettingPassword}
                    className="h-11 rounded-xl px-5 font-medium"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {isResettingPassword ? "Sending…" : "Reset password"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(true)}
                    className="h-11 rounded-xl px-5 font-medium border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>

              {/* Compact metrics + most-wanted HR / onboarding highlights */}
              <div className="pt-1 border-t border-border/50">
                {isLoadingStats ? (
                  <div className="grid grid-cols-12 gap-3 pt-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton
                        key={i}
                        className="col-span-6 sm:col-span-4 lg:col-span-3 h-20 rounded-xl"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-12 gap-3 pt-4">
                    {metricItems.map((item) => {
                      const Icon = item.icon;
                      const display =
                        item.kind === "number"
                          ? Number(item.value) > 0
                            ? item.value
                            : item.empty || "—"
                          : String(item.value || item.empty || "—");
                      return (
                        <div
                          key={item.label}
                          className={cn(
                            "rounded-xl border border-border/50 bg-muted/20 px-4 py-3.5 min-w-0",
                            metricColSpan
                          )}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] font-medium uppercase tracking-wide truncate">
                              {item.label}
                            </span>
                          </div>
                          {item.href ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "font-semibold tracking-tight text-primary truncate hover:underline block",
                                item.kind === "number"
                                  ? "text-2xl tabular-nums"
                                  : "text-sm sm:text-base"
                              )}
                              title={String(display)}
                            >
                              {display}
                            </a>
                          ) : (
                            <p
                              className={cn(
                                "font-semibold tracking-tight text-foreground truncate",
                                item.kind === "number"
                                  ? "text-2xl tabular-nums"
                                  : "text-sm sm:text-base"
                              )}
                              title={String(display)}
                            >
                              {display}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Account integrations */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Connected accounts
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Google powers Docs & Sheets integrations
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!isCheckingGoogleConnection && (
                    <>
                      {!isGoogleConnected ? (
                        <Button
                          variant="outline"
                          onClick={handleConnectGoogle}
                          className="h-10 rounded-xl px-4 text-sm font-medium"
                          aria-label="Connect with Google"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Connect Google
                        </Button>
                      ) : (
                        <>
                          <span className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground max-w-full min-w-0">
                            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span className="truncate">
                              {connectedGoogleEmail || "Google connected"}
                            </span>
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => setShowDisconnectGoogleDialog(true)}
                            className="h-10 rounded-xl px-4 text-sm font-medium border-destructive/30 text-destructive hover:bg-destructive/10"
                            aria-label="Disconnect Google"
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Disconnect
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Logout Confirmation Modal */}
        <LogoutConfirmDialog open={showConfirm} onOpenChange={handleLogoutOpen} />

        <OnboardingWizard
          open={editOnboardingOpen}
          editMode
          userId={currentUser.id}
          employeeName={currentUser.name || currentUser.username || ""}
          employeePhone={currentUser.phone || ""}
          employeeEmail={currentUser.email || ""}
          mustSetPassword={false}
          onOpenChange={setEditOnboardingOpen}
          onCompleted={handleOnboardingEditCompleted}
        />

        <EditOwnProfileDialog
          open={editBasicOpen}
          onOpenChange={setEditBasicOpen}
          user={currentUser}
          onUpdated={handleBasicProfileUpdated}
        />

        {/* Password Reset Confirmation Modal */}
        {showPasswordResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-colors p-3 sm:p-4">
            <div className="bg-card border border-border/60 rounded-2xl shadow-2xl p-4 sm:p-6 w-[min(95vw,400px)] mx-auto animate-fadeIn">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-foreground flex items-center gap-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                Reset Password
              </h2>
              <p className="mb-4 sm:mb-6 text-sm text-muted-foreground leading-relaxed">
                A password reset link will be sent to{" "}
                <span className="font-semibold text-foreground">
                  {currentUser?.email}
                </span>
                . Check your inbox and follow the instructions.
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowPasswordResetConfirm(false)}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto h-11 rounded-xl"
                >
                  {isResettingPassword ? "Sending…" : "Send reset link"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8 sm:space-y-10">
          {currentUser.id && canUseOnboarding ? (
            <ProfileSection
              eyebrow="Employee records"
              title="Onboarding & documents"
              description="Address, statutory files, banking, and HR verification status from your onboarding submission."
            >
              <OnboardingProfileSection
                userId={currentUser.id}
                onboardingCompleted={currentUser.onboarding_completed}
                employeeName={currentUser.name || currentUser.username}
                employeeUsername={currentUser.username}
                employeeEmail={currentUser.email}
                employeePhone={currentUser.phone}
                employeeRole={currentUser.role}
                employeeAvatar={currentUser.avatar}
                employeeJoiningDate={currentUser.joining_date}
                employeeCode={currentUser.employee_code}
                employeeJobTitle={currentUser.job_title}
                employeeJobLevel={currentUser.job_level}
                employeeDepartment={currentUser.department}
                employeeReportsTo={currentUser.reports_to_username}
                employeeContractType={currentUser.contract_type}
                employeeOfferLetterIssued={currentUser.offer_letter_issued}
                employeeOfferLetterSharedDate={currentUser.offer_letter_shared_date}
                employeeProbationEndDate={currentUser.probation_end_date}
              />
            </ProfileSection>
          ) : null}

          {currentUser.id ? (
            <ProfileSection
              eyebrow="Time off"
              title="Leave overview"
              description="Balances and recent leave requests linked to your account."
            >
              <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <UserLeaveDetails
                    userId={currentUser.id}
                    username={currentUser.username || undefined}
                  />
                </CardContent>
              </Card>
            </ProfileSection>
          ) : null}

          {currentUser.id ? (
            <ProfileSection
              eyebrow="Performance"
              title="Work insights"
              description="Statistics, project portfolio, then active hours — in that order for a clear productivity view."
            >
              <div className="space-y-6">
                <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
                  <CardContent className="p-5 sm:p-6 space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight">
                        Work statistics
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Task and contribution breakdown for your role.
                      </p>
                    </div>
                    <UserWorkStats userId={currentUser.id} />
                  </CardContent>
                </Card>

                <UserProjectPortfolio userId={currentUser.id} />

                <Card className="border-border/60 bg-card/60 backdrop-blur shadow-sm">
                  <CardContent className="p-5 sm:p-6 space-y-5">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold tracking-tight">
                        Active hours
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Presence and hours logged across selected periods.
                      </p>
                    </div>
                    <ActiveHours
                      userId={currentUser.id}
                      userName={currentUser.username || currentUser.name || ""}
                    />
                  </CardContent>
                </Card>
              </div>
            </ProfileSection>
          ) : null}

          <ProfileSection
            eyebrow="Timeline"
            title={
              currentUser.role === "admin"
                ? "Recent activity"
                : currentUser.role === "tester"
                  ? "Recent bugs"
                  : "Recent fixes"
            }
            description="Your latest work items across BugRicer."
          >
          <Card className="shadow-sm border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="p-4 sm:p-5 lg:p-6 pb-0 sm:pb-0 lg:pb-0">
              {/* Enhanced Search and Filter Controls */}
              <div className="relative bg-muted/20 border border-border/50 rounded-2xl p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="Search activity by title..."
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-border/60 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 text-sm font-medium transition-all duration-200"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-background border-border/60 rounded-xl">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="bug">Bugs</SelectItem>
                            <SelectItem value="fix">Fixes</SelectItem>
                            <SelectItem value="project">Projects</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <Select value={activitySort} onValueChange={(v) => setActivitySort(v as any)}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-background border-border/60 rounded-xl">
                            <SelectValue placeholder="Sort" />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[60]">
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Clear Filters Button */}
                      {(activitySearch || activityType !== "all" || activitySort !== "newest") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActivitySearch("");
                            setActivityType("all");
                            setActivitySort("newest");
                          }}
                          className="h-11 px-4 rounded-xl font-medium"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              {/* Professional Responsive Pagination Controls - Only show if there are multiple pages */}
              {filteredActivity.length > 0 && totalPages > 1 && (
                <div className="flex flex-col gap-4 sm:gap-5 mb-6 w-full bg-gradient-to-r from-background via-background to-muted/10 rounded-xl shadow-sm border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  {/* Top Row - Results Info and Items Per Page */}
                  <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                      <span className="text-sm sm:text-base text-foreground font-semibold">
                        Showing{" "}
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>
                        -
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {Math.min(currentPage * itemsPerPage, totalFiltered)}
                        </span>{" "}
                        of{" "}
                        <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                          {totalFiltered}
                        </span>{" "}
                        activities
                      </span>
                    </div>
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-center sm:justify-end gap-2 sm:gap-3">
                      <span className="text-sm text-muted-foreground font-medium whitespace-nowrap self-center">
                        Items per page:
                      </span>
                      <div className="flex items-center gap-2 min-w-0 justify-center sm:justify-end">
                        <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                          <Rows3 className="h-4 w-4 text-white" />
                        </div>
                        <Select
                          value={String(itemsPerPage)}
                          onValueChange={(v) => setItemsPerPage(Number(v))}
                        >
                          <SelectTrigger
                            className="w-full sm:w-[92px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                            aria-label="Items per page"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" className="z-[100]">
                            {[10, 25, 50].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row - Pagination Navigation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 pt-0 sm:pt-0 border-t border-border/30">
                    {/* Page Info for Mobile */}
                    <div className="sm:hidden flex items-center gap-2 text-sm text-muted-foreground font-medium w-full justify-center">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                      Page{" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {currentPage}
                      </span>{" "}
                      of{" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalPages}
                      </span>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
                      {/* Previous Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <svg
                          className="w-4 h-4 mr-2 hidden sm:inline transition-transform duration-200 group-hover:-translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden text-lg">‹</span>
                      </Button>

                      {/* Page Numbers - Responsive Display */}
                      <div className="flex items-center gap-1.5">
                        {/* Always show first page on larger screens */}
                        <Button
                          variant={currentPage === 1 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(1)}
                          className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                        >
                          1
                        </Button>

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage > 4 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                            •••
                          </span>
                        )}

                        {/* Dynamic page numbers based on current page - show more on larger screens */}
                        {(() => {
                          const pages = [];
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);

                          for (let i = start; i <= end; i++) {
                            if (i > 1 && i < totalPages) {
                              pages.push(i);
                            }
                          }

                          return pages.map((page) => (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                            >
                              {page}
                            </Button>
                          ));
                        })()}

                        {/* Show ellipsis if needed on larger screens */}
                        {currentPage < totalPages - 3 && (
                          <span className="hidden md:inline-flex items-center justify-center h-10 w-10 text-sm text-muted-foreground/60 font-medium">
                            •••
                          </span>
                        )}

                        {/* Always show last page if more than 1 page on larger screens */}
                        {totalPages > 1 && (
                          <Button
                            variant={
                              currentPage === totalPages ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            className="h-10 w-10 p-0 hidden md:flex font-medium transition-all duration-200 hover:shadow-md hover:scale-105 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                          >
                            {totalPages}
                          </Button>
                        )}

                        {/* Mobile-friendly page selector */}
                        <PageJumpSelect
                          className="md:hidden"
                          currentPage={currentPage}
                          totalPages={totalPages}
                          onPageChange={setCurrentPage}
                        />
                      </div>

                      {/* Next Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="h-10 px-4 min-w-[90px] font-medium transition-all duration-200 hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border-border/60 hover:border-primary/50 hover:bg-primary/5"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden text-lg">›</span>
                        <svg
                          className="w-4 h-4 ml-2 hidden sm:inline transition-transform duration-200 group-hover:translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Button>
                    </div>

                    {/* Page Info for Desktop */}
                    <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground font-medium">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/60 rounded-full animate-pulse"></div>
                      Page{" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {currentPage}
                      </span>{" "}
                      of{" "}
                      <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalPages}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Simple results info when no pagination needed */}
              {filteredActivity.length > 0 && totalPages <= 1 && (
                <div className="flex flex-col sm:flex-row md:flex-row sm:items-center md:items-center justify-between gap-3 sm:gap-4 md:gap-4 mb-6 p-4 sm:p-5 bg-gradient-to-r from-background via-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/70 rounded-full animate-pulse"></div>
                    <span className="text-sm sm:text-base text-foreground font-semibold">
                      Showing{" "}
                      <span className="text-primary font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {totalFiltered}
                      </span>{" "}
                      activities
                    </span>
                  </div>
                  <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-center sm:justify-end gap-2 sm:gap-3">
                    <span className="text-sm text-muted-foreground font-medium whitespace-nowrap self-center">
                      Items per page:
                    </span>
                    <div className="flex items-center gap-2 min-w-0 justify-center sm:justify-end">
                      <div className="p-1.5 bg-emerald-500 rounded-lg shrink-0">
                        <Rows3 className="h-4 w-4 text-white" />
                      </div>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(v) => setItemsPerPage(Number(v))}
                      >
                        <SelectTrigger
                          className="w-full sm:w-[92px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                          aria-label="Items per page"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[100]">
                          {[10, 25, 50].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Content */}
              {isLoadingStats ? (
                <RecentActivitySkeleton />
              ) : filteredActivity.length === 0 ? (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-indigo-50/30 to-blue-50/50 dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-blue-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                      <Search className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Activity Found</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                      {activitySearch || activityType !== "all" || activitySort !== "newest"
                        ? "No activities match your current filters. Try adjusting your search criteria."
                        : "No recent activity to display. Your activities will appear here once you start using the system."}
                    </p>
                    {(activitySearch || activityType !== "all" || activitySort !== "newest") && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setActivitySearch("");
                          setActivityType("all");
                          setActivitySort("newest");
                        }}
                        className="h-12 px-6 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {paginatedActivity.map((activity, index) => {
                    const formattedDate = formatLocalDate(
                      activity.created_at,
                      "date"
                    );
                    const formattedTime = formatLocalDate(
                      activity.created_at,
                      "time"
                    );

                    // Navigation function based on activity type with role-based URLs
                    const handleGoTo = () => {
                      const baseUrl = currentUser?.role
                        ? `/${currentUser.role}`
                        : "";

                      if (activity.type === "bug") {
                        navigate(`${baseUrl}/bugs`);
                      } else if (activity.type === "fix") {
                        navigate(`${baseUrl}/fixes`);
                      } else if (activity.type === "project") {
                        navigate(`${baseUrl}/projects`);
                      }
                    };

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-3 sm:gap-4 text-sm sm:text-base break-words p-3 sm:p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 border border-transparent hover:border-purple-200/50 dark:hover:border-purple-800/50 shadow-sm hover:shadow-md"
                      >
                        {activity.type === "bug" ? (
                          <div className="p-2 bg-orange-500 rounded-lg mt-0.5 flex-shrink-0">
                            <Bug className="h-5 w-5 text-white" />
                          </div>
                        ) : activity.type === "fix" ? (
                          <div className="p-2 bg-green-500 rounded-lg mt-0.5 flex-shrink-0">
                            <Code2 className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <div className="p-2 bg-blue-500 rounded-lg mt-0.5 flex-shrink-0">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                            <p className="break-words max-w-[180px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[400px] font-medium text-foreground">
                              {activity.title}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                              <span className="text-muted-foreground font-medium">
                                {formattedDate}
                              </span>
                              <span className="text-muted-foreground">
                                {formattedTime}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  activity.type === "bug"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                                    : activity.type === "fix"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                                }`}
                              >
                                {activity.type === "bug"
                                  ? "Bug Report"
                                  : activity.type === "fix"
                                  ? "Bug Fix"
                                  : "Project"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(activity.created_at),
                                  {
                                    addSuffix: true,
                                  }
                                )}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGoTo}
                                className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/20 hover:border-primary"
                                title={`Go to ${
                                  currentUser?.role
                                    ? `${currentUser.role}/`
                                    : ""
                                }${
                                  activity.type === "bug"
                                    ? "bugs"
                                    : activity.type === "fix"
                                    ? "fixes"
                                    : "projects"
                                } page`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </ProfileSection>
        </div>

        {/* Profile photo lightbox */}
        <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
          <DialogContent
            showCloseButton={false}
            className="max-w-[min(92vw,560px)] w-auto p-3 sm:p-4 gap-3 rounded-2xl border-border/60 bg-background z-[1200]"
            overlayClassName="z-[1200] bg-black/85"
          >
            <div className="flex items-center justify-between gap-3 min-w-0">
              <DialogTitle className="text-base font-semibold truncate min-w-0">
                {displayName}
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground"
                  aria-label="Close photo preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
            <DialogDescription className="sr-only">
              Full-size profile photo for {displayName}
            </DialogDescription>
            <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-muted/40">
              <img
                src={avatarSrc}
                alt={`${displayName}'s profile photo`}
                className="max-h-[min(72vh,520px)] w-auto max-w-full object-contain"
                decoding="async"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Disconnect Google Confirmation Dialog */}
        <Dialog open={showDisconnectGoogleDialog} onOpenChange={setShowDisconnectGoogleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect Google Account?</DialogTitle>
              <DialogDescription>
                Are you sure you want to disconnect your Google account? This will revoke access to Google Docs and Calendar. You won't be able to create or manage documents and meetings until you reconnect.
              </DialogDescription>
            </DialogHeader>
            {connectedGoogleEmail && (
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Account: <span className="font-semibold text-gray-900 dark:text-white">{connectedGoogleEmail}</span></p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDisconnectGoogleDialog(false)}
                disabled={isDisconnectingGoogle}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisconnectGoogle}
                disabled={isDisconnectingGoogle}
              >
                {isDisconnectingGoogle ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Disconnect
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
}
