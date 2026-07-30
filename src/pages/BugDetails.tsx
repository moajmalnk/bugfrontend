import { BugContentCards } from "@/components/bugs/details/BugContentCards";
import { BugDetailsCard } from "@/components/bugs/details/BugDetailsCard";
import { BugLifecycleCard } from "@/components/bugs/details/BugLifecycleCard";
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
import { notificationService } from "@/services/notificationService";
import { whatsappService } from "@/services/whatsappService";
import { Bug, BugStatus } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { prefetchFixBugPage } from "@/utils/prefetchFixBug";
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
      
      // Console only when diagnostics are explicitly enabled (avoids spam on every navigate)
      const enableDiagnostics =
        import.meta.env.DEV &&
        (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ === true;
      if (enableDiagnostics) {
        console.log(`[${componentName}]`, message, data || '');
      }
      
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
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTargetUrlRef = useRef<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigatingToBugIdRef = useRef<string | null>(null);
  const previousLocationRef = useRef<string>(location.pathname);
  const exitReloadRef = useRef(false);
  const chunkLoadErrorRef = useRef(false);
  const chunkReloadScheduledRef = useRef(false);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  // Track render performance - only in development or when explicitly enabled 
  renderCountRef.current += 1;
  const isDevelopment = import.meta.env.DEV;
  const enableDiagnostics = (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ === true;
  
  if (isDevelopment || enableDiagnostics) {
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;
    
    // Log slow renders (potential freeze indicator) - throttled
    if (timeSinceLastRender > 1000 && renderCountRef.current > 1) {
      diagnosticLogger.log('Slow render detected', {
        timeSinceLastRender,
        renderCount: renderCountRef.current,
        bugId,
        pathname: location.pathname
      });
    }
  } else {
    // Still update ref but don't log in production
    lastRenderTimeRef.current = Date.now();
  }
  
  // Initial mount logging - expose diagnostic tools (only in dev or when enabled)
  useEffect(() => {
    const isDevelopment = import.meta.env.DEV;
    const enableDiagnostics = (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ === true;
    
    if (isDevelopment || enableDiagnostics) {
      diagnosticLogger.log('Component mounted', {
        bugId,
        pathname: location.pathname,
        userId: currentUser?.id,
        userRole: currentUser?.role,
        renderCount: renderCountRef.current
      });
    }
    
    // Expose diagnostic tools to window (always available, but logging is conditional)
    if (typeof window !== 'undefined') {
      (window as any).__BUG_DETAILS_DIAGNOSTIC__ = {
        getLogs: () => diagnosticLogger.getLogs(),
        exportLogs: () => diagnosticLogger.exportLogs(),
        clearLogs: () => diagnosticLogger.clearLogs(),
        getQueryCache: () => queryClient.getQueryCache().getAll(),
        clearQueryCache: () => queryClient.clear(),
        enableDiagnostics: () => {
          (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ = true;
          console.log('[BugDetails] Diagnostics enabled. Reload page to activate.');
        },
        disableDiagnostics: () => {
          (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ = false;
          console.log('[BugDetails] Diagnostics disabled. Reload page to deactivate.');
        },
        navigateToDiagnostic: () => {
          if (bugId && currentUser?.role) {
            window.location.href = `/${currentUser.role}/bugs/${bugId}/diagnostic`;
          }
        }
      };
      
      if (enableDiagnostics) {
        console.log('[BugDetails] Diagnostic tools available at window.__BUG_DETAILS_DIAGNOSTIC__');
      }
    }
    
    return () => {
      if (isDevelopment || enableDiagnostics) {
        diagnosticLogger.log('Component unmounting', {
          bugId,
          renderCount: renderCountRef.current
        });
      }
    };
  }, [bugId, currentUser?.id, currentUser?.role, queryClient]); // Include dependencies for diagnostic tools
  const isBugRoute = useMemo(() => {
    const pathname = location.pathname;
    // More specific check: only match exact bug details route, not child routes like /fix, /edit, /diagnostic
    // Pattern: /role/bugs/:bugId (but not /role/bugs/:bugId/fix, /role/bugs/:bugId/edit, etc.)
    const bugDetailsPattern = /\/[^/]+\/bugs\/[^/]+$/; // Matches /role/bugs/:bugId but not /role/bugs/:bugId/fix
    const onBugRoute = bugDetailsPattern.test(pathname);
    
    console.debug("[BugDetails] isBugRoute computed", {
      pathname,
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
  
  // Check if user came from project / fixes page
  const fromProject = searchParams.get("from") === "project";
  const fromFixes = searchParams.get("from") === "fixes";
  const projectIdFromQuery = searchParams.get("projectId");

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
      const isDevelopment = import.meta.env.DEV;
      const enableDiagnostics = (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ === true;
      
      if (isDevelopment || enableDiagnostics) {
        diagnosticLogger.log('Bug fetch started', { bugId });
      }
      
      try {
        // apiClient handles token and impersonation automatically
        const response = await apiClient.get<ApiResponse<Bug>>(
          `/bugs/get.php?id=${bugId}`
        );
        
        const fetchDuration = performance.now() - fetchStartTime;
        
        if (response.data.success) {
          if (isDevelopment || enableDiagnostics) {
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
          }
          
          return response.data.data;
        }
        
        const errorMsg = response.data.message || "Failed to fetch bug details";
        if (isDevelopment || enableDiagnostics) {
          diagnosticLogger.log('Bug fetch failed (no data)', { bugId, error: errorMsg });
        }
        throw new Error(errorMsg);
      } catch (err: any) {
        const fetchDuration = performance.now() - fetchStartTime;
        if (isDevelopment || enableDiagnostics) {
          diagnosticLogger.log('Bug fetch error', {
            bugId,
            duration: fetchDuration,
            error: err.message || 'Unknown error',
            errorType: err.name,
          });
        }
        throw err;
      }
    },
    staleTime: 0, // Always consider bug details fresh-check (bug_types must not stick empty)
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled:
      isBugRoute &&
      Boolean(bugId) &&
      !location.pathname.includes("/fix") &&
      !location.pathname.includes("/edit") &&
      !location.pathname.includes("/diagnostic"),
    // Prevent excessive refetching
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Warm the Fix Bug page chunk while viewing details (admin/dev, unfixed bugs)
  useEffect(() => {
    if (!bug) return;
    const canFix =
      (currentUser?.role === "admin" || currentUser?.role === "developer") &&
      bug.status !== "fixed";
    if (!canFix) return;

    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(() => prefetchFixBugPage(), { timeout: 1500 })
        : window.setTimeout(() => prefetchFixBugPage(), 300);

    return () => {
      if ("requestIdleCallback" in window) {
        window.cancelIdleCallback(idle as number);
      } else {
        clearTimeout(idle as number);
      }
    };
  }, [bug, currentUser?.role]);

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
    // Check if we're on a child route (fix, edit, diagnostic)
    const isChildRoute = location.pathname.includes('/fix') || 
                         location.pathname.includes('/edit') || 
                         location.pathname.includes('/diagnostic');
    
    if (!isBugRoute || isChildRoute) {
      clearNavigationState({ reason: "cancelled" });
      chunkLoadErrorRef.current = false;
      chunkReloadScheduledRef.current = false;
      exitReloadRef.current = false;
      return;
    }
    exitReloadRef.current = false;
  }, [isBugRoute, location.pathname, clearNavigationState]);

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
  // Prefer URL projectId, then bug.project_id — keep sibling navigation scoped to the project.
  useEffect(() => {
    const resolved =
      projectIdFromQuery ||
      (fromProject && bug?.project_id ? bug.project_id : null) ||
      bug?.project_id ||
      null;
    if (resolved && resolved !== projectId) {
      setProjectId(resolved);
    }
  }, [fromProject, bug?.project_id, projectIdFromQuery, projectId]);

  const navigationProjectId =
    projectIdFromQuery || projectId || bug?.project_id || null;

  // Fetch sibling bugs for Previous / Next — always scope to the current project when known
  useEffect(() => {
    let isMounted = true;
    
    const isDevelopment = import.meta.env.DEV;
    const enableDiagnostics = (window as any).__ENABLE_BUG_DETAILS_DIAGNOSTICS__ === true;
    
    if (isDevelopment || enableDiagnostics) {
      diagnosticLogger.log('Bug list fetch effect triggered', {
        fromProject,
        navigationProjectId,
        userId: currentUser?.id
      });
    }
    
    const timeoutId = setTimeout(() => {
      const fetchStartTime = performance.now();
      setBugListLoading(true);
      
      if (isDevelopment || enableDiagnostics) {
        diagnosticLogger.log('Bug list fetch started', { fromProject, navigationProjectId });
      }
      
      requestAnimationFrame(() => {
        if (!isMounted) return;
        
        // Do NOT pass userId — that filters to "My Bugs" and breaks Previous/Next
        // when the open bug was reported by someone else (common for admins).
        bugService
          .getBugs({
            page: 1,
            limit: 500,
            ...(navigationProjectId ? { projectId: navigationProjectId } : {}),
          })
          .then((res) => {
            const fetchDuration = performance.now() - fetchStartTime;
            
            if (!isMounted) {
              if (isDevelopment || enableDiagnostics) {
                diagnosticLogger.log('Bug list fetch cancelled (unmounted)', { duration: fetchDuration });
              }
              return;
            }
            
            const updateState = () => {
              if (!isMounted) return;
              
              const currentId = bugId ? String(bugId) : null;
              let filteredBugs = res.bugs || [];
              
              if (navigationProjectId) {
                filteredBugs = filteredBugs.filter(
                  (b) => String(b.project_id) === String(navigationProjectId)
                );
              }

              // Always keep the open bug in the list so nav never collapses to empty
              if (
                bug &&
                currentId &&
                !filteredBugs.some((b) => String(b.id) === currentId)
              ) {
                filteredBugs = [bug, ...filteredBugs];
              }

              // Stable order for sequential Previous / Next (newest first)
              filteredBugs = filteredBugs.slice().sort((a, b) => {
                const ta = new Date(a.created_at || 0).getTime();
                const tb = new Date(b.created_at || 0).getTime();
                return tb - ta;
              });
              
              if (isDevelopment || enableDiagnostics) {
                diagnosticLogger.log('Bug list fetch completed', {
                  duration: fetchDuration,
                  totalBugs: res.bugs?.length ?? 0,
                  filteredBugs: filteredBugs.length,
                  fromProject,
                  navigationProjectId
                });
              }
              
              setBugList(filteredBugs);
              setBugListLoading(false);
            };
            
            if ('requestIdleCallback' in window) {
              requestIdleCallback(updateState, { timeout: 100 });
            } else {
              setTimeout(updateState, 0);
            }
          })
          .catch((error) => {
            const fetchDuration = performance.now() - fetchStartTime;
            
            if (!isMounted) {
              return;
            }
            
            if (isDevelopment || enableDiagnostics) {
              diagnosticLogger.log('Bug list fetch error', {
                duration: fetchDuration,
                error: error.message || 'Unknown error'
              });
            }
            
            console.error("[BugDetails] Error fetching bug list:", error);
            // Fallback: at least navigate within a one-item list
            if (bug && bugId) {
              setBugList([bug]);
            }
            setBugListLoading(false);
          });
      });
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (isDevelopment || enableDiagnostics) {
        diagnosticLogger.log('Bug list fetch effect cleanup', { bugId });
      }
    };
  }, [navigationProjectId, fromProject, bugId, bug]);

  // Memoize filtered bug list for adjacent navigation
  // MUST be before any early returns to follow Rules of Hooks
  const filteredBugList = useMemo(() => {
    const currentId = bugId ? String(bugId) : null;
    const list = bugList.filter((b) => {
      if (fromFixes) {
        return (
          b.status === "fixed" ||
          b.status === "rejected" ||
          (currentId != null && String(b.id) === currentId)
        );
      }
      // Project / default: active Bugs-tab statuses + always include current bug
      return (
        b.status === "pending" ||
        b.status === "in_progress" ||
        (currentId != null && String(b.id) === currentId)
      );
    });

    // Ensure current bug is present even if list fetch lagged
    if (bug && currentId && !list.some((b) => String(b.id) === currentId)) {
      return [bug, ...list];
    }
    return list;
  }, [bugList, fromFixes, bugId, bug]);
  
  // Memoize navigation values to prevent recalculation
  // MUST be before any early returns to follow Rules of Hooks
  const navigationValues = useMemo(() => {
    const currentId = bugId ? String(bugId) : null;
    const currentIndex = currentId
      ? filteredBugList.findIndex((b) => String(b.id) === currentId)
      : -1;
    const prevBugId = currentIndex > 0 ? filteredBugList[currentIndex - 1]?.id : null;
    const nextBugId = currentIndex >= 0 && currentIndex < filteredBugList.length - 1
      ? filteredBugList[currentIndex + 1]?.id
      : null;
    const totalBugs = filteredBugList.length;
    
    return { currentIndex, prevBugId, nextBugId, totalBugs };
  }, [filteredBugList, bugId]);
  
  const { currentIndex, prevBugId, nextBugId, totalBugs } = navigationValues;

  const buildSiblingUrl = (targetId: string) => {
    const role = currentUser?.role || "tester";
    const params = new URLSearchParams();
    if (fromFixes) {
      params.set("from", "fixes");
    } else if (fromProject || navigationProjectId) {
      params.set("from", "project");
      if (navigationProjectId) params.set("projectId", navigationProjectId);
    }
    const qs = params.toString();
    return `/${role}/bugs/${targetId}${qs ? `?${qs}` : ""}`;
  };

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
  // Also exit if we're on a child route like /fix, /edit, or /diagnostic
  // This is critical for production - prevents component from blocking navigation
  const isChildRoute = location.pathname.includes('/fix') || 
                       location.pathname.includes('/edit') || 
                       location.pathname.includes('/diagnostic');
  
  // CRITICAL: Return null immediately for child routes to allow React Router to mount the correct component
  if (isChildRoute) {
    return null;
  }
  
  if (!isBugRoute || !bugId) {
    // Force unmount by returning null immediately
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
      const payload: Record<string, string> = {
        id: bug.id,
        status: newStatus,
        updated_by: currentUser?.id || "",
      };
      if (newStatus === "fixed" && currentUser?.id) {
        payload.fixed_by = currentUser.id;
      }

      await apiClient.post<ApiResponse<Bug>>("/bugs/update.php", payload);

      // Update local bugList state immediately
      setBugList((prevList) =>
        prevList.map((b) =>
          b.id === bug.id
            ? {
                ...b,
                status: newStatus,
                updated_by: currentUser?.id,
                updated_by_name: currentUser?.name,
                ...(newStatus === "fixed" && currentUser?.id
                  ? {
                      fixed_by: currentUser.id,
                      fixed_by_name: currentUser.name || currentUser.username,
                    }
                  : {}),
              }
            : b
        )
      );

      queryClient.setQueryData(["bug", bug.id], (prev: Bug | undefined) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              updated_by: currentUser?.id,
              updated_by_name: currentUser?.name,
              ...(newStatus === "fixed" && currentUser?.id
                ? {
                    fixed_by: currentUser.id,
                    fixed_by_name: currentUser.name || currentUser.username,
                  }
                : {}),
            }
          : prev
      );

      // Side effects after UI is already updated — never block status change
      if (newStatus === "fixed" && bug.status !== "fixed") {
        void broadcastNotificationService
          .broadcastStatusChange(
            bug.title,
            bug.id,
            newStatus,
            currentUser?.name || "BugRicer User"
          )
          .catch(() => undefined);

        const notificationSettings = notificationService.getSettings();
        if (
          notificationSettings.whatsappNotifications &&
          notificationSettings.statusChangeNotifications
        ) {
          try {
            whatsappService.shareStatusUpdate({
              bugTitle: bug.title,
              bugId: bug.id,
              status: newStatus,
              priority: bug.priority,
              updatedBy: currentUser?.name || "BugRicer User",
              projectName: bug.project_name || bug.project_id,
              bugLevel: bug.bug_level,
              alreadyRaised: bug.already_raised,
            });
          } catch {
            // ignore
          }
        }
      }

      void queryClient.invalidateQueries({ queryKey: ["bugs"] });
      void queryClient.invalidateQueries({ queryKey: ["bugLifecycle", bug.id] });
      void queryClient.invalidateQueries({ queryKey: ["userProfilePortfolio"] });

      toast({
        title: "Success",
        description: "Bug status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update bug status",
        variant: "destructive",
      });
    }
  };

  const role = currentUser?.role || "admin";

  return (
    <main className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8 flex flex-col">
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
            <BugContentCards
              bug={bug}
              onBugUpdated={(updated) => {
                queryClient.setQueryData(["bug", bug.id], updated);
                queryClient.invalidateQueries({ queryKey: ["bugs"] });
                setBugList((prevList) =>
                  prevList.map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
                );
              }}
            />
          </section>
          {/* Move Bug Details below Bug Information as requested */}
          <section className="space-y-8">
            <BugDetailsCard
              bug={bug}
              canUpdateStatus={canUpdateStatus}
              updateBugStatus={handleStatusUpdate}
              formattedUpdatedDate={formattedUpdatedDate}
            />
            <BugLifecycleCard bugId={bug.id} />
          </section>
        </div>
      </section>
      {/* Professional navigation bar at the bottom */}
      <nav className="w-full mt-8" aria-label="Adjacent bug navigation">
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-amber-500/10" />
          <div className="relative w-full flex justify-center items-center gap-2 sm:gap-4 py-3.5 px-3 sm:px-5">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 sm:px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:opacity-40 disabled:pointer-events-none ${
                isNavigating ? "cursor-wait" : ""
              }`}
              onClick={() => {
                if (isNavigating || !prevBugId || bugListLoading || isLoading || prevBugId === bugId) {
                  return;
                }
                const url = buildSiblingUrl(prevBugId);
                lastTargetUrlRef.current = url;
                setIsNavigating(true);
                navigatingToBugIdRef.current = prevBugId;
                chunkLoadErrorRef.current = false;

                navigationTimeoutRef.current = setTimeout(() => {
                  if (navigatingToBugIdRef.current === prevBugId) {
                    window.location.assign(url);
                    clearNavigationState({
                      reason: "timeout",
                      targetId: prevBugId,
                      targetUrl: url,
                    });
                  }
                }, 2500);

                try {
                  navigate(url, { replace: false });
                } catch {
                  clearNavigationState({ reason: "cancelled" });
                  window.location.href = url;
                }
              }}
              disabled={!prevBugId || bugListLoading || isLoading || isNavigating}
              aria-label="Previous bug"
            >
              {isNavigating && navigatingToBugIdRef.current === prevBugId ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Loading…</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </>
              )}
            </button>

            <div className="min-w-[7.5rem] sm:min-w-[10rem] text-center px-2">
              {bugListLoading || isLoading ? (
                <span className="text-sm text-muted-foreground tabular-nums">Loading…</span>
              ) : totalBugs > 0 && currentIndex >= 0 ? (
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {currentIndex + 1}
                  <span className="text-muted-foreground font-medium"> / {totalBugs}</span>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">1 / 1</span>
              )}
            </div>

            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 sm:px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:opacity-40 disabled:pointer-events-none ${
                isNavigating ? "cursor-wait" : ""
              }`}
              onClick={() => {
                if (isNavigating || !nextBugId || bugListLoading || isLoading || nextBugId === bugId) {
                  return;
                }
                const url = buildSiblingUrl(nextBugId);
                lastTargetUrlRef.current = url;
                setIsNavigating(true);
                navigatingToBugIdRef.current = nextBugId;
                chunkLoadErrorRef.current = false;

                navigationTimeoutRef.current = setTimeout(() => {
                  if (navigatingToBugIdRef.current === nextBugId) {
                    window.location.assign(url);
                    clearNavigationState({
                      reason: "timeout",
                      targetId: nextBugId,
                      targetUrl: url,
                    });
                  }
                }, 2500);

                try {
                  navigate(url, { replace: false });
                } catch {
                  clearNavigationState({ reason: "cancelled" });
                  window.location.href = url;
                }
              }}
              disabled={!nextBugId || bugListLoading || isLoading || isNavigating}
              aria-label="Next bug"
            >
              {isNavigating && navigatingToBugIdRef.current === nextBugId ? (
                <>
                  <span className="hidden sm:inline">Loading…</span>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="h-4 w-4" />
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
