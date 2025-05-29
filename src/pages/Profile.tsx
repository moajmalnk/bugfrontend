import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  Github,
  Linkedin,
  Link as LinkIcon,
  LogOut,
  Mail,
  MapPin,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import handlePasswordChangeFromDialog, { ChangePasswordDialog } from "@/components/users/ChangePasswordDialog";

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

export default function Profile() {
  const { currentUser, logout, isLoading, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = useCallback(async () => {
    setShowConfirm(false);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [logout, navigate]);

  const handleUserUpdate = (updatedUser) => {
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
          <AboutCardSkeleton />
          <LinksCardSkeleton />
          <ActivityCardSkeleton />
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
      <div className="flex justify-end mb-6">
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
            <Button variant="outline" size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              BugRacer Team
            </Button>

            {/* Edit Profile and Change Password Buttons */}
            <EditUserDialog
              user={currentUser}
              onUserUpdate={handleUserUpdate}
              trigger={
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              }
            />
            <ChangePasswordDialog
              user={currentUser}
              onPasswordChange={handlePasswordChangeFromDialog}
              trigger={
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Experienced {currentUser.role} specializing in bug tracking and
              project management. Passionate about creating efficient and
              user-friendly solutions.
            </p>
          </CardContent>
        </Card>

        {/* Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href="#"
              className="flex items-center text-muted-foreground hover:text-primary"
            >
              <Github className="w-4 h-4 mr-2" />
              Github
            </a>
            <a
              href="#"
              className="flex items-center text-muted-foreground hover:text-primary"
            >
              <Linkedin className="w-4 h-4 mr-2" />
              LinkedIn
            </a>
            <a
              href="#"
              className="flex items-center text-muted-foreground hover:text-primary"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Portfolio
            </a>
          </CardContent>
        </Card>

        {/* Activity Section */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">Updated bug #{i + 1000}</p>
                    <p className="text-sm text-muted-foreground">
                      Changed status to "In Progress"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
