import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bell, User, Calendar, Tag, Check, X, Trash2, Pencil, AlertCircle, Lock } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { WhatsAppShareButton } from "@/components/bugs/WhatsAppShareButton";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { formatDetailedDate } from "@/lib/dateUtils";

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [updateList, setUpdateList] = useState<any[]>([]);
  const [updateListLoading, setUpdateListLoading] = useState(true);

  // Check if user came from project page
  const fromProject = searchParams.get("from") === "project";

  const { data: update, isLoading, isError, error, refetch, isFetching, isStale } = useQuery({
    queryKey: ["update", updateId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/get.php?id=${updateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 404) {
          throw new Error("Update not found or you do not have permission to view it.");
        }
        throw new Error("Failed to fetch update details.");
      }
      const data = await response.json();
      if (data.success) return data.data;
      throw new Error(data.message || "An unknown error occurred.");
    },
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
    
    fetch(`${API_BASE}/getAll.php`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setUpdateList(data.data || []);
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
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  };

  const approveMutation = useMutation({
    mutationFn: () => fetch(`${API_BASE}/approve.php?id=${updateId}`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(res => res.json().then(data => { if (!data.success) throw new Error(data.message); return "Update approved successfully."; })),
    ...mutationOptions,
  });

  const declineMutation = useMutation({
    mutationFn: () => fetch(`${API_BASE}/decline.php?id=${updateId}`, { method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(res => res.json().then(data => { if (!data.success) throw new Error(data.message); return "Update declined successfully."; })),
    ...mutationOptions,
  });

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`${API_BASE}/delete.php?id=${updateId}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(res => res.json().then(data => { if (!data.success) throw new Error(data.message); return "Update deleted successfully."; })),
    onSuccess: (successMessage) => {
      toast({ title: "Success", description: successMessage });
      queryClient.invalidateQueries({ queryKey: ["updates"] });
      navigate(currentUser?.role ? `/${currentUser.role}/updates` : '/updates');
    },
    onError: mutationOptions.onError,
  });
  
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "feature": return "bg-blue-100 text-blue-800 border-blue-200";
      case "fix": return "bg-green-100 text-green-800 border-green-200";
      case "maintenance": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };
  
  const getStatusBadgeStyle = (status: string) => {
     switch (status) {
      case "approved": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "declined": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
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
                <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2 -ml-2 sm:-ml-4">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Updates
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
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                      <Trash2 className="mr-2 h-4 w-4"/>Delete
                    </Button>
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
      <ConfirmationDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={() => deleteMutation.mutate()} title="Delete Update" description="Are you sure you want to permanently delete this update? This action cannot be undone." confirmText="Delete" isLoading={deleteMutation.isPending} variant="destructive" />
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
