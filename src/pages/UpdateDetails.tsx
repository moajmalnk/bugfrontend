import { Badge } from "@/components/ui/badge";
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
import { updateService } from "@/services/updateService";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bell, User, Calendar, Tag, Check, X, Trash2, Pencil, AlertCircle, Lock, Undo2, CheckCircle2, ImagePlus, Paperclip, File, Clock, CalendarDays, Play, Timer, Flag } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { WhatsAppShareButton } from "@/components/bugs/WhatsAppShareButton";
import { WhatsAppVoiceMessage } from "@/components/voice/WhatsAppVoiceMessage";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { formatDetailedDate } from "@/lib/dateUtils";


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
  <main
    className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8"
    aria-busy="true"
    aria-label="Loading update details"
  >
    <section className="max-w-7xl mx-auto space-y-8">
      <header>
        <UpdateHeaderSkeleton />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Description Skeleton */}
        <section className="lg:col-span-2 space-y-8">
          <UpdateDescriptionSkeleton />
        </section>

        {/* Sidebar - Update Details Skeleton */}
        <aside className="space-y-8">
          <UpdateDetailsSkeleton />
        </aside>
      </div>
    </section>
  </main>
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
        You don't have permission to view this update. You need to be a member of the project this update belongs to.
      </p>
    </section>
  </main>
);

