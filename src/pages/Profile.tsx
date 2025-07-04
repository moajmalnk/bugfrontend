import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { useAuth } from "@/context/AuthContext";
import { userService } from "@/services/userService";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  Bug,
  Code2,
  Github,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  LogOut,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Profile skeleton components
const ProfileHeaderSkeleton = () => (
  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
    <Skeleton className="w-32 h-32 rounded-full" />
    <div className="flex-1 text-center md:text-left">
      <Skeleton className="h-9 w-64 mb-2 mx-auto md:mx-0" />
      <Skeleton className="h-5 w-32 mb-4 mx-auto md:mx-0" />
      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>
    </div>
  </div>
);

const AboutCardSkeleton = () => (
  <Card className="md:col-span-2">
    <CardHeader>
      <Skeleton className="h-7 w-24" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-20 w-full" />
    </CardContent>
  </Card>
);

const LinksCardSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-7 w-24" />
    </CardHeader>
    <CardContent className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-6 w-32" />
    </CardContent>
  </Card>
);

const ActivityCardSkeleton = () => (
  <Card className="md:col-span-3">
    <CardHeader>
      <Skeleton className="h-7 w-40" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3].map((_, i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="w-2 h-2 mt-2 rounded-full" />
            <div className="w-full">
              <Skeleton className="h-5 w-44 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Stats skeleton component
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-8 w-12" />
    </div>
    <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-8 w-12" />
    </div>
  </div>
);

// Recent Activity skeleton component
const RecentActivitySkeleton = () => (
  <div className="bg-card rounded-lg p-4 shadow-sm min-h-[100px] overflow-x-auto">
    <Skeleton className="h-5 w-32 mb-3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);

export default function Profile() {
  const { currentUser, logout, isLoading, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch user statistics
  const { data: userStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["userStats", currentUser?.id],
    queryFn: () =>
      currentUser?.id
        ? userService.getUserStats(currentUser.id)
        : Promise.reject("User not logged in"),
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    // Fetch latest user data on mount
    if (currentUser?.id) {
      userService.getUsers().then((users) => {
        const freshUser = users.find((u) => u.id === currentUser.id);
        if (freshUser) {
          updateCurrentUser(freshUser);
        }
      });
    }
  }, [currentUser?.id, updateCurrentUser]);

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
        className="container max-w-4xl mx-auto py-8"
        aria-busy="true"
        aria-label="Loading profile"
      >
        {/* Top Bar with Skeleton Logout Button */}
        <div className="flex justify-end mb-6">
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Profile Header Skeleton */}
        <ProfileHeaderSkeleton />

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <Skeleton className="h-7 w-24" />
            </CardHeader>
            <CardContent>
              <StatsSkeleton />
            </CardContent>
          </Card>
          <LinksCardSkeleton />
          <Card className="md:col-span-3">
            <CardHeader>
              <Skeleton className="h-7 w-40" />
            </CardHeader>
            <CardContent>
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
    <div className="container max-w-4xl mx-auto py-8">
      {/* Top Bar with Logout Button */}
      <div className="flex justify-end mb-6 gap-2">
        <EditUserDialog
          user={currentUser}
          onUserUpdate={handleUserUpdate}
          loggedInUserRole={currentUser.role}
          trigger={
            <Button variant="outline" size="sm">
              Edit Profile
            </Button>
          }
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-colors">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-[90vw] max-w-md mx-4 animate-fadeIn">
            <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-500" />
              Confirm Logout
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              Are you sure you want to log out? You will need to sign in again
              to access your account.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setShowConfirm(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                Yes, Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              currentUser.name || currentUser.username
            )}&background=3b82f6&color=fff&size=128`}
            alt={currentUser.name || currentUser.username}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">
            {currentUser.name || currentUser.username}
          </h1>
          <p className="text-muted-foreground mb-4 capitalize">
            {currentUser.role}
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              {currentUser.email}
            </Button>
            {currentUser.phone && (
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                {currentUser.phone}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              BugRacer Team
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Section (Replaces About) */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <StatsSkeleton />
            ) : userStats ? (
              <div
                className={`grid gap-4 ${
                  currentUser?.role === "admin"
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Projects
                  </p>
                  <p className="text-2xl font-bold">
                    {userStats.total_projects > 0 ? (
                      userStats.total_projects
                    ) : (
                      <span className="text-muted-foreground text-base">
                        No projects
                      </span>
                    )}
                  </p>
                </div>

                {/* Role-based statistics */}
                {currentUser?.role === "admin" ? (
                  // Admin sees both Total Bugs and Total Fixes
                  <>
                    <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Bugs
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats.total_bugs > 0 ? (
                          userStats.total_bugs
                        ) : (
                          <span className="text-muted-foreground text-base">
                            No bugs
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
                      <p className="text-xs text-muted-foreground mb-1">
                        Total Fixes
                      </p>
                      <p className="text-2xl font-bold">
                        {userStats.total_fixes > 0 ? (
                          userStats.total_fixes
                        ) : (
                          <span className="text-muted-foreground text-base">
                            No fixes
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                ) : currentUser?.role === "tester" ? (
                  // Tester sees only Total Bugs
                  <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Bugs
                    </p>
                    <p className="text-2xl font-bold">
                      {userStats.total_bugs > 0 ? (
                        userStats.total_bugs
                      ) : (
                        <span className="text-muted-foreground text-base">
                          No bugs
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  // Developer sees only Total Fixes
                  <div className="bg-card rounded-lg p-4 flex flex-col items-center shadow-sm">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Fixes
                    </p>
                    <p className="text-2xl font-bold">
                      {userStats.total_fixes > 0 ? (
                        userStats.total_fixes
                      ) : (
                        <span className="text-muted-foreground text-base">
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
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="https://github.com/codoacademy"
              className="flex items-center text-muted-foreground hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 mr-2" />
              Github
            </a>
            <a
              href="https://www.linkedin.com/company/105054896/admin?lipi=urn%3Ali%3Apage%3Ad_flagship3_profile_view_base%3BJ1VB4Lv3ROO10lMF0Q2WfA%3D%3D"
              className="flex items-center text-muted-foreground hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin className="w-4 h-4 mr-2" />
              LinkedIn
            </a>
            <a
              href="https://www.codoacademy.com/"
              className="flex items-center text-muted-foreground hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Website
            </a>
            <a
              href="https://www.instagram.com/codo.ai/"
              className="flex items-center text-muted-foreground hover:text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </a>
          </CardContent>
        </Card>

        {/* Recent Activity Section */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>
              {currentUser?.role === "admin"
                ? "Recent Activity"
                : currentUser?.role === "tester"
                ? "Bugs Recent Activity"
                : "Fixes Recent Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <RecentActivitySkeleton />
            ) : userStats?.recent_activity &&
              userStats.recent_activity.length > 0 ? (
              <div className="space-y-2">
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
                  .map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-sm break-words"
                    >
                      {activity.type === "bug" ? (
                        <Bug className="h-4 w-4 mt-0.5 text-yellow-500" />
                      ) : activity.type === "fix" ? (
                        <Code2 className="h-4 w-4 mt-0.5 text-green-500" />
                      ) : (
                        <MapPin className="h-4 w-4 mt-0.5 text-blue-500" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="break-words max-w-[180px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[400px]">
                          {activity.title}
                        </p>
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
              <div className="text-muted-foreground text-center">
                No recent activity to display.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
