import EditBugDialog from "@/components/bugs/EditBugDialog";
import { WhatsAppShareButton } from "@/components/bugs/WhatsAppShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { generateShareableUrl } from "@/lib/utils";
import { bugService } from "@/services/bugService";
import { Bug } from "@/types";
import { CheckSquare, ChevronLeft, Edit2, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";

// Add getStatusColor function
const getStatusColor = (status: string) => {
  switch (status) {
    case "fixed":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "in_progress":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "declined":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

interface BugHeaderProps {
  bug: Bug;
  formattedCreatedDate: string;
  canEditBug: boolean;
  currentUser: any;
}

export const BugHeader = ({
  bug,
  formattedCreatedDate,
  canEditBug,
  currentUser,
}: BugHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser: authUser } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const fromParam = searchParams.get("from");
  const referrerIsProject =
    typeof document !== "undefined" && document.referrer.includes("/projects/");
  const isFromProject =
    location.state?.from === "project" ||
    fromParam === "project" ||
    referrerIsProject;

  const backLink = isFromProject
    ? `/${authUser?.role || "tester"}/projects/${bug.project_id}?tab=bugs`
    : `/${authUser?.role || "tester"}/bugs`;

  const backText = isFromProject ? "Back to Project Bugs" : "Back to Bugs";

  // Permission check: admin can delete any bug, or user can delete their own bug
  const canDelete =
    currentUser?.role === "admin" ||
    String(currentUser?.id) === String(bug.reported_by);

  // Generate a role-neutral URL that works for all users
  const generateRoleNeutralUrl = () => {
    return generateShareableUrl("bugs", bug.id);
  };

  const handleShare = async () => {
    const roleNeutralUrl = generateRoleNeutralUrl();
    const shareText = `Check out this bug: ${bug.title}\n${roleNeutralUrl}`;

    // Try Web Share API first
    if (navigator.share) {
      await navigator.share({
        title: bug.title,
        text: shareText,
        url: roleNeutralUrl,
      });
    } else {
      // Fallback to WhatsApp Web
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
        shareText
      )}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const handleDeleteClick = () => {
    if (canDelete) {
      setShowDeleteModal(true);
    } else {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete this bug.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await bugService.deleteBug(bug.id);

      toast({
        title: "Bug Deleted",
        description: `"${bug.title}" has been permanently deleted.`,
      });

      // Navigate back to the appropriate page
      navigate(backLink, { replace: true });
    } catch (error) {
      // console.error('Error deleting bug:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the bug. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  // Professional Delete Modal Component
  const DeleteModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete Bug
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4">
          <div className="space-y-3">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to permanently delete this bug?
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm break-words">
                    {bug.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Bug ID: {bug.id.substring(0, 8)}... • Created{" "}
                    {formattedCreatedDate}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                    Warning: Permanent Deletion
                  </p>
                  <p className="text-red-700 dark:text-red-300 text-xs">
                    This will permanently delete the bug and all associated
                    data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="min-w-[80px] bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Bug</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        <Link
          to={backLink}
          className="inline-flex items-center text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {backText}
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
              {bug.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Project Name: {bug.project_name}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Bug ID: {bug.id} • Reported on {formattedCreatedDate}
            </p>
          </div>

          {/* Actions: keep all buttons in a single horizontal row with mobile horizontal scroll */}
          <div className="w-full sm:w-auto overflow-x-auto">
            <div className="flex flex-row flex-nowrap items-center gap-2 min-w-max">
            {canEditBug && (
              <EditBugDialog bug={bug}>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap"
                >
                  <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </EditBugDialog>
            )}

            {/* General Share Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap"
            >
              <Share2 className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>

            {/* WhatsApp Share Button */}
            <WhatsAppShareButton
              data={{
                bugTitle: bug.title,
                bugId: bug.id,
                status: bug.status,
                priority: bug.priority,
                description: bug.description,
                reportedBy: bug.reporter_name || bug.reported_by,
                projectName: bug.project_name || bug.project_id,
              }}
              type={bug.status === "fixed" ? "status_update" : "new_bug"}
              variant="outline"
              size="sm"
              showLabel={false}
            />

            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 whitespace-nowrap"
              >
                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            )}

            {(currentUser?.role === "admin" || currentUser?.role === "developer") &&
              bug.status !== "fixed" && (
                <Button
                  variant="default"
                  size="sm"
                  className="shrink-0 h-8 sm:h-9 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() =>
                    navigate(`/${authUser?.role || "tester"}/bugs/${bug.id}/fix`)
                  }
                >
                  <CheckSquare className="mr-0 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            ID: {bug.id.substring(0, 8)}
          </Badge>
          <Badge variant="outline" className={getStatusColor(bug.status)}>
            {bug.status.replace(/_/g, " ").toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Portal-rendered Delete Modal */}
      {showDeleteModal && createPortal(<DeleteModal />, document.body)}
    </>
  );
};

// BugHeader Skeleton Component
export function BugHeaderSkeleton() {
  return (
    <>
      <div className="space-y-3 sm:space-y-4">
        {/* Back Button Skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <Skeleton className="h-4 w-32 sm:w-40" />
        </div>

        {/* Header Section with Title and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            {/* Main Title */}
            <Skeleton className="h-6 sm:h-8 w-full max-w-[300px] sm:max-w-[500px]" />
            {/* Bug ID and Date */}
            <Skeleton className="h-4 w-48 sm:w-64" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 flex-1 sm:flex-none" />
            <Skeleton className="h-8 sm:h-9 w-16 sm:w-20 flex-1 sm:flex-none" />
          </div>
        </div>

        {/* Badges and Fix Button Section */}
        <div className="flex flex-wrap gap-2">
          {/* ID Badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
          {/* Status Badge */}
          <Skeleton className="h-6 w-24 rounded-full" />
          {/* Fix Button (hidden on small screens) */}
          <div className="ml-auto hidden sm:flex">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>
    </>
  );
}

// Enhanced BugHeader Skeleton with more realistic proportions
export function BugHeaderSkeletonDetailed() {
  return (
    <>
      <div className="space-y-3 sm:space-y-4 animate-pulse">
        {/* Back Navigation Skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-sm" />
          <Skeleton className="h-4 w-36 sm:w-44" />
        </div>

        {/* Main Header Content */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          {/* Title and Meta Information */}
          <div className="space-y-2 flex-1 min-w-0">
            {/* Bug Title - Multiple lines for longer titles */}
            <div className="space-y-1">
              <Skeleton className="h-6 sm:h-8 w-full max-w-[280px] sm:max-w-[450px]" />
              <Skeleton className="h-5 sm:h-6 w-3/4 max-w-[200px] sm:max-w-[300px]" />
            </div>

            {/* Bug Meta Info */}
            <Skeleton className="h-3 sm:h-4 w-52 sm:w-72" />
          </div>

          {/* Action Buttons Group */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-8 sm:h-9 w-20 sm:w-24 flex-1 sm:flex-none" />
            <Skeleton className="h-8 sm:h-9 w-16 sm:w-20 flex-1 sm:flex-none" />
          </div>
        </div>

        {/* Status and Action Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ID Badge */}
          <Skeleton className="h-6 w-24 rounded-full" />
          {/* Status Badge */}
          <Skeleton className="h-6 w-28 rounded-full" />

          {/* Fix Button - Desktop Only */}
          <div className="ml-auto hidden sm:flex">
            <Skeleton className="h-8 w-28" />
          </div>

          {/* Mobile Fix Button */}
          <div className="w-full sm:hidden mt-2">
            <Skeleton className="h-8 w-full max-w-[200px]" />
          </div>
        </div>
      </div>
    </>
  );
}

// Loading state skeleton for the entire bug details page header
export function BugDetailsHeaderSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-6 md:px-6 lg:px-8">
      {/* Main Header Skeleton */}
      <BugHeaderSkeletonDetailed />

      {/* Additional spacing for page layout */}
      <div className="border-t border-border pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area placeholder */}
          <div className="lg:col-span-2">
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>

          {/* Sidebar placeholder */}
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