const UpdateDetails = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    tested: "" as "" | "yes" | "no",
    devHours: "",
    devStarted: "",
    devEnded: "",
    testedBy: "",
    notes: "",
  });
  const [updateList, setUpdateList] = useState<any[]>([]);
  const [updateListLoading, setUpdateListLoading] = useState(true);
  const [isDeletingUpdate, setIsDeletingUpdate] = useState(false);
  const [activeVoiceNoteId, setActiveVoiceNoteId] = useState<string | null>(null);

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

  useEffect(() => {
    if (showCompleteDialog) {
      setCompleteForm({
        tested: "",
        devHours: "",
        devStarted: "",
        devEnded: "",
        testedBy: "",
        notes: "",
      });
    }
  }, [showCompleteDialog]);

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

    toast({
      title: "Update Deletion Started",
      description: `"${update.title}" will be deleted in ${undoDelete.timeLeft} seconds. Click undo to cancel.`,
      action: (
        <button
          onClick={() => undoDelete.cancelCountdown()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ),
    });
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
    <main className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
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
    </main>
  );
  
  const canPerformActions = currentUser?.role === "admin" || (currentUser?.role === "developer" && update?.created_by === currentUser?.username) || (currentUser?.role === "tester" && update?.created_by === currentUser?.username)

  const canSeePlanningFields =
    currentUser?.role === "admin" || currentUser?.role === "developer";

  const formatStatusDateTime = (value: string | null | undefined) => {
    if (!value) return null;
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, "MMM d, yyyy 'at' h:mm a");
  };

  const formattedCreatedDate = formatDetailedDate(update.created_at);

  // Find current update index for navigation
  const currentIndex = updateList.findIndex((u) => u.id === updateId);
  const prevUpdateId = currentIndex > 0 ? updateList[currentIndex - 1]?.id : null;
  const nextUpdateId = currentIndex >= 0 && currentIndex < updateList.length - 1 ? updateList[currentIndex + 1]?.id : null;
  const totalUpdates = updateList.length;

  const role = currentUser?.role || "admin";

  return (
    <main className="min-h-[60vh] bg-background px-4 py-6 md:px-6 lg:px-8 flex flex-col">
      {/* Background refetch indicator */}
      {isFetching && update && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-md shadow-md text-sm font-medium animate-pulse">
            Updating...
          </div>
        </div>
      )}
      
      {/* Main content */}
      <section className="max-w-7xl mx-auto space-y-8 flex-1 w-full">
        <header className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-emerald-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="min-w-0">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    if (fromProject) {
                      // If coming from project, go back to the project updates tab
                      const role = currentUser?.role || "admin";
                      navigate(`/${role}/projects/${update?.project_id}?tab=updates`);
                    } else {
                      // Otherwise, go back to the updates page
                      const role = currentUser?.role || "admin";
                      navigate(`/${role}/updates`);
                    }
                  }} 
                  className="mb-2 -ml-2 sm:-ml-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {fromProject ? "Back to Project Updates" : "Back to Updates"}
                </Button>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate">
                  {update.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Update ID: <span className="font-mono">{update.id}</span></p>
                <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-full mt-2"></div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                {canPerformActions && (
                  <>
                    {(currentUser?.role === "admin" || update?.created_by === currentUser?.username) && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={currentUser?.role ? `/${currentUser.role}/updates/${updateId}/edit` : `/updates/${updateId}/edit`}>
                          <Pencil className="mr-2 h-4 w-4"/>Edit
                        </Link>
                      </Button>
                    )}
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
                      size="sm"
                    />
                    {isDeletingUpdate && undoDelete.isCountingDown ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          Deleting in {undoDelete.timeLeft}s
                        </span>
                      </div>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={handleDeleteUpdate}>
                        <Trash2 className="mr-2 h-4 w-4"/>Delete
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* Main Content - Description and Admin Actions */}
          <section className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                <p>{update.description}</p>
              </CardContent>
            </Card>
            
            {/* Attachments Card - Moved here to be more prominent */}
            {((update.attachments_count && update.attachments_count > 0) || 
              (update.screenshots && update.screenshots.length > 0) || 
              (update.files && update.files.length > 0) || 
              (update.voice_notes && update.voice_notes.length > 0)) && (
              <Card>
                <CardHeader><CardTitle>Attachments</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {/* Screenshots */}
                  {update.screenshots && update.screenshots.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <ImagePlus className="h-4 w-4" />
                        Screenshots ({update.screenshots.length})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {update.screenshots.map((screenshot: any) => (
                          <div key={screenshot.id} className="relative rounded-xl border border-gray-200 dark:border-gray-700 p-2 group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800">
                            <a href={screenshot.full_url || `${import.meta.env.VITE_API_URL.replace('/api', '')}/${screenshot.file_path}`} target="_blank" rel="noopener noreferrer" className="block">
                              <img 
                                src={screenshot.full_url || `${import.meta.env.VITE_API_URL.replace('/api', '')}/${screenshot.file_path}`} 
                                alt={screenshot.file_name} 
                                className="h-32 w-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3EImage%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            </a>
                            <div className="text-xs truncate mt-2 px-1 text-gray-600 dark:text-gray-400 font-medium">{screenshot.file_name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Files */}
                  {update.files && update.files.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <Paperclip className="h-4 w-4" />
                        Files ({update.files.length})
                      </div>
                      <div className="space-y-2">
                        {update.files.map((file: any) => (
                          <a 
                            key={file.id} 
                            href={file.full_url || `${import.meta.env.VITE_API_URL.replace('/api', '')}/${file.file_path}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-sm group hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              {file.full_url && file.file_type?.startsWith('image/') ? (
                                <img src={file.full_url} alt={file.file_name} className="h-10 w-10 object-cover rounded-lg" />
                              ) : (
                                <div className="h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
                                  <File className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium text-gray-700 dark:text-gray-300">{file.file_name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''}</div>
                              </div>
                            </div>
                            <File className="h-4 w-4 text-gray-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Voice Notes */}
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
                              audioSource={voiceNote.full_url || `${import.meta.env.VITE_API_URL.replace('/api', '')}/${voiceNote.file_path}`}
                              duration={voiceNote.duration || 0}
                              waveform={[]}
                              onRemove={() => {}}
                              isActive={activeVoiceNoteId === voiceNote.id}
                              onPlay={(id) => setActiveVoiceNoteId(id)}
                              onPause={(id) => setActiveVoiceNoteId(null)}
                              onEnded={() => setActiveVoiceNoteId(null)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
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

            {update?.status === "approved" && canPerformActions && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">Update Approved</CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-400">
                      This update has been approved and is ready to be marked as completed.
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
                    onClick={() => setShowCompleteDialog(true)} 
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
          
          {/* Update Details Card */}
          <section className="space-y-8">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline" className={getTypeBadgeStyle(update.type)}>{update.type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className={getStatusBadgeStyle(update.status)}>{update.status}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Project:</span>
                  <span className="font-medium">{update.project_name || "BugRicer"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created by:</span>
                  <span className="font-medium">{update.created_by_name || update.created_by}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created on:</span>
                  <span className="font-medium">{formattedCreatedDate}</span>
                </div>
                {update.expected_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Expected date:</span>
                    <span className="font-medium">{format(new Date(update.expected_date), 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {update.expected_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Expected time:</span>
                    <span className="font-medium">{update.expected_time}</span>
                  </div>
                )}
                {formatStatusDateTime(update.approved_at) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Approved on:</span>
                    <span className="font-medium">{formatStatusDateTime(update.approved_at)}</span>
                  </div>
                )}
                {formatStatusDateTime(update.declined_at) && (
                  <div className="flex items-center gap-2 text-sm">
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Declined on:</span>
                    <span className="font-medium">{formatStatusDateTime(update.declined_at)}</span>
                  </div>
                )}
                {formatStatusDateTime(update.completed_at) && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Marked completed on:</span>
                    <span className="font-medium">{formatStatusDateTime(update.completed_at)}</span>
                  </div>
                )}
                {update.status === "completed" && update.completion_tested !== null && update.completion_tested !== undefined && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tested:</span>
                      <span className="font-medium">{Number(update.completion_tested) === 1 ? "Yes" : "No"}</span>
                    </div>
                    {update.completion_dev_hours != null &&
                      update.completion_dev_hours !== "" &&
                      !Number.isNaN(Number(update.completion_dev_hours)) && (
                        <div className="flex items-center gap-2 text-sm">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Calculated hours (development):</span>
                          <span className="font-medium">
                            {Number(update.completion_dev_hours).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            h
                          </span>
                        </div>
                      )}
                    {formatStatusDateTime(update.completion_dev_started_at) && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Development started:</span>
                        <span className="font-medium">{formatStatusDateTime(update.completion_dev_started_at)}</span>
                      </div>
                    )}
                    {formatStatusDateTime(update.completion_dev_ended_at) && (
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Development ended:</span>
                        <span className="font-medium">{formatStatusDateTime(update.completion_dev_ended_at)}</span>
                      </div>
                    )}
                    {update.completion_tested_by && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Tested by:</span>
                        <span className="font-medium">{update.completion_tested_by}</span>
                      </div>
                    )}
                    {update.completion_notes && (
                      <div className="flex flex-col gap-1 text-sm pt-1">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <File className="h-4 w-4" />
                          Completion notes
                        </span>
                        <p className="text-foreground whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
                          {update.completion_notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {canSeePlanningFields && update.calculated_hours != null &&
                  update.calculated_hours !== "" &&
                  !Number.isNaN(Number(update.calculated_hours)) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Calculated hours:</span>
                      <span className="font-medium">
                        {Number(update.calculated_hours).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        h
                      </span>
                    </div>
                  )}
                {canSeePlanningFields &&
                  update.update_priority &&
                  ["high", "medium", "low"].includes(String(update.update_priority).toLowerCase()) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Flag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Update priority:</span>
                      <Badge
                        variant="outline"
                        className={getUpdatePriorityBadgeStyle(String(update.update_priority))}
                      >
                        {String(update.update_priority)}
                      </Badge>
                    </div>
                  )}
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
      
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
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark as completed</DialogTitle>
            <DialogDescription>
              Record how this update was delivered and tested before closing it out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="complete-tested">Was this update tested? *</Label>
              <Select
                value={completeForm.tested || undefined}
                onValueChange={(v) =>
                  setCompleteForm((f) => ({ ...f, tested: v as "yes" | "no" }))
                }
              >
                <SelectTrigger id="complete-tested">
                  <SelectValue placeholder="Select yes or no" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-dev-hours">Calculated hours for development</Label>
              <Input
                id="complete-dev-hours"
                type="number"
                min={0}
                step={0.25}
                placeholder="e.g. 8"
                value={completeForm.devHours}
                onChange={(e) => setCompleteForm((f) => ({ ...f, devHours: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="complete-dev-started">Development started</Label>
                <Input
                  id="complete-dev-started"
                  type="datetime-local"
                  value={completeForm.devStarted}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, devStarted: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complete-dev-ended">Development ended</Label>
                <Input
                  id="complete-dev-ended"
                  type="datetime-local"
                  value={completeForm.devEnded}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, devEnded: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-tested-by">Who tested (name)</Label>
              <Input
                id="complete-tested-by"
                placeholder="Tester name"
                value={completeForm.testedBy}
                onChange={(e) => setCompleteForm((f) => ({ ...f, testedBy: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complete-notes">Notes</Label>
              <Textarea
                id="complete-notes"
                placeholder="Optional notes about completion or testing"
                className="min-h-[100px]"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowCompleteDialog(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={completeMutation.isPending}
              onClick={() => {
                if (completeForm.tested === "") {
                  toast({
                    title: "Required",
                    description: "Please select whether this update was tested (yes or no).",
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
                  completion_notes: completeForm.notes.trim() || undefined,
                });
              }}
            >
              {completeMutation.isPending ? "Saving…" : "Mark as completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
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
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2">
                 <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                 <Button type="button" variant={variant} onClick={onConfirm} disabled={isLoading}>
                    {isLoading ? `${confirmText}...` : confirmText}
                 </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default UpdateDetails;
