import { BugContentCards } from "@/components/bugs/details/BugContentCards";
import { BugDetailsCard } from "@/components/bugs/details/BugDetailsCard";
import {
  BugHeader,
  BugHeaderSkeletonDetailed,
} from "@/components/bugs/details/BugHeader";
import { BugNotFound } from "@/components/bugs/details/BugNotFound";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { formatDetailedDate } from "@/lib/dateUtils";
import { ENV } from "@/lib/env";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { bugService } from "@/services/bugService";
import { sendBugStatusUpdateNotification } from "@/services/emailService";
import { notificationService } from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { Bug, BugStatus } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/axios";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Skeleton components for loading state
const BugHeaderSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-2">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-6 w-24" />
    </div>
    <Skeleton className="h-8 w-4/5 max-w-2xl" />
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-6 w-24 rounded-full" />
      <Skeleton className="h-6 w-32 rounded-full" />
      <div className="hidden sm:flex ml-auto gap-2">
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  </div>
);

const BugDescriptionSkeleton = () => (
  <Card className="overflow-hidden">
    <CardHeader className="pb-3">
      <Skeleton className="h-6 w-24" />
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </CardContent>
  </Card>
);

const BugScreenshotsSkeleton = () => (
  <Card>
    <CardHeader className="pb-3">
      <Skeleton className="h-6 w-32" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-full aspect-[16/10] rounded-md" />
        ))}
      </div>
    </CardContent>
  </Card>
);

