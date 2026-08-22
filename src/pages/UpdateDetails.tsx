import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useUndoDelete } from "@/hooks/useUndoDelete";
import { UndoDeleteNotificationPortal } from "@/components/ui/UndoDeleteNotification";
import { DatePicker } from "@/components/ui/DatePicker";
import { updateService } from "@/services/updateService";
import { apiClient } from "@/lib/axios";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, X, Trash2, AlertCircle, Lock, CheckCircle2, ImagePlus, Paperclip, File, Play, Timer, Loader2, Code2, ChevronLeft, Edit2, Share2, CheckSquare, Eye, Download, Video, ArrowRightLeft } from "lucide-react";
import { CopyTextButton } from "@/components/ui/CopyTextButton";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getReturnPathFromState, useMergeSearchParam } from "@/hooks/useUrlPagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { WhatsAppShareButton } from "@/components/bugs/WhatsAppShareButton";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { ScreenshotViewer } from "@/components/ui/ScreenshotViewer";
import { DocumentPreviewBody } from "@/components/attachments/DocumentPreviewBody";
import { ConvertUpdateDialog } from "@/components/updates/ConvertUpdateDialog";
import { format } from "date-fns";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { buildAudioUrl } from "@/lib/mediaUrls";
import { ENV } from "@/lib/env";
import { downloadAttachmentFile } from "@/lib/attachmentUtils";
import { UpdateDetailsCard } from "@/components/updates/UpdateDetailsCard";
import { UpdateLifecycleCard } from "@/components/updates/UpdateLifecycleCard";
import { userService } from "@/services/userService";
import { compareUsersActiveFirst } from "@/lib/utils/userSort";
import { generateShareableUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ProjectMemberOption = {
  id: string;
  username: string;
  email?: string;
  role?: string;
  user_role?: string;
  member_role?: string;
  account_active?: number;
  status?: "active" | "idle" | "offline";
};

/** Sentinel so Radix Select stays controlled (never switches from undefined → string). */
const SELECT_UNSET = "__unset__";

const resolveSelectValue = (value: string) =>
  value === SELECT_UNSET ? "" : value;


// Enhanced skeleton components for better loading experience
const UpdateHeaderSkeleton = () => (
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

const UpdateDescriptionSkeleton = () => (
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

const UpdateDetailsSkeleton = () => (
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

const UpdateDetailsMainSkeleton = () => (
  <div
    className="min-w-0 w-full space-y-8"
    aria-busy="true"
    aria-label="Loading update details"
  >
    <header>
      <UpdateHeaderSkeleton />
    </header>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section className="lg:col-span-2 space-y-8">
        <UpdateDescriptionSkeleton />
      </section>

      <aside className="space-y-8">
        <UpdateDetailsSkeleton />
      </aside>
    </div>
  </div>
);

// Component to display access error
const AccessError = () => (
  <div className="min-w-0 w-full space-y-8 flex flex-col items-center justify-center text-center py-12 relative overflow-hidden rounded-2xl">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-50/50 via-orange-50/30 to-yellow-50/50 dark:from-red-950/20 dark:via-orange-950/10 dark:to-yellow-950/20" />
    <div className="relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-2xl">
      <Lock className="h-12 w-12 text-white" />
    </div>
    <h1 className="relative text-2xl font-bold tracking-tight">Access Denied</h1>
    <p className="relative text-muted-foreground max-w-md">
      You don't have permission to view this update. You need to be a member of the project this update belongs to.
    </p>
  </div>
);

const UpdateDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const mergeSearchParam = useMergeSearchParam();

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showDiscardCompleteDialog, setShowDiscardCompleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(
    () => searchParams.get("action") === "complete"
  );
  const [completeForm, setCompleteForm] = useState({
    tested: "" as "" | "yes" | "no",
    devHours: "",
    devStarted: "",
    devEnded: "",
    testedBy: "",
    developedBy: "",
    notes: "",
  });
  const [updateList, setUpdateList] = useState<any[]>([]);
  const [updateListLoading, setUpdateListLoading] = useState(true);
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);
  const [screenshotViewerOpen, setScreenshotViewerOpen] = useState(false);
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState(0);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    url: string;
    file_name: string;
    file_path: string;
  } | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const completeNavPushedRef = useRef(false);

  // Undo delete hook
  const undoDelete = useUndoDelete({
    duration: 10,
    onConfirm: () => {
      if (updateId) {
        performActualDelete.mutate();
      }
    },
    onUndo: () => {
      setIsDeletingUpdate(false);
      toast({
        title: "Deletion Cancelled",
        description: "Update deletion has been cancelled.",
      });
    },
  });

  // Check if user came from project page
  const fromProject = searchParams.get("from") === "project";

  const { data: update, isLoading, isError, error, refetch, isFetching, isStale } = useQuery({
    queryKey: ["update", updateId],
    queryFn: () => updateService.getUpdate(updateId),
    enabled: !!updateId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const { data: projectMembersData, isLoading: membersLoading } = useQuery({
    queryKey: ["project-members", update?.project_id],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { members: ProjectMemberOption[]; admins: ProjectMemberOption[] };
      }>(`/projects/get_members.php?project_id=${update!.project_id}`);
      return res.data.data;
    },
    enabled: !!update?.project_id && showCompleteDialog,
    staleTime: 60_000,
  });

  const { data: directoryUsers = [] } = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => userService.getUsers(),
    enabled: showCompleteDialog,
    staleTime: 60_000,
  });

  const { testerOptions, developerOptions } = useMemo(() => {
    const members = projectMembersData?.members || [];
    const admins = projectMembersData?.admins || [];
    const byId = new Map<string, ProjectMemberOption>();
    const usersById = new Map(
      directoryUsers.map((u) => [String(u.id), u] as const)
    );

    const upsert = (person: ProjectMemberOption) => {
      if (!person?.id) return;
      const dir = usersById.get(String(person.id));
      byId.set(String(person.id), {
        ...person,
        account_active: dir?.account_active ?? person.account_active,
        status: dir?.status ?? person.status,
      });
    };
    members.forEach(upsert);
    admins.forEach(upsert);

    const people = Array.from(byId.values()).sort(compareUsersActiveFirst);

    const roleOf = (p: ProjectMemberOption) =>
      String(p.user_role || p.member_role || p.role || "").toLowerCase();

    const isAdmin = (p: ProjectMemberOption) => {
      const r = roleOf(p);
      return r === "admin" || r.includes("admin");
    };
    const testers = people.filter((p) => {
      const r = roleOf(p);
      return r === "tester" || r.includes("tester") || isAdmin(p);
    });
    const developers = people.filter((p) => {
      const r = roleOf(p);
      return r === "developer" || r.includes("developer") || isAdmin(p);
    });

    // Prefer role-filtered lists (testers/devs + admins); fall back to full roster
    return {
      testerOptions: testers.length > 0 ? testers : people,
      developerOptions: developers.length > 0 ? developers : people,
    };
  }, [projectMembersData, directoryUsers]);

  const updatesListFallback = `/${currentUser?.role || "admin"}/updates`;
  const updatesBackPath = fromProject
    ? `/${currentUser?.role || "admin"}/projects/${update?.project_id}?tab=updates`
    : getReturnPathFromState(location.state, updatesListFallback);

  useEffect(() => {
    // Only refetch if we don't have cached data or if it's stale
    if (!update || isStale) {
      refetch();
    }
  }, [updateId, refetch, update, isStale]);

  // Fetch updates for navigation
  useEffect(() => {
    let isMounted = true;
    setUpdateListLoading(true);
    
    updateService.getUpdates()
      .then((data) => {
        if (isMounted) {
          setUpdateList(data || []);
          setUpdateListLoading(false);
        }
      })
      .catch(() => setUpdateListLoading(false));
    
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const mutationOptions = {
    onSuccess: (successMessage: string) => {
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      queryClient.invalidateQueries({ queryKey: ["update", updateId] });
      setShowApproveDialog(false);
      setShowDeclineDialog(false);
      setShowCompleteDialog(false);
      completeNavPushedRef.current = false;
      if (searchParams.get("action") === "complete") {
        mergeSearchParam("action", null, { replace: true });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  };

  const approveMutation = useMutation({
    mutationFn: () => updateService.approveUpdate(updateId),
    ...mutationOptions,
  });

  const declineMutation = useMutation({
    mutationFn: () => updateService.declineUpdate(updateId),
    ...mutationOptions,
  });

  const completeMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateService.markAsCompleted>[1]) =>
      updateService.markAsCompleted(updateId!, payload),
    ...mutationOptions,
  });

  const roleForComplete = String(currentUser?.role || "").toLowerCase();
  const canOpenCompleteFromUrl =
    !!update &&
    update.status === "approved" &&
    (roleForComplete === "admin" ||
      roleForComplete === "developer" ||
      roleForComplete === "tester");

  const isCompleteFormDirty =
    completeForm.tested !== "" ||
    Boolean(completeForm.testedBy.trim()) ||
    Boolean(completeForm.developedBy.trim()) ||
    Boolean(completeForm.devHours.trim()) ||
    Boolean(completeForm.devStarted) ||
    Boolean(completeForm.devEnded) ||
    Boolean(completeForm.notes.trim());

  const openCompleteDialog = useCallback(() => {
    if (searchParams.get("action") !== "complete") {
      mergeSearchParam("action", "complete");
      completeNavPushedRef.current = true;
    }
    setShowCompleteDialog(true);
  }, [mergeSearchParam, searchParams]);

  const closeCompleteDialog = useCallback(
    (options?: { force?: boolean }) => {
      if (!options?.force && isCompleteFormDirty) {
        setShowDiscardCompleteDialog(true);
        return;
      }
      setShowDiscardCompleteDialog(false);
      setShowCompleteDialog(false);
      if (searchParams.get("action") === "complete") {
        if (completeNavPushedRef.current) {
          completeNavPushedRef.current = false;
          navigate(-1);
        } else {
          mergeSearchParam("action", null, { replace: true });
        }
      }
    },
    [isCompleteFormDirty, mergeSearchParam, navigate, searchParams]
  );

  const confirmDiscardComplete = useCallback(() => {
    setShowDiscardCompleteDialog(false);
    closeCompleteDialog({ force: true });
  }, [closeCompleteDialog]);

  // Keep dialog synced with ?action=complete (deep links + browser Back)
  useEffect(() => {
    const wantsComplete = searchParams.get("action") === "complete";
    if (!wantsComplete) {
      if (showCompleteDialog) setShowCompleteDialog(false);
      return;
    }
    if (!update) return;
    if (!canOpenCompleteFromUrl) {
      mergeSearchParam("action", null, { replace: true });
      setShowCompleteDialog(false);
      return;
    }
    if (!showCompleteDialog) setShowCompleteDialog(true);
  }, [
    searchParams,
    update,
    canOpenCompleteFromUrl,
    showCompleteDialog,
    mergeSearchParam,
  ]);

  useEffect(() => {
    if (showCompleteDialog) {
      setCompleteForm({
        tested: "",
        devHours: "",
        devStarted: "",
        devEnded: "",
        testedBy: "",
        developedBy: "",
        notes: "",
      });
    }
  }, [showCompleteDialog]);

  const handleCompleteSubmit = () => {
    if (completeForm.tested === "") {
      toast({
        title: "Required",
        description: "Please select whether this update was tested (yes or no).",
        variant: "destructive",
      });
      return;
    }
    if (completeForm.tested === "yes" && !completeForm.testedBy.trim()) {
      toast({
        title: "Required",
        description: "Please select who tested this update.",
        variant: "destructive",
      });
      return;
    }
    if (!completeForm.developedBy.trim()) {
      toast({
        title: "Required",
        description: "Please select who developed this update.",
        variant: "destructive",
      });
      return;
    }
    if (completeForm.notes.trim() === "") {
      toast({
        title: "Required",
        description: "Please add completion notes before marking this update as completed.",
        variant: "destructive",
      });
      return;
    }
    completeMutation.mutate({
      completion_tested: completeForm.tested === "yes",
      completion_dev_hours: completeForm.devHours.trim() || undefined,
      completion_dev_started_at: completeForm.devStarted || undefined,
      completion_dev_ended_at: completeForm.devEnded || undefined,
      completion_tested_by: completeForm.testedBy.trim() || undefined,
      completion_developed_by: completeForm.developedBy.trim() || undefined,
      completion_notes: completeForm.notes.trim() || undefined,
    });
  };

  const performActualDelete = useMutation({
    mutationFn: () => updateService.deleteUpdate(updateId),
    onSuccess: (successMessage) => {
      setIsDeletingUpdate(false);
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      navigate(currentUser?.role ? `/${currentUser.role}/updates` : '/updates');
    },
    onError: (error: Error) => {
      setIsDeletingUpdate(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteUpdate = () => {
    if (!update) return;

    setIsDeletingUpdate(true);
    undoDelete.startCountdown();
  };
  
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "feature": return "bg-blue-100 text-blue-800 border-blue-200";
      case "updation": return "bg-green-100 text-green-800 border-green-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  
  const getStatusBadgeStyle = (status: string) => {
     switch (status) {
      case "approved": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700";
      case "declined": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      case "completed": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
  };

  const getUpdatePriorityBadgeStyle = (p: string) => {
    switch (String(p).toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
      case "medium":
        return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700";
      case "low":
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";
    }
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
  // 2. We have no update data and we're currently loading/fetching
  const shouldShowSkeleton = (isLoading && !update) || (!update && isFetching);

  // Function to render skeleton UI
  const renderSkeleton = () => <UpdateDetailsMainSkeleton />;

  // Now you can do your early returns
  if (shouldShowSkeleton) return renderSkeleton();
  if (isAccessError) return <AccessError />;
  if (isError || !update) return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="mt-4">Loading Failed</CardTitle>
          <CardDescription>{(error as Error).message || "An unexpected error occurred."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate(currentUser?.role ? `/${currentUser.role}/updates` : '/updates')}>Go to Updates</Button>
        </CardContent>
      </Card>
    </div>
  );
  
  const canPerformActions = currentUser?.role === "admin" || (currentUser?.role === "developer" && update?.created_by === currentUser?.username) || (currentUser?.role === "tester" && update?.created_by === currentUser?.username)

  const canMarkAsCompleted =
    (currentUser?.role === "admin" ||
      currentUser?.role === "developer" ||
      currentUser?.role === "tester") &&
    update?.status === "approved";

  const canSeePlanningFields =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const canConvertUpdate =
    currentUser?.role === "admin" ||
    currentUser?.role === "developer" ||
    currentUser?.role === "tester";

  const apiBaseUrl = ENV.API_URL.replace(/\/$/, "");
  const buildImageUrl = (path: string) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${apiBaseUrl}/image.php?path=${encodeURIComponent(path)}`;
  };
  const buildDownloadUrl = (path: string, name?: string) => {
    const base = `${apiBaseUrl}/get_attachment.php?path=${encodeURIComponent(path)}`;
    const withName = name ? `${base}&name=${encodeURIComponent(name)}` : base;
    return `${withName}&update_id=${encodeURIComponent(update.id)}`;
  };

  const isImageAttachment = (att: {
    file_type?: string;
    file_name?: string;
  }) =>
    att.file_type === "screenshot" ||
    !!att.file_type?.startsWith("image/") ||
    !!att.file_name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);

  // Prefer screenshots array; also include image files so preview gallery is complete
  const previewScreenshots = [
    ...(Array.isArray(update.screenshots) ? update.screenshots : []),
    ...(Array.isArray(update.files)
      ? update.files.filter(
          (f: any) =>
            isImageAttachment(f) &&
            !(update.screenshots || []).some((s: any) => s.id === f.id)
        )
      : []),
  ];

  const otherFiles = (Array.isArray(update.files) ? update.files : []).filter(
    (f: any) => !isImageAttachment(f)
  );

  const openScreenshotViewer = (index: number) => {
    setSelectedScreenshotIndex(index);
    setScreenshotViewerOpen(true);
  };
  const openAttachmentPreview = (file: {
    file_name: string;
    file_path: string;
  }) => {
    setAttachmentPreview({
      url: buildDownloadUrl(file.file_path, file.file_name),
      file_name: file.file_name,
      file_path: file.file_path,
    });
  };
  const downloadAttachment = (file: { file_path: string; file_name: string }) => {
    void downloadAttachmentFile(file.file_path, file.file_name);
  };
  const isVideoFile = (file: { file_type?: string; file_name?: string }) =>
    file.file_type?.startsWith("video/") ||
    !!file.file_name?.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/i);

  const formatStatusDateTime = (value: string | null | undefined) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "MMM d, yyyy 'at' h:mm a");
  };

  // Find current update index for navigation
  const currentIndex = updateList.findIndex((u) => u.id === updateId);
  const prevUpdateId = currentIndex > 0 ? updateList[currentIndex - 1]?.id : null;
  const nextUpdateId = currentIndex >= 0 && currentIndex < updateList.length - 1 ? updateList[currentIndex + 1]?.id : null;
  const totalUpdates = updateList.length;

  const role = currentUser?.role || "admin";

  return (
    <div className="min-w-0 w-full space-y-8 flex flex-col">
      {/* Background refetch indicator */}
      {isFetching && update && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-md shadow-md text-sm font-medium animate-pulse">
            Updating...
          </div>
        </div>
      )}
      
      <div className="flex-1 w-full space-y-8">
        <header className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20" />
          <div className="relative p-4 sm:p-6 space-y-3 sm:space-y-4">
            <button
              type="button"
              onClick={() => navigate(updatesBackPath)}
              className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {fromProject ? "Back to Project Updates" : "Back to Updates"}
            </button>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
                  {update.title}
                </h1>
                {update.project_name ? (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Project Name: {update.project_name}
                  </p>
                ) : null}
                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                  Update ID: <span className="font-mono break-all">{update.id}</span>
                </p>
              </div>

              <div
                role="toolbar"
                aria-label="Update actions"
                className="flex flex-wrap items-center gap-2 w-full lg:w-auto lg:max-w-md lg:justify-end"
              >
                <CopyTextButton
                  text={update.title || ""}
                  label="title"
                  size="md"
                  className="h-9 w-9 shrink-0"
                />

                {canPerformActions &&
                  (currentUser?.role === "admin" ||
                    update?.created_by === currentUser?.username) && (
                    <Button
                      variant="outline"
                      size="sm"
                      title="Edit update"
                      aria-label="Edit update"
                      className="h-9 w-9 p-0 shrink-0"
                      asChild
                    >
                      <Link
                        to={
                          currentUser?.role
                            ? `/${currentUser.role}/updates/${updateId}/edit`
                            : `/updates/${updateId}/edit`
                        }
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}

                <Button
                  variant="outline"
                  size="sm"
                  title="Share"
                  aria-label="Share"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={async () => {
                    const url = generateShareableUrl("updates", update.id);
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: update.title,
                          text: update.title,
                          url,
                        });
                      } else {
                        await navigator.clipboard.writeText(url);
                        toast({
                          title: "Link copied",
                          description: "Update link copied to clipboard.",
                        });
                      }
                    } catch {
                      try {
                        await navigator.clipboard.writeText(url);
                        toast({
                          title: "Link copied",
                          description: "Update link copied to clipboard.",
                        });
                      } catch {
                        toast({
                          title: "Share failed",
                          description: "Could not share this update.",
                          variant: "destructive",
                        });
                      }
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>

                {canPerformActions && (
                  <WhatsAppShareButton
                    data={{
                      updateId: update.id,
                      updateTitle: update.title,
                      updateStatus: update.status,
                      updateType: update.type,
                      projectName: update.project_name,
                      createdBy: update.created_by_name || update.created_by,
                      description: update.description,
                    }}
                    type="update_details"
                    variant="outline"
                    size="sm"
                    showLabel={false}
                  />
                )}

                {canConvertUpdate && update.status !== "declined" && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Convert update"
                    aria-label="Convert update"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={() => setConvertOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                )}

                {canMarkAsCompleted && (
                  <Button
                    variant="default"
                    size="sm"
                    title="Mark as completed"
                    aria-label="Mark as completed"
                    className="h-9 w-9 p-0 shrink-0"
                    onClick={openCompleteDialog}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                )}

                {canPerformActions && (
                  <Button
                    variant="outline"
                    size="sm"
                    title="Delete update"
                    aria-label="Delete update"
                    onClick={handleDeleteUpdate}
                    className="h-9 w-9 p-0 shrink-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                ID: {String(update.id).substring(0, 8)}
              </Badge>
              {update.status ? (
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusBadgeStyle(update.status)}`}
                >
                  {String(update.status).replace(/_/g, " ").toUpperCase()}
                </Badge>
              ) : null}
              {update.type ? (
                <Badge variant="outline" className="text-xs capitalize">
                  {update.type}
                </Badge>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Content - Description and Admin Actions */}
          <section className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>Description</span>
                  <CopyTextButton
                    text={update.description || ""}
                    label="description"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                <p>{update.description}</p>
              </CardContent>
            </Card>
            
            {/* Attachments — in-app Screenshot Preview (same as Bugs), never new tab */}
            {((update.attachments_count && update.attachments_count > 0) ||
              previewScreenshots.length > 0 ||
              otherFiles.length > 0 ||
              (update.voice_notes && update.voice_notes.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {previewScreenshots.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <ImagePlus className="h-4 w-4" />
                        Screenshots ({previewScreenshots.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {previewScreenshots.map((screenshot: any, index: number) => (
                          <button
                            key={screenshot.id || `${screenshot.file_path}-${index}`}
                            type="button"
                            className="relative group text-left rounded-xl border border-gray-200 dark:border-gray-700 p-2 bg-white dark:bg-gray-800 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openScreenshotViewer(index);
                            }}
                          >
                            <div className="relative aspect-[9/16] max-h-48 bg-muted rounded-lg overflow-hidden border">
                              <img
                                src={buildImageUrl(screenshot.file_path)}
                                alt={screenshot.file_name || `Screenshot ${index + 1}`}
                                className="h-full w-full object-cover"
                                draggable={false}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3EImage%3C/text%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-sm font-medium text-black">
                                  <Eye className="w-4 h-4" />
                                  View
                                </span>
                              </div>
                            </div>
                            <div className="text-xs truncate mt-2 px-1 text-muted-foreground font-medium">
                              {screenshot.file_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherFiles.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Paperclip className="h-4 w-4" />
                        Files ({otherFiles.length})
                      </div>
                      <div className="space-y-2">
                        {otherFiles.map((file: any) => {
                          const isVideo = isVideoFile(file);
                          return (
                            <div
                              key={file.id}
                              className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm bg-white dark:bg-gray-800"
                            >
                              <div className="flex items-center space-x-3 overflow-hidden min-w-0">
                                {isVideo ? (
                                  <Video className="h-8 w-8 text-blue-500 shrink-0" />
                                ) : (
                                  <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
                                    <File className="h-5 w-5 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate font-medium text-gray-700 dark:text-gray-300">
                                    {file.file_name}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {file.file_size
                                      ? `${(file.file_size / 1024).toFixed(1)} KB`
                                      : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openAttachmentPreview(file);
                                  }}
                                  title="View attachment"
                                  className="hover:text-blue-600"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    downloadAttachment(file);
                                  }}
                                  title="Download attachment"
                                >
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {update.voice_notes && update.voice_notes.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Play className="h-4 w-4" />
                        Voice Notes ({update.voice_notes.length})
                      </div>
                      <div className="space-y-2">
                        {update.voice_notes.map((voiceNote: any) => (
                          <div key={voiceNote.id} className="relative">
                            <WhatsAppVoiceMessage
                              id={voiceNote.id}
                              audioSource={buildAudioUrl(
                                voiceNote.file_path,
                                voiceNote.full_url
                              )}
                              duration={voiceNote.duration || 0}
                              fileName={voiceNote.file_name || "voice-note.webm"}
                              accent="received"
                              isActive={activeVoiceNoteId === voiceNote.id}
                              onPlay={(id) => setActiveVoiceNoteId(id)}
                              onPause={(id) => {
                                if (id === activeVoiceNoteId) {
                                  setActiveVoiceNoteId(null);
                                }
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {previewScreenshots.length > 0 && (
              <ScreenshotViewer
                screenshots={previewScreenshots.map((s: any) => ({
                  id: String(s.id),
                  file_name: s.file_name || "screenshot",
                  file_path: s.file_path,
                  file_type: s.file_type || "image/*",
                  project_name: update.project_name,
                }))}
                open={screenshotViewerOpen}
                onOpenChange={setScreenshotViewerOpen}
                initialIndex={selectedScreenshotIndex}
              />
            )}

            <Dialog
              open={!!attachmentPreview}
              onOpenChange={(open) => {
                if (!open) setAttachmentPreview(null);
              }}
            >
              <DialogContent
                className="max-w-4xl w-[calc(100vw-1.5rem)] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden rounded-2xl"
                showCloseButton={false}
              >
                {attachmentPreview && (
                  <>
                    <DialogHeader className="relative flex flex-row items-center gap-2 space-y-0 border-b bg-background px-4 py-3 pr-3 text-left shrink-0">
                      <DialogTitle className="text-base truncate leading-tight flex-1 min-w-0">
                        {attachmentPreview.file_name}
                      </DialogTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-8 w-8 p-0 rounded-full hover:bg-muted"
                        onClick={() => setAttachmentPreview(null)}
                        aria-label="Close preview"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogHeader>
                    <div className="flex-1 min-h-[200px] overflow-auto bg-muted/20">
                      <DocumentPreviewBody
                        url={attachmentPreview.url}
                        fileName={attachmentPreview.file_name}
                      />
                    </div>
                    <div className="px-4 py-3 border-t shrink-0 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          downloadAttachment({
                            file_path: attachmentPreview.file_path,
                            file_name: attachmentPreview.file_name,
                          })
                        }
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
            
            {currentUser?.role === "admin" && update?.status === "pending" && (
              <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-yellow-900 dark:text-yellow-100">Admin Action Required</CardTitle>
                    <CardDescription className="text-yellow-700 dark:text-yellow-400">This update is awaiting your approval.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button onClick={() => setShowApproveDialog(true)} className="bg-green-600 hover:bg-green-700 text-white">
                    <Check className="mr-2 h-4 w-4" />Approve
                  </Button>
                  <Button variant="destructive" onClick={() => setShowDeclineDialog(true)}>
                    <X className="mr-2 h-4 w-4"/>Decline
                  </Button>
                </CardContent>
              </Card>
            )}

            {update?.status === "approved" &&
              currentUser?.role === "admin" &&
              !canMarkAsCompleted && (
              <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
                <CardHeader>
                  <CardTitle className="text-emerald-900 dark:text-emerald-100">Update Approved</CardTitle>
                  <CardDescription className="text-emerald-800 dark:text-emerald-300">
                    You approved this update. An admin, developer, or tester on the project team can mark it
                    completed with testing notes.
                    {formatStatusDateTime(update.approved_at) && (
                      <span className="block mt-2 text-sm font-medium">
                        Approved on {formatStatusDateTime(update.approved_at)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {canMarkAsCompleted && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">Ready to Complete</CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-400">
                      This update is approved. Mark it completed with testing details and notes for
                      the team.
                      {formatStatusDateTime(update.approved_at) && (
                        <span className="block mt-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                          Approved on {formatStatusDateTime(update.approved_at)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button 
                    onClick={openCompleteDialog} 
                    className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />Mark as Completed
                  </Button>
                </CardContent>
              </Card>
            )}

            {update?.status === "completed" && (
              <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950">
                <CardHeader>
                  <CardTitle className="text-emerald-900 dark:text-emerald-100">Update Completed</CardTitle>
                  <CardDescription className="text-emerald-800 dark:text-emerald-300">
                    This update has been marked as completed.
                    {formatStatusDateTime(update.completed_at) && (
                      <span className="block mt-2 text-sm font-medium">
                        Completed on {formatStatusDateTime(update.completed_at)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
          </section>
          
          <section className="space-y-8">
            <UpdateDetailsCard
              update={update}
              role={role}
              canSeePlanningFields={canSeePlanningFields}
              getTypeBadgeStyle={getTypeBadgeStyle}
              getStatusBadgeStyle={getStatusBadgeStyle}
              getUpdatePriorityBadgeStyle={getUpdatePriorityBadgeStyle}
            />
            <UpdateLifecycleCard update={update} />
          </section>
        </div>
      </div>
      
      {/* Professional navigation bar at the bottom */}
      <nav className="w-full mt-8">
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-50/40 to-blue-50/40 dark:from-gray-800/20 dark:to-blue-900/20" />
          <div className="relative w-full flex justify-center items-center gap-6 py-4 px-4">
            <button
              className="flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
              onClick={() => {
                if (prevUpdateId) {
                  let url = `/${role}/updates/${prevUpdateId}`;
                  if (fromProject) {
                    url += '?from=project';
                  }
                  navigate(url);
                }
              }}
              disabled={!prevUpdateId || updateListLoading}
              aria-label="Previous Update"
            >
              <ArrowLeft className="mr-2 h-5 w-5" /> Previous
            </button>
            <span className="text-sm font-medium text-muted-foreground select-none">
              {totalUpdates > 0
                ? `Update ${currentIndex + 1} of ${totalUpdates}`
                : "No updates"}
            </span>
            <button
              className="flex items-center px-4 py-2 rounded bg-muted hover:bg-muted/80 disabled:opacity-50 transition-colors"
              onClick={() => {
                if (nextUpdateId) {
                  let url = `/${role}/updates/${nextUpdateId}`;
                  if (fromProject) {
                    url += '?from=project';
                  }
                  navigate(url);
                }
              }}
              disabled={!nextUpdateId || updateListLoading}
              aria-label="Next Update"
            >
              Next <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog open={showApproveDialog} onOpenChange={setShowApproveDialog} onConfirm={() => approveMutation.mutate()} title="Approve Update" description="Are you sure you want to approve this update?" confirmText="Approve" isLoading={approveMutation.isPending} />
      <ConfirmationDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog} onConfirm={() => declineMutation.mutate()} title="Decline Update" description="Are you sure you want to decline this update? This cannot be undone." confirmText="Decline" isLoading={declineMutation.isPending} variant="destructive" />

      {canConvertUpdate && (
        <ConvertUpdateDialog
          update={update}
          open={convertOpen}
          onOpenChange={setConvertOpen}
          onConverted={(updated) => {
            queryClient.setQueryData(["update", updateId], updated);
            refetch();
          }}
        />
      )}

      <AlertDialog
        open={showDiscardCompleteDialog}
        onOpenChange={setShowDiscardCompleteDialog}
      >
        <AlertDialogContent className="max-w-[400px] rounded-2xl border-border/60 gap-4">
          <AlertDialogHeader className="text-left space-y-2">
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved completion details. Discard them and close this
              dialog?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-xl mt-0">
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscardComplete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={showCompleteDialog}
        onOpenChange={(open) => {
          if (open) openCompleteDialog();
          else closeCompleteDialog();
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[min(92vh,720px)] w-[calc(100vw-1rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full"
        >
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-emerald-600 px-4 py-5 text-white sm:px-6 sm:py-6">
            <div className="absolute inset-0 bg-black/10" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => closeCompleteDialog()}
              className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full border border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
              aria-label="Close completion dialog"
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogHeader className="relative z-10 space-y-2 pr-10 text-left">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white sm:text-2xl">
                <div className="rounded-xl bg-white/20 p-2 backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                Mark as Completed
              </DialogTitle>
              <DialogDescription className="text-sm text-blue-50 sm:text-base">
                Record how this update was delivered and tested before closing it out.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-50/60 p-4 dark:bg-gray-900/50 sm:p-6">
            <div className="space-y-5">
              <section className="space-y-4 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/40">
                    <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Testing</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complete-tested" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Was this update tested? <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={completeForm.tested || SELECT_UNSET}
                    onValueChange={(v) => {
                      const tested = resolveSelectValue(v) as "" | "yes" | "no";
                      setCompleteForm((f) => ({
                        ...f,
                        tested: tested === "yes" || tested === "no" ? tested : "",
                        testedBy: tested === "no" ? "" : f.testedBy,
                      }));
                    }}
                  >
                    <SelectTrigger id="complete-tested" className="h-11 bg-white dark:bg-gray-800">
                      <SelectValue placeholder="Select yes or no" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[220]">
                      <SelectItem value={SELECT_UNSET} disabled className="hidden">
                        Select yes or no
                      </SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {completeForm.tested === "yes" && (
                  <div className="space-y-2">
                    <Label htmlFor="complete-tested-by" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Who tested <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={completeForm.testedBy || SELECT_UNSET}
                      onValueChange={(v) =>
                        setCompleteForm((f) => ({
                          ...f,
                          testedBy: resolveSelectValue(v),
                        }))
                      }
                      disabled={membersLoading}
                    >
                      <SelectTrigger id="complete-tested-by" className="h-11 bg-white dark:bg-gray-800">
                        <SelectValue
                          placeholder={
                            membersLoading
                              ? "Loading testers…"
                              : testerOptions.length
                                ? "Select a tester"
                                : "No testers found"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        className="z-[220] max-h-60 overflow-y-auto"
                      >
                        <SelectItem value={SELECT_UNSET} disabled className="hidden">
                          Select a tester
                        </SelectItem>
                        {testerOptions.map((person) => (
                          <SelectItem key={person.id} value={person.username}>
                            {person.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Testers and admins assigned to this project.
                    </p>
                  </div>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-900/40">
                    <Timer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Development</h3>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complete-developed-by" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Who developed <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={completeForm.developedBy || SELECT_UNSET}
                    onValueChange={(v) =>
                      setCompleteForm((f) => ({
                        ...f,
                        developedBy: resolveSelectValue(v),
                      }))
                    }
                    disabled={membersLoading}
                  >
                    <SelectTrigger id="complete-developed-by" className="h-11 bg-white dark:bg-gray-800">
                      <SelectValue
                        placeholder={
                          membersLoading
                            ? "Loading developers…"
                            : developerOptions.length
                              ? "Select a developer"
                              : "No developers found"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="z-[220] max-h-60 overflow-y-auto"
                    >
                      <SelectItem value={SELECT_UNSET} disabled className="hidden">
                        Select a developer
                      </SelectItem>
                      {developerOptions.map((person) => (
                        <SelectItem key={person.id} value={person.username}>
                          <span className="inline-flex items-center gap-2">
                            <Code2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            {person.username}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                    <p className="text-xs text-muted-foreground">
                      Developers and admins assigned to this project.
                    </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complete-dev-hours" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Calculated hours for development
                  </Label>
                  <Input
                    id="complete-dev-hours"
                    type="number"
                    min={0}
                    step={0.25}
                    placeholder="e.g. 8"
                    value={completeForm.devHours}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, devHours: e.target.value }))}
                    className="h-11 bg-white dark:bg-gray-800"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Development started
                    </Label>
                    <DatePicker
                      value={completeForm.devStarted}
                      onChange={(v) =>
                        setCompleteForm((f) => ({ ...f, devStarted: v }))
                      }
                      placeholder="Pick start date"
                      className="h-11 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Development ended
                    </Label>
                    <DatePicker
                      value={completeForm.devEnded}
                      onChange={(v) =>
                        setCompleteForm((f) => ({ ...f, devEnded: v }))
                      }
                      placeholder="Pick end date"
                      className="h-11 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-indigo-100 p-1.5 dark:bg-indigo-900/40">
                    <File className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notes</h3>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complete-notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion notes <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="complete-notes"
                    placeholder="Describe what was delivered, how it was tested, and any follow-up context..."
                    className="min-h-[110px] resize-none bg-white dark:bg-gray-800"
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t bg-background px-4 py-3 sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeCompleteDialog()}
              disabled={completeMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={completeMutation.isPending}
              onClick={handleCompleteSubmit}
              className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:from-blue-700 hover:to-emerald-700 sm:w-auto"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Completed
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UndoDeleteNotificationPortal
        open={isDeletingUpdate && undoDelete.isCountingDown}
        title="Update Deleted"
        itemName={update?.title ?? ""}
        timeLeft={undoDelete.timeLeft}
        duration={10}
        onUndo={undoDelete.cancelCountdown}
        onConfirmNow={undoDelete.confirmDelete}
      />
    </div>
  );
};

// Generic Confirmation Dialog Component
const ConfirmationDialog = ({ open, onOpenChange, onConfirm, title, description, confirmText, isLoading, variant = 'default' }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText: string;
    isLoading: boolean;
    variant?: 'default' | 'destructive';
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[400px] rounded-2xl">
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
                 <DialogClose asChild><Button type="button" variant="outline" className="rounded-xl">Cancel</Button></DialogClose>
                 <Button type="button" variant={variant} className="rounded-xl" onClick={onConfirm} disabled={isLoading}>
                    {isLoading ? `${confirmText}...` : confirmText}
                 </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default UpdateDetails;
