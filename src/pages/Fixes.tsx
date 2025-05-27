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

  // Filter bugs to show only the fixed ones
  const fixedBugs = bugs?.filter((bug) => bug.status === "fixed") || [];

  // Filter by search term
  const filteredBugs = fixedBugs.filter(
    (bug) =>
      bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bug.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
              Fixed Bugs
            </h1>
            <div className="flex items-center space-x-2 sm:space-x-0 sm:ml-auto">
              <div className="flex items-center border rounded-md px-3 py-1 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-700">
                  {fixedBugs.length} Issues Fixed
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 max-w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search fixed bugs..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredBugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Fixed Bugs</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No bugs have been fixed yet.
              </p>
            </div>
          ) : (
            <>
              {/* Table for sm and up */}
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
                    {filteredBugs.map((bug) => (
                      <TableRow key={bug.id}>
                        <TableCell className="font-medium max-w-[120px] break-all">
                          <div className="flex items-center space-x-2">
                            <Bug className="h-4 w-4 text-muted-foreground" />
                            <span>{bug.id.substring(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] break-words">
                          {bug.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(bug.priority)}
                          >
                            {bug.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] break-words">
                          {bug.reported_by}
                        </TableCell>
                        <TableCell>{formatDate(bug.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/bugs/${bug.id}`}>View Details</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Card list for mobile */}
              <div className="sm:hidden space-y-4">
                {filteredBugs.map((bug) => (
                  <div
                    key={bug.id}
                    className="rounded-lg border p-4 bg-background flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm break-all">
                        {bug.id.substring(0, 8)}
                      </span>
                      <Badge
                        variant="outline"
                        className={getPriorityColor(bug.priority)}
                      >
                        {bug.priority}
                      </Badge>
                    </div>
                    <div className="font-bold text-base break-words">
                      {bug.title}
                    </div>
                    <div className="text-xs text-muted-foreground break-words">
                      Reported by:{" "}
                      <span className="font-medium">{bug.reported_by}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Fixed: {formatDate(bug.updated_at)}
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/bugs/${bug.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Fixes;
