import { BugContentCards } from "@/components/bugs/details/BugContentCards";
import { BugDetailsCard } from "@/components/bugs/details/BugDetailsCard";
import { BugHeader, BugHeaderSkeletonDetailed } from "@/components/bugs/details/BugHeader";
import { BugNotFound } from "@/components/bugs/details/BugNotFound";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ENV } from "@/lib/env";
import { formatDetailedDate } from "@/lib/dateUtils";
import { sendBugStatusUpdateNotification } from "@/services/emailService";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { Bug, BugStatus } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Lock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from 'react';

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
    <section className="max-w-7xl mx-auto space-y-8 flex flex-col items-center justify-center text-center py-12">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to view this bug. You need to be a member of the project this bug belongs to.
      </p>
    </section>
  </main>
);

const BugDetails = () => {
  const { bugId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [skeletonLoading, setSkeletonLoading] = useState(true);

  useEffect(() => {
    // No timer needed, skeleton loading will be controlled by query status
  }, []);

  const {
    data: bug,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["bug", bugId],
    queryFn: async () => {
      // Set skeleton loading when starting to fetch data
      setSkeletonLoading(true);
      
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
  });

  useEffect(() => {
    refetch();
    
    // Turn off skeleton loading when we have bug data or an error
    if (bug || error) {
      setSkeletonLoading(false);
    }
  }, [bugId, refetch, bug, error]);

  // Check if this is an access error
  const isAccessError = error && (
    (error as Error).message?.toLowerCase().includes('access') || 
    (error as Error).message?.toLowerCase().includes('permission') || 
    (error as Error).message?.toLowerCase().includes('forbidden') ||
    (error as Error).message?.toLowerCase().includes('403')
  );

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

  if (skeletonLoading || isLoading) {
    return renderSkeleton();
  }

  if (isAccessError) {
    return <AccessError />;
  }

  if (error || !bug) {
    return (
      <main>
        <BugNotFound />
      </main>
    );
  }

  const formattedCreatedDate = formatDetailedDate(bug.created_at);
  const formattedUpdatedDate = formatDetailedDate(bug.updated_at);

  const canUpdateStatus =
    currentUser?.role === "admin" || currentUser?.role === "developer";
  const canEditBug = currentUser?.role === "admin";

  const handleStatusUpdate = async (newStatus: BugStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put<ApiResponse<Bug>>(
        `${ENV.API_URL}/bugs/update.php`,
        {
          id: bug.id,
          status: newStatus,
          updated_by: currentUser?.id, // Add the current user's ID as the updater
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
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
          console.log("Broadcast notification sent for status change");
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

  return (
    <main className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8">
      <section className="max-w-7xl mx-auto space-y-8">
        <header>
          <BugHeader
            bug={bug}
            formattedCreatedDate={formattedCreatedDate}
            canEditBug={canEditBug}
            currentUser={currentUser}
          />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Description and Screenshots */}
          <section className="lg:col-span-2 space-y-8">
            <BugContentCards bug={bug} />
          </section>

          {/* Sidebar - Bug Details */}
          <aside className="space-y-8">
            <BugDetailsCard
              bug={bug}
              canUpdateStatus={canUpdateStatus}
              updateBugStatus={handleStatusUpdate}
              formattedUpdatedDate={formattedUpdatedDate}
            />
          </aside>
        </div>
      </section>
    </main>
  );
};

export default BugDetails;
