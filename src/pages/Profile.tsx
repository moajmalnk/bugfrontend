import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { useAuth } from "@/context/AuthContext";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { API_BASE_URL } from "@/lib/env";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Bug,
  Code2,
  Search,
  Github,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const { currentUser, logout, isLoading, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState<"all" | "bug" | "fix" | "project">("all");
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showPasswordResetConfirm, setShowPasswordResetConfirm] = useState(false);

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["userStats", currentUser?.id],
    queryFn: () =>
      currentUser?.id
        ? userService.getUserStats(currentUser.id)
        : Promise.reject("User not logged in"),
    enabled: !!currentUser?.id,
  });

  // Remove the problematic useEffect that was causing infinite requests
  // The user data is already available from AuthContext and doesn't need to be refetched

  const handleLogout = useCallback(async () => {
    setShowConfirm(false);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      // console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  const handleUserUpdate = (updatedUser) => {
    // // console.log("Updated user data received in handleUserUpdate:", updatedUser);
    updateCurrentUser(updatedUser);
  };

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
  const totalPages = Math.ceil(totalFiltered / itemsPerPage);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activitySearch, activityType, activitySort]);

  if (isLoading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
        <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Professional Header Skeleton */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-16 h-16 rounded-xl" />
                    <div>
                      <Skeleton className="h-8 w-48 mb-2" />
                      <Skeleton className="h-1 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-64" />
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Skeleton className="h-12 w-32" />
                  <Skeleton className="h-12 w-32" />
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <Card className="md:col-span-2 shadow-sm">
              <CardHeader className="p-4 sm:p-5 lg:p-6">
                <Skeleton className="h-7 w-24 sm:w-28" />
              </CardHeader>
              <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
                <StatsSkeleton />
              </CardContent>
            </Card>
            <LinksCardSkeleton />
            <Card className="md:col-span-3 shadow-sm">
              <CardHeader className="p-4 sm:p-5 lg:p-6">
                <Skeleton className="h-7 w-40 sm:w-44" />
              </CardHeader>
              <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
                <RecentActivitySkeleton />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-transparent to-indigo-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-indigo-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden shadow-lg">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentUser.name || currentUser.username
                      )}&background=8b5cf6&color=fff&size=128`}
                      alt={currentUser.name || currentUser.username}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      {currentUser.name || currentUser.username}
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl capitalize">
                  {currentUser.role} • BugRicer Team
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-2 h-12 px-6 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-colors p-3 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] max-w-md mx-auto animate-fadeIn">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
              Confirm Logout
            </h2>
            <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-600 dark:text-gray-300">
              Are you sure you want to log out? You will need to sign in again
              to access your account.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
              >
                Yes, Logout
              </Button>
            </div>
          </div>
        </div>
      )}

        {/* Password Reset Confirmation Modal */}
        {showPasswordResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-colors p-3 sm:p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-4 sm:p-6 w-[95vw] max-w-md mx-auto animate-fadeIn">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
                Reset Password
              </h2>
              <p className="mb-4 sm:mb-6 text-sm sm:text-base text-gray-600 dark:text-gray-300">
                A password reset link will be sent to your email address:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {currentUser?.email}
                </span>
                . Please check your inbox and follow the instructions to reset your password.
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowPasswordResetConfirm(false)}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white"
                >
                  {isResettingPassword ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 animate-pulse" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
              </Button>
            </div>
          </div>
        </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Stats Section */}
          <Card className="md:col-span-2 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500 rounded-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  Statistics
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              {isLoadingStats ? (
                <StatsSkeleton />
              ) : userStats ? (
                <div
                  className={`grid gap-3 sm:gap-4 ${
                    currentUser?.role === "admin"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4 sm:p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="p-2 bg-purple-500 rounded-lg mb-2">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center font-medium">
                      Total Projects
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {userStats.total_projects > 0 ? (
                        userStats.total_projects
                      ) : (
                        <span className="text-muted-foreground text-sm sm:text-base">
                          No projects
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Role-based statistics */}
                  {currentUser?.role === "admin" ? (
                    // Admin sees both Total Bugs and Total Fixes
                    <>
                      <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-4 sm:p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-orange-200/50 dark:border-orange-800/50">
                        <div className="p-2 bg-orange-500 rounded-lg mb-2">
                          <Bug className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center font-medium">
                          Total Bugs
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-700 dark:text-orange-300">
                          {userStats.total_bugs > 0 ? (
                            userStats.total_bugs
                          ) : (
                            <span className="text-muted-foreground text-sm sm:text-base">
                              No bugs
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 sm:p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-green-200/50 dark:border-green-800/50">
                        <div className="p-2 bg-green-500 rounded-lg mb-2">
                          <Code2 className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center font-medium">
                          Total Fixes
                        </p>
                        <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300">
                          {userStats.total_fixes > 0 ? (
                            userStats.total_fixes
                          ) : (
                            <span className="text-muted-foreground text-sm sm:text-base">
                              No fixes
                            </span>
                          )}
                        </p>
                      </div>
                    </>
                  ) : currentUser?.role === "tester" ? (
                    // Tester sees only Total Bugs
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-4 sm:p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-orange-200/50 dark:border-orange-800/50">
                      <div className="p-2 bg-orange-500 rounded-lg mb-2">
                        <Bug className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center font-medium">
                        Total Bugs
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-700 dark:text-orange-300">
                        {userStats.total_bugs > 0 ? (
                          userStats.total_bugs
                        ) : (
                          <span className="text-muted-foreground text-sm sm:text-base">
                            No bugs
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    // Developer sees only Total Fixes
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 sm:p-5 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200 border border-green-200/50 dark:border-green-800/50">
                      <div className="p-2 bg-green-500 rounded-lg mb-2">
                        <Code2 className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center font-medium">
                        Total Fixes
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 dark:text-green-300">
                        {userStats.total_fixes > 0 ? (
                          userStats.total_fixes
                        ) : (
                          <span className="text-muted-foreground text-sm sm:text-base">
                            No fixes
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-indigo-50/30 to-purple-50/50 dark:from-gray-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
                  <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-4">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-muted-foreground">
                      Could not load statistics.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links Section */}
          <Card className="shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <LinkIcon className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  Contact
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              <div className="flex items-start sm:items-center text-muted-foreground p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
                <div className="p-2 bg-blue-600 rounded-lg mr-3 flex-shrink-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-xs sm:text-sm md:text-base font-medium break-all min-w-0 flex-1">{currentUser.email}</span>
              </div>
              
              {currentUser.phone && (
                <div className="flex items-start sm:items-center text-muted-foreground p-3 sm:p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200/50 dark:border-green-800/50 shadow-sm">
                  <div className="p-2 bg-green-600 rounded-lg mr-3 flex-shrink-0">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm md:text-base font-medium break-all min-w-0 flex-1">{currentUser.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons Section */}
          <Card className="md:col-span-3 shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                <EditUserDialog
                  user={currentUser}
                  onUserUpdate={handleUserUpdate}
                  loggedInUserRole={currentUser.role}
                  trigger={
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] h-12 sm:h-14 px-8 sm:px-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      Edit Profile
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowPasswordResetConfirm(true)}
                  disabled={isResettingPassword}
                  className="w-full sm:w-auto min-w-[200px] sm:min-w-[220px] h-12 sm:h-14 px-8 sm:px-10 border-2 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  aria-label="Reset Password"
                >
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  {isResettingPassword ? "Sending..." : "Reset Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity Section */}
          <Card className="md:col-span-3 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-indigo-500 rounded-lg">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  {currentUser?.role === "admin"
                    ? "Recent Activity"
                    : currentUser?.role === "tester"
                    ? "Bugs Recent Activity"
                    : "Fixes Recent Activity"}
                </CardTitle>
              </div>
              
              {/* Enhanced Search and Filter Controls */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-indigo-50/30 dark:from-gray-800/30 dark:to-indigo-900/30 rounded-2xl"></div>
                <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Search activity by title..."
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* Type Filter */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-purple-500 rounded-lg shrink-0">
                          <Bug className="h-4 w-4 text-white" />
                        </div>
                        <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
                        <div className="p-1.5 bg-blue-500 rounded-lg shrink-0">
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                        <Select value={activitySort} onValueChange={(v) => setActivitySort(v as any)}>
                          <SelectTrigger className="w-full sm:w-[140px] md:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
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
                          className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
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
                    <div className="flex items-center justify-center sm:justify-end gap-3">
                      <label
                        htmlFor="items-per-page"
                        className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                      >
                        Items per page:
                      </label>
                      <div className="relative group">
                        <select
                          id="items-per-page"
                          value={itemsPerPage}
                          onChange={(e) =>
                            setItemsPerPage(Number(e.target.value))
                          }
                          className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                          aria-label="Items per page"
                        >
                          {[10, 25, 50].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                          <svg
                            className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
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
                        <div className="md:hidden flex items-center gap-3 bg-gradient-to-r from-muted/20 to-muted/30 rounded-lg px-3 py-2 border border-border/30 hover:border-primary/30 transition-all duration-200">
                          <select
                            value={currentPage}
                            onChange={(e) =>
                              setCurrentPage(Number(e.target.value))
                            }
                            className="border-0 bg-transparent text-sm font-semibold text-primary focus:outline-none focus:ring-0 min-w-[50px] cursor-pointer hover:text-primary/80 transition-colors duration-200"
                            aria-label="Go to page"
                          >
                            {Array.from({ length: totalPages }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1}
                              </option>
                            ))}
                          </select>
                          <span className="text-sm text-muted-foreground font-medium">
                            {" "}
                            <span className="text-primary font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                              {totalPages}
                            </span>
                          </span>
                        </div>
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
                  <div className="flex items-center justify-center sm:justify-end gap-3">
                    <label
                      htmlFor="items-per-page-simple"
                      className="text-sm text-muted-foreground font-medium whitespace-nowrap"
                    >
                      Items per page:
                    </label>
                    <div className="relative group">
                      <select
                        id="items-per-page-simple"
                        value={itemsPerPage}
                        onChange={(e) =>
                          setItemsPerPage(Number(e.target.value))
                        }
                        className="appearance-none border border-border/60 rounded-lg px-4 py-2.5 text-sm bg-background/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 min-w-[90px] font-medium group-hover:border-primary/40 group-hover:bg-background/90"
                        aria-label="Items per page"
                      >
                        {[10, 25, 50].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none transition-transform duration-200 group-hover:scale-110">
                        <svg
                          className="w-4 h-4 text-muted-foreground group-hover:text-primary/70"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
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
        </div>
      </section>
    </main>
  );
}
