import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugService, Bug as BugType } from "@/services/bugService";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bug, CheckCircle, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// Table row skeleton component for loading state
const TableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-[180px]" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-[22px] w-16 rounded-full" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-28" />
    </TableCell>
    <TableCell className="text-right">
      <Skeleton className="h-9 w-[90px] ml-auto" />
    </TableCell>
  </TableRow>
);

// Card skeleton for mobile view
const CardSkeleton = () => (
  <div className="rounded-lg border p-4 bg-background flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-[22px] w-16 rounded-full" />
    </div>
    <Skeleton className="h-5 w-4/5" />
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-28" />
    </div>
    <div className="flex justify-end">
      <Skeleton className="h-8 w-[90px]" />
    </div>
  </div>
);

// Header skeleton
const HeaderSkeleton = () => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
    <h1 className="text-2xl font-bold tracking-tight break-words">
      Fixed Bugs
    </h1>
    <div className="flex items-center space-x-2 sm:space-x-0 sm:ml-auto">
      <Skeleton className="h-[34px] w-36 rounded-md" />
    </div>
  </div>
);

const Fixes = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all bugs
  const {
    data: bugs,
    isLoading,
    error,
  } = useQuery<BugType[]>({
    queryKey: ["bugs"],
    queryFn: () => bugService.getBugs(),
  });

  // Calculate fixed bugs by priority
  const bugsByPriority = bugs?.reduce((acc, bug) => {
    acc[bug.priority] = (acc[bug.priority] || 0) + 1;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  // Determine priorities colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "";
    }
  };

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load fixed bugs. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-6xl mx-auto">
      {isLoading ? (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <HeaderSkeleton />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          {/* Table skeleton for desktop */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table className="min-w-[600px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Bug ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Fixed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRowSkeleton key={index} />
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Card skeleton for mobile */}
          <div className="sm:hidden space-y-4">
            {Array(3)
              .fill(0)
              .map((_, index) => (
                <CardSkeleton key={index} />
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight break-words">
              Bugs by Priority
            </h1>
            <div className="flex items-center space-x-2 sm:space-x-0 sm:ml-auto">
              {/* Add + Fix Bugs button */}
              {(currentUser?.role === "admin" || currentUser?.role === "tester") && (
                <Button asChild className="h-9 text-sm">
                  <Link to="/bugs">+ Fix Bugs</Link>
                </Button>
              )}

              {/* Display priority counts */}
              {!isLoading && bugs && (
                <div className="flex items-center space-x-2">
                  {bugsByPriority.high > 0 && (
                    <div className="flex items-center border rounded-md px-2 py-1 bg-red-50 border-red-200 text-red-700 text-xs font-medium">
                      <AlertCircle className="h-3 w-3 mr-1" /> High: {bugsByPriority.high}
                    </div>
                  )}
                  {bugsByPriority.medium > 0 && (
                    <div className="flex items-center border rounded-md px-2 py-1 bg-yellow-50 border-yellow-200 text-yellow-700 text-xs font-medium">
                      <AlertCircle className="h-3 w-3 mr-1" /> Medium: {bugsByPriority.medium}
                    </div>
                  )}
                  {bugsByPriority.low > 0 && (
                    <div className="flex items-center border rounded-md px-2 py-1 bg-green-50 border-green-200 text-green-700 text-xs font-medium">
                      <AlertCircle className="h-3 w-3 mr-1" /> Low: {bugsByPriority.low}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Display summary or no bugs message */}
          {!isLoading && bugs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bug className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Bugs Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                There are no bugs in the system yet.
              </p>
            </div>
          ) : (
            null
          )}
        </>
      )}
    </div>
  );
};

export default Fixes;
