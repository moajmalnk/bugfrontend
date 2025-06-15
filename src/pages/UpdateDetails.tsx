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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = import.meta.env.VITE_API_URL + "/updates";

const UpdateDetails = () => {
  const navigate = useNavigate();
  const { updateId } = useParams<{ updateId: string }>();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const {
    data: update,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["update", updateId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/get.php?id=${updateId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      throw new Error(data.message || "Failed to fetch update");
    },
    enabled: !!updateId,
  });

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [isLoading]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "feature":
        return "text-blue-500";
      case "fix":
        return "text-green-500";
      case "maintenance":
        return "text-yellow-500";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
        <section className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="flex items-center text-muted-foreground hover:text-foreground"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Error</CardTitle>
              <CardDescription>
                Failed to load update details. Please try again.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 sm:px-4 py-4 sm:py-6 md:px-6 lg:px-8 xl:px-10">
      <section className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="flex items-center text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {showSkeleton || isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-xl sm:text-2xl">
                    {update?.title}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Update ID: {update?.id}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`text-sm ${getTypeColor(update?.type || "")}`}
                >
                  {update?.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {update?.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    Created by
                  </div>
                  <p className="text-sm font-medium">{update?.created_by}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Bell className="h-4 w-4 mr-2" />
                    Created at
                  </div>
                  <p className="text-sm font-medium">
                    {formatDate(update?.created_at || "")}
                  </p>
                </div>
              </div>

              {(currentUser?.role === "admin" ||
                ((currentUser?.role === "tester" || currentUser?.role === "developer") && update?.created_by === currentUser?.username)
              ) && (
                <div className="flex justify-end pt-4 border-t gap-2 flex-wrap">
                  {currentUser?.role === "admin" && update?.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setShowApproveDialog(true)}
                        disabled={isApproving}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeclineDialog(true)}
                        disabled={isDeclining}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={isDeleting}
                  >
                    Delete Update
                  </Button>
                  {(currentUser?.role === "admin" || currentUser?.role === "developer") && (
                    <Button asChild>
                      <Link to={`/updates/${updateId}/edit`}>Edit Update</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approve Confirmation Dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Update</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to approve this update?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  setIsApproving(true);
                  try {
                    const response = await fetch(`${API_BASE}/approve.php?id=${updateId}`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    });
                    const data = await response.json();
                    if (data.success) {
                      toast({ title: "Approved", description: "Update approved" });
                      queryClient.invalidateQueries({ queryKey: ["updates"] });
                      queryClient.invalidateQueries({ queryKey: ["update", updateId] });
                      setShowApproveDialog(false);
                    } else {
                      toast({ title: "Error", description: data.message, variant: "destructive" });
                    }
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to approve update", variant: "destructive" });
                  } finally {
                    setIsApproving(false);
                  }
                }}
                disabled={isApproving}
              >
                {isApproving ? "Approving..." : "Approve"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Confirmation Dialog */}
        <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Decline Update</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to decline this update?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeclineDialog(false)}
                disabled={isDeclining}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setIsDeclining(true);
                  try {
                    const response = await fetch(`${API_BASE}/decline.php?id=${updateId}`, {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    });
                    const data = await response.json();
                    if (data.success) {
                      toast({ title: "Declined", description: "Update declined" });
                      queryClient.invalidateQueries({ queryKey: ["updates"] });
                      queryClient.invalidateQueries({ queryKey: ["update", updateId] });
                      setShowDeclineDialog(false);
                    } else {
                      toast({ title: "Error", description: data.message, variant: "destructive" });
                    }
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to decline update", variant: "destructive" });
                  } finally {
                    setIsDeclining(false);
                  }
                }}
                disabled={isDeclining}
              >
                {isDeclining ? "Declining..." : "Decline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Update</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete this update? This action cannot be undone.</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    const response = await fetch(`${API_BASE}/delete.php?id=${updateId}`, {
                      method: "DELETE",
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    });
                    const data = await response.json();
                    if (data.success) {
                      toast({ title: "Deleted", description: "Update deleted successfully" });
                      setShowDeleteDialog(false);
                      queryClient.invalidateQueries({ queryKey: ["updates"] });
                      navigate("/updates");
                    } else {
                      toast({ title: "Error", description: data.message || "Failed to delete update", variant: "destructive" });
                    }
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to delete update", variant: "destructive" });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
};

export default UpdateDetails;
