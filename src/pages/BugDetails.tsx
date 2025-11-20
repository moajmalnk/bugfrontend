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
import { apiClient } from "@/lib/axios";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";

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

// Enhanced logging for production debugging
const createDiagnosticLogger = (componentName: string) => {
  const logs: Array<{ time: number; message: string; data?: any }> = [];
  const MAX_LOGS = 50;

  return {
    log: (message: string, data?: any) => {
      const timestamp = Date.now();
      const logEntry = { time: timestamp, message, data };
      logs.push(logEntry);
      
      // Keep only last MAX_LOGS entries
      if (logs.length > MAX_LOGS) {
        logs.shift();
      }
      
      // Always log to console in production for debugging
      console.log(`[${componentName}]`, message, data || '');
      
      // Store in window for global access
      if (typeof window !== 'undefined') {
        (window as any).__BUG_DETAILS_LOGS__ = logs;
      }
    },
    getLogs: () => logs,
    clearLogs: () => logs.length = 0,
    exportLogs: () => {
      return JSON.stringify(logs, null, 2);
    }
  };
};

const diagnosticLogger = createDiagnosticLogger('BugDetails');

const BugDetails = () => {
  // All hooks at the top!
  const { bugId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [bugList, setBugList] = useState<Bug[]>([]);
  const [bugListLoading, setBugListLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigationFallbackRef = useRef<NodeJS.Timeout | null>(null);
  const lastTargetUrlRef = useRef<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingToBugIdRef = useRef<string | null>(null);
  const previousLocationRef = useRef<string>(location.pathname);
  const exitReloadRef = useRef(false);
  const chunkLoadErrorRef = useRef(false);
  const chunkReloadScheduledRef = useRef(false);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  // Track render performance
  renderCountRef.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTimeRef.current;
  lastRenderTimeRef.current = now;
  
  // Log slow renders (potential freeze indicator)
  if (timeSinceLastRender > 1000 && renderCountRef.current > 1) {
    diagnosticLogger.log('Slow render detected', {
      timeSinceLastRender,
      renderCount: renderCountRef.current,
      bugId,
      pathname: location.pathname
    });
  }
  
  // Initial mount logging - expose diagnostic tools
  useEffect(() => {
    diagnosticLogger.log('Component mounted', {
      bugId,
      pathname: location.pathname,
      userId: currentUser?.id,
      userRole: currentUser?.role,
      renderCount: renderCountRef.current
    });
    
    // Expose diagnostic tools to window
    if (typeof window !== 'undefined') {
      (window as any).__BUG_DETAILS_DIAGNOSTIC__ = {
        getLogs: () => diagnosticLogger.getLogs(),
        exportLogs: () => diagnosticLogger.exportLogs(),
        clearLogs: () => diagnosticLogger.clearLogs(),
        getQueryCache: () => queryClient.getQueryCache().getAll(),
        clearQueryCache: () => queryClient.clear(),
        navigateToDiagnostic: () => {
          if (bugId && currentUser?.role) {
            window.location.href = `/${currentUser.role}/bugs/${bugId}/diagnostic`;
          }
        }
      };
      
      console.log('[BugDetails] Diagnostic tools available at window.__BUG_DETAILS_DIAGNOSTIC__');
    }
    
    return () => {
      diagnosticLogger.log('Component unmounting', {
        bugId,
        renderCount: renderCountRef.current
      });
    };
  }, [bugId, currentUser?.id, currentUser?.role, queryClient]); // Include dependencies for diagnostic tools
  const isBugRoute = useMemo(() => {
    const onBugRoute = location.pathname.includes("/bugs/");
    console.debug("[BugDetails] isBugRoute computed", {
      pathname: location.pathname,
      onBugRoute,
    });
    return onBugRoute;
  }, [location.pathname]);
  
  const markChunkLoadError = useCallback((maybeError: unknown) => {
    if (!maybeError) {
      return;
    }

    const extractMessage = (value: unknown): string | undefined => {
      if (!value) return undefined;
      if (typeof value === "string") return value;
      if (value instanceof Error) return value.message;
      if (typeof (value as { message?: string }).message === "string") {
        return (value as { message: string }).message;
      }
      if (typeof (value as { reason?: unknown }).reason === "string") {
        return (value as { reason: string }).reason;
      }
      const reasonMessage = (value as { reason?: { message?: string } })?.reason?.message;
      if (typeof reasonMessage === "string") {
        return reasonMessage;
      }
      return undefined;
    };

    const message = extractMessage(maybeError);
    if (!message) {
      return;
    }

    const normalizedMessage = message.toLowerCase();
    const matchesChunkError =
      normalizedMessage.includes("chunkloaderror") ||
      normalizedMessage.includes("loading chunk") ||
      normalizedMessage.includes("failed to fetch dynamically imported module") ||
      normalizedMessage.includes("error loading dynamically imported module") ||
      normalizedMessage.includes("import()") ||
      normalizedMessage.includes("imported module");

    console.warn("[BugDetails] markChunkLoadError invoked", { message });

    if (matchesChunkError) {
      chunkLoadErrorRef.current = true;
      console.warn("[BugDetails] Detected chunk load error, enabling hard reload fallback", {
        message,
      });

      if (!chunkReloadScheduledRef.current) {
        chunkReloadScheduledRef.current = true;
        setTimeout(() => {
          if (!window.location.pathname.includes("/bugs/")) {
            console.warn("[BugDetails] Chunk error encountered outside bug route, forcing reload");
            window.location.reload();
          }
          chunkReloadScheduledRef.current = false;
        }, 250);
      }
    }
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      markChunkLoadError(event?.reason);
    };
    const handleErrorEvent = (event: ErrorEvent) => {
      markChunkLoadError(event?.error ?? event?.message);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleErrorEvent);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleErrorEvent);
    };
  }, [markChunkLoadError]);
  
  const clearNavigationState = useCallback(
    (options?: {
      reason?: "success" | "timeout" | "cancelled";
      targetId?: string;
      targetUrl?: string;
    }) => {
      console.groupCollapsed("[BugDetails] clearNavigationState");
      console.log("reason", options?.reason);
      console.log("targetId", options?.targetId);
      console.log("targetUrl", options?.targetUrl);
      console.log("currentPath", location.pathname);
      console.log("isNavigating (before reset)", isNavigating);
      console.groupEnd();

      const fallbackUrl = options?.targetUrl ?? lastTargetUrlRef.current ?? undefined;
      
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }

      if (navigationFallbackRef.current) {
        clearTimeout(navigationFallbackRef.current);
        navigationFallbackRef.current = null;
      }

      navigatingToBugIdRef.current = null;
      setIsNavigating(false);

      if (options?.reason === "timeout") {
        toast({
          title: "Still loading",
          description:
            "Navigation is taking longer than expected. Please check your connection and try again.",
          variant: "default",
        });

        if (chunkLoadErrorRef.current && fallbackUrl) {
          console.warn("BugDetails: navigation timeout with chunk error, forcing hard reload", {
              targetUrl: fallbackUrl,
              currentPath: window.location.pathname,
            });
            window.location.assign(fallbackUrl);
          chunkLoadErrorRef.current = false;
        }
      }
      
      lastTargetUrlRef.current = null;
      chunkLoadErrorRef.current = false;
    },
    [toast]
  );
  
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
      const fetchStartTime = performance.now();
      diagnosticLogger.log('Bug fetch started', { bugId });
      
      try {
        // apiClient handles token and impersonation automatically
        const response = await apiClient.get<ApiResponse<Bug>>(
          `/bugs/get.php?id=${bugId}`
        );
        
        const fetchDuration = performance.now() - fetchStartTime;
        
        if (response.data.success) {
          diagnosticLogger.log('Bug fetch successful', {
            bugId,
            duration: fetchDuration,
            hasAttachments: !!response.data.data?.attachments,
            attachmentsCount: response.data.data?.attachments?.length || 0,
          });
          
          // Log slow fetches
          if (fetchDuration > 3000) {
            diagnosticLogger.log('WARNING: Slow bug fetch', {
              duration: fetchDuration,
              bugId
            });
          }
          
          return response.data.data;
        }
        
        const errorMsg = response.data.message || "Failed to fetch bug details";
        diagnosticLogger.log('Bug fetch failed (no data)', { bugId, error: errorMsg });
        throw new Error(errorMsg);
      } catch (err: any) {
        const fetchDuration = performance.now() - fetchStartTime;
        diagnosticLogger.log('Bug fetch error', {
          bugId,
          duration: fetchDuration,
          error: err.message || 'Unknown error',
          errorType: err.name,
        });
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // Match global config: 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnMount: (query) => {
      // Only refetch if data is stale or doesn't exist
      return !query.state.data || query.isStale();
    },
    refetchOnWindowFocus: false, // Already set globally but be explicit
    enabled: isBugRoute && Boolean(bugId),
    // Prevent excessive refetching
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Track location changes to detect navigation completion - Clean and efficient
  useEffect(() => {
    console.debug("[BugDetails] location change detected", {
      pathname: location.pathname,
      bugId,
      isBugRoute,
    });

    const currentPath = location.pathname;
    const pathChanged = previousLocationRef.current !== currentPath;
    
    if (pathChanged) {
      const pathBugId = currentPath.split('/bugs/')[1]?.split('?')[0];
      previousLocationRef.current = currentPath;
      
      // Clear navigation state when we reach the target bug
      if (navigatingToBugIdRef.current && pathBugId === navigatingToBugIdRef.current) {
        clearNavigationState({ reason: "success" });
      } else if (navigatingToBugIdRef.current && pathBugId && pathBugId !== navigatingToBugIdRef.current) {
        // Navigation was interrupted or redirected
        clearNavigationState({ reason: "cancelled" });
      } else if (navigatingToBugIdRef.current && !pathBugId) {
        // Navigated away from bug detail routes entirely
        clearNavigationState({ reason: "cancelled" });
      }
    }
    
    // Fallback: Clear navigation state if bugId param matches target
    if (navigatingToBugIdRef.current && bugId === navigatingToBugIdRef.current) {
      clearNavigationState({ reason: "success" });
    }
  }, [location.pathname, bugId, clearNavigationState]);

  // Consolidated navigation success detection - prevents duplicate checks
  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const targetId = navigatingToBugIdRef.current;
    if (!targetId) {
      return;
    }

    // Check if navigation succeeded by matching bugId or loaded bug data
    const navigationSucceeded = 
      (targetId === bugId) || 
      (!isFetching && !isLoading && bug?.id === targetId);

    if (navigationSucceeded) {
      clearNavigationState({ reason: "success" });
    }
  }, [bugId, bug?.id, isNavigating, isFetching, isLoading, clearNavigationState]);

  // Remove manual refetch - React Query handles this automatically with refetchOnMount
  // The query will refetch when bugId changes if data is stale or missing

  useEffect(() => {
    if (!isBugRoute) {
      clearNavigationState({ reason: "cancelled" });
      chunkLoadErrorRef.current = false;
      chunkReloadScheduledRef.current = false;
      exitReloadRef.current = false;
      return;
    }
    exitReloadRef.current = false;
  }, [isBugRoute, clearNavigationState]);

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      if (navigationFallbackRef.current) {
        clearTimeout(navigationFallbackRef.current);
        navigationFallbackRef.current = null;
      }
      
      // Reset all refs
      navigatingToBugIdRef.current = null;
      lastTargetUrlRef.current = null;
      chunkLoadErrorRef.current = false;
      chunkReloadScheduledRef.current = false;
      exitReloadRef.current = false;
      
      // Reset state
      setIsNavigating(false);
    };
  }, []);

  // Set project ID when we first detect we're coming from a project page
  useEffect(() => {
    if (fromProject && bug && !projectId) {
      setProjectId(bug.project_id);
    } else if (!fromProject && projectId) {
      // Clear project ID if we're no longer in project context
      setProjectId(null);
    }
  }, [fromProject, bug, projectId]);

  // Fetch bugs for navigation - optimized to prevent UI freeze
  useEffect(() => {
    let isMounted = true;
    
    diagnosticLogger.log('Bug list fetch effect triggered', {
      fromProject,
      projectId,
      userId: currentUser?.id
    });
    
    // Debounce to prevent rapid refetches
    const timeoutId = setTimeout(() => {
      const fetchStartTime = performance.now();
      setBugListLoading(true);
      diagnosticLogger.log('Bug list fetch started', { fromProject, projectId });
      
      // Use smaller limit initially - fetch only what's needed for navigation
      // Reduced from 1000 to 200 to prevent UI freeze in production
      bugService
        .getBugs({
          page: 1,
          limit: 200, // Reduced from 1000 to prevent UI freeze
          userId: currentUser?.id,
          ...(fromProject && projectId ? { projectId: projectId } : {}),
        })
        .then((res) => {
          const fetchDuration = performance.now() - fetchStartTime;
          
          if (!isMounted) {
            diagnosticLogger.log('Bug list fetch cancelled (unmounted)', { duration: fetchDuration });
            return;
          }
          
          let filteredBugs = res.bugs;
          
          // If coming from project page, filter by the stored project ID
          if (fromProject && projectId) {
            filteredBugs = res.bugs.filter(b => b.project_id === projectId);
          }
          
          diagnosticLogger.log('Bug list fetch completed', {
            duration: fetchDuration,
            totalBugs: res.bugs.length,
            filteredBugs: filteredBugs.length,
            fromProject,
            projectId
          });
          
          // Warn about slow fetches
          if (fetchDuration > 5000) {
            diagnosticLogger.log('WARNING: Slow bug list fetch', {
              duration: fetchDuration,
              bugCount: filteredBugs.length
            });
          }
          
          setBugList(filteredBugs);
          setBugListLoading(false);
        })
        .catch((error) => {
          const fetchDuration = performance.now() - fetchStartTime;
          
          if (!isMounted) {
            return;
          }
          
          diagnosticLogger.log('Bug list fetch error', {
            duration: fetchDuration,
            error: error.message || 'Unknown error'
          });
          
          console.error("[BugDetails] Error fetching bug list:", error);
          setBugListLoading(false);
        });
    }, 150); // Small debounce to prevent rapid refetches

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      diagnosticLogger.log('Bug list fetch effect cleanup', { bugId });
    };
  }, [fromProject, projectId, currentUser?.id, bugId]);

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

  // Early exit if we're no longer on a bug route (component should unmount)
  if (!isBugRoute || !bugId) {
    return null;
  }

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
  const canEditBug = currentUser?.role === "admin" || String(currentUser?.id) === String(bug.reported_by);

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
            updated_by_name: currentUser?.name || "BugRicer", // Include updater name in notification
          };

          // Send email notification
          await sendBugStatusUpdateNotification(bugData);

          // Broadcast browser notification to all users
          await broadcastNotificationService.broadcastStatusChange(
            bug.title,
            bug.id,
            newStatus,
            currentUser?.name || "BugRicer User"
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
              updatedBy: currentUser?.name || "BugRicer User",
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
              className={`flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-all duration-200 ${
                isNavigating ? 'cursor-wait' : ''
              }`}
              onClick={(e) => {
                console.info("[BugDetails] Prev button clicked", {
                  currentBugId: bugId,
                  targetBugId: prevBugId,
                  isNavigating,
                  bugListLoading,
                  isLoading,
                });
                if (isNavigating || !prevBugId || bugListLoading || isLoading || prevBugId === bugId) {
                  return;
                }

                if (bugId === prevBugId) {
                  return;
                }
                
                // Build URL
                let url = `/${role}/bugs/${prevBugId}`;
                if (fromProject) url += '?from=project';
                else if (fromFixes) url += '?from=fixes';
                lastTargetUrlRef.current = url;
                
                setIsNavigating(true);
                console.info("[BugDetails] Starting navigation to previous bug", {
                  targetBugId: prevBugId,
                  url,
                });
                navigatingToBugIdRef.current = prevBugId;
                chunkLoadErrorRef.current = false;
                
                // Backup timeout - clear after 2.5 seconds to avoid long disabled state
                navigationTimeoutRef.current = setTimeout(() => {
                  if (navigatingToBugIdRef.current === prevBugId) {
                    console.warn("[BugDetails] Navigation timeout hit for previous bug, forcing hard redirect", {
                      targetId: prevBugId,
                      url,
                    });
                    window.location.assign(url);
                    clearNavigationState({
                      reason: "timeout",
                      targetId: prevBugId,
                      targetUrl: url,
                    });
                  }
                }, 2500);
                
                // Try React Router navigation first
                try {
                  navigate(url, { replace: false });
                } catch (error) {
                  clearNavigationState({ reason: "cancelled" });
                  window.location.href = url;
                }

                // Hard fallback: only reload if a chunk load error is detected
                if (navigationFallbackRef.current) {
                  clearTimeout(navigationFallbackRef.current);
                }
                navigationFallbackRef.current = setTimeout(() => {
                  if (!chunkLoadErrorRef.current) {
                    console.info("[BugDetails] No chunk error detected for prev navigation; skipping hard reload", {
                      from: window.location.pathname,
                      to: url,
                    });
                    navigationFallbackRef.current = null;
                    return;
                  }
                  console.warn("BugDetails: chunk error fallback triggered (prev bug)", {
                      from: window.location.pathname,
                      to: url,
                    });
                    window.location.assign(url);
                    lastTargetUrlRef.current = null;
                  chunkLoadErrorRef.current = false;
                  navigationFallbackRef.current = null;
                }, 800);
              }}
              disabled={!prevBugId || bugListLoading || isLoading || isNavigating}
              aria-label="Previous Bug"
            >
              {isNavigating && navigatingToBugIdRef.current === prevBugId ? (
                <>
                  <div className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-5 w-5" /> Previous
                </>
              )}
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
              className={`flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-all duration-200 ${
                isNavigating ? 'cursor-wait' : ''
              }`}
              onClick={(e) => {
                console.info("[BugDetails] Next button clicked", {
                  currentBugId: bugId,
                  targetBugId: nextBugId,
                  isNavigating,
                  bugListLoading,
                  isLoading,
                });
                if (isNavigating || !nextBugId || bugListLoading || isLoading || nextBugId === bugId) {
                  return;
                }

                if (bugId === nextBugId) {
                  return;
                }
                
                // Build URL
                let url = `/${role}/bugs/${nextBugId}`;
                if (fromProject) url += '?from=project';
                else if (fromFixes) url += '?from=fixes';
                lastTargetUrlRef.current = url;
                
                setIsNavigating(true);
                console.info("[BugDetails] Starting navigation to next bug", {
                  targetBugId: nextBugId,
                  url,
                });
                navigatingToBugIdRef.current = nextBugId;
                chunkLoadErrorRef.current = false;
                
                // Backup timeout - clear after 2.5 seconds to avoid long disabled state
                navigationTimeoutRef.current = setTimeout(() => {
                  if (navigatingToBugIdRef.current === nextBugId) {
                    console.warn("[BugDetails] Navigation timeout hit for next bug, forcing hard redirect", {
                      targetId: nextBugId,
                      url,
                    });
                    window.location.assign(url);
                    clearNavigationState({
                      reason: "timeout",
                      targetId: nextBugId,
                      targetUrl: url,
                    });
                  }
                }, 2500);
                
                // Try React Router navigation first
                try {
                  navigate(url, { replace: false });
                } catch (error) {
                  clearNavigationState({ reason: "cancelled" });
                  window.location.href = url;
                }

                // Hard fallback: only reload if a chunk load error is detected
                if (navigationFallbackRef.current) {
                  clearTimeout(navigationFallbackRef.current);
                }
                navigationFallbackRef.current = setTimeout(() => {
                  if (!chunkLoadErrorRef.current) {
                    console.info("[BugDetails] No chunk error detected for next navigation; skipping hard reload", {
                      from: window.location.pathname,
                      to: url,
                    });
                    navigationFallbackRef.current = null;
                    return;
                  }
                  console.warn("BugDetails: chunk error fallback triggered (next bug)", {
                      from: window.location.pathname,
                      to: url,
                    });
                    window.location.assign(url);
                    lastTargetUrlRef.current = null;
                  chunkLoadErrorRef.current = false;
                  navigationFallbackRef.current = null;
                }, 800);
              }}
              disabled={!nextBugId || bugListLoading || isLoading || isNavigating}
              aria-label="Next Bug"
            >
              {isNavigating && navigatingToBugIdRef.current === nextBugId ? (
                <>
                  <div className="ml-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Next <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </nav>
    </main>
  );
};

export default BugDetails;