const BugDetailsSkeleton = () => (
  <div className="w-full max-w-full sm:max-w-sm mx-auto">
    <Card className="w-full h-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-2 py-3 border-t border-border">
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Component to display access error
const AccessError = () => (
  <main className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8">
    <section className="max-w-7xl mx-auto space-y-8 flex flex-col items-center justify-center text-center py-12 relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20" />
      <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl">
        <Lock className="h-12 w-12 text-white" />
      </div>
      <h1 className="relative text-2xl font-bold tracking-tight">Access Denied</h1>
      <p className="relative text-muted-foreground max-w-md">
        You don't have permission to view this bug. You need to be a member of the project this bug belongs to.
      </p>
    </section>
  </main>
);

const BugDetails = () => {
  // All hooks at the top!
  const { bugId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [bugList, setBugList] = useState<Bug[]>([]);
  const [bugListLoading, setBugListLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  // Check if user came from project page
  const fromProject = searchParams.get("from") === "project";

  const {
    data: bug,
    isLoading,
    error,
    refetch,
    isFetching,
    isStale,
  } = useQuery({
    queryKey: ["bug", bugId],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get<ApiResponse<Bug>>(
        `${ENV.API_URL}/bugs/get.php?id=${bugId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || "Failed to fetch bug details");
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (renamed from cacheTime in v5)
  });

  useEffect(() => {
    // Only refetch if we don't have cached data or if it's stale
    if (!bug || isStale) {
      refetch();
    }
  }, [bugId, refetch, bug, isStale]);

  // Set project ID when we first detect we're coming from a project page
  useEffect(() => {
    if (fromProject && bug && !projectId) {
      setProjectId(bug.project_id);
    } else if (!fromProject && projectId) {
      // Clear project ID if we're no longer in project context
      setProjectId(null);
    }
  }, [fromProject, bug, projectId]);

  // Fetch bugs for navigation - filter by project if coming from project page
  useEffect(() => {
    let isMounted = true;
    setBugListLoading(true);
    
    // If coming from project page, we need to get the project ID from the current bug
    // We'll fetch all bugs first, then filter by project if needed
    bugService
      .getBugs({
        page: 1,
        limit: 1000,
        userId: currentUser?.id,
      })
      .then((res) => {
        if (isMounted) {
          let filteredBugs = res.bugs;
          
          // If coming from project page, filter by the stored project ID
          if (fromProject && projectId) {
            filteredBugs = res.bugs.filter(b => b.project_id === projectId);
          }
          
          setBugList(filteredBugs);
          setBugListLoading(false);
        }
      })
      .catch(() => setBugListLoading(false));
    return () => {
      isMounted = false;
    };
  }, [fromProject, projectId, currentUser?.id]);

  // Check if this is an access error
  const isAccessError =
    error &&
    ((error as Error).message?.toLowerCase().includes("access") ||
      (error as Error).message?.toLowerCase().includes("permission") ||
      (error as Error).message?.toLowerCase().includes("forbidden") ||
      (error as Error).message?.toLowerCase().includes("403"));

  // Show skeleton only when:
  // 1. Initial loading (no cached data) OR
  // 2. We have no bug data and we're currently loading/fetching
  const shouldShowSkeleton = (isLoading && !bug) || (!bug && isFetching);

  // Function to render skeleton UI
  const renderSkeleton = () => (
    <main
      className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8"
      aria-busy="true"
      aria-label="Loading bug details"
    >
      <section className="max-w-7xl mx-auto space-y-8">
        <header>
          <BugHeaderSkeletonDetailed />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Description and Screenshots Skeletons */}
          <section className="lg:col-span-2 space-y-8">
            <BugDescriptionSkeleton />
            <BugScreenshotsSkeleton />
          </section>

          {/* Sidebar - Bug Details Skeleton */}
          <aside className="space-y-8">
            <BugDetailsSkeleton />
          </aside>
        </div>
      </section>
    </main>
  );

  // Now you can do your early returns
  if (shouldShowSkeleton) return renderSkeleton();
  if (isAccessError) return <AccessError />;
  if (error || !bug)
    return (
      <main>
        <BugNotFound />
      </main>
    );

  const formattedCreatedDate = formatDetailedDate(bug.created_at);
  const formattedUpdatedDate = formatDetailedDate(bug.updated_at);

  const canUpdateStatus =
    currentUser?.role === "admin" || currentUser?.role === "developer";
  const canEditBug = currentUser?.role === "admin";

  const handleStatusUpdate = async (newStatus: BugStatus) => {
    try {
      const token = localStorage.getItem("token");
      await apiClient.post<ApiResponse<Bug>>(
        '/bugs/update.php',
        {
          id: bug.id,
          status: newStatus,
          updated_by: currentUser?.id, // Add the current user's ID as the updater
        }
      );

      // Update local bugList state immediately
      setBugList((prevList) =>
        prevList.map((b) =>
          b.id === bug.id
            ? {
                ...b,
                status: newStatus,
                updated_by: currentUser?.id,
                updated_by_name: currentUser?.name,
              }
            : b
        )
      );

      // Send notification if new status is "fixed"
      if (newStatus === "fixed" && bug.status !== "fixed") {
        try {
          const bugData = {
            ...bug,
            status: newStatus,
            updated_by_name: currentUser?.name || "Bug Ricer", // Include updater name in notification
          };

          // Send email notification
          await sendBugStatusUpdateNotification(bugData);

          // Broadcast browser notification to all users
          await broadcastNotificationService.broadcastStatusChange(
            bug.title,
            bug.id,
            newStatus,
            currentUser?.name || "Bug Ricer User"
          );
          //console.log("Broadcast notification sent for status change");

          // Check if WhatsApp notifications are enabled and share
          const notificationSettings = notificationService.getSettings();
          if (
            notificationSettings.whatsappNotifications &&
            notificationSettings.statusChangeNotifications
          ) {
            whatsappService.shareStatusUpdate({
              bugTitle: bug.title,
              bugId: bug.id,
              status: newStatus,
              priority: bug.priority,
              updatedBy: currentUser?.name || "Bug Ricer User",
              projectName: bug.project_name || bug.project_id,
            });
            // console.log("WhatsApp share opened for status change");
          }
        } catch (notificationError) {
          // // console.error("Failed to send notification:", notificationError);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["bug", bug.id] });
      queryClient.invalidateQueries({ queryKey: ["bugs"] });

      toast({
        title: "Success",
        description: "Bug status updated successfully",
      });
    } catch (error) {
      // // console.error("Failed to update bug status:", error);
      toast({
        title: "Error",
        description: "Failed to update bug status",
        variant: "destructive",
      });
    }
  };

  // Find current bug index
  // Check if user came from fixes page via URL parameter
  const fromFixes = searchParams.get("from") === "fixes";
  
  const filteredBugList = bugList.filter(
    (b) => {
      // If coming from fixes page, show only fixed bugs
      if (fromFixes) {
        return b.status === "fixed" || b.id === bugId; // Always include the current bug
      }
      // Otherwise, show non-fixed bugs (original behavior)
      return ["pending", "in_progress", "declined", "rejected"].includes(b.status) || b.id === bugId;
    }
  );
  const currentIndex = filteredBugList.findIndex((b) => b.id === bugId);
  const prevBugId =
    currentIndex > 0 ? filteredBugList[currentIndex - 1]?.id : null;
  const nextBugId =
    currentIndex >= 0 && currentIndex < filteredBugList.length - 1
      ? filteredBugList[currentIndex + 1]?.id
      : null;
  const totalBugs = filteredBugList.length;

  const role = currentUser?.role || "admin";

  return (
    <main className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8 flex flex-col">
      {/* Background refetch indicator */}
      {isFetching && bug && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-md shadow-md text-sm font-medium animate-pulse">
            Updating...
          </div>
        </div>
      )}
      {/* Main content */}
      <section className="max-w-7xl mx-auto space-y-8 flex-1 w-full">
        <header className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20"></div>
          <div className="relative p-4 sm:p-6">
            <BugHeader
              bug={bug}
              formattedCreatedDate={formattedCreatedDate}
              canEditBug={canEditBug}
              currentUser={currentUser}
            />
          </div>
        </header>
        <div className="grid grid-cols-1 gap-8">
          {/* Main Content - Description, Screenshots, Voice Notes, Attachments, Bug Information */}
          <section className="space-y-8">
            <BugContentCards bug={bug} />
          </section>
          {/* Move Bug Details below Bug Information as requested */}
          <section className="space-y-8">
            <BugDetailsCard
              bug={bug}
              canUpdateStatus={canUpdateStatus}
              updateBugStatus={handleStatusUpdate}
              formattedUpdatedDate={formattedUpdatedDate}
            />
          </section>
        </div>
      </section>
      {/* Professional navigation bar at the bottom */}
      <nav className="w-full mt-8">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/40 to-orange-50/40 dark:from-gray-800/20 dark:to-orange-900/20" />
          <div className="relative w-full flex justify-center items-center gap-6 py-4 px-4">
            <button
              className="flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
          onClick={() => {
            if (prevBugId) {
              let url = `/${role}/bugs/${prevBugId}`;
              if (fromProject) {
                url += '?from=project';
              } else if (fromFixes) {
                url += '?from=fixes';
              }
              navigate(url);
            }
          }}
          disabled={!prevBugId || bugListLoading}
          aria-label="Previous Bug"
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Previous
            </button>
            <span className="text-sm font-medium text-muted-foreground select-none">
          {totalBugs > 0
            ? fromFixes 
              ? `Fixed Bug ${currentIndex + 1} of ${totalBugs}`
              : `Bug ${currentIndex + 1} of ${totalBugs}`
            : fromFixes 
              ? "No fixed bugs"
              : "No bugs"}
            </span>
            <button
              className="flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
          onClick={() => {
            if (nextBugId) {
              let url = `/${role}/bugs/${nextBugId}`;
              if (fromProject) {
                url += '?from=project';
              } else if (fromFixes) {
                url += '?from=fixes';
              }
              navigate(url);
            }
          }}
          disabled={!nextBugId || bugListLoading}
          aria-label="Next Bug"
        >
          Next <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>
    </main>
  );
};

export default BugDetails;
