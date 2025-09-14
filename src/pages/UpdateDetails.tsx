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
import { ArrowLeft, Bell, User, Calendar, Tag, Check, X, Trash2, Pencil, AlertCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { WhatsAppShareButton } from "@/components/bugs/WhatsAppShareButton";
import { format } from "date-fns";
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

// Skeleton for the main content
const UpdateDetailsSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-1/4 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
);

const UpdateDetails = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const { data: update, isLoading, isError, error } = useQuery({
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
  });

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

  if (isLoading) return <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto"><UpdateDetailsSkeleton /></main>;
  
  if (isError) return (
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

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
       <div className="relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
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
                    <Button asChild variant="outline" size="sm"><Link to={currentUser?.role ? `/${currentUser.role}/updates/${updateId}/edit` : `/updates/${updateId}/edit`}><Pencil className="mr-2 h-4 w-4"/>Edit</Link></Button>
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
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}><Trash2 className="mr-2 h-4 w-4"/>Delete</Button>
                 </>
            )}
            </div>
          </div>
         </div>
       </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
                         <Button onClick={() => setShowApproveDialog(true)} className="bg-green-600 hover:bg-green-700 text-white"><Check className="mr-2 h-4 w-4" />Approve</Button>
                         <Button variant="destructive" onClick={() => setShowDeclineDialog(true)}><X className="mr-2 h-4 w-4"/>Decline</Button>
                    </CardContent>
                </Card>
            )}
        </div>
        
        <div className="lg:col-span-1 space-y-6">
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
                <span className="font-medium">{format(new Date(update.created_at), "PPPp")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
