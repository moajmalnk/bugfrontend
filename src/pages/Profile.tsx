import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { useAuth } from "@/context/AuthContext";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
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
  LogOut,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useCallback, useState } from "react";
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

  if (isLoading) {
    return (
      <div
        className="container max-w-4xl mx-auto px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8"
        aria-busy="true"
        aria-label="Loading profile"
      >
        {/* Top Bar with Skeleton Logout Button */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <Skeleton className="h-9 w-24 sm:w-28" />
        </div>

        {/* Profile Header Skeleton */}
        <ProfileHeaderSkeleton />

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="md:col-span-2">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <Skeleton className="h-7 w-24 sm:w-28" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              <StatsSkeleton />
            </CardContent>
          </Card>
          <LinksCardSkeleton />
          <Card className="md:col-span-3">
            <CardHeader className="p-4 sm:p-5 lg:p-6">
              <Skeleton className="h-7 w-40 sm:w-44" />
            </CardHeader>
            <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
              <RecentActivitySkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      {/* Top Bar with Logout Button */}
      <div className="flex flex-col sm:flex-row justify-end mb-4 sm:mb-6 gap-2 sm:gap-3">
        <EditUserDialog
          user={currentUser}
          onUserUpdate={handleUserUpdate}
          loggedInUserRole={currentUser.role}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
            >
              Edit Profile
            </Button>
          }
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          Logout
        </Button>
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

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              currentUser.name || currentUser.username
            )}&background=3b82f6&color=fff&size=128`}
            alt={currentUser.name || currentUser.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3">
            {currentUser.name || currentUser.username}
          </h1>
          <p className="text-muted-foreground mb-3 sm:mb-4 capitalize text-sm sm:text-base lg:text-lg">
            {currentUser.role}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center md:justify-start">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-a
              uto h-9 sm:h-10 text-xs sm:text-sm"
            >
              <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {currentUser.email}
            </Button>
            {currentUser.phone && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
              >
                <Phone className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {currentUser.phone}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm"
            >
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              BugRicer Team
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Stats Section (Replaces About) */}
        <Card className="md:col-span-2 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="p-4 sm:p-5 lg:p-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">
              Statistics
            </CardTitle>
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
                <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center">
                    Total Projects
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
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
                    <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center">
                        Total Bugs
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
                        {userStats.total_bugs > 0 ? (
                          userStats.total_bugs
                        ) : (
                          <span className="text-muted-foreground text-sm sm:text-base">
                            No bugs
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center">
                        Total Fixes
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
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
                  <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center">
                      Total Bugs
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
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
                  <div className="bg-card rounded-lg p-3 sm:p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-all duration-200">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2 text-center">
                      Total Fixes
                    </p>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
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
              <div className="text-muted-foreground text-center">
                Could not load statistics.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Links Section */}
        <Card className="shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="p-4 sm:p-5 lg:p-6">
            <CardTitle className="text-lg sm:text-xl lg:text-2xl">
              Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
            <a
              href="https://github.com/codoacademy"
              className="flex items-center text-muted-foreground hover:text-primary transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-muted/50"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
              <span className="text-sm sm:text-base font-medium">Github</span>
            </a>
            <a
              href="https://www.linkedin.com/company/105054896/admin?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base%3BJ1VB4Lv3ROO10lMF0Q2WfA%3D%3D"
              className="flex items-center text-muted-foreground hover:text-primary transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-muted/50"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
              <span className="text-sm sm:text-base font-medium">LinkedIn</span>
            </a>
            <a
              href="https://www.codoacademy.com/"
              className="flex items-center text-muted-foreground hover:text-primary transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-muted/50"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
              <span className="text-sm sm:text-base font-medium">Website</span>
            </a>
            <a
              href="https://www.instagram.com/codo.ai/"
              className="flex items-center text-muted-foreground hover:text-primary transition-colors duration-200 p-2 sm:p-3 rounded-lg hover:bg-muted/50"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
              <span className="text-sm sm:text-base font-medium">
                Instagram
              </span>
            </a>
          </CardContent>
        </Card>

        {/* Recent Activity Section */}
        <Card className="md:col-span-3 shadow-sm hover:shadow-md transition-all duration-200">
          <CardHeader className="p-4 sm:p-5 lg:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">
                  {currentUser?.role === "admin"
                    ? "Recent Activity"
                    : currentUser?.role === "tester"
                    ? "Bugs Recent Activity"
                    : "Fixes Recent Activity"}
                </CardTitle>
                <div className="hidden md:flex items-center gap-2">
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="bug">Bugs</SelectItem>
                      <SelectItem value="fix">Fixes</SelectItem>
                      <SelectItem value="project">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={activitySort} onValueChange={(v) => setActivitySort(v as any)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActivitySearch("");
                      setActivityType("all");
                      setActivitySort("newest");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search activity by title..."
                    value={activitySearch}
                    onChange={(e) => setActivitySearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
                  />
                </div>
                <div className="flex md:hidden items-center gap-2">
                  <Select value={activityType} onValueChange={(v) => setActivityType(v as any)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="bug">Bugs</SelectItem>
                      <SelectItem value="fix">Fixes</SelectItem>
                      <SelectItem value="project">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={activitySort} onValueChange={(v) => setActivitySort(v as any)}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActivitySearch("");
                      setActivityType("all");
                      setActivitySort("newest");
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 lg:p-6 pt-0 sm:pt-0 lg:pt-0">
            {isLoadingStats ? (
              <RecentActivitySkeleton />
            ) : userStats?.recent_activity &&
              userStats.recent_activity.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {userStats.recent_activity
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
                  })
                  .map((activity, index) => {
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
                        className="flex items-start gap-3 sm:gap-4 text-sm sm:text-base break-words p-3 sm:p-4 rounded-lg hover:bg-muted/30 transition-colors duration-200 border border-transparent hover:border-muted/50"
                      >
                        {activity.type === "bug" ? (
                          <Bug className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-yellow-500 flex-shrink-0" />
                        ) : activity.type === "fix" ? (
                          <Code2 className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <MapPin className="h-5 w-5 sm:h-6 sm:w-6 mt-0.5 text-blue-500 flex-shrink-0" />
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
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  activity.type === "bug"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
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
                                className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
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
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-muted-foreground text-center py-8">
                <div className="space-y-2">
                  <p className="text-sm sm:text-base">
                    No recent activity to display.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your activities will appear here once you start using the
                    system.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
