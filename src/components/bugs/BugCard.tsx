import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { Link, useLocation } from "react-router-dom";

interface Bug {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "fixed" | "declined" | "rejected";
  project_id: string;
  project_name?: string;
  reported_by: string;
  reporter_name?: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at?: string;
}

interface BugCardProps {
  bug: Bug;
  onDelete?: () => void;
}

const priorityColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
};

const statusColors = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  in_progress:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  fixed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
};

function formatDateTime(dateStr: string) {
  return formatLocalDate(dateStr, "datetime");
}

export function BugCard({ bug, onDelete }: BugCardProps) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const isFromProject = location.pathname.includes("/projects/");

  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm w-full h-full p-4 sm:p-5 hover:shadow-xl transition-all duration-300">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-50/40 via-transparent to-red-50/40 dark:from-orange-950/15 dark:via-transparent dark:to-red-950/15"></div>
      <div className="relative w-full h-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-base sm:text-lg break-words whitespace-pre-line w-full text-gray-900 dark:text-white">
            {bug.title || "Untitled Bug"}
          </h4>
          <Badge
            variant="outline"
            className={`text-xs ${
              priorityColors[bug.priority] || priorityColors.medium
            }`}
          >
            {bug.priority || "medium"}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${
              statusColors[bug.status] || statusColors.pending
            }`}
          >
            {(bug.status || "pending").replace("_", " ")}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          {bug.project_name && !isFromProject && (
            <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">
              Project: {bug.project_name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <span>
              Created by: <b>{bug.reporter_name || bug.reported_by}</b>
            </span>
            <br />
            <span>Created: {formatDateTime(bug.created_at)}</span>
          </p>
          {bug.updated_by_name && bug.updated_at && (
            <p className="text-xs text-muted-foreground">
              <span>
                Updated by: <b>{bug.updated_by_name}</b>
              </span>
              <br />
              <span>Updated: {formatDateTime(bug.updated_at)}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="text-xs sm:text-sm h-9 px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-300 dark:hover:border-orange-700 text-gray-700 dark:text-gray-300 hover:text-orange-700 dark:hover:text-orange-300 font-semibold shadow-sm transition-all duration-300"
        >
          <Link
            to={`/${currentUser?.role || "tester"}/bugs/${bug.id}${
              isFromProject ? "?from=project" : ""
            }`}
            state={{ from: isFromProject ? "project" : "bugs" }}
          >
            View
          </Link>
        </Button>
      </div>
      </div>
    </Card>
  );
}

// BugCard Skeleton Component
export function BugCardSkeleton() {
  return (
    <Card className="w-full h-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Title Skeleton */}
          <Skeleton className="h-5 sm:h-6 w-full max-w-[300px] sm:max-w-[400px]" />
          {/* Priority Badge Skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" />
          {/* Status Badge Skeleton */}
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        <div className="flex flex-col gap-1">
          {/* Project Name Skeleton (conditional) */}
          <Skeleton className="h-4 w-32 sm:w-40" />
          {/* Created Date Skeleton */}
          <Skeleton className="h-3 sm:h-4 w-28 sm:w-36" />
        </div>
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4">
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24" />
      </div>
    </Card>
  );
}

// Advanced BugCard Skeleton with more detailed placeholders
export function BugCardSkeletonDetailed() {
  return (
    <Card className="w-full h-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow animate-pulse">
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header Row with Title and Badges */}
        <div className="flex flex-wrap items-start gap-2">
          <div className="w-full space-y-2">
            {/* Main Title */}
            <Skeleton className="h-5 sm:h-6 w-full max-w-[280px] sm:max-w-[380px]" />
            {/* Secondary line for longer titles */}
            <Skeleton className="h-4 w-3/4 max-w-[200px] sm:max-w-[250px]" />
          </div>

          {/* Badges Row */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-18 rounded-full" />
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex flex-col gap-1.5">
          {/* Project Name (when not from project page) */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-24 sm:w-32" />
          </div>
          {/* Created Date */}
          <Skeleton className="h-3 sm:h-4 w-32 sm:w-40" />
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex flex-wrap gap-2 mt-3 sm:mt-0 sm:ml-4 min-w-fit">
        <Skeleton className="h-7 sm:h-8 w-20 sm:w-24 flex-shrink-0" />
      </div>
    </Card>
  );
}

// Responsive Grid Skeleton for multiple bug cards
export function BugCardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 grid-cols-1"
      aria-busy="true"
      aria-label="Loading bug list"
    >
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <BugCardSkeleton key={index} />
        ))}
    </div>
  );
}

// Enhanced Grid Skeleton with staggered animation
export function BugCardGridSkeletonAnimated({ count = 3 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 grid-cols-1"
      aria-busy="true"
      aria-label="Loading bug list"
    >
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            key={index}
            className="animate-in fade-in duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <BugCardSkeletonDetailed />
          </div>
        ))}
    </div>
  );
}
