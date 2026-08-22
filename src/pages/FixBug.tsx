import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { broadcastNotificationService } from "@/services/broadcastNotificationService";
import { bugService } from "@/services/bugService";
import { Bug } from "@/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  AlertCircle,
  ArrowLeft,
  Bug as BugIcon,
  CheckCircle,
  Clock,
  FolderOpen,
  Save,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BugFixCelebration } from "@/components/celebration/BugFixCelebration";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const DEFAULT_FIX_DESCRIPTION =
  "The issue has been fixed. Please retest and confirm at your convenience.";
const BUG_STALE_TIME = 5 * 60 * 1000;

const FixBug = () => {
  const navigate = useNavigate();
  const { bugId } = useParams<{ bugId: string }>();
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fixDescription, setFixDescription] = useState("");
  const [status, setStatus] = useState<Bug["status"]>("fixed");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationBug, setCelebrationBug] = useState<Bug | null>(null);
  const [hasInitializedNotes, setHasInitializedNotes] = useState(false);

  const fromProject = searchParams.get("from") === "project";

  const cachedBug = useMemo(
    () => (bugId ? queryClient.getQueryData<Bug>(["bug", bugId]) : undefined),
    [bugId, queryClient]
  );

  const {
    data: bug,
    isLoading,
    error,
  } = useQuery<Bug>({
    queryKey: ["bug", bugId],
    queryFn: async () => {
      if (!bugId) throw new Error("Bug ID is missing");
      return bugService.getBug(bugId);
    },
    enabled: !!bugId,
    staleTime: BUG_STALE_TIME,
    gcTime: 10 * 60 * 1000,
    // Reuse BugDetails cache so the form paints immediately
    initialData: cachedBug,
    initialDataUpdatedAt: bugId
      ? queryClient.getQueryState(["bug", bugId])?.dataUpdatedAt
      : undefined,
    refetchOnWindowFocus: false,
    refetchOnMount: (query) => !query.state.data || query.isStale(),
  });

  // Seed notes once from cached / fetched bug (avoids waiting on a second paint)
  useEffect(() => {
    if (!bug || hasInitializedNotes) return;

    if (bug.fix_description?.trim()) {
      setFixDescription(bug.fix_description);
    } else {
      setFixDescription(DEFAULT_FIX_DESCRIPTION);
    }
    setHasInitializedNotes(true);
  }, [bug, hasInitializedNotes]);

  useEffect(() => {
    if (status === "fixed" && (!fixDescription || fixDescription.trim() === "")) {
      setFixDescription(DEFAULT_FIX_DESCRIPTION);
    }
  }, [status, fixDescription]);

  const getBugDetailsUrl = () => {
    const bugDetailsUrl = currentUser?.role
      ? `/${currentUser.role}/bugs/${bugId}`
      : `/bugs/${bugId}`;
    return fromProject ? `${bugDetailsUrl}?from=project` : bugDetailsUrl;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentUser || !bugId || !bug) {
      return;
    }

    setIsSubmitting(true);

    const previousBug = queryClient.getQueryData<Bug>(["bug", bugId]);
    const optimisticBug: Bug = {
      ...bug,
      status,
      fix_description: fixDescription,
      fixed_by: currentUser.id,
    };

    // Paint success state immediately while the request runs
    queryClient.setQueryData(["bug", bugId], optimisticBug);

    try {
      const formData = new FormData();
      formData.append("id", bugId);
      formData.append("status", status);
      formData.append("fix_description", fixDescription);
      formData.append("fixed_by", currentUser.id);

      const response = await apiClient.post("/bugs/update.php", formData);
      const data = response.data as ApiResponse<Bug>;

      if (!data.success) {
        throw new Error(data.message || "Failed to update bug status");
      }

      const updatedBug: Bug = { ...optimisticBug, ...data.data, status };
      queryClient.setQueryData(["bug", bugId], updatedBug);
      // Refresh list views in the background; don't block this screen
      void queryClient.invalidateQueries({
        queryKey: ["bugs"],
        refetchType: "inactive",
      });

      toast({
        title: "Success",
        description: "Bug status updated successfully",
      });

      if (status === "fixed") {
        setCelebrationBug(updatedBug);
        setShowCelebration(true);
      }

      if (status && bug) {
        queueMicrotask(() => {
          broadcastNotificationService
            .broadcastStatusChange(
              bug.title,
              bug.id,
              status,
              currentUser?.name || "BugRicer"
            )
            .catch((err) => {
              console.error("Failed to send broadcast notification:", err);
            });
        });
      }

      if (status !== "fixed") {
        navigate(getBugDetailsUrl());
      }
    } catch (error) {
      if (previousBug) {
        queryClient.setQueryData(["bug", bugId], previousBug);
      } else {
        queryClient.invalidateQueries({ queryKey: ["bug", bugId] });
      }

      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const apiMessage =
        axiosError?.response?.data?.message ||
        (error instanceof Error ? error.message : null) ||
        "Failed to update bug status";

      toast({
        title:
          axiosError?.response?.status === 403
            ? "Permission denied"
            : "Error",
        description: apiMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only skeleton when we have nothing to show (no cache)
  if (isLoading && !bug) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-1 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-96 max-w-full" />
                </div>
                <Skeleton className="h-12 w-32" />
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
            <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-[120px] w-full" />
              </div>
              <div className="flex justify-between pt-6">
                <Skeleton className="h-11 w-24" />
                <Skeleton className="h-11 w-40" />
              </div>
            </div>
          </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="min-w-0 w-full space-y-6 sm:space-y-8">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <AlertCircle className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Error Loading Bug
              </h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {error?.message ||
                  "Could not fetch bug details. Please try again later."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => navigate(-1)}
                  variant="outline"
                  size="lg"
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 text-gray-700 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Go Back
                </Button>
                <Button
                  onClick={() =>
                    queryClient.invalidateQueries({ queryKey: ["bug", bugId] })
                  }
                  size="lg"
                  className="h-12 px-6 bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-700 hover:to-orange-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 w-full space-y-6 sm:space-y-8">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-green-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-green-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-green-600 rounded-xl shadow-lg">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Fix Bug
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-green-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Update the status and provide details for bug resolution
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Button
                  variant="outline"
                  className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => navigate(getBugDetailsUrl())}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Back
                </Button>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <BugIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {bug.priority}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <BugIcon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Bug Information
                  </h3>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Bug Title
                    </Label>
                    <div className="relative group">
                      <Input
                        id="title"
                        value={bug.title}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <BugIcon className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="bugId"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Bug ID
                    </Label>
                    <div className="relative group">
                      <Input
                        id="bugId"
                        value={bug.id}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={bug.description}
                    readOnly
                    disabled
                    className="min-h-[120px] bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white cursor-not-allowed resize-none"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="project"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Project
                    </Label>
                    <div className="relative group">
                      <Input
                        id="project"
                        value={bug.project_name || "—"}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="priority"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Priority
                    </Label>
                    <div className="relative group">
                      <Input
                        id="priority"
                        value={bug.priority}
                        readOnly
                        disabled
                        className="h-11 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium cursor-not-allowed capitalize"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            bug.priority === "high"
                              ? "bg-red-500"
                              : bug.priority === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Update Status
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="status"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Status
                    </Label>
                    <Select
                      value={status}
                      onValueChange={(value: Bug["status"]) => setStatus(value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="status"
                        className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="fixed" className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Fixed
                        </SelectItem>
                        <SelectItem
                          value="in_progress"
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4 text-blue-500" />
                          In Progress
                        </SelectItem>
                        <SelectItem
                          value="declined"
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4 text-orange-500" />
                          Declined
                        </SelectItem>
                        <SelectItem
                          value="rejected"
                          className="flex items-center gap-2"
                        >
                          <X className="h-4 w-4 text-red-500" />
                          Rejected
                        </SelectItem>
                        <SelectItem
                          value="pending"
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4 text-gray-500" />
                          Pending
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="fixDescription"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Fix Details / Notes
                    </Label>
                    <Textarea
                      id="fixDescription"
                      placeholder="Provide details about the fix, steps taken, etc."
                      className="min-h-[120px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 resize-none"
                      value={fixDescription}
                      onChange={(e) => setFixDescription(e.target.value)}
                      disabled={isSubmitting}
                    />
                    {status === "fixed" &&
                      fixDescription === DEFAULT_FIX_DESCRIPTION && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                            Default message provided. You can edit this to add
                            more specific details about the fix.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-6">
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(getBugDetailsUrl())}
                      disabled={isSubmitting}
                      className="h-12 px-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !bugId}
                      className="h-12 px-8 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          Update Bug Status
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

      <BugFixCelebration
        bug={celebrationBug}
        isVisible={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          setCelebrationBug(null);
          navigate(getBugDetailsUrl());
        }}
      />
    </div>
  );
};

export default FixBug;
